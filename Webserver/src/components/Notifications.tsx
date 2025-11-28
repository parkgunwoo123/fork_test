import { useState } from 'react';
import { User } from '../App';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Bell, X, Check, MessageCircle, ShoppingCart, Star, AlertCircle } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';

type NotificationsProps = {
  currentUser: User;
  onClose: () => void;
  onNavigate: (page: string, id?: string) => void;
};

type Notification = {
  id: string;
  type: 'message' | 'order' | 'review' | 'system';
  title: string;
  content: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
};

// 🔴 보안 취약점: 하드코딩된 알림 데이터
// DB 연결 필요: SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50
const mockNotifications: Notification[] = [
  {
    id: '1',
    type: 'message',
    title: '새로운 메시지',
    content: '김철수님이 메시지를 보냈습니다.',
    link: 'chat',
    isRead: false,
    createdAt: '5분 전',
  },
  {
    id: '2',
    type: 'order',
    title: '주문 배송 시작',
    content: '주문하신 상품이 배송 시작되었습니다.',
    link: 'mypage',
    isRead: false,
    createdAt: '1시간 전',
  },
  {
    id: '3',
    type: 'review',
    title: '새로운 리뷰',
    content: '판매하신 상품에 리뷰가 작성되었습니다.',
    link: 'product',
    isRead: true,
    createdAt: '2시간 전',
  },
  {
    id: '4',
    type: 'system',
    title: '시스템 공지',
    content: '서비스 점검이 예정되어 있습니다.',
    isRead: true,
    createdAt: '1일 전',
  },
];

export function Notifications({ currentUser, onClose, onNavigate }: NotificationsProps) {
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);

  const getIcon = (type: string) => {
    switch (type) {
      case 'message':
        return <MessageCircle className="size-5 text-blue-600" />;
      case 'order':
        return <ShoppingCart className="size-5 text-green-600" />;
      case 'review':
        return <Star className="size-5 text-yellow-600" />;
      case 'system':
        return <AlertCircle className="size-5 text-gray-600" />;
      default:
        return <Bell className="size-5" />;
    }
  };

  const handleMarkAsRead = (id: string) => {
    // 🔴 보안 취약점: 권한 검증 부족
    // 다른 사용자의 알림도 읽음 처리 가능
    // DB 연결 필요: UPDATE notifications SET is_read = TRUE, read_at = NOW() WHERE id = ? AND user_id = ?
    
    setNotifications(notifications.map(n =>
      n.id === id ? { ...n, isRead: true } : n
    ));
  };

  const handleMarkAllAsRead = () => {
    // 🔴 보안 취약점: 권한 검증 부족
    // DB 연결 필요: UPDATE notifications SET is_read = TRUE, read_at = NOW() WHERE user_id = ? AND is_read = FALSE
    
    setNotifications(notifications.map(n => ({ ...n, isRead: true })));
  };

  const handleDelete = (id: string) => {
    // 🔴 보안 취약점: IDOR (Insecure Direct Object Reference)
    // DB 연결 필요: DELETE FROM notifications WHERE id = ? AND user_id = ?
    
    setNotifications(notifications.filter(n => n.id !== id));
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      handleMarkAsRead(notification.id);
    }
    if (notification.link) {
      onNavigate(notification.link);
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <Card className="w-full max-w-md">
      <CardContent className="p-0">
        {/* 헤더 */}
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="size-5" />
            <h3>알림</h3>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="rounded-full">
                {unreadCount}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllAsRead}
              >
                <Check className="size-4 mr-1" />
                모두 읽음
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
            >
              <X className="size-5" />
            </Button>
          </div>
        </div>

        {/* 알림 목록 */}
        {/* 🔴 보안 취약점: XSS 위험
            알림 내용에 사용자 입력이 포함될 경우 스크립트 삽입 가능 */}
        <ScrollArea className="h-[400px]">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              알림이 없습니다.
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                    !notification.isRead ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                      {getIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-1">
                        <p className={`text-sm ${!notification.isRead ? 'font-semibold' : ''}`}>
                          {notification.title}
                        </p>
                        {!notification.isRead && (
                          <div className="size-2 bg-blue-600 rounded-full flex-shrink-0 ml-2 mt-1" />
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-1">
                        {notification.content}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">
                          {notification.createdAt}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(notification.id);
                          }}
                          className="h-6 px-2"
                        >
                          <X className="size-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
