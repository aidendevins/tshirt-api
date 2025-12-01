import { Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing.jsx';
import Creator from './pages/Creator.jsx';
import UserLogin from './pages/UserLogin.jsx';
import ProductDesignerPage from './pages/ProductDesigner.jsx';
import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';
import CreatorProfile from './pages/CreatorProfile.jsx';
import ProductDetail from './pages/ProductDetail.jsx';

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <Routes>
        {/* Routes without Header/Footer (Dashboard has its own layout) */}
        <Route path="/creator/*" element={<Creator />} />
        <Route path="/creator/design" element={<ProductDesignerPage />} />

        {/* Routes with Header/Footer */}
        <Route path="/*" element={
          <>
            <Header />
            <main className="flex-1">
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/login" element={<UserLogin />} />
                <Route path="/:username" element={<CreatorProfile />} />
                <Route path="/:username/:handle" element={<ProductDetail />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
            <Footer />
          </>
        } />
      </Routes>
    </div>
  );
}
