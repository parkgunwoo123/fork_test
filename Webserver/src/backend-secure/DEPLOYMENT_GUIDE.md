# 보안 강화 버전 배포 가이드

Rocky Linux 8.10 + Apache + MariaDB 환경에서 보안이 강화된 중고거래 플랫폼을 배포하는 완전한 가이드입니다.

---

## 📋 목차

1. [사전 준비](#사전-준비)
2. [시스템 설정](#시스템-설정)
3. [데이터베이스 설정](#데이터베이스-설정)
4. [백엔드 배포](#백엔드-배포)
5. [Apache 설정](#apache-설정)
6. [보안 설정](#보안-설정)
7. [테스트 및 검증](#테스트-및-검증)

---

## 1. 사전 준비

### 시스템 요구사항

- **OS**: Rocky Linux 8.10
- **CPU**: 2코어 이상
- **RAM**: 4GB 이상
- **디스크**: 50GB 이상
- **네트워크**: 고정 IP 또는 도메인

### 필수 소프트웨어

- Apache httpd 2.4+
- MariaDB 15.1
- Node.js 18+
- PM2 (프로세스 관리)
- Let's Encrypt (SSL)

---

## 2. 시스템 설정

### 2.1 시스템 업데이트

```bash
# root 권한으로 실행
sudo dnf update -y
sudo dnf install -y epel-release
```

### 2.2 SELinux 설정

```bash
# SELinux 상태 확인
getenforce

# SELinux 정책 설정
sudo setsebool -P httpd_can_network_connect 1
sudo setsebool -P httpd_can_network_connect_db 1
sudo setsebool -P httpd_can_sendmail 1

# 또는 Permissive 모드로 변경 (테스트 환경)
# sudo setenforce 0
# sudo vi /etc/selinux/config  # SELINUX=permissive
```

### 2.3 방화벽 설정

```bash
# HTTP/HTTPS 포트 열기
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload

# 방화벽 상태 확인
sudo firewall-cmd --list-all
```

---

## 3. 데이터베이스 설정

### 3.1 MariaDB 15.1 설치

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

# MariaDB 설치
sudo dnf install -y MariaDB-server MariaDB-client

# 서비스 시작 및 부팅 시 자동 시작
sudo systemctl enable mariadb
sudo systemctl start mariadb
sudo systemctl status mariadb
```

### 3.2 MariaDB 보안 설정

```bash
# 초기 보안 설정 실행
sudo mysql_secure_installation

# 다음 질문에 답변:
# - Set root password? [Y/n] Y
# - Remove anonymous users? [Y/n] Y
# - Disallow root login remotely? [Y/n] Y
# - Remove test database? [Y/n] Y
# - Reload privilege tables? [Y/n] Y
```

### 3.3 데이터베이스 및 사용자 생성

```bash
# MariaDB 접속
sudo mysql -u root -p
```

```sql
-- 데이터베이스 생성
CREATE DATABASE IF NOT EXISTS marketplace 
  CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

-- 사용자 생성 (강력한 비밀번호 사용)
CREATE USER IF NOT EXISTS 'marketplace_user'@'localhost' 
  IDENTIFIED BY 'Strong_Password_2024!@#$';

-- 권한 부여 (최소 권한 원칙)
GRANT SELECT, INSERT, UPDATE, DELETE ON marketplace.* 
  TO 'marketplace_user'@'localhost';

FLUSH PRIVILEGES;

-- 권한 확인
SHOW GRANTS FOR 'marketplace_user'@'localhost';
```

### 3.4 데이터베이스 스키마 생성

```bash
# 스키마 파일 적용 (DB_CONNECTION_GUIDE.md 참조)
mysql -u marketplace_user -p marketplace < schema.sql
```

### 3.5 MariaDB 성능 최적화

```bash
sudo vi /etc/my.cnf.d/server.cnf
```

```ini
[mysqld]
# 기본 설정
max_connections = 200
connect_timeout = 10
wait_timeout = 600
max_allowed_packet = 64M

# InnoDB 설정
innodb_buffer_pool_size = 1G
innodb_log_file_size = 256M
innodb_flush_method = O_DIRECT

# 보안 설정
bind-address = 127.0.0.1
local-infile = 0
skip-name-resolve

# 쿼리 캐시 (MariaDB 10.5 이하)
# query_cache_size = 128M
# query_cache_type = 1
```

```bash
# MariaDB 재시작
sudo systemctl restart mariadb
```

---

## 4. 백엔드 배포

### 4.1 Node.js 18 설치

```bash
# Node.js 18.x 저장소 추가
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -

# Node.js 설치
sudo dnf install -y nodejs

# 버전 확인
node --version  # v18.x.x
npm --version   # 9.x.x
```

### 4.2 PM2 설치

```bash
# PM2 전역 설치
sudo npm install -g pm2

# 부팅 시 자동 시작 설정
pm2 startup systemd
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp /home/$USER
```

### 4.3 백엔드 파일 배포

```bash
# 프로젝트 디렉토리 생성
sudo mkdir -p /var/www/marketplace
sudo chown -R $USER:$USER /var/www/marketplace

# 백엔드 파일 복사 (backend-secure 폴더 내용)
cd /var/www/marketplace
# Git clone 또는 파일 복사
# git clone https://github.com/your-repo/marketplace-backend.git .
# 또는
# scp -r backend-secure/* user@server:/var/www/marketplace/

# 의존성 설치
npm install --production
```

### 4.4 환경 변수 설정

```bash
# .env 파일 생성
cp .env.example .env
vi .env
```

```env
NODE_ENV=production
PORT=3001
HOST=localhost
FRONTEND_URL=https://your-domain.com

DB_HOST=localhost
DB_PORT=3306
DB_USER=marketplace_user
DB_PASSWORD=Strong_Password_2024!@#$
DB_NAME=marketplace

# openssl rand -base64 32 명령어로 생성
JWT_SECRET=your_generated_secret_key_here
SESSION_SECRET=your_generated_session_secret_here
CSRF_SECRET=your_generated_csrf_secret_here

JWT_EXPIRES_IN=7d

UPLOAD_DIR=/var/www/marketplace/uploads
MAX_FILE_SIZE=5242880

RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# SMTP 설정 (선택사항)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

```bash
# .env 파일 보안 설정
chmod 600 .env
```

### 4.5 업로드 디렉토리 생성

```bash
# 업로드 디렉토리 생성
mkdir -p /var/www/marketplace/uploads

# 권한 설정
chown -R apache:apache /var/www/marketplace/uploads
chmod 750 /var/www/marketplace/uploads
```

### 4.6 PM2로 서버 시작

```bash
# 서버 시작
pm2 start server.js --name marketplace-api

# 상태 확인
pm2 status

# 로그 확인
pm2 logs marketplace-api

# 부팅 시 자동 시작 설정 저장
pm2 save
```

---

## 5. Apache 설정

### 5.1 Apache 설치

```bash
# Apache 설치
sudo dnf install -y httpd httpd-tools mod_ssl

# 필요한 모듈 설치
sudo dnf install -y mod_proxy_html

# 서비스 시작
sudo systemctl enable httpd
sudo systemctl start httpd
```

### 5.2 Virtual Host 설정

```bash
sudo vi /etc/httpd/conf.d/marketplace.conf
```

```apache
<VirtualHost *:80>
    ServerName your-domain.com
    ServerAlias www.your-domain.com
    
    # HTTP to HTTPS 리다이렉트
    RewriteEngine On
    RewriteCond %{HTTPS} off
    RewriteRule ^(.*)$ https://%{HTTP_HOST}$1 [R=301,L]
    
    ErrorLog /var/log/httpd/marketplace_error.log
    CustomLog /var/log/httpd/marketplace_access.log combined
</VirtualHost>

<VirtualHost *:443>
    ServerName your-domain.com
    ServerAlias www.your-domain.com
    
    # SSL 설정 (Let's Encrypt)
    SSLEngine on
    SSLCertificateFile /etc/letsencrypt/live/your-domain.com/cert.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/your-domain.com/privkey.pem
    SSLCertificateChainFile /etc/letsencrypt/live/your-domain.com/chain.pem
    
    # 프론트엔드 정적 파일 (React 빌드)
    DocumentRoot /var/www/marketplace/frontend/build
    
    <Directory /var/www/marketplace/frontend/build>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
        
        # React Router 지원
        RewriteEngine On
        RewriteBase /
        RewriteRule ^index\.html$ - [L]
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteCond %{REQUEST_URI} !^/api
        RewriteRule . /index.html [L]
    </Directory>
    
    # API 프록시 (Node.js)
    ProxyPreserveHost On
    ProxyPass /api http://localhost:3001/api
    ProxyPassReverse /api http://localhost:3001/api
    
    # 업로드 파일 서빙
    Alias /uploads /var/www/marketplace/uploads
    <Directory /var/www/marketplace/uploads>
        Options -Indexes -ExecCGI
        AllowOverride None
        Require all granted
        
        # 파일 다운로드 전용 (실행 방지)
        <FilesMatch "\.(php|phtml|php3|php4|php5|pl|py|jsp|asp|sh|cgi)$">
            Require all denied
        </FilesMatch>
    </Directory>
    
    # WebSocket 지원 (채팅)
    RewriteEngine On
    RewriteCond %{HTTP:Upgrade} websocket [NC]
    RewriteCond %{HTTP:Connection} upgrade [NC]
    RewriteRule ^/?(.*) "ws://localhost:3001/$1" [P,L]
    
    # 보안 헤더
    Header always set X-Frame-Options "SAMEORIGIN"
    Header always set X-Content-Type-Options "nosniff"
    Header always set X-XSS-Protection "1; mode=block"
    Header always set Referrer-Policy "strict-origin-when-cross-origin"
    Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
    
    # 로그
    ErrorLog /var/log/httpd/marketplace_ssl_error.log
    CustomLog /var/log/httpd/marketplace_ssl_access.log combined
</VirtualHost>
```

### 5.3 보안 설정

```bash
sudo vi /etc/httpd/conf.d/security.conf
```

```apache
# 서버 정보 숨기기
ServerTokens Prod
ServerSignature Off

# 디렉토리 리스팅 비활성화
<Directory />
    Options -Indexes
    AllowOverride None
    Require all denied
</Directory>

# HTTP 메서드 제한
<LimitExcept GET POST PUT DELETE OPTIONS>
    Require all denied
</LimitExcept>

# 업로드 크기 제한
LimitRequestBody 10485760

# Timeout 설정
Timeout 60
KeepAlive On
MaxKeepAliveRequests 100
KeepAliveTimeout 5
```

### 5.4 Let's Encrypt SSL 인증서

```bash
# Certbot 설치
sudo dnf install -y certbot python3-certbot-apache

# SSL 인증서 발급
sudo certbot --apache -d your-domain.com -d www.your-domain.com

# 자동 갱신 설정
sudo systemctl enable certbot-renew.timer
sudo systemctl start certbot-renew.timer

# 갱신 테스트
sudo certbot renew --dry-run
```

### 5.5 Apache 재시작

```bash
# 설정 파일 문법 검사
sudo httpd -t

# Apache 재시작
sudo systemctl restart httpd

# 상태 확인
sudo systemctl status httpd
```

---

## 6. 보안 설정

### 6.1 파일 권한 설정

```bash
# 소유자 설정
sudo chown -R apache:apache /var/www/marketplace

# 디렉토리 권한
sudo find /var/www/marketplace -type d -exec chmod 750 {} \;

# 파일 권한
sudo find /var/www/marketplace -type f -exec chmod 640 {} \;

# .env 파일 특별 보호
sudo chmod 600 /var/www/marketplace/.env

# 업로드 디렉토리 (실행 권한 제거)
sudo chmod -R -x+X /var/www/marketplace/uploads
```

### 6.2 Fail2Ban 설치 (무차별 대입 공격 방지)

```bash
# Fail2Ban 설치
sudo dnf install -y fail2ban

# 설정 파일 복사
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local

# Apache 보호 설정
sudo vi /etc/fail2ban/jail.local
```

```ini
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true

[apache-auth]
enabled = true
port = http,https
logpath = /var/log/httpd/*error.log

[apache-badbots]
enabled = true
port = http,https
logpath = /var/log/httpd/*access.log
```

```bash
# Fail2Ban 시작
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
sudo systemctl status fail2ban
```

### 6.3 로그 로테이션

```bash
sudo vi /etc/logrotate.d/marketplace
```

```
/var/log/httpd/marketplace*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 640 apache apache
    sharedscripts
    postrotate
        /bin/systemctl reload httpd > /dev/null 2>/dev/null || true
    endscript
}

/var/www/marketplace/logs/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 640 apache apache
}
```

---

## 7. 테스트 및 검증

### 7.1 기본 동작 테스트

```bash
# API 헬스 체크
curl http://localhost:3001/health

# 예상 응답:
# {"success":true,"message":"Server is running","timestamp":"..."}

# 웹사이트 접속
curl -I https://your-domain.com

# 예상 응답:
# HTTP/2 200
# strict-transport-security: max-age=31536000
```

### 7.2 보안 테스트

```bash
# SQL Injection 테스트
curl "https://your-domain.com/api/products?category=electronics' OR '1'='1"
# 예상: 정상 응답 또는 에러 (쿼리 실행 안됨)

# XSS 테스트
curl -X POST https://your-domain.com/api/products \
  -H "Content-Type: application/json" \
  -d '{"title":"<script>alert(1)</script>"}'
# 예상: HTML 이스케이프됨

# Rate Limiting 테스트
for i in {1..101}; do curl https://your-domain.com/api/products; done
# 예상: 100회 이후 429 Too Many Requests
```

### 7.3 SSL/TLS 테스트

```bash
# SSL Labs 테스트
# https://www.ssllabs.com/ssltest/analyze.html?d=your-domain.com

# 또는 testssl.sh 사용
git clone https://github.com/drwetter/testssl.sh.git
cd testssl.sh
./testssl.sh https://your-domain.com

# 예상: A+ 등급
```

### 7.4 성능 테스트

```bash
# Apache Bench
ab -n 1000 -c 10 https://your-domain.com/

# 또는 wrk
wrk -t12 -c400 -d30s https://your-domain.com/
```

---

## 8. 모니터링 및 유지보수

### 8.1 시스템 모니터링

```bash
# PM2 모니터링
pm2 monit

# 시스템 리소스 확인
top
htop

# 디스크 사용량
df -h

# 로그 실시간 확인
tail -f /var/log/httpd/marketplace_error.log
pm2 logs marketplace-api
```

### 8.2 데이터베이스 백업

```bash
# 백업 스크립트 생성
sudo vi /usr/local/bin/backup-marketplace-db.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/marketplace"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="marketplace"
DB_USER="marketplace_user"
DB_PASS="Strong_Password_2024!@#$"

mkdir -p $BACKUP_DIR

# 백업 실행
mysqldump -u $DB_USER -p$DB_PASS $DB_NAME | gzip > $BACKUP_DIR/marketplace_$DATE.sql.gz

# 30일 이상 된 백업 삭제
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete

echo "Backup completed: marketplace_$DATE.sql.gz"
```

```bash
# 실행 권한 부여
sudo chmod +x /usr/local/bin/backup-marketplace-db.sh

# 크론탭 설정 (매일 새벽 3시)
sudo crontab -e
```

```
0 3 * * * /usr/local/bin/backup-marketplace-db.sh >> /var/log/marketplace-backup.log 2>&1
```

### 8.3 자동 업데이트

```bash
# 의존성 업데이트 (정기적으로 실행)
cd /var/www/marketplace
npm audit
npm update

# PM2 재시작
pm2 restart marketplace-api
```

---

## 9. 트러블슈팅

### 문제: 502 Bad Gateway

```bash
# Node.js 서버 상태 확인
pm2 status

# 로그 확인
pm2 logs marketplace-api

# 재시작
pm2 restart marketplace-api
```

### 문제: DB 연결 실패

```bash
# MariaDB 상태 확인
sudo systemctl status mariadb

# 연결 테스트
mysql -u marketplace_user -p -h localhost marketplace

# 방화벽 확인
sudo firewall-cmd --list-all
```

### 문제: 파일 업로드 실패

```bash
# 권한 확인
ls -la /var/www/marketplace/uploads

# SELinux 컨텍스트 확인
ls -Z /var/www/marketplace/uploads

# SELinux 컨텍스트 설정
sudo chcon -R -t httpd_sys_rw_content_t /var/www/marketplace/uploads
```

---

## 10. 체크리스트

배포 완료 후 확인:

- [ ] MariaDB 설치 및 보안 설정
- [ ] 데이터베이스 스키마 생성
- [ ] Node.js 백엔드 실행 (PM2)
- [ ] Apache 설정 및 프록시
- [ ] SSL 인증서 설치 (HTTPS)
- [ ] 방화벽 설정 (80, 443 포트)
- [ ] 파일 권한 설정
- [ ] .env 파일 설정 및 보호
- [ ] 보안 헤더 적용
- [ ] Rate Limiting 동작 확인
- [ ] Fail2Ban 설치 및 설정
- [ ] 로그 로테이션 설정
- [ ] 백업 스크립트 작성 및 크론 설정
- [ ] 보안 테스트 (SQL Injection, XSS, CSRF 등)
- [ ] 성능 테스트
- [ ] SSL/TLS 테스트 (A+ 등급)
- [ ] 모니터링 설정

---

## 참고 사항

### 추천 도구

- **보안 스캐닝**: OWASP ZAP, Nessus
- **성능 모니터링**: New Relic, Datadog
- **로그 분석**: ELK Stack, Graylog
- **백업**: rsync, AWS S3

### 유용한 명령어

```bash
# 전체 로그 확인
sudo journalctl -xe

# Apache 에러 로그
sudo tail -f /var/log/httpd/error_log

# PM2 프로세스 목록
pm2 list

# 포트 사용 확인
sudo netstat -tulpn | grep LISTEN

# 시스템 리소스 확인
vmstat 1
iostat 1
```

---

**배포 완료!** 

이제 보안이 강화된 중고거래 플랫폼이 운영 중입니다. 정기적으로 보안 업데이트와 백업을 수행하세요.
