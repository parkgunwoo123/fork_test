import { useState } from 'react';
import { User } from '../App';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import { ArrowLeft, Search, MessageSquare, CheckCircle2 } from 'lucide-react';

type CustomerServiceProps = {
  currentUser: User | null;
  onBack: () => void;
};

type Inquiry = {
  id: string;
  title: string;
  content: string;
  status: 'pending' | 'answered';
  createdAt: string;
  answer?: string;
};

// 🔴 보안 취약점: 하드코딩된 FAQ 및 문의 데이터
// DB 연결 필요: SELECT * FROM faqs WHERE is_active = true ORDER BY display_order
const mockFAQs = [
  {
    id: '1',
    question: '환불은 어떻게 하나요?',
    answer: '구매 후 7일 이내에 환불 요청이 가능합니다. 단, 상품이 훼손되지 않은 상태여야 합니다.',
  },
  {
    id: '2',
    question: '직거래는 어떻게 진행하나요?',
    answer: '판매자와 채팅을 통해 직거래 장소와 시간을 협의하실 수 있습니다.',
  },
  {
    id: '3',
    question: '안전결제란 무엇인가요?',
    answer: '중고마켓이 거래 대금을 보관하고 있다가 구매자가 상품 수령 확인 후 판매자에게 전달하는 서비스입니다.',
  },
  {
    id: '4',
    question: '상품이 설명과 다를 경우 어떻게 하나요?',
    answer: '고객센터에 신고하시면 조사 후 적절한 조치를 취해드립니다.',
  },
];

export function CustomerService({ currentUser, onBack }: CustomerServiceProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [inquiries, setInquiries] = useState<Inquiry[]>([
    {
      id: '1',
      title: '배송 문의',
      content: '배송이 언제 되나요?',
      status: 'answered',
      createdAt: '2024-01-15',
      answer: '배송은 영업일 기준 2-3일 소요됩니다.',
    },
  ]);
  const [inquiryTitle, setInquiryTitle] = useState('');
  const [inquiryContent, setInquiryContent] = useState('');
  const [inquiryEmail, setInquiryEmail] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // 🔴 보안 취약점 1: SQL Injection 위험
  // 검색어를 직접 쿼리에 사용하면 위험
  // DB 연결 필요: SELECT * FROM faqs WHERE question LIKE ? OR answer LIKE ?
  // Prepared Statement 사용 필요
  const filteredFAQs = mockFAQs.filter(
    (faq) =>
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmitInquiry = (e: React.FormEvent) => {
    e.preventDefault();

    // 🔴 보안 취약점 2: 이메일 검증 부족
    // 유효한 이메일 형식인지 확인 필요
    // 정규식: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!inquiryEmail || !inquiryTitle || !inquiryContent) {
      alert('모든 항목을 입력해주세요.');
      return;
    }

    // 🔴 보안 취약점 3: XSS (Cross-Site Scripting)
    // 사용자 입력을 그대로 저장/표시하면 스크립트 삽입 가능
    // DB 연결 필요: INSERT INTO inquiries (user_id, title, content, email, status, created_at) 
    //               VALUES (?, ?, ?, ?, 'pending', NOW())
    // 서버에서 HTML 태그 이스케이프 처리 필요

    // 🔴 보안 취약점 4: SQL Injection
    // 잘못된 예: "INSERT INTO inquiries VALUES ('" + inquiryTitle + "')"
    // Prepared Statement 사용 필요

    // 🔴 보안 취약점 5: CSRF (Cross-Site Request Forgery)
    // 문의 등록 시 CSRF 토큰 필요

    // 🔴 보안 취약점 6: Rate Limiting 부재
    // 스팸 문의 방지를 위한 제한 필요
    // 예: IP당 시간당 최대 5개 문의

    // 🔴 보안 취약점 7: 개인정보 노출
    // 이메일 주소 등 개인정보는 암호화하여 저장 권장
    // 또는 로그인한 사용자의 경우 user_id만 저장

    const newInquiry: Inquiry = {
      id: Date.now().toString(), // 🔴 취약점: 예측 가능한 ID
      title: inquiryTitle,
      content: inquiryContent,
      status: 'pending',
      createdAt: new Date().toISOString().split('T')[0],
    };

    setInquiries([newInquiry, ...inquiries]);
    setInquiryTitle('');
    setInquiryContent('');
    setInquiryEmail('');
    setSubmitSuccess(true);
    setTimeout(() => setSubmitSuccess(false), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Button variant="ghost" onClick={onBack} className="mb-4">
        <ArrowLeft className="size-4 mr-2" />
        뒤로가기
      </Button>

      <h1 className="mb-6">고객센터</h1>

      <Tabs defaultValue="faq" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="faq">자주 묻는 질문</TabsTrigger>
          <TabsTrigger value="inquiry">1:1 문의</TabsTrigger>
        </TabsList>

        {/* FAQ 탭 */}
        <TabsContent value="faq" className="space-y-4">
          {/* 검색 */}
          <Card>
            <CardContent className="pt-6">
              <div className="relative">
                {/* 🔴 보안 취약점 8: XSS 위험
                    검색어를 그대로 표시하면 스크립트 삽입 가능 */}
                <Input
                  type="text"
                  placeholder="궁금한 내용을 검색해보세요..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 size-5 text-gray-400" />
              </div>
            </CardContent>
          </Card>

          {/* FAQ 목록 */}
          {/* 🔴 보안 취약점 9: IDOR (Insecure Direct Object Reference)
              FAQ ID가 예측 가능하여 비공개 FAQ도 접근 가능
              DB 연결 필요: 공개 여부 확인 */}
          <Card>
            <CardContent className="pt-6">
              <Accordion type="single" collapsible className="w-full">
                {filteredFAQs.map((faq, index) => (
                  <AccordionItem key={faq.id} value={`item-${index}`}>
                    <AccordionTrigger className="text-left">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-gray-600">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>

              {filteredFAQs.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  검색 결과가 없습니다.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 1:1 문의 탭 */}
        <TabsContent value="inquiry" className="space-y-4">
          {/* 문의 작성 폼 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="size-5" />
                문의하기
              </CardTitle>
            </CardHeader>
            <CardContent>
              {submitSuccess && (
                <div className="mb-4 bg-green-50 text-green-600 p-4 rounded-lg flex items-center gap-2">
                  <CheckCircle2 className="size-5" />
                  <span>문의가 성공적으로 등록되었습니다!</span>
                </div>
              )}

              <form onSubmit={handleSubmitInquiry} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">이메일 *</Label>
                  {/* 🔴 보안 취약점 10: 이메일 형식 검증 부족
                      클라이언트와 서버 양쪽에서 검증 필요 */}
                  <Input
                    id="email"
                    type="email"
                    placeholder="example@email.com"
                    value={inquiryEmail}
                    onChange={(e) => setInquiryEmail(e.target.value)}
                    required
                  />
                  <p className="text-sm text-gray-500">
                    답변 받으실 이메일 주소를 입력해주세요
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="title">제목 *</Label>
                  {/* 🔴 보안 취약점 11: 입력값 길이 제한 없음
                      DB 연결 필요: VARCHAR(200) 등으로 길이 제한 */}
                  <Input
                    id="title"
                    type="text"
                    placeholder="문의 제목을 입력하세요"
                    value={inquiryTitle}
                    onChange={(e) => setInquiryTitle(e.target.value)}
                    required
                    maxLength={100}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="content">문의 내용 *</Label>
                  <Textarea
                    id="content"
                    placeholder="문의 내용을 자세히 입력해주세요"
                    value={inquiryContent}
                    onChange={(e) => setInquiryContent(e.target.value)}
                    rows={6}
                    required
                    maxLength={1000}
                  />
                  <p className="text-sm text-gray-500">
                    {inquiryContent.length} / 1000
                  </p>
                </div>

                {/* 🔴 보안 취약점 12: CAPTCHA 부재
                    봇에 의한 스팸 문의 방지를 위해 CAPTCHA 권장 */}

                <Button type="submit" className="w-full">
                  문의 등록
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* 내 문의 내역 */}
          {currentUser && inquiries.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>내 문의 내역</CardTitle>
              </CardHeader>
              <CardContent>
                {/* 🔴 보안 취약점 13: IDOR (Insecure Direct Object Reference)
                    다른 사용자의 문의도 조회 가능
                    DB 연결 필요: SELECT * FROM inquiries WHERE user_id = ? ORDER BY created_at DESC */}
                <div className="space-y-4">
                  {inquiries.map((inquiry) => (
                    <div key={inquiry.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h3>{inquiry.title}</h3>
                        <span
                          className={`text-sm px-2 py-1 rounded ${
                            inquiry.status === 'answered'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}
                        >
                          {inquiry.status === 'answered' ? '답변완료' : '대기중'}
                        </span>
                      </div>
                      <p className="text-gray-600 text-sm mb-2">
                        {inquiry.content}
                      </p>
                      <p className="text-xs text-gray-500">{inquiry.createdAt}</p>

                      {inquiry.answer && (
                        <div className="mt-4 bg-blue-50 p-3 rounded-lg">
                          <p className="text-sm font-medium text-blue-900 mb-1">
                            답변
                          </p>
                          <p className="text-sm text-blue-800">{inquiry.answer}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
