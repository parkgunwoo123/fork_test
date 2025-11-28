import { useEffect, useState } from 'react';
import { Home } from './components/Home';
import { Login } from './components/Login';
import { Register } from './components/Register';
import { ProductDetail } from './components/ProductDetail';
import { AddProduct } from './components/AddProduct';
import { Cart } from './components/Cart';
import { Chat } from './components/Chat';
import { CustomerService } from './components/CustomerService';
import { MyPage } from './components/MyPage';
import { Header } from './components/Header';
import { Notifications } from './components/Notifications';
import { SellerProfile } from './components/SellerProfile';
import { apiRequest } from './components/client';

export type User = {
  id: string;
  email: string;
  username: string;
  isAdmin: boolean;
};

export type Product = {
  id: string;
  title: string;
  price: number;
  description: string;
  image: string;
  sellerId: string;
  sellerName: string;
  category: string;
  rating: number;
  reviewCount: number;
};

export type CartItem = {
  productId: string;
  quantity: number;
};

function App() {
  const [currentPage, setCurrentPage] = useState<string>('home');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [selectedSellerId, setSelectedSellerId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  // 🔴 보안 취약점: 클라이언트 측 상태 관리만으로 인증 처리
  // 실제 구현 시 서버 세션 또는 JWT 토큰으로 관리해야 함
  // DB 연결 필요: 사용자 세션 검증 API
  useEffect(() => {
    const restoreSession = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;

      try {
        const user = await apiRequest<User>('/auth/me');
        setCurrentUser(user);
      } catch (err) {
        console.error(err);
        localStorage.removeItem('token');
        setCurrentUser(null);
      }
    };

    restoreSession();
  }, []);

  const handleLogout = async () => {
    try {
      await apiRequest('/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error(err);
    } finally {
      localStorage.removeItem('token');
      setCurrentUser(null);
      setCurrentPage('home');
    }
  };
  
  const addToCart = (productId: string) => {
    // 🔴 보안 취약점: 권한 검증 없이 장바구니 추가
    // DB 연결 필요: 장바구니 추가 API (INSERT INTO cart)
    const existingItem = cartItems.find(item => item.productId === productId);
    if (existingItem) {
      setCartItems(cartItems.map(item => 
        item.productId === productId 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCartItems([...cartItems, { productId, quantity: 1 }]);
    }
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return (
          <Home 
            onProductClick={(id) => {
              setSelectedProductId(id);
              setCurrentPage('product-detail');
            }}
            onAddToCart={addToCart}
            onSellerClick={(id) => {
              setSelectedSellerId(id);
              setCurrentPage('seller-profile');
            }}
          />
        );
      case 'login':
        return (
          <Login 
            onLogin={(user) => {
              setCurrentUser(user);
              setCurrentPage('home');
            }}
            onRegisterClick={() => setCurrentPage('register')}
          />
        );
      case 'register':
        return (
          <Register 
            onRegister={(user) => {
              setCurrentUser(user);
              setCurrentPage('home');
            }}
            onLoginClick={() => setCurrentPage('login')}
          />
        );
      case 'product-detail':
        return (
          <ProductDetail 
            productId={selectedProductId || '1'}
            currentUser={currentUser}
            onAddToCart={addToCart}
            onBack={() => setCurrentPage('home')}
          />
        );
      case 'add-product':
        // 🔴 보안 취약점: 클라이언트 측 권한 확인만으로 상품 등록 제한
        // 서버 측에서 권한 검증 필요
        return currentUser ? (
          <AddProduct 
            currentUser={currentUser}
            onSuccess={() => setCurrentPage('home')}
            onCancel={() => setCurrentPage('home')}
          />
        ) : (
          <div className="flex items-center justify-center min-h-screen">
            <p>로그인이 필요합니다.</p>
          </div>
        );
      case 'cart':
        return (
          <Cart 
            cartItems={cartItems}
            currentUser={currentUser}
            onUpdateQuantity={(productId, quantity) => {
              setCartItems(cartItems.map(item =>
                item.productId === productId ? { ...item, quantity } : item
              ));
            }}
            onRemoveItem={(productId) => {
              setCartItems(cartItems.filter(item => item.productId !== productId));
            }}
            onBack={() => setCurrentPage('home')}
          />
        );
      case 'chat':
        return currentUser ? (
          <Chat 
            currentUser={currentUser}
            onBack={() => setCurrentPage('home')}
          />
        ) : (
          <div className="flex items-center justify-center min-h-screen">
            <p>로그인이 필요합니다.</p>
          </div>
        );
      case 'customer-service':
        return (
          <CustomerService 
            currentUser={currentUser}
            onBack={() => setCurrentPage('home')}
          />
        );
      case 'mypage':
        return currentUser ? (
          <MyPage 
            currentUser={currentUser}
            onUpdateUser={(updatedUser) => setCurrentUser(updatedUser)}
            onBack={() => setCurrentPage('home')}
          />
        ) : (
          <div className="flex items-center justify-center min-h-screen">
            <p>로그인이 필요합니다.</p>
          </div>
        );
      case 'seller-profile':
        return selectedSellerId ? (
          <SellerProfile
            sellerId={selectedSellerId}
            currentUser={currentUser}
            onBack={() => setCurrentPage('home')}
            onProductClick={(id) => {
              setSelectedProductId(id);
              setCurrentPage('product-detail');
            }}
          />
        ) : (
          <div className="flex items-center justify-center min-h-screen">
            <p>판매자 정보를 찾을 수 없습니다.</p>
          </div>
        );
      default:
        return <Home onProductClick={(id) => {
          setSelectedProductId(id);
          setCurrentPage('product-detail');
        }} onAddToCart={addToCart} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        currentUser={currentUser}
        cartItemCount={cartItems.length}
        onNavigate={(page) => setCurrentPage(page)}
        onLogout={handleLogout}
        onNotificationClick={() => setShowNotifications(!showNotifications)}
      />
      
      {/* 알림 패널 */}
      {showNotifications && currentUser && (
        <div className="fixed top-16 right-4 z-50 shadow-lg">
          <Notifications
            currentUser={currentUser}
            onClose={() => setShowNotifications(false)}
            onNavigate={(page) => {
              setCurrentPage(page);
              setShowNotifications(false);
            }}
          />
        </div>
      )}
      
      <main>
        {renderPage()}
      </main>
    </div>
  );
}

export default App;
