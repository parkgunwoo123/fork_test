import { useState } from 'react';
import { User } from '../App';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ArrowLeft, User as UserIcon, Package, Heart, Settings } from 'lucide-react';

type MyPageProps = {
  currentUser: User;
  onUpdateUser: (user: User) => void;
  onBack: () => void;
};

type Order = {
  id: string;
  productTitle: string;
  price: number;
  status: string;
  orderDate: string;
};

// 🔴 보안 취약점: 하드코딩된 주문 데이터
// DB 연결 필요: 
// SELECT o.*, p.title as product_title, p.price 
// FROM orders o 
// JOIN order_items oi ON o.id = oi.order_id 
// JOIN products p ON oi.product_id = p.id 
// WHERE o.user_id = ? 
// ORDER BY o.created_at DESC
const mockOrders: Order[] = [
  {
    id: '1',
    productTitle: '아이폰 14 Pro 256GB',
    price: 950000,
    status: '배송중',
    orderDate: '2024-01-15',
  },
  {
    id: '2',
    productTitle: '맥북 프로 M2',
    price: 1800000,
    status: '배송완료',
    orderDate: '2024-01-10',
  },
];

export function MyPage({ currentUser, onUpdateUser, onBack }: MyPageProps) {
  const [email, setEmail] = useState(currentUser.email);
  const [username, setUsername] = useState(currentUser.username);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('010-1234-5678');
  const [address, setAddress] = useState('서울시 강남구');

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();

    // 🔴 보안 취약점 1: 권한 검증 부족
    // 다른 사용자의 정보도 수정 가능
    // DB 연결 필요: UPDATE users SET username = ?, phone = ?, address = ? WHERE id = ?
    // 서버에서 세션의 user_id와 요청의 user_id 일치 확인 필요

    // 🔴 보안 취약점 2: SQL Injection
    // 잘못된 예: "UPDATE users SET username = '" + username + "' WHERE id = " + currentUser.id
    // Prepared Statement 사용 필요

    // 🔴 보안 취약점 3: XSS (Cross-Site Scripting)
    // 사용자 입력을 그대로 저장/표시하면 스크립트 삽입 가능
    // 서버에서 HTML 태그 이스케이프 처리 필요

    // 🔴 보안 취약점 4: CSRF (Cross-Site Request Forgery)
    // 프로필 업데이트 시 CSRF 토큰 필요

    // 🔴 보안 취약점 5: 입력값 검증 부족
    // 이메일, 전화번호 형식 검증 필요
    if (!email || !username) {
      alert('이메일과 사용자명은 필수입니다.');
      return;
    }

    const updatedUser: User = {
      ...currentUser,
      email,
      username,
    };

    onUpdateUser(updatedUser);
    alert('프로필이 업데이트되었습니다.');
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();

    // 🔴 보안 취약점 6: 현재 비밀번호 검증 부재
    // 비밀번호 변경 시 현재 비밀번호 확인 필수
    // DB 연결 필요: SELECT password_hash FROM users WHERE id = ?
    // bcrypt.compare(currentPassword, storedHash)

    // 🔴 보안 취약점 7: 약한 비밀번호 정책
    // 최소 8자, 대소문자, 숫자, 특수문자 조합 권장
    if (newPassword.length < 8) {
      alert('새 비밀번호는 최소 8자 이상이어야 합니다.');
      return;
    }

    if (newPassword !== confirmPassword) {
      alert('새 비밀번호가 일치하지 않습니다.');
      return;
    }

    // 🔴 보안 취약점 8: 비밀번호 평문 전송/저장
    // HTTPS 사용 및 bcrypt로 해시 후 저장 필요
    // DB 연결 필요: UPDATE users SET password_hash = ? WHERE id = ?
    // const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 🔴 보안 취약점 9: 세션 무효화 부재
    // 비밀번호 변경 시 다른 기기의 세션도 무효화해야 함
    // DB 연결 필요: DELETE FROM sessions WHERE user_id = ? AND id != ?

    alert('비밀번호가 변경되었습니다.');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleDeleteAccount = () => {
    // 🔴 보안 취약점 10: 계정 삭제 확인 부족
    // 재확인 및 비밀번호 입력 요구 필요
    // 중요한 작업이므로 이메일 인증 추가 권장
    
    const confirmed = confirm(
      '정말로 계정을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.'
    );

    if (!confirmed) return;

    // 🔴 보안 취약점 11: Soft Delete vs Hard Delete
    // 개인정보 보호를 위해 실제 삭제(Hard Delete) 또는
    // 일정 기간 후 삭제(Soft Delete) 정책 필요
    // DB 연결 필요: 
    // UPDATE users SET is_deleted = true, deleted_at = NOW() WHERE id = ?
    // 또는 DELETE FROM users WHERE id = ?
    // 관련 데이터(주문, 리뷰 등)도 처리 필요

    alert('계정이 삭제되었습니다.');
    onBack();
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Button variant="ghost" onClick={onBack} className="mb-4">
        <ArrowLeft className="size-4 mr-2" />
        뒤로가기
      </Button>

      <h1 className="mb-6">마이페이지</h1>

      <Tabs defaultValue="orders" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="orders" className="flex items-center gap-2">
            <Package className="size-4" />
            <span className="hidden sm:inline">주문내역</span>
          </TabsTrigger>
          <TabsTrigger value="wishlist" className="flex items-center gap-2">
            <Heart className="size-4" />
            <span className="hidden sm:inline">찜목록</span>
          </TabsTrigger>
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <UserIcon className="size-4" />
            <span className="hidden sm:inline">프로필</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="size-4" />
            <span className="hidden sm:inline">설정</span>
          </TabsTrigger>
        </TabsList>

        {/* 주문내역 탭 */}
        <TabsContent value="orders" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>주문 내역</CardTitle>
            </CardHeader>
            <CardContent>
              {/* 🔴 보안 취약점 12: IDOR (Insecure Direct Object Reference)
                  다른 사용자의 주문 내역도 조회 가능
                  DB 연결 필요: 사용자 ID로 필터링 필수 */}
              <div className="space-y-4">
                {mockOrders.map((order) => (
                  <div key={order.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3>{order.productTitle}</h3>
                        <p className="text-gray-600">
                          {order.price.toLocaleString()}원
                        </p>
                      </div>
                      <span
                        className={`text-sm px-3 py-1 rounded ${
                          order.status === '배송완료'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {order.status}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-gray-500">
                        주문일: {order.orderDate}
                      </p>
                      <Button variant="outline" size="sm">
                        상세보기
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 찜목록 탭 */}
        <TabsContent value="wishlist">
          <Card>
            <CardHeader>
              <CardTitle>찜한 상품</CardTitle>
            </CardHeader>
            <CardContent>
              {/* 🔴 보안 취약점 13: 찜 목록 권한 확인 부족
                  DB 연결 필요: SELECT p.* FROM wishlists w JOIN products p ON w.product_id = p.id WHERE w.user_id = ? */}
              <div className="text-center py-8 text-gray-500">
                찜한 상품이 없습니다.
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 프로필 탭 */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>프로필 정보</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="profile-email">이메일</Label>
                  {/* 🔴 보안 취약점 14: 이메일 변경 시 인증 부재
                      이메일 변경 시 새 이메일로 인증 링크 전송 필요 */}
                  <Input
                    id="profile-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="profile-username">사용자명</Label>
                  <Input
                    id="profile-username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="profile-phone">전화번호</Label>
                  {/* 🔴 보안 취약점 15: 전화번호 형식 검증 부족
                      정규식으로 검증 필요 */}
                  <Input
                    id="profile-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="profile-address">주소</Label>
                  <Input
                    id="profile-address"
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </div>

                <Button type="submit" className="w-full">
                  프로필 업데이트
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 설정 탭 */}
        <TabsContent value="settings" className="space-y-4">
          {/* 비밀번호 변경 */}
          <Card>
            <CardHeader>
              <CardTitle>비밀번호 변경</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current-password">현재 비밀번호</Label>
                  <Input
                    id="current-password"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new-password">새 비밀번호</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                  <p className="text-sm text-gray-500">
                    최소 8자 이상 입력해주세요
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-new-password">새 비밀번호 확인</Label>
                  <Input
                    id="confirm-new-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>

                <Button type="submit" className="w-full">
                  비밀번호 변경
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* 계정 삭제 */}
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="text-red-600">위험 구역</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                계정을 삭제하면 모든 데이터가 영구적으로 삭제되며 복구할 수 없습니다.
              </p>
              <Button
                variant="destructive"
                onClick={handleDeleteAccount}
                className="w-full"
              >
                계정 삭제
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
