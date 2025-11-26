import { useState } from 'react';
import { User } from '../App';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

type RegisterProps = {
  onRegister: (user: User) => void;
  onLoginClick: () => void;
};

export function Register({ onRegister, onLoginClick }: RegisterProps) {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // 🔴 보안 취약점 1: 클라이언트 측 검증만 수행
    // 클라이언트 검증은 우회 가능, 서버 측에서도 반드시 검증 필요
    // DB 연결 필요: 서버 측 입력 검증 API

    // 🔴 보안 취약점 2: 약한 비밀번호 정책
    // 최소 8자, 대소문자, 숫자, 특수문자 조합 권장
    if (password.length < 8) {
      setError('비밀번호는 최소 8자 이상이어야 합니다.');
      return;
    }

    if (password !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }

    // 🔴 보안 취약점 3: 이메일 중복 확인 부재
    // DB 연결 필요: SELECT COUNT(*) FROM users WHERE email = ?
    // 사용자 존재 여부 확인 시 타이밍 공격 방지 필요

    // 🔴 보안 취약점 4: SQL Injection 위험
    // 잘못된 예: INSERT INTO users VALUES ('" + email + "', '" + password + "')
    // DB 연결 필요: Prepared Statement 사용
    // 올바른 예: INSERT INTO users (email, username, password_hash, phone, address) VALUES (?, ?, ?, ?, ?)

    // 🔴 보안 취약점 5: 비밀번호 평문 저장
    // DB 연결 필요: bcrypt.hash(password, 10) 등으로 해시 후 저장
    // CREATE TABLE users (
    //   id UUID PRIMARY KEY,
    //   email VARCHAR(255) UNIQUE NOT NULL,
    //   username VARCHAR(100) NOT NULL,
    //   password_hash VARCHAR(255) NOT NULL,
    //   phone VARCHAR(20),
    //   address TEXT,
    //   is_admin BOOLEAN DEFAULT FALSE,
    //   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    // )

    // 🔴 보안 취약점 6: 개인정보 보호 부재
    // 전화번호, 주소 등 민감 정보는 암호화 저장 권장
    // 또는 최소한의 정보만 수집

    // 🔴 보안 취약점 7: 이메일 인증 부재
    // 실제로는 이메일 인증 링크 전송 필요
    // DB 연결 필요: 
    // CREATE TABLE email_verifications (
    //   user_id UUID,
    //   token VARCHAR(255),
    //   expires_at TIMESTAMP
    // )

    // 🔴 보안 취약점 8: XSS 위험
    // 사용자 입력을 저장하기 전 sanitize 필요
    if (!email || !username || !password) {
      setError('모든 필수 항목을 입력해주세요.');
      return;
    }

    // 🔴 보안 취약점 9: CAPTCHA 부재
    // 봇에 의한 대량 계정 생성 방지를 위해 CAPTCHA 권장

    // Mock 회원가입 (실제로는 서버 API 호출)
    // DB 연결 필요: POST /api/auth/register
    const newUser: User = {
      id: Math.random().toString(36).substr(2, 9), // 🔴 취약점: 예측 가능한 ID (UUID 사용 권장)
      email,
      username,
      isAdmin: false,
    };

    setSuccess('회원가입이 완료되었습니다!');
    setTimeout(() => {
      onRegister(newUser);
    }, 1000);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>회원가입</CardTitle>
          <CardDescription>
            새 계정을 만들어 중고마켓을 시작하세요
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg flex items-center gap-2">
                <AlertCircle className="size-4" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            {success && (
              <div className="bg-green-50 text-green-600 p-3 rounded-lg flex items-center gap-2">
                <CheckCircle2 className="size-4" />
                <span className="text-sm">{success}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">이메일 *</Label>
              <Input
                id="email"
                type="email"
                placeholder="example@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">사용자명 *</Label>
              {/* 🔴 보안 취약점 10: 사용자명 중복 확인 부재
                  DB 연결 필요: SELECT COUNT(*) FROM users WHERE username = ? */}
              <Input
                id="username"
                type="text"
                placeholder="홍길동"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">비밀번호 *</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <p className="text-xs text-gray-500">
                최소 8자 이상 입력해주세요
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">비밀번호 확인 *</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">전화번호</Label>
              {/* 🔴 보안 취약점 11: 전화번호 형식 검증 부족
                  정규식으로 형식 검증 필요: /^01[0-9]-?[0-9]{4}-?[0-9]{4}$/ */}
              <Input
                id="phone"
                type="tel"
                placeholder="010-1234-5678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">주소</Label>
              <Input
                id="address"
                type="text"
                placeholder="서울시 강남구..."
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>

            {/* 🔴 보안 취약점 12: 개인정보 처리방침 동의 부재
                실제로는 개인정보 처리방침, 이용약관 동의 체크박스 필요 */}

            <Button type="submit" className="w-full">
              회원가입
            </Button>

            <div className="text-center text-sm">
              <span className="text-gray-600">이미 계정이 있으신가요? </span>
              <button
                type="button"
                onClick={onLoginClick}
                className="text-blue-600 hover:underline"
              >
                로그인
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
