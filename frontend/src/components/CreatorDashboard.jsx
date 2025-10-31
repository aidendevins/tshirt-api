import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchCreatorProducts, formatProductData } from '../services/creatorProducts';

export default function CreatorDashboard({ user }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('creator'); // 'creator' or 'community'
  const [creatorProducts, setCreatorProducts] = useState([]);
  const [communityProducts, setCommunityProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch creator's products on component mount
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
          setCommunityProducts(data.communityProducts.map(formatProductData));
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

  const ProductCard = ({ product, isCommunity = false }) => (
    <div className="product-card">
      <div className="product-image">
        <img src={product.image} alt={product.name} />
        <div className={`product-status ${product.status.toLowerCase()}`}>
          {product.status}
        </div>
      </div>
      <div className="product-info">
        <h3>{product.name}</h3>
        <p className="product-price">{product.price}</p>
        <p className="product-created">Created: {product.createdAt}</p>
        {isCommunity && (
          <p className="fan-credit">by {product.fanName}</p>
        )}
        {product.tags && product.tags.length > 0 && (
          <div className="product-tags">
            {product.tags.slice(0, 3).map(tag => (
              <span key={tag} className="tag">#{tag}</span>
            ))}
          </div>
        )}
      </div>
      <div className="product-actions">
        <button className="btn-secondary">Edit</button>
        <button className="btn-danger">Delete</button>
      </div>
    </div>
  );

  const currentProducts = activeTab === 'creator' ? creatorProducts : communityProducts;

  return (
    <div className="creator-dashboard">
      <div className="dashboard-header">
        <div className="header-content">
          <div className="welcome-section">
            <h1>Welcome back, {user?.firstName || 'Creator'}!</h1>
            <p>Manage your products and community designs</p>
          </div>
          <div className="header-actions">
            <button onClick={handleCreateProduct} className="btn-primary">
              + Create New Product
            </button>
          </div>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="dashboard-tabs">
          <button 
            className={`tab-button ${activeTab === 'creator' ? 'active' : ''}`}
            onClick={() => setActiveTab('creator')}
          >
            Your Designs ({creatorProducts.length})
          </button>
          <button 
            className={`tab-button ${activeTab === 'community' ? 'active' : ''}`}
            onClick={() => setActiveTab('community')}
          >
            Community Designs ({communityProducts.length})
          </button>
        </div>

        <div className="products-section">
          <div className="section-header">
            <h2>
              {activeTab === 'creator' ? 'Your Product Designs' : 'Community Designs'}
            </h2>
            <p>
              {activeTab === 'creator' 
                ? 'Products you\'ve designed and submitted' 
                : 'Designs created by your fans using the AI tool'
              }
            </p>
          </div>

          {isLoading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Loading your products...</p>
            </div>
          ) : error ? (
            <div className="error-state">
              <p>❌ {error}</p>
              <button onClick={() => window.location.reload()} className="btn-primary">
                Try Again
              </button>
            </div>
          ) : (
            <div className="products-grid">
              {currentProducts.length > 0 ? (
                currentProducts.map(product => (
                  <ProductCard key={product.id} product={product} isCommunity={activeTab === 'community'} />
                ))
              ) : (
                <div className="empty-state">
                  <h3>No products yet</h3>
                  <p>
                    {activeTab === 'creator' 
                      ? 'Create your first product design to get started!' 
                      : 'Share your AI tool with fans to start receiving community designs!'
                    }
                  </p>
                  {activeTab === 'creator' && (
                    <button onClick={handleCreateProduct} className="btn-primary">
                      Create Your First Product
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}