import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import CreatorLogin from '../components/CreatorLogin.jsx';
import CreatorDashboard from '../components/CreatorDashboard.jsx';
import { getCreatorSession, isCreatorAuthenticated, logoutCreator } from '../firebase/auth';
import { clearCreatorSession } from '../utils/session';
import { fetchCreatorProducts, formatProductData } from '../services/creatorProducts';
import Sidebar from '../components/Sidebar';

// Placeholder components for other sections
function OrdersPage() {
  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center">
      <div className="glass-card p-12 text-center">
        <h1 className="text-3xl font-bold text-white mb-4">Orders</h1>
        <p className="text-white/60">Orders management coming soon...</p>
      </div>
    </div>
  );
}

// Full Products Page with Grid Layout
function ProductsPage({ user }) {
  const navigate = useNavigate();
  const [creatorProducts, setCreatorProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadProducts = async () => {
      if (!user?.uid) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        const data = await fetchCreatorProducts(user.uid);
        
        if (data.error) {
          setError(data.error);
        } else {
          setCreatorProducts(data.creatorProducts.map(formatProductData));
        }
      } catch (err) {
        setError('Failed to load products');
        console.error('Error loading products:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadProducts();
  }, [user?.uid]);

  const handleCreateProduct = () => {
    navigate('/creator/design');
  };

  const ProductCard = ({ product }) => {
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    
    const images = product.images && Array.isArray(product.images) 
      ? product.images.map(img => typeof img === 'string' ? img : (img.src || img))
      : (product.image ? [product.image] : []);
    const currentImage = images[currentImageIndex] || product.image;
    const hasMultipleImages = images.length > 1;
    
    const nextImage = () => {
      setCurrentImageIndex((prev) => (prev + 1) % images.length);
    };
    
    const prevImage = () => {
      setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
    };
    
    return (
      <div className="glass-card p-0 overflow-hidden hover:shadow-glow-lg transition-all duration-300 hover:scale-105">
        <div className="relative aspect-square group">
          <img src={currentImage} alt={product.name} className="w-full h-full object-cover" />
          
          {hasMultipleImages && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  prevImage();
                }}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/50 hover:bg-black/70 backdrop-blur-sm rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  nextImage();
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/50 hover:bg-black/70 backdrop-blur-sm rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
              
              <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/50 backdrop-blur-sm rounded-full text-xs text-white">
                {currentImageIndex + 1} / {images.length}
              </div>
            </>
          )}
          
          <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-md ${
            product.status.toLowerCase() === 'active' 
              ? 'bg-green-500/30 border border-green-500/50 text-green-300' 
              : 'bg-yellow-500/30 border border-yellow-500/50 text-yellow-300'
          }`}>
            {product.status}
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <h3 className="text-xl font-bold text-white mb-2">{product.name}</h3>
            <p className="text-2xl font-bold text-gradient">{product.price}</p>
            <p className="text-sm text-white/60 mt-1">Created: {product.createdAt}</p>
          </div>
          {product.tags && product.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {product.tags.slice(0, 3).map(tag => (
                <span key={tag} className="px-3 py-1 bg-white/5 backdrop-blur-sm border border-white/10 rounded-full text-xs text-white/70">
                  #{tag}
                </span>
              ))}
            </div>
          )}
          <div className="flex gap-2 pt-2">
            <button className="flex-1 glass-button py-2 text-sm">Edit</button>
            <button className="flex-1 btn-danger py-2 text-sm">Delete</button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex min-h-screen gradient-bg">
      <Sidebar />
      
      <main className="ml-64 flex-1 p-8">
        <div className="glass-card p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">All Products</h1>
              <p className="text-white/60">{creatorProducts.length} product{creatorProducts.length !== 1 ? 's' : ''} total</p>
            </div>
            <button onClick={handleCreateProduct} className="btn-primary">
              + Create New Product
            </button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="glass-card p-12 text-center">
                <div className="w-16 h-16 border-4 border-purple-bright/30 border-t-purple-bright rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-white/60">Loading products...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-20">
              <div className="glass-card p-12 text-center space-y-4">
                <p className="text-red-300 text-lg">❌ {error}</p>
                <button onClick={() => window.location.reload()} className="btn-primary">
                  Try Again
                </button>
              </div>
            </div>
          ) : creatorProducts.length === 0 ? (
            <div className="text-center py-20 space-y-4">
              <div className="text-6xl mb-4">📦</div>
              <h3 className="text-2xl font-bold text-white">No products yet</h3>
              <p className="text-white/60 mb-6">Create your first product to get started!</p>
              <button onClick={handleCreateProduct} className="btn-primary">
                + Create Product
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {creatorProducts.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// Community Designs Page
function CommunityDesignsPage({ user }) {
  const navigate = useNavigate();
  const [communityProducts, setCommunityProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadProducts = async () => {
      if (!user?.uid) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        const data = await fetchCreatorProducts(user.uid);
        
        if (data.error) {
          setError(data.error);
        } else {
          setCommunityProducts(data.communityProducts.map(formatProductData));
        }
      } catch (err) {
        setError('Failed to load community designs');
        console.error('Error loading community designs:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadProducts();
  }, [user?.uid]);

  const ProductCard = ({ product }) => {
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    
    const images = product.images && Array.isArray(product.images) 
      ? product.images.map(img => typeof img === 'string' ? img : (img.src || img))
      : (product.image ? [product.image] : []);
    const currentImage = images[currentImageIndex] || product.image;
    const hasMultipleImages = images.length > 1;
    
    const nextImage = () => {
      setCurrentImageIndex((prev) => (prev + 1) % images.length);
    };
    
    const prevImage = () => {
      setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
    };
    
    return (
      <div className="glass-card p-0 overflow-hidden hover:shadow-glow-lg transition-all duration-300 hover:scale-105">
        <div className="relative aspect-square group">
          <img src={currentImage} alt={product.name} className="w-full h-full object-cover" />
          
          {hasMultipleImages && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  prevImage();
                }}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/50 hover:bg-black/70 backdrop-blur-sm rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  nextImage();
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/50 hover:bg-black/70 backdrop-blur-sm rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
              
              <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/50 backdrop-blur-sm rounded-full text-xs text-white">
                {currentImageIndex + 1} / {images.length}
              </div>
            </>
          )}
          
          <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-md ${
            product.status.toLowerCase() === 'active' 
              ? 'bg-green-500/30 border border-green-500/50 text-green-300' 
              : 'bg-yellow-500/30 border border-yellow-500/50 text-yellow-300'
          }`}>
            {product.status}
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <h3 className="text-xl font-bold text-white mb-2">{product.name}</h3>
            <p className="text-2xl font-bold text-gradient">{product.price}</p>
            <p className="text-sm text-white/60 mt-1">Created: {product.createdAt}</p>
            <p className="text-sm text-purple-bright italic mt-1">by {product.fanName || 'Community User'}</p>
          </div>
          {product.tags && product.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {product.tags.slice(0, 3).map(tag => (
                <span key={tag} className="px-3 py-1 bg-white/5 backdrop-blur-sm border border-white/10 rounded-full text-xs text-white/70">
                  #{tag}
                </span>
              ))}
            </div>
          )}
          <div className="flex gap-2 pt-2">
            <button className="flex-1 glass-button py-2 text-sm">Approve</button>
            <button className="flex-1 btn-danger py-2 text-sm">Reject</button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex min-h-screen gradient-bg">
      <Sidebar />
      
      <main className="ml-64 flex-1 p-8">
        <div className="glass-card p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">Community Designs</h1>
              <p className="text-white/60">Designs created by your fans using the AI tool</p>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="glass-card p-12 text-center">
                <div className="w-16 h-16 border-4 border-purple-bright/30 border-t-purple-bright rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-white/60">Loading community designs...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-20">
              <div className="glass-card p-12 text-center space-y-4">
                <p className="text-red-300 text-lg">❌ {error}</p>
                <button onClick={() => window.location.reload()} className="btn-primary">
                  Try Again
                </button>
              </div>
            </div>
          ) : communityProducts.length === 0 ? (
            <div className="text-center py-20 space-y-4">
              <div className="text-6xl mb-4">👥</div>
              <h3 className="text-2xl font-bold text-white">No community designs yet</h3>
              <p className="text-white/60">
                Share your AI tool with fans to start receiving community designs!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {communityProducts.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function PromotionsPage() {
  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center">
      <div className="glass-card p-12 text-center">
        <h1 className="text-3xl font-bold text-white mb-4">Promotions</h1>
        <p className="text-white/60">Promotions management coming soon...</p>
      </div>
    </div>
  );
}

function MembershipsPage() {
  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center">
      <div className="glass-card p-12 text-center">
        <h1 className="text-3xl font-bold text-white mb-4">Memberships</h1>
        <p className="text-white/60">Membership features coming soon...</p>
      </div>
    </div>
  );
}

function SiteDesignPage() {
  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center">
      <div className="glass-card p-12 text-center">
        <h1 className="text-3xl font-bold text-white mb-4">Site Design</h1>
        <p className="text-white/60">Site customization coming soon...</p>
      </div>
    </div>
  );
}

function AnalyticsPage() {
  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center">
      <div className="glass-card p-12 text-center">
        <h1 className="text-3xl font-bold text-white mb-4">Analytics</h1>
        <p className="text-white/60">Analytics dashboard coming soon...</p>
      </div>
    </div>
  );
}

function AppsPage() {
  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center">
      <div className="glass-card p-12 text-center">
        <h1 className="text-3xl font-bold text-white mb-4">Apps</h1>
        <p className="text-white/60">App marketplace coming soon...</p>
      </div>
    </div>
  );
}

function SettingsPage() {
  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center">
      <div className="glass-card p-12 text-center">
        <h1 className="text-3xl font-bold text-white mb-4">Settings</h1>
        <p className="text-white/60">Settings panel coming soon...</p>
      </div>
    </div>
  );
}

export default function Creator() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check session on component mount
  useEffect(() => {
    const checkSession = () => {
      try {
        if (isCreatorAuthenticated()) {
          const sessionData = getCreatorSession();
          if (sessionData) {
            setUser(sessionData);
            setIsAuthenticated(true);
          }
        }
      } catch (error) {
        console.error('Error checking session:', error);
        clearCreatorSession();
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();
  }, []);

  // Handle successful authentication
  const handleAuthSuccess = (userData) => {
    setUser(userData);
    setIsAuthenticated(true);
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await logoutCreator();
      setUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Logout error:', error);
      // Force logout even if Firebase fails
      clearCreatorSession();
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  // Show loading spinner while checking session
  if (isLoading) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <div className="glass-card p-12 text-center">
          <div className="w-16 h-16 border-4 border-purple-bright/30 border-t-purple-bright rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white/60">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <CreatorLogin onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <Routes>
      <Route index element={<CreatorDashboard user={user} onLogout={handleLogout} />} />
      <Route path="orders" element={<OrdersPage />} />
      <Route path="products" element={<ProductsPage user={user} />} />
      <Route path="community-designs" element={<CommunityDesignsPage user={user} />} />
      <Route path="promotions" element={<PromotionsPage />} />
      <Route path="memberships" element={<MembershipsPage />} />
      <Route path="site-design" element={<SiteDesignPage />} />
      <Route path="analytics" element={<AnalyticsPage />} />
      <Route path="apps" element={<AppsPage />} />
      <Route path="settings" element={<SettingsPage />} />
      <Route path="*" element={<Navigate to="/creator" replace />} />
    </Routes>
  );
}
