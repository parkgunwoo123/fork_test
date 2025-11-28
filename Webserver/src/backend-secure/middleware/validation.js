/**
 * 입력값 검증 스키마 (Joi)
 * - 모든 사용자 입력 검증
 * - SQL Injection 방지
 * - XSS 방지
 */

const Joi = require('joi');

/**
 * 회원가입 검증
 */
const registerSchema = Joi.object({
  email: Joi.string()
    .email()
    .max(255)
    .required()
    .messages({
      'string.email': '유효한 이메일 주소를 입력해주세요.',
      'string.max': '이메일은 255자를 초과할 수 없습니다.',
      'any.required': '이메일은 필수 입력 항목입니다.'
    }),
  
  username: Joi.string()
    .min(2)
    .max(100)
    .pattern(/^[가-힣a-zA-Z0-9_]+$/)
    .required()
    .messages({
      'string.min': '사용자명은 최소 2자 이상이어야 합니다.',
      'string.max': '사용자명은 100자를 초과할 수 없습니다.',
      'string.pattern.base': '사용자명은 한글, 영문, 숫자, 언더스코어만 사용 가능합니다.',
      'any.required': '사용자명은 필수 입력 항목입니다.'
    }),
  
  password: Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .required()
    .messages({
      'string.min': '비밀번호는 최소 8자 이상이어야 합니다.',
      'string.max': '비밀번호는 128자를 초과할 수 없습니다.',
      'string.pattern.base': '비밀번호는 대소문자, 숫자, 특수문자를 포함해야 합니다.',
      'any.required': '비밀번호는 필수 입력 항목입니다.'
    }),
  
  phone: Joi.string()
    .pattern(/^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/)
    .allow('', null)
    .messages({
      'string.pattern.base': '올바른 휴대폰 번호 형식이 아닙니다.'
    }),
  
  address: Joi.string()
    .max(500)
    .allow('', null)
    .messages({
      'string.max': '주소는 500자를 초과할 수 없습니다.'
    })
});

/**
 * 로그인 검증
 */
const loginSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': '유효한 이메일 주소를 입력해주세요.',
      'any.required': '이메일은 필수 입력 항목입니다.'
    }),
  
  password: Joi.string()
    .required()
    .messages({
      'any.required': '비밀번호는 필수 입력 항목입니다.'
    })
});

/**
 * 상품 등록 검증
 */
const productSchema = Joi.object({
  title: Joi.string()
    .min(2)
    .max(200)
    .required()
    .messages({
      'string.min': '제목은 최소 2자 이상이어야 합니다.',
      'string.max': '제목은 200자를 초과할 수 없습니다.',
      'any.required': '제목은 필수 입력 항목입니다.'
    }),
  
  description: Joi.string()
    .min(10)
    .max(5000)
    .required()
    .messages({
      'string.min': '설명은 최소 10자 이상이어야 합니다.',
      'string.max': '설명은 5000자를 초과할 수 없습니다.',
      'any.required': '설명은 필수 입력 항목입니다.'
    }),
  
  price: Joi.number()
    .integer()
    .min(0)
    .max(999999999)
    .required()
    .messages({
      'number.base': '가격은 숫자여야 합니다.',
      'number.integer': '가격은 정수여야 합니다.',
      'number.min': '가격은 0원 이상이어야 합니다.',
      'number.max': '가격은 999,999,999원을 초과할 수 없습니다.',
      'any.required': '가격은 필수 입력 항목입니다.'
    }),
  
  category: Joi.string()
    .valid('electronics', 'fashion', 'beauty', 'sports', 'books', 'food', 'furniture', 'etc')
    .required()
    .messages({
      'any.only': '유효한 카테고리를 선택해주세요.',
      'any.required': '카테고리는 필수 선택 항목입니다.'
    }),
  
  stock: Joi.number()
    .integer()
    .min(1)
    .max(9999)
    .default(1)
    .messages({
      'number.base': '재고는 숫자여야 합니다.',
      'number.min': '재고는 최소 1개 이상이어야 합니다.',
      'number.max': '재고는 9999개를 초과할 수 없습니다.'
    }),
  
  location: Joi.string()
    .max(100)
    .allow('', null)
    .messages({
      'string.max': '거래 지역은 100자를 초과할 수 없습니다.'
    }),
  
  is_negotiable: Joi.boolean()
    .default(false),
  
  condition_status: Joi.string()
    .valid('new', 'like_new', 'good', 'fair', 'poor')
    .allow('', null)
});

/**
 * 리뷰 작성 검증
 */
const reviewSchema = Joi.object({
  product_id: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.guid': '유효한 상품 ID가 아닙니다.',
      'any.required': '상품 ID는 필수입니다.'
    }),
  
  rating: Joi.number()
    .integer()
    .min(1)
    .max(5)
    .required()
    .messages({
      'number.min': '별점은 1점 이상이어야 합니다.',
      'number.max': '별점은 5점 이하여야 합니다.',
      'any.required': '별점은 필수입니다.'
    }),
  
  comment: Joi.string()
    .min(10)
    .max(1000)
    .required()
    .messages({
      'string.min': '리뷰는 최소 10자 이상이어야 합니다.',
      'string.max': '리뷰는 1000자를 초과할 수 없습니다.',
      'any.required': '리뷰 내용은 필수입니다.'
    })
});

/**
 * 문의 등록 검증
 */
const inquirySchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': '유효한 이메일 주소를 입력해주세요.',
      'any.required': '이메일은 필수입니다.'
    }),
  
  title: Joi.string()
    .min(5)
    .max(200)
    .required()
    .messages({
      'string.min': '제목은 최소 5자 이상이어야 합니다.',
      'string.max': '제목은 200자를 초과할 수 없습니다.',
      'any.required': '제목은 필수입니다.'
    }),
  
  content: Joi.string()
    .min(10)
    .max(2000)
    .required()
    .messages({
      'string.min': '내용은 최소 10자 이상이어야 합니다.',
      'string.max': '내용은 2000자를 초과할 수 없습니다.',
      'any.required': '내용은 필수입니다.'
    }),
  
  category: Joi.string()
    .valid('general', 'order', 'payment', 'delivery', 'refund', 'product', 'account', 'etc')
    .required()
    .messages({
      'any.only': '유효한 카테고리를 선택해주세요.',
      'any.required': '카테고리는 필수입니다.'
    })
});

/**
 * 메시지 전송 검증
 */
const messageSchema = Joi.object({
  chat_room_id: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.guid': '유효한 채팅방 ID가 아닙니다.',
      'any.required': '채팅방 ID는 필수입니다.'
    }),
  
  content: Joi.string()
    .min(1)
    .max(1000)
    .required()
    .messages({
      'string.min': '메시지는 최소 1자 이상이어야 합니다.',
      'string.max': '메시지는 1000자를 초과할 수 없습니다.',
      'any.required': '메시지 내용은 필수입니다.'
    }),
  
  message_type: Joi.string()
    .valid('text', 'image', 'file', 'system')
    .default('text')
});

/**
 * 프로필 수정 검증
 */
const updateProfileSchema = Joi.object({
  username: Joi.string()
    .min(2)
    .max(100)
    .pattern(/^[가-힣a-zA-Z0-9_]+$/)
    .messages({
      'string.min': '사용자명은 최소 2자 이상이어야 합니다.',
      'string.max': '사용자명은 100자를 초과할 수 없습니다.',
      'string.pattern.base': '사용자명은 한글, 영문, 숫자, 언더스코어만 사용 가능합니다.'
    }),
  
  phone: Joi.string()
    .pattern(/^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/)
    .allow('', null)
    .messages({
      'string.pattern.base': '올바른 휴대폰 번호 형식이 아닙니다.'
    }),
  
  address: Joi.string()
    .max(500)
    .allow('', null)
    .messages({
      'string.max': '주소는 500자를 초과할 수 없습니다.'
    }),
  
  bio: Joi.string()
    .max(500)
    .allow('', null)
    .messages({
      'string.max': '자기소개는 500자를 초과할 수 없습니다.'
    })
});

/**
 * 비밀번호 변경 검증
 */
const changePasswordSchema = Joi.object({
  current_password: Joi.string()
    .required()
    .messages({
      'any.required': '현재 비밀번호는 필수입니다.'
    }),
  
  new_password: Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .required()
    .messages({
      'string.min': '새 비밀번호는 최소 8자 이상이어야 합니다.',
      'string.max': '새 비밀번호는 128자를 초과할 수 없습니다.',
      'string.pattern.base': '새 비밀번호는 대소문자, 숫자, 특수문자를 포함해야 합니다.',
      'any.required': '새 비밀번호는 필수입니다.'
    }),
  
  confirm_password: Joi.string()
    .valid(Joi.ref('new_password'))
    .required()
    .messages({
      'any.only': '비밀번호가 일치하지 않습니다.',
      'any.required': '비밀번호 확인은 필수입니다.'
    })
});

/**
 * 가격 제안 검증
 */
const priceSuggestionSchema = Joi.object({
  product_id: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.guid': '유효한 상품 ID가 아닙니다.',
      'any.required': '상품 ID는 필수입니다.'
    }),
  
  suggested_price: Joi.number()
    .integer()
    .min(0)
    .max(999999999)
    .required()
    .messages({
      'number.base': '제안 가격은 숫자여야 합니다.',
      'number.min': '제안 가격은 0원 이상이어야 합니다.',
      'number.max': '제안 가격이 너무 높습니다.',
      'any.required': '제안 가격은 필수입니다.'
    }),
  
  message: Joi.string()
    .max(500)
    .allow('', null)
    .messages({
      'string.max': '메시지는 500자를 초과할 수 없습니다.'
    })
});

/**
 * 신고 검증
 */
const reportSchema = Joi.object({
  reported_user_id: Joi.string()
    .uuid()
    .allow(null),
  
  reported_product_id: Joi.string()
    .uuid()
    .allow(null),
  
  reported_review_id: Joi.string()
    .uuid()
    .allow(null),
  
  reason: Joi.string()
    .valid('spam', 'fraud', 'inappropriate', 'copyright', 'other')
    .required()
    .messages({
      'any.only': '유효한 신고 사유를 선택해주세요.',
      'any.required': '신고 사유는 필수입니다.'
    }),
  
  description: Joi.string()
    .min(10)
    .max(500)
    .required()
    .messages({
      'string.min': '신고 내용은 최소 10자 이상이어야 합니다.',
      'string.max': '신고 내용은 500자를 초과할 수 없습니다.',
      'any.required': '신고 내용은 필수입니다.'
    })
});

/**
 * 검색 쿼리 검증
 */
const searchSchema = Joi.object({
  q: Joi.string()
    .max(200)
    .allow('', null)
    .messages({
      'string.max': '검색어는 200자를 초과할 수 없습니다.'
    }),
  
  category: Joi.string()
    .valid('electronics', 'fashion', 'beauty', 'sports', 'books', 'food', 'furniture', 'etc', '')
    .allow('', null),
  
  minPrice: Joi.number()
    .integer()
    .min(0)
    .allow(null),
  
  maxPrice: Joi.number()
    .integer()
    .min(0)
    .allow(null),
  
  location: Joi.string()
    .max(100)
    .allow('', null),
  
  page: Joi.number()
    .integer()
    .min(1)
    .default(1),
  
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(20)
});

module.exports = {
  registerSchema,
  loginSchema,
  productSchema,
  reviewSchema,
  inquirySchema,
  messageSchema,
  updateProfileSchema,
  changePasswordSchema,
  priceSuggestionSchema,
  reportSchema,
  searchSchema
};
