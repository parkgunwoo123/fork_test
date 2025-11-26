import { CartItem, User, Product } from '../App';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Input } from './ui/input';
import { ArrowLeft, Trash2, Minus, Plus } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';

type CartProps = {
  cartItems: CartItem[];
  currentUser: User | null;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onBack: () => void;
};

// 🔴 보안 취약점: 하드코딩된 상품 정보
// DB 연결 필요: SELECT * FROM products WHERE id IN (...)
const mockProducts: { [key: string]: Product } = {
  '1': {
    id: '1',
    title: '아이폰 14 Pro 256GB',
    price: 950000,
    description: '거의 새것 같은 상태입니다.',
    image: 'smartphone',
    sellerId: 'seller1',
    sellerName: '김철수',
    category: '전자기기',
    rating: 4.8,
    reviewCount: 24,
  },
  '2': {
    id: '2',
    title: '맥북 프로 M2',
    price: 1800000,
    description: '2023년 구매',
    image: 'laptop',
    sellerId: 'seller2',
    sellerName: '이영희',
    category: '전자기기',
    rating: 5.0,
    reviewCount: 15,
  },
};

export function Cart({ cartItems, currentUser, onUpdateQuantity, onRemoveItem, onBack }: CartProps) {
  // 🔴 보안 취약점 1: 클라이언트에서 가격 계산
  // 가격 조작 방지를 위해 서버에서 계산해야 함
  // DB 연결 필요: SELECT SUM(p.price * c.quantity) FROM cart c JOIN products p ON c.product_id = p.id WHERE c.user_id = ?
  
  const calculateTotal = () => {
    return cartItems.reduce((total, item) => {
      const product = mockProducts[item.productId];
      if (!product) return total;
      return total + product.price * item.quantity;
    }, 0);
  };

  const handleCheckout = () => {
    if (!currentUser) {
      alert('로그인이 필요합니다.');
      return;
    }

    if (cartItems.length === 0) {
      alert('장바구니가 비어있습니다.');
      return;
    }

    // 🔴 보안 취약점 2: 결제 프로세스 권한 검증 부족
    // 실제 사용자 인증 및 결제 정보 검증 필요
    // DB 연결 필요: 
    // BEGIN TRANSACTION;
    // INSERT INTO orders (user_id, total_amount, status) VALUES (?, ?, 'pending');
    // INSERT INTO order_items (order_id, product_id, quantity, price) VALUES ...;
    // UPDATE products SET stock = stock - ? WHERE id = ?;
    // COMMIT;

    // 🔴 보안 취약점 3: Race Condition
    // 동시에 같은 상품 구매 시 재고 문제 발생 가능
    // DB 락(Lock) 또는 트랜잭션 격리 수준 조정 필요

    // 🔴 보안 취약점 4: CSRF (Cross-Site Request Forgery)
    // 결제 요청 시 CSRF 토큰 필요

    // 🔴 보안 취약점 5: 가격 변조 가능
    // 클라이언트에서 전송한 가격을 그대로 사용하면 안됨
    // 서버에서 실제 상품 가격 조회하여 계산

    alert(`총 ${calculateTotal().toLocaleString()}원 결제가 진행됩니다.`);
  };

  if (!currentUser) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <p>로그인이 필요합니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Button
        variant="ghost"
        onClick={onBack}
        className="mb-4"
      >
        <ArrowLeft className="size-4 mr-2" />
        쇼핑 계속하기
      </Button>

      <h1 className="mb-6">장바구니</h1>

      {cartItems.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-500 mb-4">장바구니가 비어있습니다.</p>
          <Button onClick={onBack}>쇼핑하러 가기</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 장바구니 아이템 목록 */}
          <div className="lg:col-span-2 space-y-4">
            {cartItems.map((item) => {
              const product = mockProducts[item.productId];
              if (!product) return null;

              // 🔴 보안 취약점 6: IDOR (Insecure Direct Object Reference)
              // 다른 사용자의 장바구니 아이템도 접근 가능
              // DB 연결 필요: SELECT * FROM cart WHERE user_id = ? AND product_id = ?

              return (
                <Card key={item.productId}>
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      <div className="w-24 h-24 bg-gray-200 rounded-lg flex-shrink-0 overflow-hidden">
                        <ImageWithFallback
                          src="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200&h=200&fit=crop&q=80"
                          alt={product.title}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <div className="flex-1">
                        <h3 className="mb-1">{product.title}</h3>
                        <p className="text-gray-600 text-sm mb-2">
                          판매자: {product.sellerName}
                        </p>
                        <p className="text-blue-600">
                          {product.price.toLocaleString()}원
                        </p>

                        <div className="flex items-center gap-2 mt-4">
                          {/* 🔴 보안 취약점 7: 수량 검증 부족
                              음수 또는 과도하게 큰 수량 방지 필요
                              DB 연결 필요: UPDATE cart SET quantity = ? WHERE user_id = ? AND product_id = ? */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (item.quantity > 1) {
                                onUpdateQuantity(item.productId, item.quantity - 1);
                              }
                            }}
                            disabled={item.quantity <= 1}
                          >
                            <Minus className="size-4" />
                          </Button>
                          
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => {
                              const newQuantity = parseInt(e.target.value);
                              if (newQuantity > 0 && newQuantity <= 99) {
                                onUpdateQuantity(item.productId, newQuantity);
                              }
                            }}
                            className="w-16 text-center"
                            min="1"
                            max="99"
                          />
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (item.quantity < 99) {
                                onUpdateQuantity(item.productId, item.quantity + 1);
                              }
                            }}
                            disabled={item.quantity >= 99}
                          >
                            <Plus className="size-4" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onRemoveItem(item.productId)}
                            className="ml-auto text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="size-4 mr-1" />
                            삭제
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t flex justify-between items-center">
                      <span className="text-gray-600">소계</span>
                      <span className="text-lg">
                        {(product.price * item.quantity).toLocaleString()}원
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* 주문 요약 */}
          <div className="lg:col-span-1">
            <Card className="sticky top-20">
              <CardContent className="p-6">
                <h2 className="mb-4">주문 요약</h2>
                
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between">
                    <span className="text-gray-600">상품 수량</span>
                    <span>{cartItems.reduce((sum, item) => sum + item.quantity, 0)}개</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">상품 금액</span>
                    <span>{calculateTotal().toLocaleString()}원</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">배송비</span>
                    <span>무료</span>
                  </div>
                  <div className="border-t pt-3 flex justify-between items-center">
                    <span>총 결제금액</span>
                    <span className="text-2xl text-blue-600">
                      {calculateTotal().toLocaleString()}원
                    </span>
                  </div>
                </div>

                <Button
                  onClick={handleCheckout}
                  className="w-full"
                  size="lg"
                >
                  결제하기
                </Button>

                {/* 🔴 보안 취약점 8: 쿠폰/할인 코드 검증 부족
                    DB 연결 필요: 
                    SELECT * FROM coupons WHERE code = ? AND valid_from <= NOW() AND valid_until >= NOW()
                    쿠폰 중복 사용 방지 및 사용 이력 저장 */}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
