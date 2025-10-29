import { Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing.jsx';
import Creator from './pages/Creator.jsx';
import UserLogin from './pages/UserLogin.jsx';
import ShopifyOAuthCallback from './components/ShopifyOAuthCallback.jsx';
import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';

export default function App() {
  return (
    <div className="app-container">
      <Header />
      <main className="content">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/creator" element={<Creator />} />
          <Route path="/login" element={<UserLogin />} />
          <Route path="/shopify/callback" element={<ShopifyOAuthCallback />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}


