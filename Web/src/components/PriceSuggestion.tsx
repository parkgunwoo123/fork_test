import { useState } from 'react';
import { User } from '../App';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { DollarSign } from 'lucide-react';

type PriceSuggestionProps = {
  productId: string;
  productTitle: string;
  originalPrice: number;
  currentUser: User | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export function PriceSuggestion({
  productId,
  productTitle,
  originalPrice,
  currentUser,
  isOpen,
  onClose,
  onSuccess,
}: PriceSuggestionProps) {
  const [suggestedPrice, setSuggestedPrice] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentUser) {
      alert('로그인이 필요합니다.');
      return;
    }

    // 🔴 보안 취약점 1: 가격 검증 부족
    // 음수, 0, 원가보다 높은 가격 등을 제한해야 함
    const price = parseInt(suggestedPrice);
    if (isNaN(price) || price <= 0) {
      alert('올바른 가격을 입력해주세요.');
      return;
    }

    // 🔴 보안 취약점 2: Rate Limiting 부재
    // 동일 상품에 대해 무한정 가격 제안 가능
    // DB 연결 필요: 사용자당 하루 제안 횟수 제한

    // 🔴 보안 취약점 3: XSS (Cross-Site Scripting)
    // 메시지 내용에 스크립트 삽입 가능
    // DB 연결 필요:
    // INSERT INTO price_suggestions (product_id, buyer_id, suggested_price, message, status)
    // VALUES (?, ?, ?, ?, 'pending')

    // 🔴 보안 취약점 4: CSRF (Cross-Site Request Forgery)
    // 가격 제안 시 CSRF 토큰 필요

    // 🔴 보안 취약점 5: 권한 검증 부족
    // 자신이 판매하는 상품에도 가격 제안 가능
    // 서버에서 buyer_id != seller_id 확인 필요

    // 🔴 보안 취약점 6: SQL Injection
    // Prepared Statement 사용 필요

    console.log('가격 제안:', {
      productId,
      buyerId: currentUser.id,
      suggestedPrice: price,
      message,
    });

    alert('가격 제안이 전송되었습니다!');
    setSuggestedPrice('');
    setMessage('');
    onSuccess();
    onClose();
  };

  const discountPercent = suggestedPrice
    ? Math.round(((originalPrice - parseInt(suggestedPrice)) / originalPrice) * 100)
    : 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>가격 제안하기</DialogTitle>
          <DialogDescription>
            판매자에게 원하는 가격을 제안해보세요
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 상품 정보 */}
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">상품</p>
            <p className="font-medium truncate">{productTitle}</p>
            <p className="text-sm text-gray-600 mt-1">
              현재 가격: {originalPrice.toLocaleString()}원
            </p>
          </div>

          {/* 제안 가격 */}
          <div className="space-y-2">
            <Label htmlFor="suggested-price">제안 가격 *</Label>
            {/* 🔴 보안 취약점 7: 클라이언트 측 검증만 수행
                서버에서도 반드시 검증 필요 */}
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
              <Input
                id="suggested-price"
                type="number"
                placeholder="제안할 가격을 입력하세요"
                value={suggestedPrice}
                onChange={(e) => setSuggestedPrice(e.target.value)}
                className="pl-9"
                required
                min="1000"
                max={originalPrice}
              />
            </div>
            {suggestedPrice && parseInt(suggestedPrice) < originalPrice && (
              <p className="text-sm text-green-600">
                원가 대비 {discountPercent}% 할인
              </p>
            )}
            {suggestedPrice && parseInt(suggestedPrice) >= originalPrice && (
              <p className="text-sm text-red-600">
                제안 가격이 원가보다 높습니다
              </p>
            )}
          </div>

          {/* 메시지 */}
          <div className="space-y-2">
            <Label htmlFor="message">메시지 (선택)</Label>
            {/* 🔴 보안 취약점 8: 입력값 길이 제한 없음
                DB 연결 필요: VARCHAR(500) 등으로 길이 제한 */}
            <Textarea
              id="message"
              placeholder="판매자에게 전달할 메시지를 입력하세요 (선택사항)"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              maxLength={500}
            />
            <p className="text-xs text-gray-500">
              {message.length} / 500
            </p>
          </div>

          {/* 안내 문구 */}
          <div className="bg-blue-50 p-3 rounded-lg">
            <p className="text-sm text-blue-900">
              💡 판매자가 제안을 수락하면 알림을 보내드립니다.
            </p>
          </div>

          {/* 버튼 */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              취소
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={!suggestedPrice || parseInt(suggestedPrice) >= originalPrice}
            >
              제안하기
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
