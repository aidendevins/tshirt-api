import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import ProductDesigner from '../components/ProductDesigner';
import { isCreatorAuthenticated } from '../utils/session';

export default function ProductDesignerPage() {
  const navigate = useNavigate();
  const [showSuccess, setShowSuccess] = useState(false);
  const [productUrl, setProductUrl] = useState('');
  const [productTitle, setProductTitle] = useState('');
  
  // Protect route - redirect if not authenticated
  useEffect(() => {
    if (!isCreatorAuthenticated()) {
      console.log('User not authenticated, redirecting to creator login');
      navigate('/creator', { replace: true });
    }
  }, [navigate]);
  
  // Don't render if not authenticated
  if (!isCreatorAuthenticated()) {
    return null;
  }
  
  const handleSaveSuccess = (result) => {
    console.log('Product launched:', result);
    setProductUrl(result.product?.url || '');
    setProductTitle(result.product?.title || 'Product');
    setShowSuccess(true);
    
    // Redirect to dashboard after 3 seconds
    setTimeout(() => {
      navigate('/creator');
    }, 3000);
  };
  
  return (
    <div className="product-designer-page">
      {showSuccess && (
        <div className="success-banner">
          <div className="success-content">
            <h2>🎉 Product Launched Successfully!</h2>
            <p>Your product "{productTitle}" has been added to your collection.</p>
            {productUrl && (
              <a href={productUrl} target="_blank" rel="noopener noreferrer" className="view-product-link">
                View Product on Store
              </a>
            )}
            <p className="redirect-message">Redirecting to dashboard...</p>
          </div>
        </div>
      )}
      <div className="designer-container">
        <ProductDesigner
          onSave={handleSaveSuccess}
          onCancel={() => navigate('/creator')}
        />
      </div>
    </div>
  );
}
