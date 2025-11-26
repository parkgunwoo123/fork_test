import { useState } from 'react';
import { User, Product } from '../App';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Textarea } from './ui/textarea';
import { ArrowLeft, Star, ShoppingCart, MessageCircle, Heart, DollarSign, Flag } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { PriceSuggestion } from './PriceSuggestion';
import { ReportDialog } from './ReportDialog';

type ProductDetailProps = {
  productId: string;
  currentUser: User | null;
  onAddToCart: (productId: string) => void;
  onBack: () => void;
};

type Review = {
  id: string;
  userId: string;
  username: string;
  rating: number;
  comment: string;
  createdAt: string;
};

// 🔴 보안 취약점: 하드코딩된 상품 데이터
// DB 연결 필요: SELECT * FROM products WHERE id = ?
const mockProduct: Product = {
  id: '1',
  title: '아이폰 14 Pro 256GB',
  price: 950000,
  description: '거의 새것 같은 상태입니다. 케이스랑 같이 드려요. 2023년 3월에 구매했고, 보호필름 붙여서 사용했습니다. 배터리 성능 98%이고, 외관상 기스 전혀 없습니다.',
  image: 'smartphone device',
  sellerId: 'seller1',
  sellerName: '김철수',
  category: '전자기기',
  rating: 4.8,
  reviewCount: 24,
};

// 🔴 보안 취약점: 하드코딩된 리뷰 데이터
// DB 연결 필요: SELECT * FROM reviews WHERE product_id = ? ORDER BY created_at DESC
const mockReviews: Review[] = [
  {
    id: '1',
    userId: 'user1',
    username: '박철수',
    rating: 5,
    comment: '상태 정말 좋아요! 감사합니다.',
    createdAt: '2024-01-15',
  },
  {
    id: '2',
    userId: 'user2',
    username: '이영희',
    rating: 4,
    comment: '빠른 배송 감사합니다',
    createdAt: '2024-01-10',
  },
];

export function ProductDetail({ productId, currentUser, onAddToCart, onBack }: ProductDetailProps) {
  const [reviews, setReviews] = useState<Review[]>(mockReviews);
  const [newReview, setNewReview] = useState('');
  const [newRating, setNewRating] = useState(5);
  const [isLiked, setIsLiked] = useState(false);
  const [showPriceSuggestion, setShowPriceSuggestion] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);

  // 🔴 보안 취약점: IDOR (Insecure Direct Object Reference)
  // productId가 예측 가능하여 권한 없이 다른 상품 접근 가능
  // DB 연결 필요: 상품 조회 시 권한 확인

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentUser) {
      alert('로그인이 필요합니다.');
      return;
    }

    // 🔴 보안 취약점 1: XSS (Cross-Site Scripting)
    // 사용자 입력을 그대로 표시하면 스크립트 삽입 가능
    // 예: <script>alert('XSS')</script>
    // DB 연결 필요: INSERT INTO reviews (product_id, user_id, rating, comment) VALUES (?, ?, ?, ?)
    // 서버에서 HTML 태그 이스케이프 처리 필요

    // 🔴 보안 취약점 2: SQL Injection
    // 잘못된 예: "INSERT INTO reviews VALUES ('" + newReview + "')"
    // Prepared Statement 사용 필요

    // 🔴 보안 취약점 3: CSRF (Cross-Site Request Forgery)
    // 리뷰 작성 시 CSRF 토큰 검증 필요

    // 🔴 보안 취약점 4: Rate Limiting 부재
    // 동일 사용자의 연속 리뷰 작성 제한 필요
    // DB 연결 필요: 최근 작성 시간 확인

    // 🔴 보안 취약점 5: 권한 검증 부족
    // 실제 구매자만 리뷰 작성 가능하도록 제한 필요
    // DB 연결 필요: SELECT * FROM orders WHERE user_id = ? AND product_id = ?

    const review: Review = {
      id: Date.now().toString(), // 🔴 취약점: 예측 가능한 ID
      userId: currentUser.id,
      username: currentUser.username,
      rating: newRating,
      comment: newReview,
      createdAt: new Date().toISOString().split('T')[0],
    };

    setReviews([review, ...reviews]);
    setNewReview('');
    setNewRating(5);
  };

  const handleDeleteReview = (reviewId: string) => {
    // 🔴 보안 취약점 6: 권한 검증 부족
    // 다른 사용자의 리뷰도 삭제 가능
    // DB 연결 필요: DELETE FROM reviews WHERE id = ? AND user_id = ?
    // 서버에서 작성자 본인인지 확인 필요
    
    setReviews(reviews.filter(r => r.id !== reviewId));
  };

  const handleLike = () => {
    // 🔴 보안 취약점 7: 중복 좋아요 방지 부재
    // DB 연결 필요: 
    // CREATE TABLE product_likes (user_id UUID, product_id UUID, PRIMARY KEY(user_id, product_id))
    // INSERT INTO product_likes (user_id, product_id) VALUES (?, ?)
    // ON CONFLICT DO NOTHING
    
    setIsLiked(!isLiked);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Button
        variant="ghost"
        onClick={onBack}
        className="mb-4"
      >
        <ArrowLeft className="size-4 mr-2" />
        뒤로가기
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
        {/* 상품 이미지 */}
        <div className="aspect-square bg-gray-200 rounded-lg overflow-hidden">
          <ImageWithFallback
            src="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&h=800&fit=crop&q=80"
            alt={mockProduct.title}
            className="w-full h-full object-cover"
          />
        </div>

        {/* 상품 정보 */}
        <div>
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h1 className="mb-2">{mockProduct.title}</h1>
              <div className="flex items-center gap-2 mb-4">
                <div className="flex items-center gap-1">
                  <Star className="size-5 fill-yellow-400 text-yellow-400" />
                  <span>{mockProduct.rating}</span>
                </div>
                <span className="text-gray-500">({mockProduct.reviewCount}개 리뷰)</span>
              </div>
              <p className="text-blue-600 text-3xl mb-4">
                {mockProduct.price.toLocaleString()}원
              </p>
            </div>
            
            {/* 신고 버튼 */}
            {currentUser && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowReportDialog(true)}
                title="신고하기"
              >
                <Flag className="size-5 text-gray-400 hover:text-red-600" />
              </Button>
            )}
          </div>

          <Card className="mb-4">
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">판매자</span>
                  <span>{mockProduct.sellerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">카테고리</span>
                  <span>{mockProduct.category}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="mb-6">
            <h3 className="mb-2">상품 설명</h3>
            <p className="text-gray-600 whitespace-pre-wrap">
              {mockProduct.description}
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="lg"
                onClick={handleLike}
                className="flex-shrink-0"
              >
                <Heart className={`size-5 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="flex-1"
                onClick={() => onAddToCart(productId)}
              >
                <ShoppingCart className="size-5 mr-2" />
                장바구니
              </Button>
              <Button
                size="lg"
                className="flex-1"
              >
                <MessageCircle className="size-5 mr-2" />
                채팅하기
              </Button>
            </div>
            
            {/* 가격 제안 버튼 */}
            {currentUser && (
              <Button
                variant="outline"
                size="lg"
                className="w-full"
                onClick={() => setShowPriceSuggestion(true)}
              >
                <DollarSign className="size-5 mr-2" />
                가격 제안하기
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* 리뷰 섹션 */}
      <div className="border-t pt-8">
        <h2 className="mb-6">상품 리뷰 ({reviews.length})</h2>

        {/* 리뷰 작성 폼 */}
        {currentUser && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <form onSubmit={handleSubmitReview} className="space-y-4">
                <div>
                  <label className="block text-sm mb-2">별점</label>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setNewRating(star)}
                        className="focus:outline-none"
                      >
                        <Star
                          className={`size-6 ${
                            star <= newRating
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-gray-300'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label htmlFor="review" className="block text-sm mb-2">
                    리뷰 작성
                  </label>
                  {/* 🔴 보안 취약점 8: 입력값 길이 제한 없음
                      DB 연결 필요: VARCHAR(1000) 등으로 길이 제한 */}
                  <Textarea
                    id="review"
                    placeholder="상품에 대한 리뷰를 작성해주세요..."
                    value={newReview}
                    onChange={(e) => setNewReview(e.target.value)}
                    rows={4}
                    required
                  />
                </div>
                <Button type="submit">리뷰 등록</Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* 리뷰 목록 */}
        <div className="space-y-4">
          {reviews.map((review) => (
            <Card key={review.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium">{review.username}</p>
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`size-4 ${
                            i < review.rating
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">{review.createdAt}</span>
                    {currentUser && currentUser.id === review.userId && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteReview(review.id)}
                      >
                        삭제
                      </Button>
                    )}
                  </div>
                </div>
                {/* 🔴 보안 취약점 9: XSS 위험
                    사용자가 입력한 리뷰 내용이 그대로 표시됨
                    React는 기본적으로 방어하지만 dangerouslySetInnerHTML 사용 시 주의 */}
                <p className="text-gray-600">{review.comment}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {reviews.length === 0 && !currentUser && (
          <div className="text-center py-8 text-gray-500">
            첫 번째 리뷰를 작성해보세요!
          </div>
        )}
      </div>

      {/* 가격 제안 다이얼로그 */}
      <PriceSuggestion
        productId={productId}
        productTitle={mockProduct.title}
        originalPrice={mockProduct.price}
        currentUser={currentUser}
        isOpen={showPriceSuggestion}
        onClose={() => setShowPriceSuggestion(false)}
        onSuccess={() => {
          // 🔴 보안 취약점: 클라이언트에서만 처리
          // DB 연결 필요: 알림 생성 등
        }}
      />

      {/* 신고 다이얼로그 */}
      <ReportDialog
        reportType="product"
        reportedId={productId}
        reportedName={mockProduct.title}
        currentUser={currentUser}
        isOpen={showReportDialog}
        onClose={() => setShowReportDialog(false)}
      />
    </div>
  );
}