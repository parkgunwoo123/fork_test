import { ShoppingCart, MessageCircle, User, Menu, Home, PlusCircle, HelpCircle, Bell } from 'lucide-react';
import { User as UserType } from '../App';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { useState } from 'react';

type HeaderProps = {
  currentUser: UserType | null;
  cartItemCount: number;
  onNavigate: (page: string) => void;
  onLogout: () => void;
  onNotificationClick: () => void;
};

export function Header({ currentUser, cartItemCount, onNavigate, onLogout, onNotificationClick }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const unreadNotifications = 2; // 🔴 취약점: 하드코딩된 알림 수 (DB 연결 필요)

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* 로고 */}
          <div className="flex items-center">
            <button 
              onClick={() => onNavigate('home')}
              className="flex items-center space-x-2"
            >
              <ShoppingCart className="size-8 text-blue-600" />
              <span className="text-xl">중고마켓</span>
            </button>
          </div>

          {/* 데스크톱 네비게이션 */}
          <nav className="hidden md:flex items-center space-x-4">
            <Button 
              variant="ghost" 
              onClick={() => onNavigate('home')}
              className="flex items-center gap-2"
            >
              <Home className="size-4" />
              홈
            </Button>
            
            {currentUser && (
              <>
                <Button 
                  variant="ghost" 
                  onClick={() => onNavigate('add-product')}
                  className="flex items-center gap-2"
                >
                  <PlusCircle className="size-4" />
                  판매하기
                </Button>

                <Button 
                  variant="ghost" 
                  onClick={() => onNavigate('chat')}
                  className="flex items-center gap-2"
                >
                  <MessageCircle className="size-4" />
                  채팅
                </Button>

                <Button
                  variant="ghost"
                  onClick={onNotificationClick}
                  className="flex items-center gap-2 relative"
                >
                  <Bell className="size-4" />
                  알림
                  {unreadNotifications > 0 && (
                    <Badge variant="destructive" className="absolute -top-1 -right-1 size-5 flex items-center justify-center p-0 text-xs">
                      {unreadNotifications}
                    </Badge>
                  )}
                </Button>
              </>
            )}

            <Button 
              variant="ghost" 
              onClick={() => onNavigate('customer-service')}
              className="flex items-center gap-2"
            >
              <HelpCircle className="size-4" />
              고객센터
            </Button>

            <Button 
              variant="ghost" 
              onClick={() => onNavigate('cart')}
              className="flex items-center gap-2 relative"
            >
              <ShoppingCart className="size-4" />
              장바구니
              {cartItemCount > 0 && (
                <Badge variant="destructive" className="absolute -top-1 -right-1 size-5 flex items-center justify-center p-0 text-xs">
                  {cartItemCount}
                </Badge>
              )}
            </Button>

            {currentUser ? (
              <>
                <Button 
                  variant="ghost" 
                  onClick={() => onNavigate('mypage')}
                  className="flex items-center gap-2"
                >
                  <User className="size-4" />
                  {currentUser.username}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={onLogout}
                >
                  로그아웃
                </Button>
              </>
            ) : (
              <Button 
                onClick={() => onNavigate('login')}
              >
                로그인
              </Button>
            )}
          </nav>

          {/* 모바일 메뉴 버튼 */}
          <button 
            className="md:hidden p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <Menu className="size-6" />
          </button>
        </div>

        {/* 모바일 네비게이션 */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t">
            <div className="flex flex-col space-y-2">
              <Button 
                variant="ghost" 
                onClick={() => {
                  onNavigate('home');
                  setMobileMenuOpen(false);
                }}
                className="justify-start"
              >
                <Home className="size-4 mr-2" />
                홈
              </Button>
              
              {currentUser && (
                <>
                  <Button 
                    variant="ghost" 
                    onClick={() => {
                      onNavigate('add-product');
                      setMobileMenuOpen(false);
                    }}
                    className="justify-start"
                  >
                    <PlusCircle className="size-4 mr-2" />
                    판매하기
                  </Button>

                  <Button 
                    variant="ghost" 
                    onClick={() => {
                      onNavigate('chat');
                      setMobileMenuOpen(false);
                    }}
                    className="justify-start"
                  >
                    <MessageCircle className="size-4 mr-2" />
                    채팅
                  </Button>

                  <Button
                    variant="ghost"
                    onClick={() => {
                      onNotificationClick();
                      setMobileMenuOpen(false);
                    }}
                    className="justify-start relative"
                  >
                    <Bell className="size-4 mr-2" />
                    알림
                    {unreadNotifications > 0 && (
                      <Badge variant="destructive" className="ml-2 size-5 flex items-center justify-center p-0 text-xs">
                        {unreadNotifications}
                      </Badge>
                    )}
                  </Button>
                </>
              )}

              <Button 
                variant="ghost" 
                onClick={() => {
                  onNavigate('customer-service');
                  setMobileMenuOpen(false);
                }}
                className="justify-start"
              >
                <HelpCircle className="size-4 mr-2" />
                고객센터
              </Button>

              <Button 
                variant="ghost" 
                onClick={() => {
                  onNavigate('cart');
                  setMobileMenuOpen(false);
                }}
                className="justify-start relative"
              >
                <ShoppingCart className="size-4 mr-2" />
                장바구니
                {cartItemCount > 0 && (
                  <Badge variant="destructive" className="ml-2 size-5 flex items-center justify-center p-0 text-xs">
                    {cartItemCount}
                  </Badge>
                )}
              </Button>

              {currentUser ? (
                <>
                  <Button 
                    variant="ghost" 
                    onClick={() => {
                      onNavigate('mypage');
                      setMobileMenuOpen(false);
                    }}
                    className="justify-start"
                  >
                    <User className="size-4 mr-2" />
                    {currentUser.username}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      onLogout();
                      setMobileMenuOpen(false);
                    }}
                    className="justify-start"
                  >
                    로그아웃
                  </Button>
                </>
              ) : (
                <Button 
                  onClick={() => {
                    onNavigate('login');
                    setMobileMenuOpen(false);
                  }}
                  className="justify-start"
                >
                  로그인
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}