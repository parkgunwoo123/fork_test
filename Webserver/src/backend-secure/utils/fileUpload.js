/**
 * 보안 강화 파일 업로드 유틸리티
 * - 파일 타입 검증
 * - 파일 크기 제한
 * - 파일명 sanitize
 * - 악성 파일 차단
 */

const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs').promises;

// 업로드 디렉토리
const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';

// 허용된 이미지 MIME 타입
const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp'
];

// 최대 파일 크기 (5MB)
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024;

/**
 * 파일명 Sanitize (경로 조작 공격 방지)
 */
const sanitizeFilename = (filename) => {
  // 확장자 추출
  const ext = path.extname(filename).toLowerCase();
  
  // 파일명에서 위험한 문자 제거
  const safeName = filename
    .replace(ext, '')
    .replace(/[^a-zA-Z0-9가-힣_-]/g, '_')
    .substring(0, 50);
  
  // 랜덤 해시 추가 (파일명 중복 방지)
  const hash = crypto.randomBytes(8).toString('hex');
  
  return `${safeName}_${hash}${ext}`;
};

/**
 * 파일 타입 검증
 */
const fileFilter = (req, file, cb) => {
  // MIME 타입 검증
  if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
    return cb(
      new Error(`허용되지 않는 파일 형식입니다. (${file.mimetype})`),
      false
    );
  }

  // 파일 확장자 검증 (더블 확장자 공격 방지)
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  
  if (!allowedExts.includes(ext)) {
    return cb(
      new Error(`허용되지 않는 파일 확장자입니다. (${ext})`),
      false
    );
  }

  cb(null, true);
};

/**
 * Multer 저장소 설정
 */
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      // 날짜별 폴더 생성 (uploads/2024/01/15/)
      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      
      const uploadPath = path.join(UPLOAD_DIR, String(year), month, day);
      
      // 디렉토리 생성 (없으면)
      await fs.mkdir(uploadPath, { recursive: true });
      
      cb(null, uploadPath);
    } catch (error) {
      cb(error);
    }
  },
  
  filename: (req, file, cb) => {
    // 안전한 파일명 생성
    const safeFilename = sanitizeFilename(file.originalname);
    cb(null, safeFilename);
  }
});

/**
 * Multer 설정
 */
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE, // 파일 크기 제한
    files: 10 // 최대 파일 개수
  }
});

/**
 * 파일 삭제 (보안)
 */
const deleteFile = async (filePath) => {
  try {
    // 경로 검증 (디렉토리 탈출 방지)
    const normalizedPath = path.normalize(filePath);
    const uploadDirNormalized = path.normalize(UPLOAD_DIR);
    
    if (!normalizedPath.startsWith(uploadDirNormalized)) {
      throw new Error('유효하지 않은 파일 경로입니다.');
    }

    await fs.unlink(normalizedPath);
    return true;
  } catch (error) {
    console.error('파일 삭제 에러:', error);
    return false;
  }
};

/**
 * 이미지 메타데이터 검증 (추가 보안)
 */
const validateImageMetadata = async (filePath) => {
  try {
    // TODO: sharp 라이브러리 등을 사용하여 이미지 메타데이터 검증
    // - 실제 이미지인지 확인
    // - EXIF 데이터에서 악성 코드 제거
    // - 이미지 리사이징 (용량 최적화)
    
    return true;
  } catch (error) {
    console.error('이미지 검증 에러:', error);
    return false;
  }
};

/**
 * 파일 업로드 에러 핸들러
 */
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: `파일 크기가 너무 큽니다. (최대 ${MAX_FILE_SIZE / 1024 / 1024}MB)`
      });
    }
    
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: '파일 개수가 너무 많습니다. (최대 10개)'
      });
    }
    
    return res.status(400).json({
      success: false,
      message: `파일 업로드 에러: ${err.message}`
    });
  }
  
  if (err) {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }
  
  next();
};

module.exports = {
  upload,
  deleteFile,
  validateImageMetadata,
  handleUploadError,
  sanitizeFilename
};
