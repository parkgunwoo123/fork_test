/**
 * 보안 미들웨어 모음
 * - CSRF 방지
 * - XSS 방지
 * - Rate Limiting
 * - Input Validation
 * - SQL Injection 방지
 */

const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const crypto = require('crypto');
const { query } = require('../db');

/**
 * Helmet 보안 헤더 설정
 */
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
});

/**
 * Rate Limiting - 전역
 */
const globalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15분
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: '너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요.',
  standardHeaders: true,
  legacyHeaders: false,
  // IP 기반 제한
  keyGenerator: (req) => {
    return req.ip || req.connection.remoteAddress;
  }
});

/**
 * Rate Limiting - 로그인/회원가입
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: 5, // 최대 5회 시도
  message: '계정생성5회 하셨습니다. 15분 후 다시 시도해주세요.',
  skipSuccessfulRequests: true
});

/**
 * Rate Limiting - API 요청
 */
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1분
  max: 60, // 분당 60회
  message: 'API 요청 한도를 초과했습니다.'
});

/**
 * CSRF 토큰 생성
 */
const generateCSRFToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * CSRF 토큰 검증 미들웨어
 */
const csrfProtection = (req, res, next) => {
  // GET, HEAD, OPTIONS 요청은 제외
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  const token = req.headers['x-csrf-token'] || req.body._csrf;
  const sessionToken = req.session?.csrfToken;

  if (!token || !sessionToken || token !== sessionToken) {
    return res.status(403).json({
      success: false,
      message: 'CSRF 토큰이 유효하지 않습니다.'
    });
  }

  next();
};

/**
 * XSS 방지 - HTML 이스케이프
 */
const escapeHtml = (text) => {
  if (typeof text !== 'string') return text;
  
  const map = {
    '&': '&',
    '<': '<',
    '>': '>',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };
  
  return text.replace(/[&<>"'/]/g, (char) => map[char]);
};

/**
 * XSS 방지 미들웨어
 */
const sanitizeInput = (req, res, next) => {
  // body의 모든 문자열 필드를 이스케이프
  if (req.body) {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = escapeHtml(req.body[key]);
      }
    });
  }

  // query 파라미터도 이스케이프
  if (req.query) {
    Object.keys(req.query).forEach(key => {
      if (typeof req.query[key] === 'string') {
        req.query[key] = escapeHtml(req.query[key]);
      }
    });
  }

  next();
};

/**
 * SQL Injection 방지 - 입력값 검증
 */
const validateInput = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        success: false,
        message: '입력값이 유효하지 않습니다.',
        errors
      });
    }

    req.body = value;
    next();
  };
};

/**
 * 로그인 시도 횟수 제한
 */
const checkLoginAttempts = async (req, res, next) => {
  const { email } = req.body;
  const ip = req.ip || req.connection.remoteAddress;

  try {
    // 최근 15분간 실패한 로그인 시도 확인
    const attempts = await query(
      `SELECT COUNT(*) as count 
       FROM login_attempts 
       WHERE (email = ? OR ip_address = ?) 
       AND success = FALSE 
       AND attempted_at > DATE_SUB(NOW(), INTERVAL 15 MINUTE)`,
      [email, ip]
    );

    const maxAttempts = parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5;

    if (attempts[0].count >= maxAttempts) {
      return res.status(429).json({
        success: false,
        message: '로그인 시도 횟수를 초과했습니다. 15분 후 다시 시도해주세요.'
      });
    }

    next();
  } catch (error) {
    console.error('로그인 시도 확인 에러:', error);
    next();
  }
};

/**
 * 로그인 시도 기록
 */
const logLoginAttempt = async (email, ip, success, failReason = null) => {
  try {
    await query(
      `INSERT INTO login_attempts (email, ip_address, success, fail_reason) 
       VALUES (?, ?, ?, ?)`,
      [email, ip, success, failReason]
    );

    // 30일 이상 된 기록 삭제 (정기 정리)
    await query(
      'DELETE FROM login_attempts WHERE attempted_at < DATE_SUB(NOW(), INTERVAL 30 DAY)'
    );
  } catch (error) {
    console.error('로그인 시도 기록 실패:', error);
  }
};

/**
 * 파일 업로드 보안 검증
 */
const validateFileUpload = (req, res, next) => {
  if (!req.file && !req.files) {
    return next();
  }

  const allowedTypes = (process.env.ALLOWED_FILE_TYPES || 'image/jpeg,image/png').split(',');
  const maxSize = parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024; // 5MB

  const files = req.files || [req.file];

  for (const file of files) {
    // MIME 타입 검증
    if (!allowedTypes.includes(file.mimetype)) {
      return res.status(400).json({
        success: false,
        message: `허용되지 않는 파일 형식입니다. (${file.mimetype})`
      });
    }

    // 파일 크기 검증
    if (file.size > maxSize) {
      return res.status(400).json({
        success: false,
        message: `파일 크기가 너무 큽니다. (최대 ${maxSize / 1024 / 1024}MB)`
      });
    }

    // 파일명 검증 (경로 조작 방지)
    const filename = file.originalname;
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({
        success: false,
        message: '유효하지 않은 파일명입니다.'
      });
    }
  }

  next();
};

/**
 * IP 화이트리스트 (관리자 기능)
 */
const ipWhitelist = (whitelist = []) => {
  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    
    if (whitelist.length > 0 && !whitelist.includes(ip)) {
      return res.status(403).json({
        success: false,
        message: '접근이 거부되었습니다.'
      });
    }
    
    next();
  };
};

module.exports = {
  securityHeaders,
  globalLimiter,
  authLimiter,
  apiLimiter,
  generateCSRFToken,
  csrfProtection,
  escapeHtml,
  sanitizeInput,
  validateInput,
  checkLoginAttempts,
  logLoginAttempt,
  validateFileUpload,
  ipWhitelist
};
