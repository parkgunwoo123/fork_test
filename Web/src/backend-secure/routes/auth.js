/**
 * 보안 강화 인증 라우트
 * - 안전한 비밀번호 해싱 (bcrypt)
 * - JWT 토큰 발급
 * - 세션 관리
 * - 로그인 시도 제한
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { query, transaction } = require('../db');
const { validateInput } = require('../middleware/security');
const { registerSchema, loginSchema, changePasswordSchema } = require('../middleware/validation');
const { authLimiter, checkLoginAttempts, logLoginAttempt } = require('../middleware/security');
const { authenticateToken } = require('../middleware/auth');

// bcrypt 해싱 라운드 (10-12 권장)
const SALT_ROUNDS = 12;

/**
 * 회원가입
 * POST /api/auth/register
 */
router.post('/register', 
  authLimiter,
  validateInput(registerSchema),
  async (req, res) => {
    try {
      const { email, username, password, phone, address } = req.body;

      // 이메일 중복 확인
      const existingUsers = await query(
        'SELECT id FROM users WHERE email = ?',
        [email]
      );

      if (existingUsers.length > 0) {
        return res.status(400).json({
          success: false,
          message: '이미 사용 중인 이메일입니다.'
        });
      }

      // 사용자명 중복 확인
      const existingUsername = await query(
        'SELECT id FROM users WHERE username = ?',
        [username]
      );

      if (existingUsername.length > 0) {
        return res.status(400).json({
          success: false,
          message: '이미 사용 중인 사용자명입니다.'
        });
      }

      // 비밀번호 해싱
      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

      // 사용자 생성
      const userId = uuidv4();
      await query(
        `INSERT INTO users (id, email, username, password_hash, phone, address) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [userId, email, username, passwordHash, phone || null, address || null]
      );

      // TODO: 이메일 인증 메일 발송 (생략)

      res.status(201).json({
        success: true,
        message: '회원가입이 완료되었습니다. 이메일을 확인해주세요.',
        data: {
          id: userId,
          email,
          username
        }
      });

    } catch (error) {
      console.error('회원가입 에러:', error);
      res.status(500).json({
        success: false,
        message: '서버 오류가 발생했습니다.'
      });
    }
  }
);

/**
 * 로그인
 * POST /api/auth/login
 */
router.post('/login',
  authLimiter,
  checkLoginAttempts,
  validateInput(loginSchema),
  async (req, res) => {
    const ip = req.ip || req.connection.remoteAddress;
    
    try {
      const { email, password } = req.body;

      // 사용자 조회
      const users = await query(
        'SELECT * FROM users WHERE email = ? AND is_deleted = FALSE',
        [email]
      );

      if (users.length === 0) {
        // 로그인 실패 기록
        await logLoginAttempt(email, ip, false, 'user_not_found');
        
        return res.status(401).json({
          success: false,
          message: '이메일 또는 비밀번호가 올바르지 않습니다.'
        });
      }

      const user = users[0];

      // 비밀번호 검증
      const isPasswordValid = await bcrypt.compare(password, user.password_hash);

      if (!isPasswordValid) {
        // 로그인 실패 기록
        await logLoginAttempt(email, ip, false, 'invalid_password');
        
        return res.status(401).json({
          success: false,
          message: '이메일 또는 비밀번호가 올바르지 않습니다.'
        });
      }

      // 이메일 인증 확인 (옵션)
      // if (!user.is_verified) {
      //   return res.status(403).json({
      //     success: false,
      //     message: '이메일 인증이 필요합니다.'
      //   });
      // }

      // JWT 토큰 생성
      const token = jwt.sign(
        { 
          userId: user.id,
          email: user.email,
          isAdmin: user.is_admin 
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );

      // 세션 생성
      const sessionId = uuidv4();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7일

      await query(
        `INSERT INTO sessions (id, user_id, token, expires_at, ip_address, user_agent)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          sessionId,
          user.id,
          token,
          expiresAt,
          ip,
          req.headers['user-agent'] || null
        ]
      );

      // 마지막 로그인 시간 업데이트
      await query(
        'UPDATE users SET last_login_at = NOW() WHERE id = ?',
        [user.id]
      );

      // 로그인 성공 기록
      await logLoginAttempt(email, ip, true);

      // 비밀번호 제외하고 반환
      const { password_hash, ...userWithoutPassword } = user;

      res.json({
        success: true,
        message: '로그인 성공',
        data: {
          user: userWithoutPassword,
          token
        }
      });

    } catch (error) {
      console.error('로그인 에러:', error);
      res.status(500).json({
        success: false,
        message: '서버 오류가 발생했습니다.'
      });
    }
  }
);

/**
 * 로그아웃
 * POST /api/auth/logout
 */
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    // 세션 삭제
    await query(
      'DELETE FROM sessions WHERE token = ? AND user_id = ?',
      [req.token, req.user.id]
    );

    res.json({
      success: true,
      message: '로그아웃되었습니다.'
    });

  } catch (error) {
    console.error('로그아웃 에러:', error);
    res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.'
    });
  }
});

/**
 * 현재 사용자 정보 조회
 * GET /api/auth/me
 */
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const users = await query(
      `SELECT id, email, username, phone, address, profile_image, bio, 
              is_admin, is_verified, rating, total_sales, created_at 
       FROM users WHERE id = ?`,
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: '사용자를 찾을 수 없습니다.'
      });
    }

    res.json({
      success: true,
      data: users[0]
    });

  } catch (error) {
    console.error('사용자 정보 조회 에러:', error);
    res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.'
    });
  }
});

/**
 * 비밀번호 변경
 * PUT /api/auth/password
 */
router.put('/password',
  authenticateToken,
  validateInput(changePasswordSchema),
  async (req, res) => {
    try {
      const { current_password, new_password } = req.body;

      // 현재 비밀번호 확인
      const users = await query(
        'SELECT password_hash FROM users WHERE id = ?',
        [req.user.id]
      );

      if (users.length === 0) {
        return res.status(404).json({
          success: false,
          message: '사용자를 찾을 수 없습니다.'
        });
      }

      // 현재 비밀번호 검증
      const isPasswordValid = await bcrypt.compare(current_password, users[0].password_hash);

      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: '현재 비밀번호가 올바르지 않습니다.'
        });
      }

      // 새 비밀번호 해싱
      const newPasswordHash = await bcrypt.hash(new_password, SALT_ROUNDS);

      // 비밀번호 업데이트
      await query(
        'UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?',
        [newPasswordHash, req.user.id]
      );

      // 모든 세션 삭제 (재로그인 필요)
      await query(
        'DELETE FROM sessions WHERE user_id = ?',
        [req.user.id]
      );

      res.json({
        success: true,
        message: '비밀번호가 변경되었습니다. 다시 로그인해주세요.'
      });

    } catch (error) {
      console.error('비밀번호 변경 에러:', error);
      res.status(500).json({
        success: false,
        message: '서버 오류가 발생했습니다.'
      });
    }
  }
);

/**
 * 세션 만료 정리 (크론 작업으로 실행 권장)
 */
const cleanExpiredSessions = async () => {
  try {
    await query('DELETE FROM sessions WHERE expires_at < NOW()');
  } catch (error) {
    console.error('세션 정리 에러:', error);
  }
};

// 1시간마다 만료된 세션 정리
setInterval(cleanExpiredSessions, 60 * 60 * 1000);

module.exports = router;
