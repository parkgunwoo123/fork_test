import { useState } from 'react';
import { User } from '../App';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent } from './ui/card';
import { ArrowLeft, Send } from 'lucide-react';
import { Avatar, AvatarFallback } from './ui/avatar';

type ChatProps = {
  currentUser: User;
  onBack: () => void;
};

type ChatRoom = {
  id: string;
  otherUser: {
    id: string;
    name: string;
  };
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
};

type Message = {
  id: string;
  senderId: string;
  text: string;
  timestamp: string;
};

// 🔴 보안 취약점: 하드코딩된 채팅방 데이터
// DB 연결 필요: 
// SELECT cr.*, u.username, m.content as last_message, m.created_at as last_message_time
// FROM chat_rooms cr
// JOIN users u ON (cr.user1_id = u.id OR cr.user2_id = u.id) AND u.id != ?
// LEFT JOIN messages m ON m.id = (SELECT id FROM messages WHERE chat_room_id = cr.id ORDER BY created_at DESC LIMIT 1)
// WHERE cr.user1_id = ? OR cr.user2_id = ?
const mockChatRooms: ChatRoom[] = [
  {
    id: '1',
    otherUser: { id: 'seller1', name: '김철수' },
    lastMessage: '네, 직거래 가능합니다!',
    lastMessageTime: '10분 전',
    unreadCount: 2,
  },
  {
    id: '2',
    otherUser: { id: 'seller2', name: '이영희' },
    lastMessage: '상품 상태 정말 좋아요',
    lastMessageTime: '1시간 전',
    unreadCount: 0,
  },
];

export function Chat({ currentUser, onBack }: ChatProps) {
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      senderId: 'seller1',
      text: '안녕하세요! 무엇을 도와드릴까요?',
      timestamp: '14:20',
    },
    {
      id: '2',
      senderId: currentUser.id,
      text: '직거래 가능한가요?',
      timestamp: '14:25',
    },
    {
      id: '3',
      senderId: 'seller1',
      text: '네, 직거래 가능합니다!',
      timestamp: '14:30',
    },
  ]);
  const [newMessage, setNewMessage] = useState('');

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();

    if (!newMessage.trim()) return;

    // 🔴 보안 취약점 1: XSS (Cross-Site Scripting)
    // 사용자 입력을 그대로 표시하면 스크립트 삽입 가능
    // 예: <script>alert('XSS')</script>
    // <img src=x onerror=alert('XSS')>
    // DB 연결 필요: INSERT INTO messages (chat_room_id, sender_id, content, created_at) VALUES (?, ?, ?, NOW())
    // 서버에서 HTML 태그 이스케이프 처리 필요

    // 🔴 보안 취약점 2: SQL Injection
    // 잘못된 예: "INSERT INTO messages VALUES ('" + newMessage + "')"
    // Prepared Statement 사용 필요

    // 🔴 보안 취약점 3: CSRF (Cross-Site Request Forgery)
    // 메시지 전송 시 CSRF 토큰 필요

    // 🔴 보안 취약점 4: 메시지 길이 제한 없음
    // 과도하게 긴 메시지 방지 필요
    // DB 연결 필요: VARCHAR(1000) 등으로 길이 제한

    // 🔴 보안 취약점 5: Rate Limiting 부재
    // 메시지 스팸 방지를 위한 전송 속도 제한 필요
    // 예: 1초에 최대 5개 메시지

    // 🔴 보안 취약점 6: 권한 검증 부족
    // 채팅방 참여자가 아닌 사용자도 메시지 전송 가능
    // DB 연결 필요: 
    // SELECT COUNT(*) FROM chat_rooms WHERE id = ? AND (user1_id = ? OR user2_id = ?)

    const message: Message = {
      id: Date.now().toString(), // 🔴 취약점: 예측 가능한 ID
      senderId: currentUser.id,
      text: newMessage,
      timestamp: new Date().toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    setMessages([...messages, message]);
    setNewMessage('');

    // 🔴 보안 취약점 7: 실시간 통신 보안
    // WebSocket 사용 시 인증 토큰 검증 필요
    // wss:// (보안 WebSocket) 사용 권장
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Button variant="ghost" onClick={onBack} className="mb-4">
        <ArrowLeft className="size-4 mr-2" />
        뒤로가기
      </Button>

      <h1 className="mb-6">채팅</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[600px]">
        {/* 채팅방 목록 */}
        <Card className="md:col-span-1 overflow-hidden">
          <CardContent className="p-0 h-full overflow-y-auto">
            {/* 🔴 보안 취약점 8: IDOR (Insecure Direct Object Reference)
                다른 사용자의 채팅방도 접근 가능
                DB 연결 필요: 채팅방 조회 시 참여자 확인 */}
            {mockChatRooms.map((room) => (
              <button
                key={room.id}
                onClick={() => setSelectedRoom(room.id)}
                className={`w-full p-4 border-b hover:bg-gray-50 text-left ${
                  selectedRoom === room.id ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <Avatar>
                    <AvatarFallback>
                      {room.otherUser.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <p className="font-medium">{room.otherUser.name}</p>
                      <span className="text-xs text-gray-500">
                        {room.lastMessageTime}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 truncate">
                      {room.lastMessage}
                    </p>
                  </div>
                  {room.unreadCount > 0 && (
                    <div className="bg-red-500 text-white text-xs rounded-full size-5 flex items-center justify-center flex-shrink-0">
                      {room.unreadCount}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        {/* 채팅 메시지 */}
        <Card className="md:col-span-2 flex flex-col overflow-hidden">
          {selectedRoom ? (
            <>
              {/* 채팅 헤더 */}
              <div className="p-4 border-b">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback>
                      {mockChatRooms[0].otherUser.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">
                      {mockChatRooms[0].otherUser.name}
                    </p>
                    <p className="text-sm text-gray-500">온라인</p>
                  </div>
                </div>
              </div>

              {/* 메시지 목록 */}
              {/* 🔴 보안 취약점 9: 메시지 내용 암호화 부재
                  민감한 대화 내용은 종단간 암호화(E2EE) 권장
                  DB 연결 필요: 메시지를 암호화하여 저장 */}
              <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((message) => {
                  const isOwn = message.senderId === currentUser.id;
                  return (
                    <div
                      key={message.id}
                      className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-lg px-4 py-2 ${
                          isOwn
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        {/* 🔴 보안 취약점 10: XSS 위험
                            사용자 메시지를 그대로 렌더링
                            React는 기본적으로 방어하지만 dangerouslySetInnerHTML 사용 시 주의 */}
                        <p className="break-words">{message.text}</p>
                        <p
                          className={`text-xs mt-1 ${
                            isOwn ? 'text-blue-100' : 'text-gray-500'
                          }`}
                        >
                          {message.timestamp}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </CardContent>

              {/* 메시지 입력 */}
              <form
                onSubmit={handleSendMessage}
                className="p-4 border-t flex gap-2"
              >
                <Input
                  type="text"
                  placeholder="메시지를 입력하세요..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="flex-1"
                  maxLength={500}
                />
                <Button type="submit" size="icon">
                  <Send className="size-4" />
                </Button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              채팅방을 선택해주세요
            </div>
          )}
        </Card>
      </div>

      {/* 🔴 보안 취약점 11: 파일 공유 기능 보안
          채팅에서 파일 공유 시 악성 파일 업로드 방지 필요
          파일 타입, 크기 제한 및 바이러스 스캔 권장 */}
    </div>
  );
}
