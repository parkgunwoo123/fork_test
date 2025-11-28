/**
 * 보안 강화 메인 서버 파일
 * - Express 보안 설정
 * - CORS 설정
 * - 세션 관리
 * - 에러 핸들링
 * - 로깅
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const session = require('express-session');
const path = require('path');
require('dotenv').config();

// 미들웨어 import
const { 
  securityHeaders, 
  globalLimiter, 
  sanitizeInput 
} = require('./middleware/security');

// 라우트 import
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
// const cartRoutes = require('./routes/cart');
// const orderRoutes = require('./routes/orders');
// const reviewRoutes = require('./routes/reviews');
// const chatRoutes = require('./routes/chat');
// const userRoutes = require('./routes/users');
// const inquiryRoutes = require('./routes/inquiries');

const app = express();
const PORT = 3001;

// ==================== 보안 설정 ====================

// Helmet 보안 헤더
app.use(securityHeaders);

// CORS 설정
const corsOptions = {
  origin: process.env.CORS_ORIGIN || process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true, // 쿠키 허용
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token']
};
app.use(cors(corsOptions));

// Body Parser
app.use(express.json({ limit: '10mb' })); // JSON 페이로드 크기 제한
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 세션 설정
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    httpOnly: true, // XSS 방지
    maxAge: parseInt(process.env.SESSION_MAX_AGE) || 24 * 60 * 60 * 1000, // 24시간
    sameSite: 'strict' // CSRF 방지
  }
}));

// Rate Limiting (전역)
app.use('/api/', globalLimiter);

// XSS 방지 - 입력값 sanitize
app.use(sanitizeInput);

// 정적 파일 제공 (업로드된 이미지 등)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Request 로깅 (개발 환경)
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
  });
}

// ==================== 라우트 설정 ====================

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// API 라우트
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
// app.use('/api/cart', cartRoutes);
// app.use('/api/orders', orderRoutes);
// app.use('/api/reviews', reviewRoutes);
// app.use('/api/chat', chatRoutes);
// app.use('/api/users', userRoutes);
// app.use('/api/inquiries', inquiryRoutes);

// ==================== 에러 핸들링 ====================

// 404 핸들러
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: '요청한 리소스를 찾을 수 없습니다.'
  });
});

// 전역 에러 핸들러
app.use((err, req, res, next) => {
  console.error('에러 발생:', err);

  // 에러 타입별 처리
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: '입력값이 유효하지 않습니다.',
      errors: err.details
    });
  }

  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      success: false,
      message: '인증이 필요합니다.'
    });
  }

  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({
      success: false,
      message: '이미 존재하는 데이터입니다.'
    });
  }

  // 기본 에러 응답
  const statusCode = err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? '서버 오류가 발생했습니다.' 
    : err.message;

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

// ==================== 서버 시작 ====================

// Graceful Shutdown
const gracefulShutdown = () => {
  console.log('\n서버를 종료합니다...');
  server.close(() => {
    console.log('서버가 종료되었습니다.');
    process.exit(0);
  });

  // 강제 종료 (30초 후)
  setTimeout(() => {
    console.error('강제로 서버를 종료합니다.');
    process.exit(1);
  }, 30000);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// 서버 시작
const server = app.listen(PORT, () => {
  console.log('='.repeat(50));
  console.log(`✅ 보안 강화 서버가 시작되었습니다.`);
  console.log(`📡 포트: ${PORT}`);
  console.log(`🌍 환경: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔒 CORS Origin: ${corsOptions.origin}`);
  console.log('='.repeat(50));
});

// 처리되지 않은 Promise 거부 처리
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

module.exports = app;
