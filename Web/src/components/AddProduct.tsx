import { useState } from 'react';
import { User } from '../App';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Upload, X } from 'lucide-react';

type AddProductProps = {
  currentUser: User;
  onSuccess: () => void;
  onCancel: () => void;
};

export function AddProduct({ currentUser, onSuccess, onCancel }: AddProductProps) {
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [images, setImages] = useState<File[]>([]);

  const categories = ['전자기기', '패션', '가구', '도서', '생활용품', '기타'];

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    // 🔴 보안 취약점 1: 파일 업로드 검증 부족
    // 파일 타입, 크기, 확장자 검증 필요
    // 악성 파일 업로드 방지 필요
    // DB 연결 필요: INSERT INTO product_images (product_id, image_url) VALUES (?, ?)
    
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      
      // 🔴 보안 취약점 2: 파일 크기 제한 없음
      // 대용량 파일 업로드로 서버 자원 고갈 가능
      // 올바른 예: 파일당 5MB 제한
      const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
      const oversizedFiles = newFiles.filter(file => file.size > MAX_FILE_SIZE);
      
      if (oversizedFiles.length > 0) {
        alert('파일 크기는 5MB를 초과할 수 없습니다.');
        return;
      }

      // 🔴 보안 취약점 3: 파일 확장자 검증 부족
      // 이미지 파일만 허용해야 함
      // 올바른 예: MIME 타입 확인
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      const invalidFiles = newFiles.filter(file => !allowedTypes.includes(file.type));
      
      if (invalidFiles.length > 0) {
        alert('이미지 파일만 업로드 가능합니다 (JPG, PNG, GIF, WEBP)');
        return;
      }

      // 🔴 보안 취약점 4: 파일명 검증 부족
      // 경로 순회 공격 (Path Traversal) 방지 필요
      // 올바른 예: 파일명을 UUID로 변경하여 저장
      
      setImages([...images, ...newFiles]);
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // 🔴 보안 취약점 5: 클라이언트 측 검증만 수행
    // 서버 측에서도 반드시 검증 필요
    if (!title || !price || !category || !description) {
      alert('모든 필수 항목을 입력해주세요.');
      return;
    }

    // 🔴 보안 취약점 6: 가격 검증 부족
    // 음수 가격, 비정상적으로 큰 가격 방지 필요
    const priceNum = parseInt(price);
    if (isNaN(priceNum) || priceNum < 0) {
      alert('올바른 가격을 입력해주세요.');
      return;
    }

    // 🔴 보안 취약점 7: SQL Injection
    // DB 연결 필요: Prepared Statement 사용
    // 잘못된 예: "INSERT INTO products VALUES ('" + title + "', " + price + ")"
    // 올바른 예: INSERT INTO products (title, price, category, description, seller_id, status) 
    //            VALUES (?, ?, ?, ?, ?, 'active')

    // 🔴 보안 취약점 8: XSS (Cross-Site Scripting)
    // 사용자 입력을 sanitize하지 않으면 스크립트 삽입 가능
    // 서버에서 HTML 태그 이스케이프 처리 필요

    // 🔴 보안 취약점 9: 권한 검증 부족
    // 로그인한 사용자의 ID와 seller_id 일치 확인 필요
    // DB 연결 필요: 서버 세션에서 user_id 확인

    // 🔴 보안 취약점 10: CSRF (Cross-Site Request Forgery)
    // 상품 등록 요청에 CSRF 토큰 필요

    // 🔴 보안 취약점 11: Rate Limiting 부재
    // 단시간에 대량의 상품 등록 방지 필요
    // DB 연결 필요: 사용자별 등록 횟수 제한

    // Mock 상품 등록
    // DB 연결 필요: POST /api/products
    // 실제 파일 업로드는 multipart/form-data로 전송
    // 이미지는 S3 또는 CDN에 저장하고 URL만 DB에 저장

    console.log('상품 등록:', {
      title,
      price: priceNum,
      category,
      description,
      sellerId: currentUser.id,
      images: images.map(img => img.name),
    });

    alert('상품이 등록되었습니다!');
    onSuccess();
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Card>
        <CardHeader>
          <CardTitle>상품 등록</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 이미지 업로드 */}
            <div className="space-y-2">
              <Label>상품 이미지</Label>
              <div className="border-2 border-dashed rounded-lg p-6 text-center">
                <input
                  type="file"
                  id="image-upload"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                />
                {/* 🔴 보안 취약점 12: 업로드된 파일 미리보기 시 XSS 위험
                    올바른 예: URL.createObjectURL 사용 (React는 안전) */}
                <label
                  htmlFor="image-upload"
                  className="cursor-pointer inline-flex flex-col items-center"
                >
                  <Upload className="size-12 text-gray-400 mb-2" />
                  <span className="text-sm text-gray-600">
                    이미지를 업로드하세요 (최대 5MB)
                  </span>
                </label>
              </div>

              {/* 업로드된 이미지 미리보기 */}
              {images.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
                  {images.map((image, index) => (
                    <div key={index} className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden">
                      <img
                        src={URL.createObjectURL(image)}
                        alt={`Upload ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(index)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 상품명 */}
            <div className="space-y-2">
              <Label htmlFor="title">상품명 *</Label>
              {/* 🔴 보안 취약점 13: 입력값 길이 제한 없음
                  DB 연결 필요: VARCHAR(200) 등으로 길이 제한 */}
              <Input
                id="title"
                type="text"
                placeholder="상품명을 입력하세요"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                maxLength={100}
              />
            </div>

            {/* 가격 */}
            <div className="space-y-2">
              <Label htmlFor="price">가격 (원) *</Label>
              {/* 🔴 보안 취약점 14: 클라이언트에서 type="number" 사용 시 우회 가능
                  서버에서 반드시 숫자 타입 검증 필요 */}
              <Input
                id="price"
                type="number"
                placeholder="가격을 입력하세요"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
                min="0"
              />
            </div>

            {/* 카테고리 */}
            <div className="space-y-2">
              <Label htmlFor="category">카테고리 *</Label>
              <Select value={category} onValueChange={setCategory} required>
                <SelectTrigger>
                  <SelectValue placeholder="카테고리를 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 상품 설명 */}
            <div className="space-y-2">
              <Label htmlFor="description">상품 설명 *</Label>
              {/* 🔴 보안 취약점 15: 입력값 길이 제한 없음
                  서버에서 최대 길이 검증 필요 */}
              <Textarea
                id="description"
                placeholder="상품에 대한 자세한 설명을 입력하세요"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={6}
                required
                maxLength={2000}
              />
              <p className="text-sm text-gray-500">
                {description.length} / 2000
              </p>
            </div>

            {/* 버튼 */}
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
                취소
              </Button>
              <Button type="submit" className="flex-1">
                등록하기
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
