# 🛒 정보보안 교육용 중고거래 플랫폼

Rocky Linux 8.10 + Apache httpd + MariaDB 15.1 기반의 보안 취약점 학습용 중고거래 웹 애플리케이션입니다.

> ⚠️ **경고**: 이 프로젝트는 **교육 목적**으로만 사용해야 합니다. 실제 운영 환경에 절대 배포하지 마세요!

---

## 📋 목차

- [주요 기능](#주요-기능)
- [기술 스택](#기술-스택)
- [설치 및 실행](#설치-및-실행)
- [데이터베이스 설정](#데이터베이스-설정)
- [취약점 목록](#취약점-목록)
- [학습 방법](#학습-방법)
- [문서](#문서)

---

## 🎯 주요 기능

### 사용자 기능
- ✅ 회원가입 / 로그인 / 로그아웃
- ✅ 프로필 관리 (정보 수정, 비밀번호 변경, 계정 삭제)
- ✅ 이메일 인증 (구현 예정)

### 상품 기능
- ✅ 상품 목록 조회 및 검색
- ✅ 카테고리별 필터링
- ✅ 상품 상세 페이지
- ✅ 상품 등록 / 수정 / 삭제
- ✅ 상품 찜하기
- ✅ 최근 본 상품
- ✅ 가격 제안 기능

### 거래 기능
- ✅ 장바구니
- ✅ 주문 / 결제
- ✅ 주문 내역 조회
- ✅ 배송 추적
- ✅ 쿠폰 시스템

### 커뮤니케이션
- ✅ 실시간 채팅 (WebSocket)
- ✅ 리뷰 및 별점
- ✅ 판매자 후기
- ✅ 알림 시스템

### 판매자 기능
- ✅ 판매자 프로필 페이지
- ✅ 판매 통계 대시보드
- ✅ 팔로우 / 팔로워 시스템
- ✅ 가격 제안 수락/거절

### 고객 지원
- ✅ FAQ (자주 묻는 질문)
- ✅ 1:1 문의
- ✅ 신고 기능 (사용자/상품/리뷰)

---

## 🛠️ 기술 스택

### 프론트엔드
- **React 18** - UI 라이브러리
- **TypeScript** - 타입 안전성
- **Tailwind CSS v4** - 스타일링
- **shadcn/ui** - UI 컴포넌트
- **Lucide React** - 아이콘

### 백엔드 (구현 예정)
- **Node.js 18+** - 런타임
- **Express** - 웹 프레임워크
- **MariaDB 15.1** - 데이터베이스
- **Socket.io** - 실시간 통신
- **JWT** - 인증
- **bcrypt** - 비밀번호 해싱

### 서버 환경
- **Rocky Linux 8.10** - 운영체제
- **Apache httpd** - 웹 서버
- **PM2** - 프로세스 관리
- **Let's Encrypt** - SSL 인증서

---

## 🚀 설치 및 실행

### 프론트엔드 (개발 모드)

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# 프로덕션 빌드
npm run build
```

### Rocky Linux 8.10 서버 설정

```bash
# 1. 시스템 업데이트
sudo dnf update -y

# 2. Apache httpd 설치
sudo dnf install -y httpd httpd-tools mod_ssl
sudo systemctl enable httpd
sudo systemctl start httpd

# 3. 방화벽 설정
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload

# 4. MariaDB 15.1 설치
# /etc/yum.repos.d/mariadb.repo 파일 생성
sudo tee /etc/yum.repos.d/mariadb.repo << EOF
[mariadb]
name = MariaDB
baseurl = https://rpm.mariadb.org/15.1/rhel/8/x86_64
module_hotfixes = 1
gpgkey = https://rpm.mariadb.org/RPM-GPG-KEY-MariaDB
gpgcheck = 1
EOF

sudo dnf install -y MariaDB-server MariaDB-client
sudo systemctl enable mariadb
sudo systemctl start mariadb
sudo mysql_secure_installation

# 5. Node.js 설치
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo dnf install -y nodejs
sudo npm install -g pm2

# 6. 애플리케이션 배포
sudo mkdir -p /var/www/marketplace
cd /var/www/marketplace

# 프론트엔드 빌드 파일 복사
# 빌드된 파일을 /var/www/marketplace/build 에 업로드

# 백엔드 설정
cd backend
npm install
pm2 start server.js --name marketplace-api
pm2 save
pm2 startup
```

---

## 🗄️ 데이터베이스 설정

### MariaDB 데이터베이스 생성

```bash
# MariaDB 접속
mysql -u root -p
```

```sql
-- 데이터베이스 생성
CREATE DATABASE IF NOT EXISTS marketplace CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 사용자 생성
CREATE USER IF NOT EXISTS 'marketplace_user'@'localhost' IDENTIFIED BY 'your_strong_password';
GRANT ALL PRIVILEGES ON marketplace.* TO 'marketplace_user'@'localhost';
FLUSH PRIVILEGES;

-- 데이터베이스 선택
USE marketplace;

-- 테이블 생성 (DB_CONNECTION_GUIDE.md 참조)
```

자세한 스키마는 `/DB_CONNECTION_GUIDE.md` 문서를 참조하세요.

---

## 🔴 취약점 목록

이 애플리케이션에는 **교육 목적**으로 다음과 같은 보안 취약점이 포함되어 있습니다:

### 1. SQL Injection
- **위치**: 로그인, 회원가입, 검색, 상품 등록 등
- **설명**: Prepared Statement를 사용하지 않아 SQL 명령 삽입 가능
- **공격 예시**: `admin' OR '1'='1`

### 2. XSS (Cross-Site Scripting)
- **위치**: 리뷰, 댓글, 상품명, 채팅 등 사용자 입력 모든 곳
- **설명**: 사용자 입력을 sanitize하지 않아 스크립트 삽입 가능
- **공격 예시**: `<script>alert('XSS')</script>`

### 3. CSRF (Cross-Site Request Forgery)
- **위치**: 모든 POST/PUT/DELETE 요청
- **설명**: CSRF 토큰이 없어 악의적인 요청 가능
- **방어**: CSRF 토큰 구현 필요

### 4. IDOR (Insecure Direct Object Reference)
- **위치**: 상품 ID, 주문 ID, 채팅방 ID 등
- **설명**: 예측 가능한 ID로 권한 없이 접근 가능
- **방어**: UUID 사용 및 권한 검증

### 5. 평문 비밀번호 저장/전송
- **위치**: 로그인, 회원가입
- **설명**: 비밀번호를 암호화하지 않음
- **방어**: bcrypt로 해싱, HTTPS 사용

### 6. Brute Force 공격 방어 부재
- **위치**: 로그인
- **설명**: 로그인 시도 횟수 제한 없음
- **방어**: Rate Limiting, CAPTCHA

### 7. 파일 업로드 취약점
- **위치**: 상품 이미지 업로드
- **설명**: 파일 타입/크기 검증 부족
- **방어**: MIME 타입 검증, 크기 제한

### 8. 권한 검증 부족
- **위치**: 상품 등록/수정/삭제, 리뷰 삭제 등
- **설명**: 클라이언트 측 권한 확인만 수행
- **방어**: 서버 측 권한 검증 필수

### 9. Race Condition
- **위치**: 결제, 재고 관리
- **설명**: 동시 요청 처리 시 데이터 불일치
- **방어**: 트랜잭션, 락(Lock) 사용

### 10. 정보 노출
- **위치**: 에러 메시지, API 응답
- **설명**: 상세한 에러 메시지로 시스템 정보 노출
- **방어**: 일반적인 에러 메시지 사용

자세한 내용은 `/VULNERABILITY_GUIDE.md`를 참조하세요.

---

## 📚 학습 방법

### 1. 이론 학습
각 취약점의 원리와 공격 방법을 이해합니다.

```bash
# 취약점 가이드 읽기
cat VULNERABILITY_GUIDE.md
```

### 2. 취약점 탐색
코드에서 `🔴 보안 취약점` 주석을 찾아 취약점 위치를 파악합니다.

```bash
# 취약점 주석 검색
grep -r "🔴 보안 취약점" components/
```

### 3. 공격 시연 (로컬 환경에서만!)
- SQL Injection: 로그인 폼에서 `admin' OR '1'='1` 입력
- XSS: 리뷰 작성 시 `<script>alert('XSS')</script>` 입력
- IDOR: URL의 ID를 변경하여 다른 사용자 데이터 접근 시도

### 4. 취약점 수정
코드를 수정하여 취약점을 해결하고 재테스트합니다.

### 5. 토론
팀원들과 실제 사례를 분석하고 대응 방안을 논의합니다.

---

## 📄 문서

### `/DB_CONNECTION_GUIDE.md`
- Rocky Linux + Apache + MariaDB 환경 설정
- 데이터베이스 스키마 (MariaDB 15.1)
- API 엔드포인트 목록
- Node.js + Express 연동 예시
- 백업 및 모니터링 방법

### `/VULNERABILITY_GUIDE.md`
- 10가지 주요 취약점 상세 설명
- 각 취약점별 공격 예시
- 해결 방법 및 코드 예시
- 테스트 방법
- 보안 체크리스트

---

## 🎓 테스트 계정

### 일반 사용자
- **이메일**: test@test.com
- **비밀번호**: password

### 관리자
- **이메일**: admin@admin.com
- **비밀번호**: admin

---

## 🔒 보안 체크리스트

배포 전 반드시 다음 항목을 확인하세요:

- [ ] 모든 SQL 쿼리를 Prepared Statement로 변경
- [ ] 모든 사용자 입력을 sanitize 처리
- [ ] CSRF 토큰 구현
- [ ] HTTPS 적용 (Let's Encrypt)
- [ ] 비밀번호 bcrypt로 해싱
- [ ] Rate Limiting 설정
- [ ] 파일 업로드 검증
- [ ] 서버 측 권한 검증
- [ ] 에러 메시지 일반화
- [ ] 로깅 시 민감정보 제거
- [ ] 데이터베이스 백업 자동화
- [ ] 보안 헤더 설정 (helmet.js)

---

## 📊 프로젝트 구조

```
marketplace/
├── components/           # React 컴포넌트
│   ├── ui/              # shadcn/ui 컴포넌트
│   ├── Header.tsx       # 헤더 (네비게이션)
│   ├── Home.tsx         # 홈 (상품 목록)
│   ├── Login.tsx        # 로그인
│   ├── Register.tsx     # 회원가입
│   ├── ProductDetail.tsx # 상품 상세
│   ├── AddProduct.tsx   # 상품 등록
│   ├── Cart.tsx         # 장바구니
│   ├── Chat.tsx         # 채팅
│   ├── CustomerService.tsx # 고객센터
│   ├── MyPage.tsx       # 마이페이지
│   ├── Notifications.tsx # 알림
│   ├── SellerProfile.tsx # 판매자 프로필
│   ├── PriceSuggestion.tsx # 가격 제안
│   └── ReportDialog.tsx # 신고
├── styles/              # 스타일
│   └── globals.css      # 전역 스타일
├── App.tsx              # 메인 앱
├── DB_CONNECTION_GUIDE.md # DB 연결 가이드
├── VULNERABILITY_GUIDE.md # 취약점 가이드
└── README.md            # 이 파일
```

---

## 🤝 기여

이 프로젝트는 교육 목적으로 만들어졌습니다. 새로운 취약점 예시나 학습 자료를 추가하고 싶으시면 Issue 또는 Pull Request를 보내주세요.

---

## ⚖️ 법적 고지

**이 프로젝트는 오직 교육 목적으로만 사용되어야 합니다.**

- ❌ 실제 운영 환경에 배포 금지
- ❌ 다른 사람의 시스템에 무단 침투 금지
- ❌ 개인정보 무단 수집 금지
- ❌ 악의적인 목적으로 사용 금지

허가 없이 실제 시스템을 공격하는 행위는 법적 처벌을 받을 수 있습니다.

---

## 📞 문의

프로젝트 사용 중 문의사항이 있으시면 Issue를 생성해주세요.

---

## 📜 라이선스

MIT License - 교육 목적으로 자유롭게 사용 가능합니다.

---

**⚠️ 다시 한 번 강조합니다: 이 프로젝트는 교육용입니다. 실제 운영 환경에 절대 배포하지 마세요!**
