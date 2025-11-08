import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import ProductDesigner from '../components/ProductDesigner';
import { isCreatorAuthenticated } from '../utils/session';

export default function ProductDesignerPage() {
  const navigate = useNavigate();
  const [savedDesign, setSavedDesign] = useState(null);
  
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
    console.log('Product launched successfully:', result);
    setSavedDesign(result);
    
    // Redirect to dashboard after 3 seconds
    setTimeout(() => {
      navigate('/creator');
    }, 3000);
  };
  
  return (
    <div className="min-h-screen gradient-bg">
      {savedDesign ? (
        <div className="flex items-center justify-center min-h-screen px-4">
          <div className="glass-card rounded-2xl p-8 md:p-12 max-w-2xl w-full text-center animate-fade-in-up">
            {/* Success Icon */}
            <div className="mb-6">
              <div className="w-20 h-20 mx-auto bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-glow">
                <svg 
                  className="w-10 h-10 text-white" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={3} 
                    d="M5 13l4 4L19 7" 
                  />
                </svg>
              </div>
            </div>

            {/* Success Message */}
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              🎉 Product Launched!
            </h2>
            <p className="text-xl text-white/80 mb-2">
              Your design is now live and ready for customers!
            </p>
            {savedDesign.product?.title && (
              <p className="text-lg text-white/60 mb-8">
                "{savedDesign.product.title}"
              </p>
            )}

            {/* Product Links */}
            <div className="space-y-3 mb-8">
              {savedDesign.product?.url && (
                <a
                  href={savedDesign.product.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all hover:shadow-glow"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  View on Store
                </a>
              )}
              {savedDesign.product?.adminUrl && (
                <a
                  href={savedDesign.product.adminUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all hover:shadow-glow ml-3"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Manage in Shopify
                </a>
              )}
            </div>

            {/* Redirect Message */}
            <div className="flex items-center justify-center gap-2 text-white/60">
              <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <p className="text-sm">Redirecting to dashboard...</p>
            </div>
          </div>
        </div>
      ) : (
        <ProductDesigner
          onSave={handleSaveSuccess}
          onCancel={() => navigate('/creator')}
        />
      )}
    </div>
  );
}
