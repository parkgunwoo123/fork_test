import { useState } from 'react';
import { User } from '../App';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { AlertCircle } from 'lucide-react';

type LoginProps = {
  onLogin: (user: User) => void;
  onRegisterClick: () => void;
};

export function Login({ onLogin, onRegisterClick }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // 🔴 보안 취약점 1: SQL Injection 위험
    // 서버에서 다음과 같은 쿼리를 사용하면 위험:
    // SELECT * FROM users WHERE email = '" + email + "' AND password = '" + password + "'"
    // 공격 예시: email에 "admin' OR '1'='1" 입력 시 모든 계정 접근 가능
    // DB 연결 필요: Prepared Statement 사용
    // 올바른 예: SELECT * FROM users WHERE email = ? AND password = ?

    // 🔴 보안 취약점 2: 평문 비밀번호 저장/전송
    // 비밀번호를 평문으로 전송하고 저장하면 안됨
    // DB 연결 필요: bcrypt 또는 argon2로 해시된 비밀번호 저장
    // 올바른 예: bcrypt.compare(password, hashedPasswordFromDB)

    // 🔴 보안 취약점 3: 입력 검증 부족
    // 클라이언트와 서버 양쪽에서 입력 검증 필요
    if (!email || !password) {
      setError('이메일과 비밀번호를 입력해주세요.');
      return;
    }

    // 🔴 보안 취약점 4: Brute Force 공격 방어 부재
    // DB 연결 필요: 로그인 실패 횟수 추적 테이블
    // CREATE TABLE login_attempts (ip_address VARCHAR, attempts INT, last_attempt TIMESTAMP)
    // 일정 횟수 이상 실패 시 계정 잠금 또는 CAPTCHA 요구

    // 🔴 보안 취약점 5: 타이밍 공격 (Timing Attack) 가능
    // 사용자 존재 여부에 따라 응답 시간이 달라지면 안됨
    // 올바른 예: 동일한 처리 시간 유지

    // Mock 로그인 (실제로는 서버 API 호출)
    // DB 연결 필요: POST /api/auth/login
    if (email === 'test@test.com' && password === 'password') {
      // 🔴 보안 취약점 6: 취약한 세션 관리
      // 실제로는 서버에서 안전한 세션 토큰 생성
      // DB 연결 필요: INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, ?)
      // 세션 토큰은 암호학적으로 안전한 랜덤 값 사용 (crypto.randomBytes)
      
      const user: User = {
        id: '1',
        email: 'test@test.com',
        username: '테스��유저',
        isAdmin: false,
      };
      onLogin(user);
    } else if (email === 'admin@admin.com' && password === 'admin') {
      // 🔴 보안 취약점 7: 기본 관리자 계정
      // 기본 계정이 있으면 보안 위험
      const user: User = {
        id: '0',
        email: 'admin@admin.com',
        username: '관리자',
        isAdmin: true,
      };
      onLogin(user);
    } else {
      // 🔴 보안 취약점 8: 정보 노출
      // "이메일이 존재하지 않습니다" vs "비밀번호가 틀렸습니다" 같은 구체적 메시지는 위험
      // 올바른 예: "이메일 또는 비밀번호가 일치하지 않습니다"
      setError('이메일 또는 비밀번호가 일치하지 않습니다.');
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>로그인</CardTitle>
          <CardDescription>
            계정에 로그인하여 중고마켓을 이용하세요
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
            
            {/* 🔴 보안 취약점 9: HTTPS 미사용 시 중간자 공격 가능
                실제 배포 시 반드시 HTTPS 사용 */}
            <div className="space-y-2">
              <Label htmlFor="email">이메일</Label>
              {/* 🔴 보안 취약점 10: XSS (Cross-Site Scripting)
                  입력값을 적절히 sanitize하지 않으면 스크립트 삽입 가능
                  React는 기본적으로 XSS 방어하지만 dangerouslySetInnerHTML 사용 시 주의 */}
              <Input
                id="email"
                type="email"
                placeholder="example@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">비밀번호</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>

            {/* 🔴 보안 취약점 11: CSRF (Cross-Site Request Forgery) 취약점
                실제 구현 시 CSRF 토큰 필요
                DB 연결 필요: 세션에 CSRF 토큰 저장 및 검증
                <input type="hidden" name="csrf_token" value="..." /> */}

            <Button type="submit" className="w-full">
              로그인
            </Button>

            <div className="text-center text-sm">
              <span className="text-gray-600">계정이 없으신가요? </span>
              <button
                type="button"
                onClick={onRegisterClick}
                className="text-blue-600 hover:underline"
              >
                회원가입
              </button>
            </div>

            <div className="text-xs text-gray-500 p-4 bg-gray-50 rounded-lg">
              <p className="mb-2">테스트 계정:</p>
              <p>일반 사용자: test@test.com / password</p>
              <p>관리자: admin@admin.com / admin</p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
