import { useState } from 'react';
import { User } from '../App';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { AlertTriangle } from 'lucide-react';

type ReportDialogProps = {
  reportType: 'user' | 'product' | 'review';
  reportedId: string;
  reportedName: string;
  currentUser: User | null;
  isOpen: boolean;
  onClose: () => void;
};

export function ReportDialog({
  reportType,
  reportedId,
  reportedName,
  currentUser,
  isOpen,
  onClose,
}: ReportDialogProps) {
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');

  const reportReasons = {
    user: [
      { value: 'fraud', label: '사기 의심' },
      { value: 'harassment', label: '욕설/비방' },
      { value: 'spam', label: '스팸/광고' },
      { value: 'fake_profile', label: '허위 프로필' },
      { value: 'other', label: '기타' },
    ],
    product: [
      { value: 'fake', label: '가품/위조품' },
      { value: 'illegal', label: '불법 상품' },
      { value: 'misleading', label: '허위/과장 광고' },
      { value: 'inappropriate', label: '부적절한 내용' },
      { value: 'duplicate', label: '중복 게시물' },
      { value: 'other', label: '기타' },
    ],
    review: [
      { value: 'fake', label: '허위 리뷰' },
      { value: 'spam', label: '스팸' },
      { value: 'inappropriate', label: '부적절한 내용' },
      { value: 'offensive', label: '욕설/비방' },
      { value: 'other', label: '기타' },
    ],
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentUser) {
      alert('로그인이 필요합니다.');
      return;
    }

    if (!reason) {
      alert('신고 사유를 선택해주세요.');
      return;
    }

    // 🔴 보안 취약점 1: 신고 남용 방지 부족
    // 동일 항목에 대해 무한정 신고 가능
    // DB 연결 필요: 
    // SELECT COUNT(*) FROM reports 
    // WHERE reporter_id = ? AND reported_${reportType}_id = ? AND created_at > DATE_SUB(NOW(), INTERVAL 1 DAY)
    // 하루에 동일 항목 최대 1회 신고 제한

    // 🔴 보안 취약점 2: XSS (Cross-Site Scripting)
    // 신고 내용에 스크립트 삽입 가능
    // 서버에서 HTML 태그 이스케이프 처리 필요

    // 🔴 보안 취약점 3: SQL Injection
    // DB 연결 필요: Prepared Statement 사용
    // INSERT INTO reports (reporter_id, reported_${reportType}_id, reason, description, status)
    // VALUES (?, ?, ?, ?, 'pending')

    // 🔴 보안 취약점 4: CSRF (Cross-Site Request Forgery)
    // 신고 시 CSRF 토큰 필요

    // 🔴 보안 취약점 5: 자기 자신 신고 방지
    // 서버에서 reporter_id != reported_user_id 확인 필요

    // 🔴 보안 취약점 6: Rate Limiting 부재
    // 짧은 시간에 대량 신고 방지 필요
    // 예: IP당 시간당 최대 10회 신고

    console.log('신고:', {
      reportType,
      reporterId: currentUser.id,
      reportedId,
      reason,
      description,
    });

    alert('신고가 접수되었습니다. 검토 후 조치하겠습니다.');
    setReason('');
    setDescription('');
    onClose();
  };

  const getReportTypeText = () => {
    switch (reportType) {
      case 'user':
        return '사용자';
      case 'product':
        return '상품';
      case 'review':
        return '리뷰';
      default:
        return '';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="size-5 text-red-600" />
            {getReportTypeText()} 신고하기
          </DialogTitle>
          <DialogDescription>
            신고하려는 {getReportTypeText()}: <strong>{reportedName}</strong>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 신고 사유 선택 */}
          <div className="space-y-3">
            <Label>신고 사유 *</Label>
            <RadioGroup value={reason} onValueChange={setReason}>
              {reportReasons[reportType].map((r) => (
                <div key={r.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={r.value} id={r.value} />
                  <Label htmlFor={r.value} className="cursor-pointer font-normal">
                    {r.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* 상세 설명 */}
          <div className="space-y-2">
            <Label htmlFor="description">상세 내용 (선택)</Label>
            {/* 🔴 보안 취약점 7: 입력값 길이 제한 없음
                DB 연결 필요: TEXT 타입 사용 시 최대 길이 검증 */}
            <Textarea
              id="description"
              placeholder="신고 사유에 대한 상세한 설명을 입력해주세요"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              maxLength={1000}
            />
            <p className="text-xs text-gray-500">
              {description.length} / 1000
            </p>
          </div>

          {/* 안내 문구 */}
          <div className="bg-yellow-50 p-3 rounded-lg">
            <p className="text-sm text-yellow-900">
              ⚠️ 허위 신고는 서비스 이용에 제한이 있을 수 있습니다.
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
              variant="destructive"
              className="flex-1"
              disabled={!reason}
            >
              신고하기
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
