import { useState } from 'react';
import { User, Product } from '../App';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Badge } from './ui/badge';
import { ArrowLeft, Star, ShoppingBag, UserPlus, UserMinus, MapPin, Calendar } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';

type SellerProfileProps = {
  sellerId: string;
  currentUser: User | null;
  onBack: () => void;
  onProductClick: (productId: string) => void;
};

type SellerInfo = {
  id: string;
  username: string;
  profileImage?: string;
  bio: string;
  rating: number;
  totalSales: number;
  followerCount: number;
  location: string;
  joinedAt: string;
};

type SellerReview = {
  id: string;
  buyerName: string;
  rating: number;
  comment: string;
  createdAt: string;
};

// 🔴 보안 취약점: 하드코딩된 판매자 정보
// DB 연결 필요: SELECT * FROM users WHERE id = ? AND is_deleted = FALSE
const mockSeller: SellerInfo = {
  id: 'seller1',
  username: '김철수',
  bio: '안전하고 빠른 거래를 약속합니다. 직거래 환영합니다!',
  rating: 4.8,
  totalSales: 156,
  followerCount: 342,
  location: '서울 강남구',
  joinedAt: '2023년 1월',
};

// 🔴 보안 취약점: 하드코딩된 판매자 상품
// DB 연결 필요: SELECT * FROM products WHERE seller_id = ? AND status = 'active' ORDER BY created_at DESC
const mockSellerProducts: Product[] = [
  {
    id: '1',
    title: '아이폰 14 Pro 256GB',
    price: 950000,
    description: '거의 새것',
    image: 'smartphone',
    sellerId: 'seller1',
    sellerName: '김철수',
    category: '전자기기',
    rating: 4.8,
    reviewCount: 24,
  },
  {
    id: '6',
    title: '플레이스테이션 5',
    price: 550000,
    description: '디스크 에디션',
    image: 'gaming console',
    sellerId: 'seller1',
    sellerName: '김철수',
    category: '전자기기',
    rating: 4.7,
    reviewCount: 18,
  },
];

// 🔴 보안 취약점: 하드코딩된 판매자 리뷰
// DB 연결 필요:
// SELECT r.*, u.username as buyer_name FROM reviews r
// JOIN order_items oi ON r.order_id = oi.order_id
// JOIN users u ON r.user_id = u.id
// WHERE oi.seller_id = ?
// ORDER BY r.created_at DESC
const mockSellerReviews: SellerReview[] = [
  {
    id: '1',
    buyerName: '이영희',
    rating: 5,
    comment: '빠른 배송과 친절한 응대 감사합니다!',
    createdAt: '2024-01-15',
  },
  {
    id: '2',
    buyerName: '박민수',
    rating: 4,
    comment: '상품 상태 좋아요',
    createdAt: '2024-01-10',
  },
];

export function SellerProfile({ sellerId, currentUser, onBack, onProductClick }: SellerProfileProps) {
  const [seller] = useState<SellerInfo>(mockSeller);
  const [products] = useState<Product[]>(mockSellerProducts);
  const [reviews] = useState<SellerReview[]>(mockSellerReviews);
  const [isFollowing, setIsFollowing] = useState(false);

  // 🔴 보안 취약점: IDOR (Insecure Direct Object Reference)
  // sellerId가 예측 가능하여 권한 없이 프로필 접근 가능
  // DB 연결 필요: 프로필 조회 시 공개 설정 확인

  const handleFollow = () => {
    if (!currentUser) {
      alert('로그인이 필요합니다.');
      return;
    }

    // 🔴 보안 취약점: 권한 검증 부족
    // DB 연결 필요:
    // if (isFollowing) {
    //   DELETE FROM seller_follows WHERE follower_id = ? AND following_id = ?
    // } else {
    //   INSERT INTO seller_follows (follower_id, following_id) VALUES (?, ?)
    // }

    // 🔴 보안 취약점: Race Condition
    // 동시에 여러 번 팔로우 버튼 클릭 시 중복 팔로우 가능
    // UNIQUE 제약 조건으로 방지 필요

    setIsFollowing(!isFollowing);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Button variant="ghost" onClick={onBack} className="mb-4">
        <ArrowLeft className="size-4 mr-2" />
        뒤로가기
      </Button>

      {/* 판매자 정보 */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-6">
            {/* 프로필 이미지 */}
            <div className="flex flex-col items-center md:items-start">
              <Avatar className="size-24 mb-4">
                <AvatarFallback className="text-2xl">
                  {seller.username.charAt(0)}
                </AvatarFallback>
              </Avatar>
              
              {currentUser && currentUser.id !== seller.id && (
                <Button
                  onClick={handleFollow}
                  variant={isFollowing ? 'outline' : 'default'}
                  className="w-full"
                >
                  {isFollowing ? (
                    <>
                      <UserMinus className="size-4 mr-2" />
                      팔로잉
                    </>
                  ) : (
                    <>
                      <UserPlus className="size-4 mr-2" />
                      팔로우
                    </>
                  )}
                </Button>
              )}
            </div>

            {/* 판매자 상세 정보 */}
            <div className="flex-1">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="mb-2">{seller.username}</h1>
                  {/* 🔴 보안 취약점: XSS 위험
                      판매자 자기소개에 스크립트 삽입 가능 */}
                  <p className="text-gray-600 mb-2">{seller.bio}</p>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <MapPin className="size-4" />
                      {seller.location}
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="size-4" />
                      {seller.joinedAt} 가입
                    </div>
                  </div>
                </div>
              </div>

              {/* 통계 */}
              <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Star className="size-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-2xl">{seller.rating}</span>
                  </div>
                  <p className="text-sm text-gray-600">평점</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <ShoppingBag className="size-4" />
                    <span className="text-2xl">{seller.totalSales}</span>
                  </div>
                  <p className="text-sm text-gray-600">판매 건수</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <UserPlus className="size-4" />
                    <span className="text-2xl">{seller.followerCount}</span>
                  </div>
                  <p className="text-sm text-gray-600">팔로워</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 탭 메뉴 */}
      <Tabs defaultValue="products" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="products">
            판매 상품 ({products.length})
          </TabsTrigger>
          <TabsTrigger value="reviews">
            판매자 후기 ({reviews.length})
          </TabsTrigger>
        </TabsList>

        {/* 판매 상품 탭 */}
        <TabsContent value="products">
          {/* 🔴 보안 취약점: IDOR
              다른 판매자의 비공개 상품도 조회 가능할 수 있음
              DB 연결 필요: 공개 상품만 조회 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
            {products.map((product) => (
              <Card
                key={product.id}
                className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => onProductClick(product.id)}
              >
                <div className="aspect-square bg-gray-200 relative">
                  <ImageWithFallback
                    src="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop&q=80"
                    alt={product.title}
                    className="w-full h-full object-cover"
                  />
                  {product.reviewCount > 0 && (
                    <Badge className="absolute top-2 right-2">
                      <Star className="size-3 mr-1 fill-current" />
                      {product.rating}
                    </Badge>
                  )}
                </div>
                <CardContent className="p-4">
                  <h3 className="mb-2 line-clamp-1">{product.title}</h3>
                  <p className="text-gray-600 text-sm mb-2 line-clamp-2">
                    {product.description}
                  </p>
                  <p className="text-blue-600">
                    {product.price.toLocaleString()}원
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {products.length === 0 && (
            <div className="text-center py-16 text-gray-500">
              등록된 상품이 없습니다.
            </div>
          )}
        </TabsContent>

        {/* 판매자 후기 탭 */}
        <TabsContent value="reviews">
          <div className="space-y-4 mt-6">
            {/* 🔴 보안 취약점: 리뷰 조작 가능
                판매자가 자신의 계정으로 자신에게 좋은 리뷰 작성 가능
                DB 연결 필요: 실제 구매 이력 확인 */}
            {reviews.map((review) => (
              <Card key={review.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-medium">{review.buyerName}</p>
                      <div className="flex items-center gap-1 mt-1">
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
                    <span className="text-sm text-gray-500">{review.createdAt}</span>
                  </div>
                  {/* 🔴 보안 취약점: XSS 위험
                      리뷰 내용에 스크립트 삽입 가능 */}
                  <p className="text-gray-600">{review.comment}</p>
                </CardContent>
              </Card>
            ))}

            {reviews.length === 0 && (
              <div className="text-center py-16 text-gray-500">
                아직 후기가 없습니다.
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
