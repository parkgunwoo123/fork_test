/**
 * 보안 강화 인증 미들웨어
 * - JWT 토큰 검증
 * - 세션 검증
 * - 권한 확인
 * - 토큰 재사용 방지
 */

const jwt = require('jsonwebtoken');
const { query } = require('../db');

/**
 * JWT 토큰 검증 미들웨어
 */
const authenticateToken = async (req, res, next) => {
  try {
    // Authorization 헤더에서 토큰 추출
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: '인증 토큰이 필요합니다.' 
      });
    }

    // 토큰 검증
    jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
      if (err) {
        if (err.name === 'TokenExpiredError') {
          return res.status(401).json({ 
            success: false, 
            message: '토큰이 만료되었습니다.' 
          });
        }
        return res.status(403).json({ 
          success: false, 
          message: '유효하지 않은 토큰입니다.' 
        });
      }

      // 세션 테이블에서 토큰 확인 (토큰 재사용 방지)
      const sessions = await query(
        'SELECT * FROM sessions WHERE token = ? AND user_id = ? AND expires_at > NOW()',
        [token, decoded.userId]
      );

      if (sessions.length === 0) {
        return res.status(401).json({ 
          success: false, 
          message: '세션이 만료되었거나 유효하지 않습니다.' 
        });
      }

      // 사용자 정보 조회
      const users = await query(
        'SELECT id, email, username, is_admin, is_verified, is_deleted FROM users WHERE id = ?',
        [decoded.userId]
      );

      if (users.length === 0 || users[0].is_deleted) {
        return res.status(401).json({ 
          success: false, 
          message: '사용자를 찾을 수 없습니다.' 
        });
      }

      // 계정 정지 확인
      if (!users[0].is_verified) {
        return res.status(403).json({ 
          success: false, 
          message: '이메일 인증이 필요합니다.' 
        });
      }

      // 사용자 정보를 req 객체에 추가
      req.user = users[0];
      req.token = token;
      
      next();
    });
  } catch (error) {
    console.error('인증 미들웨어 에러:', error);
    return res.status(500).json({ 
      success: false, 
      message: '서버 오류가 발생했습니다.' 
    });
  }
};

/**
 * 관리자 권한 확인 미들웨어
 */
const requireAdmin = (req, res, next) => {
  if (!req.user || !req.user.is_admin) {
    return res.status(403).json({ 
      success: false, 
      message: '관리자 권한이 필요합니다.' 
    });
  }
  next();
};

/**
 * 본인 확인 미들웨어 (자신의 리소스만 접근 가능)
 */
const requireSelf = (paramName = 'userId') => {
  return (req, res, next) => {
    const targetUserId = req.params[paramName] || req.body[paramName];
    
    if (req.user.id !== targetUserId && !req.user.is_admin) {
      return res.status(403).json({ 
        success: false, 
        message: '권한이 없습니다.' 
      });
    }
    next();
  };
};

/**
 * 선택적 인증 미들웨어 (토큰이 있으면 검증, 없어도 진행)
 */
const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const users = await query(
      'SELECT id, email, username, is_admin FROM users WHERE id = ? AND is_deleted = FALSE',
      [decoded.userId]
    );

    if (users.length > 0) {
      req.user = users[0];
    }
  } catch (error) {
    // 토큰이 유효하지 않아도 계속 진행
  }

  next();
};

module.exports = {
  authenticateToken,
  requireAdmin,
  requireSelf,
  optionalAuth
};
