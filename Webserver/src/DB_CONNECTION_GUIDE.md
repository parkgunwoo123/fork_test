# 데이터베이스 연결 가이드 (Rocky Linux 8.10 + MariaDB 15.1)

이 문서는 중고거래 플랫폼을 Rocky Linux 8.10, Apache httpd, MariaDB 15.1 환경에서 구축하는 방법을 설명합니다.

## 📋 목차

1. [서버 환경 설정](#서버-환경-설정)
2. [데이터베이스 스키마 (MariaDB 15.1)](#데이터베이스-스키마-mariadb-151)
3. [API 엔드포인트](#api-엔드포인트)
4. [컴포넌트별 DB 연결 지점](#컴포넌트별-db-연결-지점)
5. [보안 권장사항](#보안-권장사항)

---

## 🖥️ 서버 환경 설정

### 1. Rocky Linux 8.10 초기 설정

```bash
# 시스템 업데이트
sudo dnf update -y

# 필수 패키지 설치
sudo dnf install -y epel-release
sudo dnf install -y wget curl vim git
```

### 2. Apache httpd 설치 및 설정

```bash
# httpd 설치
sudo dnf install -y httpd httpd-tools mod_ssl

# 방화벽 설정
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload

# httpd 활성화 및 시작
sudo systemctl enable httpd
sudo systemctl start httpd

# SELinux 설정 (필요시)
sudo setsebool -P httpd_can_network_connect 1
sudo setsebool -P httpd_can_network_connect_db 1
```

### 3. MariaDB 15.1 설치

```bash
# MariaDB 저장소 추가
sudo tee /etc/yum.repos.d/mariadb.repo << EOF
[mariadb]
name = MariaDB
baseurl = https://rpm.mariadb.org/15.1/rhel/8/x86_64
module_hotfixes = 1
gpgkey = https://rpm.mariadb.org/RPM-GPG-KEY-MariaDB
gpgcheck = 1
EOF

# MariaDB 15.1 설치
sudo dnf install -y MariaDB-server MariaDB-client

# MariaDB 활성화 및 시작
sudo systemctl enable mariadb
sudo systemctl start mariadb

# 초기 보안 설정
sudo mysql_secure_installation
```

### 4. Node.js 설치 (백엔드 API용)

```bash
# Node.js 18.x 설치
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo dnf install -y nodejs

# PM2 설치 (프로세스 관리)
sudo npm install -g pm2
```

### 5. Apache + Node.js 연동 (Reverse Proxy)

```bash
# Apache 설정 파일 생성
sudo vi /etc/httpd/conf.d/marketplace.conf
```

```apache
<VirtualHost *:80>
    ServerName marketplace.example.com
    DocumentRoot /var/www/marketplace/build

    # React 빌드 파일 서빙
    <Directory /var/www/marketplace/build>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
        
        # React Router를 위한 설정
        RewriteEngine On
        RewriteBase /
        RewriteRule ^index\.html$ - [L]
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteRule . /index.html [L]
    </Directory>

    # API 요청을 Node.js로 프록시
    ProxyPreserveHost On
    ProxyPass /api http://localhost:3001/api
    ProxyPassReverse /api http://localhost:3001/api

    # WebSocket 지원 (채팅용)
    RewriteEngine On
    RewriteCond %{HTTP:Upgrade} websocket [NC]
    RewriteCond %{HTTP:Connection} upgrade [NC]
    RewriteRule ^/?(.*) "ws://localhost:3001/$1" [P,L]

    # 로그 설정
    ErrorLog /var/log/httpd/marketplace_error.log
    CustomLog /var/log/httpd/marketplace_access.log combined
</VirtualHost>

# HTTPS 설정 (Let's Encrypt 사용 권장)
<VirtualHost *:443>
    ServerName marketplace.example.com
    DocumentRoot /var/www/marketplace/build

    SSLEngine on
    SSLCertificateFile /etc/letsencrypt/live/marketplace.example.com/cert.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/marketplace.example.com/privkey.pem
    SSLCertificateChainFile /etc/letsencrypt/live/marketplace.example.com/chain.pem

    # 위의 설정과 동일
    <Directory /var/www/marketplace/build>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
        RewriteEngine On
        RewriteBase /
        RewriteRule ^index\.html$ - [L]
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteRule . /index.html [L]
    </Directory>

    ProxyPreserveHost On
    ProxyPass /api http://localhost:3001/api
    ProxyPassReverse /api http://localhost:3001/api

    ErrorLog /var/log/httpd/marketplace_ssl_error.log
    CustomLog /var/log/httpd/marketplace_ssl_access.log combined
</VirtualHost>
```

```bash
# mod_proxy 모듈 활성화
sudo dnf install -y mod_proxy_html

# Apache 재시작
sudo systemctl restart httpd
```

### 6. Let's Encrypt SSL 인증서 설치

```bash
# Certbot 설치
sudo dnf install -y certbot python3-certbot-apache

# SSL 인증서 발급
sudo certbot --apache -d marketplace.example.com

# 자동 갱신 설정
sudo systemctl enable certbot-renew.timer
sudo systemctl start certbot-renew.timer
```

---

## 🗄️ 데이터베이스 스키마 (MariaDB 15.1)

### 데이터베이스 생성

```sql
-- MariaDB 접속
mysql -u root -p

-- 데이터베이스 생성
CREATE DATABASE IF NOT EXISTS marketplace CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 사용자 생성 및 권한 부여
CREATE USER IF NOT EXISTS 'marketplace_user'@'localhost' IDENTIFIED BY 'strong_password_here';
GRANT ALL PRIVILEGES ON marketplace.* TO 'marketplace_user'@'localhost';
FLUSH PRIVILEGES;

-- 데이터베이스 선택
USE marketplace;
```

### 1. users (사용자)
```sql
CREATE TABLE users (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) NOT NULL,
    password_hash VARCHAR(255) NOT NULL COMMENT 'bcrypt 해시',
    phone VARCHAR(20),
    address TEXT,
    profile_image VARCHAR(500),
    bio TEXT COMMENT '자기소개',
    is_admin BOOLEAN DEFAULT FALSE,
    is_verified BOOLEAN DEFAULT FALSE COMMENT '이메일 인증 여부',
    is_deleted BOOLEAN DEFAULT FALSE,
    rating DECIMAL(3,2) DEFAULT 0.0 COMMENT '판매자 평점',
    total_sales INT DEFAULT 0 COMMENT '총 판매 건수',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    last_login_at TIMESTAMP NULL,
    INDEX idx_email (email),
    INDEX idx_username (username),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 2. sessions (세션)
```sql
CREATE TABLE sessions (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) NOT NULL,
    token VARCHAR(255) UNIQUE NOT NULL COMMENT 'JWT 또는 세션 토큰',
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45),
    user_agent TEXT,
    INDEX idx_user_id (user_id),
    INDEX idx_token (token),
    INDEX idx_expires_at (expires_at),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 3. products (상품)
```sql
CREATE TABLE products (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    price INT NOT NULL CHECK (price >= 0),
    category VARCHAR(50) NOT NULL,
    seller_id CHAR(36) NOT NULL,
    status VARCHAR(20) DEFAULT 'active' COMMENT 'active, sold, deleted, reserved',
    stock INT DEFAULT 1,
    rating DECIMAL(3,2) DEFAULT 0.0,
    review_count INT DEFAULT 0,
    view_count INT DEFAULT 0 COMMENT '조회수',
    like_count INT DEFAULT 0 COMMENT '찜 수',
    location VARCHAR(100) COMMENT '거래 지역',
    is_negotiable BOOLEAN DEFAULT FALSE COMMENT '가격 협상 가능 여부',
    condition_status VARCHAR(20) COMMENT 'new, like_new, good, fair, poor',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    sold_at TIMESTAMP NULL,
    INDEX idx_seller_id (seller_id),
    INDEX idx_category (category),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at DESC),
    INDEX idx_price (price),
    INDEX idx_location (location),
    FULLTEXT idx_search (title, description),
    FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 4. product_images (상품 이미지)
```sql
CREATE TABLE product_images (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    product_id CHAR(36) NOT NULL,
    image_url TEXT NOT NULL,
    display_order INT DEFAULT 0,
    is_thumbnail BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_product_id (product_id),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 5. cart (장바구니)
```sql
CREATE TABLE cart (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) NOT NULL,
    product_id CHAR(36) NOT NULL,
    quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_user_product (user_id, product_id),
    INDEX idx_user_id (user_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 6. orders (주문)
```sql
CREATE TABLE orders (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    order_number VARCHAR(50) UNIQUE NOT NULL COMMENT '주문번호',
    user_id CHAR(36) NOT NULL,
    total_amount INT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' COMMENT 'pending, paid, shipping, delivered, cancelled, refunded',
    payment_method VARCHAR(50),
    payment_status VARCHAR(20) DEFAULT 'pending' COMMENT 'pending, completed, failed',
    shipping_address TEXT,
    recipient_name VARCHAR(100),
    recipient_phone VARCHAR(20),
    tracking_number VARCHAR(100) COMMENT '운송장 번호',
    memo TEXT COMMENT '배송 메모',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    paid_at TIMESTAMP NULL,
    shipped_at TIMESTAMP NULL,
    delivered_at TIMESTAMP NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_status (status),
    INDEX idx_order_number (order_number),
    INDEX idx_created_at (created_at DESC),
    FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 7. order_items (주문 상품)
```sql
CREATE TABLE order_items (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    order_id CHAR(36) NOT NULL,
    product_id CHAR(36) NOT NULL,
    seller_id CHAR(36) NOT NULL COMMENT '판매자 ID',
    quantity INT NOT NULL,
    price INT NOT NULL COMMENT '주문 시점의 가격',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_order_id (order_id),
    INDEX idx_seller_id (seller_id),
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (seller_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 8. reviews (리뷰)
```sql
CREATE TABLE reviews (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    product_id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    order_id CHAR(36) COMMENT '구매 확인용',
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT NOT NULL,
    seller_reply TEXT COMMENT '판매자 답변',
    is_helpful_count INT DEFAULT 0 COMMENT '도움이 됨 수',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    replied_at TIMESTAMP NULL,
    UNIQUE KEY unique_product_user (product_id, user_id),
    INDEX idx_product_id (product_id),
    INDEX idx_user_id (user_id),
    INDEX idx_rating (rating),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 9. chat_rooms (채팅방)
```sql
CREATE TABLE chat_rooms (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user1_id CHAR(36) NOT NULL,
    user2_id CHAR(36) NOT NULL,
    product_id CHAR(36) COMMENT '관련 상품',
    last_message_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_users (user1_id, user2_id),
    INDEX idx_user1_id (user1_id),
    INDEX idx_user2_id (user2_id),
    INDEX idx_product_id (product_id),
    INDEX idx_last_message_at (last_message_at DESC),
    FOREIGN KEY (user1_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (user2_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 10. messages (메시지)
```sql
CREATE TABLE messages (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    chat_room_id CHAR(36) NOT NULL,
    sender_id CHAR(36) NOT NULL,
    content TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text' COMMENT 'text, image, file, system',
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP NULL,
    INDEX idx_chat_room_id (chat_room_id),
    INDEX idx_sender_id (sender_id),
    INDEX idx_created_at (created_at),
    FOREIGN KEY (chat_room_id) REFERENCES chat_rooms(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 11. inquiries (고객 문의)
```sql
CREATE TABLE inquiries (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36),
    email VARCHAR(255) NOT NULL,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(50) COMMENT '문의 유형',
    status VARCHAR(20) DEFAULT 'pending' COMMENT 'pending, answered, closed',
    answer TEXT,
    admin_id CHAR(36) COMMENT '답변 관리자',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    answered_at TIMESTAMP NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_status (status),
    INDEX idx_category (category),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 12. faqs (자주 묻는 질문)
```sql
CREATE TABLE faqs (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    category VARCHAR(50) NOT NULL,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    display_order INT DEFAULT 0,
    view_count INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_category (category),
    INDEX idx_display_order (display_order),
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 13. wishlists (찜 목록)
```sql
CREATE TABLE wishlists (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) NOT NULL,
    product_id CHAR(36) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_user_product (user_id, product_id),
    INDEX idx_user_id (user_id),
    INDEX idx_product_id (product_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 14. login_attempts (로그인 시도 기록)
```sql
CREATE TABLE login_attempts (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    email VARCHAR(255),
    ip_address VARCHAR(45) NOT NULL,
    success BOOLEAN NOT NULL,
    fail_reason VARCHAR(100),
    attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_ip (ip_address),
    INDEX idx_email (email),
    INDEX idx_attempted_at (attempted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 15. coupons (쿠폰)
```sql
CREATE TABLE coupons (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    code VARCHAR(50) UNIQUE NOT NULL,
    discount_type VARCHAR(20) NOT NULL COMMENT 'percentage, fixed',
    discount_value INT NOT NULL,
    min_purchase_amount INT DEFAULT 0 COMMENT '최소 구매 금액',
    max_discount_amount INT COMMENT '최대 할인 금액',
    valid_from TIMESTAMP NOT NULL,
    valid_until TIMESTAMP NOT NULL,
    usage_limit INT COMMENT '사용 제한 횟수',
    usage_count INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_code (code),
    INDEX idx_valid_dates (valid_from, valid_until),
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 16. user_coupons (사용자 쿠폰)
```sql
CREATE TABLE user_coupons (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) NOT NULL,
    coupon_id CHAR(36) NOT NULL,
    used_at TIMESTAMP NULL,
    order_id CHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_coupon_id (coupon_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE CASCADE,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 17. notifications (알림)
```sql
CREATE TABLE notifications (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) NOT NULL,
    type VARCHAR(50) NOT NULL COMMENT 'message, order, review, system',
    title VARCHAR(200) NOT NULL,
    content TEXT,
    link VARCHAR(500) COMMENT '이동할 링크',
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_is_read (is_read),
    INDEX idx_created_at (created_at DESC),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 18. reports (신고)
```sql
CREATE TABLE reports (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    reporter_id CHAR(36) NOT NULL COMMENT '신고자',
    reported_user_id CHAR(36) COMMENT '신고된 사용자',
    reported_product_id CHAR(36) COMMENT '신고된 상품',
    reported_review_id CHAR(36) COMMENT '신고된 리뷰',
    reason VARCHAR(100) NOT NULL COMMENT '신고 사유',
    description TEXT,
    status VARCHAR(20) DEFAULT 'pending' COMMENT 'pending, reviewing, resolved, rejected',
    admin_memo TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP NULL,
    INDEX idx_reporter_id (reporter_id),
    INDEX idx_reported_user_id (reported_user_id),
    INDEX idx_status (status),
    FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (reported_user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (reported_product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (reported_review_id) REFERENCES reviews(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 19. price_suggestions (가격 제안)
```sql
CREATE TABLE price_suggestions (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    product_id CHAR(36) NOT NULL,
    buyer_id CHAR(36) NOT NULL,
    suggested_price INT NOT NULL,
    message TEXT,
    status VARCHAR(20) DEFAULT 'pending' COMMENT 'pending, accepted, rejected, cancelled',
    seller_reply TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    responded_at TIMESTAMP NULL,
    INDEX idx_product_id (product_id),
    INDEX idx_buyer_id (buyer_id),
    INDEX idx_status (status),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 20. recently_viewed (최근 본 상품)
```sql
CREATE TABLE recently_viewed (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) NOT NULL,
    product_id CHAR(36) NOT NULL,
    viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_product_id (product_id),
    INDEX idx_viewed_at (viewed_at DESC),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 21. search_history (검색 기록)
```sql
CREATE TABLE search_history (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36),
    search_query VARCHAR(200) NOT NULL,
    result_count INT DEFAULT 0,
    searched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_search_query (search_query),
    INDEX idx_searched_at (searched_at DESC),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 22. seller_follows (판매자 팔로우)
```sql
CREATE TABLE seller_follows (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    follower_id CHAR(36) NOT NULL COMMENT '팔로워',
    following_id CHAR(36) NOT NULL COMMENT '팔로잉 (판매자)',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_follow (follower_id, following_id),
    INDEX idx_follower_id (follower_id),
    INDEX idx_following_id (following_id),
    FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (following_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 샘플 데이터 삽입

```sql
-- FAQ 샘플 데이터
INSERT INTO faqs (category, question, answer, display_order) VALUES
('payment', '어떤 결제 방법을 사용할 수 있나요?', '신용카드, 체크카드, 계좌이체, 간편결제(카카오페이, 네이버페이 등)를 사용하실 수 있습니다.', 1),
('delivery', '배송은 얼마나 걸리나요?', '일반적으로 영업일 기준 2-3일 소요됩니다. 지역에 따라 차이가 있을 수 있습니다.', 2),
('refund', '환불은 어떻게 하나요?', '구매 후 7일 이내에 환불 요청이 가능합니다. 단, 상품이 훼손되지 않은 상태여야 합니다.', 3),
('direct', '직거래는 어떻게 진행하나요?', '판매자와 채팅을 통해 직거래 장소와 시간을 협의하실 수 있습니다.', 4),
('safety', '안전결제란 무엇인가요?', '중고마켓이 거래 대금을 보관하고 있다가 구매자가 상품 수령 확인 후 판매자에게 전달하는 서비스입니다.', 5);

-- 쿠폰 샘플 데이터
INSERT INTO coupons (code, discount_type, discount_value, min_purchase_amount, max_discount_amount, valid_from, valid_until, usage_limit) VALUES
('WELCOME2024', 'percentage', 10, 50000, 10000, NOW(), DATE_ADD(NOW(), INTERVAL 90 DAY), 1000),
('FIRSTBUY', 'fixed', 5000, 30000, NULL, NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY), 500);
```

---

## 🔌 API 엔드포인트

### 인증 관련
- `POST /api/auth/register` - 회원가입
- `POST /api/auth/login` - 로그인
- `POST /api/auth/logout` - 로그아웃
- `GET /api/auth/me` - 현재 사용자 정보
- `POST /api/auth/verify-email` - 이메일 인증
- `POST /api/auth/forgot-password` - 비밀번호 찾기
- `POST /api/auth/reset-password` - 비밀번호 재설정

### 상품 관련
- `GET /api/products` - 상품 목록 조회
- `GET /api/products/:id` - 상품 상세 조회
- `POST /api/products` - 상품 등록
- `PUT /api/products/:id` - 상품 수정
- `DELETE /api/products/:id` - 상품 삭제
- `GET /api/products/search?q=검색어&category=카테고리&minPrice=최소가격&maxPrice=최대가격&location=지역` - 상품 검색
- `GET /api/products/recommended` - 추천 상품
- `GET /api/products/:id/similar` - 유사 상품
- `POST /api/products/:id/view` - 조회수 증가

### 판매자 관련
- `GET /api/sellers/:id` - 판매자 프로필
- `GET /api/sellers/:id/products` - 판매자 상품 목록
- `GET /api/sellers/:id/reviews` - 판매자 후기
- `POST /api/sellers/:id/follow` - 판매자 팔로우
- `DELETE /api/sellers/:id/follow` - 팔로우 취소
- `GET /api/sellers/:id/followers` - 팔로워 목록
- `GET /api/sellers/following` - 내가 팔로우한 판매자

### 장바구니 관련
- `GET /api/cart` - 장바구니 조회
- `POST /api/cart` - 장바구니에 추가
- `PUT /api/cart/:productId` - 수량 변경
- `DELETE /api/cart/:productId` - 장바구니에서 제거
- `DELETE /api/cart/clear` - 장바구니 비우기

### 주문 관련
- `GET /api/orders` - 주문 내역 조회
- `GET /api/orders/:id` - 주문 상세 조회
- `POST /api/orders` - 주문 생성
- `PUT /api/orders/:id/cancel` - 주문 취소
- `POST /api/orders/:id/confirm` - 구매 확정
- `POST /api/orders/:id/refund` - 환불 요청
- `GET /api/orders/:id/tracking` - 배송 추적

### 리뷰 관련
- `GET /api/reviews?productId=:id` - 상품 리뷰 조회
- `POST /api/reviews` - 리뷰 작성
- `PUT /api/reviews/:id` - 리뷰 수정
- `DELETE /api/reviews/:id` - 리뷰 삭제
- `POST /api/reviews/:id/helpful` - 도움이 됨 표시
- `POST /api/reviews/:id/reply` - 판매자 답변

### 채팅 관련
- `GET /api/chat/rooms` - 채팅방 목록
- `GET /api/chat/rooms/:id` - 채팅방 상세
- `POST /api/chat/rooms` - 채팅방 생성
- `GET /api/chat/rooms/:id/messages` - 메시지 조회
- `POST /api/chat/messages` - 메시지 전송
- `PUT /api/chat/messages/:id/read` - 읽음 처리
- `WS /api/chat/ws` - WebSocket 연결

### 고객센터 관련
- `GET /api/faqs` - FAQ 목록
- `GET /api/faqs/:id` - FAQ 상세
- `GET /api/inquiries` - 내 문의 내역
- `GET /api/inquiries/:id` - 문의 상세
- `POST /api/inquiries` - 문의 등록
- `PUT /api/inquiries/:id` - 문의 수정

### 사용자 관련
- `GET /api/users/me` - 내 정보 조회
- `PUT /api/users/me` - 프로필 수정
- `PUT /api/users/me/password` - 비밀번호 변경
- `DELETE /api/users/me` - 계정 삭제
- `POST /api/users/me/avatar` - 프로필 이미지 업로드

### 찜/북마크 관련
- `GET /api/wishlist` - 찜 목록
- `POST /api/wishlist/:productId` - 찜 추가
- `DELETE /api/wishlist/:productId` - 찜 제거

### 알림 관련
- `GET /api/notifications` - 알림 목록
- `PUT /api/notifications/:id/read` - 알림 읽음 처리
- `PUT /api/notifications/read-all` - 모든 알림 읽음
- `DELETE /api/notifications/:id` - 알림 삭제

### 신고 관련
- `POST /api/reports/user` - 사용자 신고
- `POST /api/reports/product` - 상품 신고
- `POST /api/reports/review` - 리뷰 신고

### 가격 제안 관련
- `POST /api/price-suggestions` - 가격 제안
- `GET /api/price-suggestions/received` - 받은 가격 제안
- `GET /api/price-suggestions/sent` - 보낸 가격 제안
- `PUT /api/price-suggestions/:id/accept` - 가격 제안 수락
- `PUT /api/price-suggestions/:id/reject` - 가격 제안 거절

### 통계/분석 관련
- `GET /api/stats/dashboard` - 판매자 대시보드
- `GET /api/stats/sales` - 판매 통계
- `GET /api/stats/products` - 상품별 통계
- `GET /api/recently-viewed` - 최근 본 상품
- `GET /api/search-suggestions?q=검색어` - 검색 자동완성

### 쿠폰 관련
- `GET /api/coupons/my` - 내 쿠폰 목록
- `POST /api/coupons/register` - 쿠폰 등록
- `POST /api/coupons/validate` - 쿠폰 유효성 검증

---

## 🔗 Node.js + Express + MariaDB 연결 예시

### package.json
```json
{
  "name": "marketplace-api",
  "version": "1.0.0",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "mysql2": "^3.6.5",
    "bcrypt": "^5.1.1",
    "jsonwebtoken": "^9.0.2",
    "express-session": "^1.17.3",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "express-rate-limit": "^7.1.5",
    "multer": "^1.4.5-lts.1",
    "dotenv": "^16.3.1",
    "joi": "^17.11.0",
    "socket.io": "^4.6.2",
    "uuid": "^9.0.1"
  }
}
```

### .env
```env
# 서버 설정
NODE_ENV=production
PORT=3001
HOST=localhost

# 데이터베이스 설정
DB_HOST=localhost
DB_PORT=3306
DB_USER=marketplace_user
DB_PASSWORD=strong_password_here
DB_NAME=marketplace

# JWT 설정
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_EXPIRES_IN=7d

# 세션 설정
SESSION_SECRET=your-super-secret-session-key-change-this

# 파일 업로드 설정
UPLOAD_DIR=/var/www/marketplace/uploads
MAX_FILE_SIZE=5242880

# 이메일 설정 (선택사항)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

### db.js (MariaDB 연결)
```javascript
const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

// 연결 테스트
pool.getConnection()
  .then(connection => {
    console.log('✅ MariaDB 연결 성공');
    connection.release();
  })
  .catch(err => {
    console.error('❌ MariaDB 연결 실패:', err.message);
    process.exit(1);
  });

module.exports = pool;
```

### server.js
```javascript
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const session = require('express-session');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();

// 보안 헤더
app.use(helmet());

// CORS 설정
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? 'https://marketplace.example.com' 
    : 'http://localhost:3000',
  credentials: true
}));

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 세션 설정
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24시간
  }
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: 100 // 최대 100 요청
});
app.use('/api/', limiter);

// 라우트 임포트
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
// ... 기타 라우트

// 라우트 등록
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);

// 에러 핸들링
app.use((err, req, res, next) => {
  console.error(err.stack);
  
  if (process.env.NODE_ENV === 'production') {
    res.status(err.status || 500).json({
      error: '서버 오류가 발생했습니다.'
    });
  } else {
    res.status(err.status || 500).json({
      error: err.message,
      stack: err.stack
    });
  }
});

// 서버 시작
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 서버가 포트 ${PORT}에서 실행 중입니다.`);
});
```

### routes/auth.js (로그인 예시)
```javascript
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db');
const router = express.Router();

// 로그인
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // 입력 검증
    if (!email || !password) {
      return res.status(400).json({ error: '이메일과 비밀번호를 입력해주세요.' });
    }

    // 사용자 조회 (Prepared Statement)
    const [users] = await db.execute(
      'SELECT id, email, username, password_hash, is_admin FROM users WHERE email = ? AND is_deleted = FALSE',
      [email]
    );

    if (users.length === 0) {
      // 로그인 실패 기록
      await db.execute(
        'INSERT INTO login_attempts (email, ip_address, success, fail_reason) VALUES (?, ?, FALSE, ?)',
        [email, req.ip, 'invalid_credentials']
      );
      
      return res.status(401).json({ error: '이메일 또는 비밀번호가 일치하지 않습니다.' });
    }

    const user = users[0];

    // 비밀번호 검증
    const isValid = await bcrypt.compare(password, user.password_hash);
    
    if (!isValid) {
      await db.execute(
        'INSERT INTO login_attempts (email, ip_address, success, fail_reason) VALUES (?, ?, FALSE, ?)',
        [email, req.ip, 'invalid_password']
      );
      
      return res.status(401).json({ error: '이메일 또는 비밀번호가 일치하지 않습니다.' });
    }

    // JWT 토큰 생성
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    // 세션 저장
    await db.execute(
      'INSERT INTO sessions (user_id, token, expires_at, ip_address, user_agent) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY), ?, ?)',
      [user.id, token, req.ip, req.headers['user-agent']]
    );

    // 마지막 로그인 시간 업데이트
    await db.execute(
      'UPDATE users SET last_login_at = NOW() WHERE id = ?',
      [user.id]
    );

    // 로그인 성공 기록
    await db.execute(
      'INSERT INTO login_attempts (email, ip_address, success) VALUES (?, ?, TRUE)',
      [email, req.ip]
    );

    res.json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        isAdmin: user.is_admin
      },
      token
    });
  } catch (error) {
    console.error('로그인 에러:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 회원가입
router.post('/register', async (req, res) => {
  try {
    const { email, username, password, phone, address } = req.body;

    // 입력 검증
    if (!email || !username || !password) {
      return res.status(400).json({ error: '필수 항목을 입력해주세요.' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: '비밀번호는 최소 8자 이상이어야 합니다.' });
    }

    // 이메일 중복 확인
    const [existingUsers] = await db.execute(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({ error: '이미 사용 중인 이메일입니다.' });
    }

    // 비밀번호 해싱
    const hashedPassword = await bcrypt.hash(password, 10);

    // 사용자 생성
    const [result] = await db.execute(
      'INSERT INTO users (email, username, password_hash, phone, address) VALUES (?, ?, ?, ?, ?)',
      [email, username, hashedPassword, phone, address]
    );

    // 생성된 사용자 조회
    const [newUser] = await db.execute(
      'SELECT id, email, username FROM users WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({
      user: newUser[0]
    });
  } catch (error) {
    console.error('회원가입 에러:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

module.exports = router;
```

---

## 🚀 배포 스크립트

### deploy.sh
```bash
#!/bin/bash

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== 중고마켓 배포 스크립트 ===${NC}\n"

# 1. Git pull
echo -e "${YELLOW}[1/7] Git 저장소 업데이트...${NC}"
git pull origin main

# 2. 프론트엔드 빌드
echo -e "${YELLOW}[2/7] 프론트엔드 빌드...${NC}"
cd /var/www/marketplace
npm install
npm run build

# 3. 빌드 파일 복사
echo -e "${YELLOW}[3/7] 빌드 파일 복사...${NC}"
sudo rm -rf /var/www/marketplace/build_old
sudo mv /var/www/marketplace/build /var/www/marketplace/build_old
sudo mv /var/www/marketplace/dist /var/www/marketplace/build

# 4. 백엔드 업데이트
echo -e "${YELLOW}[4/7] 백엔드 업데이트...${NC}"
cd /var/www/marketplace/backend
npm install

# 5. 데이터베이스 마이그레이션
echo -e "${YELLOW}[5/7] 데이터베이스 마이그레이션...${NC}"
mysql -u marketplace_user -p marketplace < migrations/latest.sql

# 6. PM2로 백엔드 재시작
echo -e "${YELLOW}[6/7] 백엔드 재시작...${NC}"
pm2 restart marketplace-api

# 7. Apache 재시작
echo -e "${YELLOW}[7/7] Apache 재시작...${NC}"
sudo systemctl restart httpd

echo -e "\n${GREEN}✅ 배포 완료!${NC}"
echo -e "웹사이트: https://marketplace.example.com"
echo -e "API 상태: $(pm2 status marketplace-api)"
```

---

## 🛡️ 보안 권장사항

### 1. MariaDB 보안 설정
```sql
-- 원격 root 로그인 비활성화
DELETE FROM mysql.user WHERE User='root' AND Host NOT IN ('localhost', '127.0.0.1', '::1');

-- 익명 사용자 제거
DELETE FROM mysql.user WHERE User='';

-- test 데이터베이스 제거
DROP DATABASE IF EXISTS test;

-- 권한 적용
FLUSH PRIVILEGES;
```

### 2. 방화벽 설정
```bash
# MariaDB 포트는 로컬에서만 접근 가능
sudo firewall-cmd --permanent --remove-service=mysql
sudo firewall-cmd --reload

# 특정 IP에서만 SSH 접근 허용
sudo firewall-cmd --permanent --add-rich-rule='rule family="ipv4" source address="YOUR_IP" service name="ssh" accept'
sudo firewall-cmd --reload
```

### 3. 정기 백업
```bash
#!/bin/bash
# backup.sh

BACKUP_DIR="/var/backups/marketplace"
DATE=$(date +%Y%m%d_%H%M%S)

# 데이터베이스 백업
mysqldump -u marketplace_user -p marketplace > $BACKUP_DIR/db_$DATE.sql

# 업로드 파일 백업
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz /var/www/marketplace/uploads

# 7일 이상 된 백업 삭제
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
```

```bash
# crontab에 등록 (매일 새벽 3시)
0 3 * * * /usr/local/bin/backup.sh >> /var/log/marketplace_backup.log 2>&1
```

---

## 📊 모니터링

### 1. 로그 확인
```bash
# Apache 로그
sudo tail -f /var/log/httpd/marketplace_access.log
sudo tail -f /var/log/httpd/marketplace_error.log

# MariaDB 로그
sudo tail -f /var/log/mariadb/mariadb.log

# PM2 로그
pm2 logs marketplace-api

# 시스템 로그
sudo journalctl -u httpd -f
sudo journalctl -u mariadb -f
```

### 2. 성능 모니터링
```bash
# 시스템 리소스
htop

# MariaDB 상태
mysql -u root -p -e "SHOW FULL PROCESSLIST;"
mysql -u root -p -e "SHOW STATUS LIKE '%connection%';"

# Apache 상태
sudo systemctl status httpd

# 디스크 사용량
df -h

# 네트워크 연결
ss -tulpn
```

---

이 가이드를 따라 Rocky Linux 8.10 환경에서 안정적인 중고거래 플랫폼을 구축할 수 있습니다!
