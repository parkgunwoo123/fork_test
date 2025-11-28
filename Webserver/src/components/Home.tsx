import { useState } from 'react';
import { Product } from '../App';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Search, Star, ShoppingCart } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';

type HomeProps = {
  onProductClick: (productId: string) => void;
  onAddToCart: (productId: string) => void;
  onSellerClick?: (sellerId: string) => void;
};

// 🔴 보안 취약점: 하드코딩된 목 데이터 (실제로는 DB에서 조회)
// DB 연결 필요: SELECT * FROM products WHERE status = 'active' ORDER BY created_at DESC
const mockProducts: Product[] = [
  {
    id: '1',
    title: '아이폰 14 Pro 256GB',
    price: 950000,
    description: '거의 새것 같은 상태입니다. 케이스랑 같이 드려요',
    image: 'smartphone device',
    sellerId: 'seller1',
    sellerName: '김철수',
    category: '전자기기',
    rating: 4.8,
    reviewCount: 24,
  },
  {
    id: '2',
    title: '맥북 프로 M2',
    price: 1800000,
    description: '2023년 구매, 사용감 거의 없음',
    image: 'laptop computer',
    sellerId: 'seller2',
    sellerName: '이영희',
    category: '전자기기',
    rating: 5.0,
    reviewCount: 15,
  },
  {
    id: '3',
    title: '나이키 에어맥스 270',
    price: 85000,
    description: '250mm, 몇 번 신지 않았어요',
    image: 'nike shoes',
    sellerId: 'seller3',
    sellerName: '박민수',
    category: '패션',
    rating: 4.5,
    reviewCount: 8,
  },
  {
    id: '4',
    title: '이케아 책상',
    price: 50000,
    description: '직거래 가능합니다',
    image: 'desk furniture',
    sellerId: 'seller4',
    sellerName: '최지혜',
    category: '가구',
    rating: 4.2,
    reviewCount: 5,
  },
  {
    id: '5',
    title: '캐논 EOS R6',
    price: 2200000,
    description: '샷수 1만회 미만, 풀박스',
    image: 'camera professional',
    sellerId: 'seller5',
    sellerName: '정우성',
    category: '전자기기',
    rating: 4.9,
    reviewCount: 12,
  },
  {
    id: '6',
    title: '플레이스테이션 5',
    price: 550000,
    description: '디스크 에디션, 게임 3개 포함',
    image: 'gaming console',
    sellerId: 'seller1',
    sellerName: '김철수',
    category: '전자기기',
    rating: 4.7,
    reviewCount: 18,
  },
];

export function Home({ onProductClick, onAddToCart, onSellerClick }: HomeProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('전체');

  const categories = ['전체', '전자기기', '패션', '가구', '도서', '생활용품'];

  // 🔴 보안 취약점: SQL Injection 위험
  // 클라이언트에서 검색어를 직접 처리하면, 서버에서는 파라미터화된 쿼리를 사용해야 함
  // 나쁜 예: SELECT * FROM products WHERE title LIKE '%' + searchQuery + '%'
  // 좋은 예: Prepared Statement 사용
  // DB 연결 필요: SELECT * FROM products WHERE title LIKE ? OR description LIKE ?
  const filteredProducts = mockProducts.filter(product => {
    const matchesSearch = product.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         product.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === '전체' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* 검색 바 */}
      <div className="mb-8">
        <div className="relative max-w-2xl mx-auto">
          {/* 🔴 보안 취약점: XSS (Cross-Site Scripting) 위험
              사용자 입력을 적절히 sanitize하지 않으면 스크립트 삽입 가능
              예: <script>alert('XSS')</script> 같은 입력
              DB 연결 시: 서버에서 입력 검증 및 이스케이프 처리 필요 */}
          <Input
            type="text"
            placeholder="상품을 검색해보세요..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 size-5 text-gray-400" />
        </div>
      </div>

      {/* 카테고리 필터 */}
      <div className="mb-8 flex flex-wrap gap-2 justify-center">
        {categories.map((category) => (
          <Button
            key={category}
            variant={selectedCategory === category ? 'default' : 'outline'}
            onClick={() => setSelectedCategory(category)}
            className="rounded-full"
          >
            {category}
          </Button>
        ))}
      </div>

      {/* 상품 목록 */}
      {/* 🔴 보안 취약점: IDOR (Insecure Direct Object Reference)
          상품 ID가 예측 가능한 숫자로 되어 있어 권한 없이 접근 가능
          DB 연결 필요: 상품 조회 시 권한 확인 및 UUID 사용 권장 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredProducts.map((product) => (
          <div
            key={product.id}
            className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
          >
            <div onClick={() => onProductClick(product.id)}>
              <div className="aspect-square bg-gray-200 relative">
                <ImageWithFallback
                  src={`https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop&q=80`}
                  alt={product.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-4">
                <h3 className="mb-2 truncate">{product.title}</h3>
                <p className="text-gray-600 text-sm mb-2 line-clamp-2">
                  {product.description}
                </p>
                <div className="flex items-center gap-1 mb-2">
                  <Star className="size-4 fill-yellow-400 text-yellow-400" />
                  <span className="text-sm">{product.rating}</span>
                  <span className="text-sm text-gray-500">({product.reviewCount})</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-blue-600">
                    {product.price.toLocaleString()}원
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onSellerClick) {
                        onSellerClick(product.sellerId);
                      }
                    }}
                    className="text-sm text-gray-500 hover:text-gray-700 hover:underline"
                  >
                    {product.sellerName}
                  </button>
                </div>
              </div>
            </div>
            <div className="px-4 pb-4">
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  onAddToCart(product.id);
                }}
                className="w-full"
                size="sm"
              >
                <ShoppingCart className="size-4 mr-2" />
                장바구니
              </Button>
            </div>
          </div>
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center py-16">
          <p className="text-gray-500">검색 결과가 없습니다.</p>
        </div>
      )}
    </div>
  );
}