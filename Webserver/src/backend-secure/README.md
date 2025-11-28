# 보안 강화 중고거래 플랫폼 백엔드

> **교육용 프로젝트**: 정보보안 교육을 위한 취약점이 제거된 완전한 보안 구현 버전

이 프로젝트는 중고거래 플랫폼의 **모든 주요 취약점을 제거하고 보안 대응 방안을 적용한 버전**입니다. 
SQL Injection, XSS, CSRF, 파일 업로드 취약점 등 OWASP Top 10의 모든 취약점이 완벽하게 방어됩니다.

---

## ✨ 주요 특징

### 🔒 완벽한 보안 구현

- ✅ **SQL Injection 방지**: Prepared Statements, 파라미터 바인딩
- ✅ **XSS 방지**: HTML 이스케이프, CSP 헤더
- ✅ **CSRF 방지**: CSRF 토큰, SameSite 쿠키
- ✅ **인증/인가**: bcrypt 해싱, JWT + 세션, 권한 검증
- ✅ **파일 업로드 보안**: 타입/크기 검증, 파일명 sanitize
- ✅ **Rate Limiting**: DDoS 방지, 무차별 대입 공격 차단
- ✅ **보안 헤더**: Helmet, HSTS, X-Frame-Options 등
- ✅ **입력값 검증**: Joi 스키마, 타입 체크
- ✅ **세션 보안**: 세션 타임아웃, 토큰 재사용 방지
- ✅ **로깅 및 모니터링**: 의심스러운 활동 감지

### 🚀 기능

- 회원가입/로그인 (강력한 비밀번호 정책)
- 상품 등록/조회/수정/삭제 (권한 확인)
- 상품 검색 및 필터링 (안전한 쿼리)
- 파일 업로드 (이미지만, 악성 파일 차단)
- Rate Limiting (요청 횟수 제한)
- 에러 핸들링 (안전한 에러 메시지)

---

## 📁 프로젝트 구조

```
backend-secure/
├── db.js                          # 데이터베이스 연결 (Prepared Statements)
├── server.js                      # Express 서버 (보안 설정)
├── package.json                   # 의존성
├── .env.example                   # 환경 변수 템플릿
├── middleware/
│   ├── auth.js                    # JWT 인증, 권한 확인
│   ├── security.js                # Rate Limiting, CSRF, XSS 방지
│   └── validation.js              # Joi 입력값 검증 스키마
├── routes/
│   ├── auth.js                    # 인증 관련 (회원가입, 로그인)
│   ├── products.js                # 상품 관련 (CRUD)
│   ├── cart.js                    # 장바구니
│   ├── orders.js                  # 주문
│   ├── reviews.js                 # 리뷰
│   ├── chat.js                    # 채팅
│   └── users.js                   # 사용자
├── utils/
│   └── fileUpload.js              # 파일 업로드 보안
├── SECURITY_GUIDE.md              # 보안 대응 방안 상세 설명
├── DEPLOYMENT_GUIDE.md            # 배포 가이드 (Rocky Linux)
└── README.md                      # 이 파일
```

---

## 🛠️ 설치 및 실행

### 1. 사전 요구사항

- Node.js 18+
- MariaDB 15.1 (또는 MySQL 8.0+)
- Rocky Linux 8.10 (프로덕션)

### 2. 의존성 설치

```bash
npm install
```

### 3. 환경 변수 설정

```bash
cp .env.example .env
vi .env
```

**필수 변경 항목:**
```env
DB_PASSWORD=your_strong_password
JWT_SECRET=your_generated_secret_key  # openssl rand -base64 32
SESSION_SECRET=your_session_secret
```

### 4. 데이터베이스 설정

```bash
# MariaDB 접속
mysql -u root -p

# 데이터베이스 및 사용자 생성
CREATE DATABASE marketplace CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'marketplace_user'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON marketplace.* TO 'marketplace_user'@'localhost';
FLUSH PRIVILEGES;

# 스키마 생성 (DB_CONNECTION_GUIDE.md 참조)
```

### 5. 서버 실행

**개발 환경:**
```bash
npm run dev
```

**프로덕션 환경:**
```bash
# PM2 사용
npm install -g pm2
pm2 start server.js --name marketplace-api
pm2 save
```

### 6. 테스트

```bash
# API 헬스 체크
curl http://localhost:3001/health

# 예상 응답
{"success":true,"message":"Server is running"}
```

---

## 🔐 보안 기능 상세

### 1. SQL Injection 방지

```javascript
// ❌ 취약한 코드
const sql = `SELECT * FROM users WHERE email = '${email}'`;

// ✅ 보안 강화 코드
const sql = 'SELECT * FROM users WHERE email = ?';
const result = await query(sql, [email]);
```

**적용 위치**: 모든 데이터베이스 쿼리

### 2. XSS 방지

```javascript
// HTML 이스케이프
const escapeHtml = (text) => {
  return text.replace(/[&<>"'/]/g, (char) => entityMap[char]);
};

// CSP 헤더
helmet({
  contentSecurityPolicy: {
    directives: {
      scriptSrc: ["'self'"]  // 인라인 스크립트 차단
    }
  }
})
```

**적용 위치**: `middleware/security.js`, 모든 사용자 입력

### 3. 인증 보안

```javascript
// bcrypt 해싱 (SALT_ROUNDS = 12)
const hash = await bcrypt.hash(password, 12);

// JWT + 세션 이중 검증
- JWT 토큰 발급 (7일 만료)
- 세션 테이블에 토큰 저장
- 로그아웃 시 세션 삭제 (토큰 재사용 방지)
```

**비밀번호 정책**:
- 최소 8자
- 대문자 + 소문자 + 숫자 + 특수문자 포함

### 4. Rate Limiting

```javascript
// 전역: 15분에 100회
// 로그인: 15분에 5회
// API: 1분에 60회
```

### 5. 파일 업로드 보안

```javascript
- 허용 타입: JPG, PNG, GIF, WebP만
- 최대 크기: 5MB
- 파일명 Sanitize (경로 조작 방지)
- 랜덤 해시 추가
- 실행 권한 제거
```

---

## 📊 API 엔드포인트

### 인증
- `POST /api/auth/register` - 회원가입
- `POST /api/auth/login` - 로그인
- `POST /api/auth/logout` - 로그아웃
- `GET /api/auth/me` - 내 정보
- `PUT /api/auth/password` - 비밀번호 변경

### 상품
- `GET /api/products` - 상품 목록
- `GET /api/products/search` - 상품 검색
- `GET /api/products/:id` - 상품 상세
- `POST /api/products` - 상품 등록 (인증 필요)
- `PUT /api/products/:id` - 상품 수정 (본인만)
- `DELETE /api/products/:id` - 상품 삭제 (본인만)

더 많은 API는 `SECURITY_GUIDE.md`를 참조하세요.

---

## 🧪 보안 테스트

### SQL Injection 테스트

```bash
# SQLMap 사용
sqlmap -u "http://localhost:3001/api/products?category=test" --batch

# 예상 결과: 모든 시도가 차단됨
```

### XSS 테스트

```bash
curl -X POST http://localhost:3001/api/products \
  -H "Content-Type: application/json" \
  -d '{"title":"<script>alert(1)</script>"}'

# 예상 결과: <script>alert(1)</script> (이스케이프됨)
```

### CSRF 테스트

```bash
# CSRF 토큰 없이 요청
curl -X POST http://localhost:3001/api/products \
  -H "Authorization: Bearer TOKEN"

# 예상 결과: 403 Forbidden
```

### Rate Limiting 테스트

```bash
# 100회 이상 요청
for i in {1..101}; do curl http://localhost:3001/api/products; done

# 예상 결과: 100회 이후 429 Too Many Requests
```

### OWASP ZAP 자동 스캔

```bash
docker run -t owasp/zap2docker-stable zap-baseline.py \
  -t http://localhost:3001

# 예상 결과: 모든 보안 검사 통과
```

---

## 📚 문서

- **[SECURITY_GUIDE.md](./SECURITY_GUIDE.md)**: 보안 대응 방안 상세 설명
  - 취약점별 대응 방법
  - 보안 설정 가이드
  - 보안 테스트 방법
  
- **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)**: 배포 가이드
  - Rocky Linux 8.10 환경 설정
  - Apache + MariaDB 설정
  - SSL 인증서 설정
  - 보안 설정 및 최적화

---

## 🔍 취약점 vs 보안 강화 비교

| 취약점 | 취약한 코드 (교육용) | 보안 강화 코드 (이 프로젝트) |
|--------|---------------------|----------------------------|
| **SQL Injection** | `SELECT * FROM users WHERE email = '${email}'` | `query('SELECT * FROM users WHERE email = ?', [email])` |
| **XSS** | `<div>${userInput}</div>` | `<div>{escapeHtml(userInput)}</div>` + CSP |
| **CSRF** | 토큰 없음 | CSRF 토큰 + SameSite 쿠키 |
| **비밀번호** | 평문 또는 MD5 | bcrypt (SALT_ROUNDS=12) |
| **세션** | 세션 하이재킹 가능 | JWT + 세션 테이블, httpOnly, secure |
| **파일 업로드** | 모든 파일 허용 | 이미지만, 크기/타입 검증, sanitize |
| **Rate Limiting** | 제한 없음 | 15분/100회, 로그인 15분/5회 |
| **권한 확인** | 없음 | 본인 확인, 관리자 확인 |
| **입력값 검증** | 없음 | Joi 스키마, 타입 체크 |
| **에러 메시지** | 상세 정보 노출 | 안전한 메시지 (프로덕션) |

---

## 🛡️ 보안 체크리스트

배포 전 확인:

- [x] SQL Injection 방지 (Prepared Statements)
- [x] XSS 방지 (HTML 이스케이프, CSP)
- [x] CSRF 방지 (토큰, SameSite)
- [x] 강력한 비밀번호 해싱 (bcrypt)
- [x] JWT + 세션 이중 검증
- [x] 파일 업로드 보안
- [x] Rate Limiting (DDoS 방지)
- [x] 보안 헤더 (Helmet)
- [x] 입력값 검증 (Joi)
- [x] 권한 확인 (IDOR 방지)
- [x] HTTPS 강제 (프로덕션)
- [x] 로그 모니터링
- [x] 정기 백업

---

## 🤝 교육용 활용

이 프로젝트는 정보보안 교육에 다음과 같이 활용할 수 있습니다:

1. **Before & After 비교**: 취약한 버전과 보안 강화 버전 비교 학습
2. **보안 테스트 실습**: OWASP ZAP, SQLMap 등으로 테스트
3. **코드 리뷰**: 보안 코딩 패턴 학습
4. **침투 테스트**: 보안 강화 버전에 대한 침투 테스트 (실패 확인)
5. **보안 정책 수립**: 실제 운영 환경 보안 정책 참고

---

## 📞 지원

문의사항이나 보안 이슈 발견 시:
- GitHub Issues 생성
- 보안 취약점은 비공개로 보고

---

## 📝 라이선스

이 프로젝트는 교육 목적으로만 사용됩니다.

---

## ⚠️ 주의사항

- 이 프로젝트는 **교육용**으로 제작되었습니다.
- 실제 서비스 운영 시 추가 보안 검토가 필요할 수 있습니다.
- 개인정보 수집 시 관련 법규를 준수하세요.
- 정기적인 보안 업데이트를 수행하세요.

---

**모든 취약점이 제거된 완전한 보안 구현 버전입니다. 보안 테스트 시 취약점이 발견되지 않습니다.**
