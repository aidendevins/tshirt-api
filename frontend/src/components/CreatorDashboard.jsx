import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { fetchCreatorProducts, formatProductData } from '../services/creatorProducts';
import Sidebar from './Sidebar';
import CardSpotlight from './ui/CardSpotlight';
import Card3D from './ui/Card3D';

export default function CreatorDashboard({ user }) {
  const navigate = useNavigate();
  const [creatorProducts, setCreatorProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Sample product templates for "Create your first product" section
  const productTemplates = [
    {
      id: 1,
      name: 'Cotton Heritage Unisex Premium Hoodie',
      price: 'From $26.95',
      image: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400&h=400&fit=crop'
    },
    {
      id: 2,
      name: 'Comfort Colors Garment-Dyed Heavyweight T-Shirt',
      price: 'From $15.40',
      image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=400&fit=crop'
    },
    {
      id: 3,
      name: 'Gildan Heavyweight T-Shirt',
      price: 'From $9.50',
      image: 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=400&h=400&fit=crop'
    },
    {
      id: 4,
      name: 'Bella+Canvas Supersoft T-Shirt',
      price: 'From $11.75',
      image: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=400&h=400&fit=crop'
    },
    {
      id: 5,
      name: 'Independent Trading Co. Midweight Hoodie',
      price: 'From $31.57',
      image: 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=400&h=400&fit=crop'
    }
  ];

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

  const ProductCard = ({ product, isCommunity = false }) => {
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
      <CardSpotlight className="p-0">
        <div className="relative aspect-square group">
          <img src={currentImage} alt={product.name} className="w-full h-full object-cover rounded-t-3xl" />

          {hasMultipleImages && (
            <>
              <motion.button
                onClick={(e) => {
                  e.stopPropagation();
                  prevImage();
                }}
                className="absolute left-2 top-1/2 -mt-4 w-8 h-8 bg-black/50 hover:bg-black/70 backdrop-blur-sm rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </motion.button>

              <motion.button
                onClick={(e) => {
                  e.stopPropagation();
                  nextImage();
                }}
                className="absolute right-2 top-1/2 -mt-4 w-8 h-8 bg-black/50 hover:bg-black/70 backdrop-blur-sm rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </motion.button>

              <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/50 backdrop-blur-sm rounded-full text-xs text-white">
                {currentImageIndex + 1} / {images.length}
              </div>
            </>
          )}

          <motion.div
            className={`absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-md ${product.status.toLowerCase() === 'active'
              ? 'bg-green-500/30 border border-green-500/50 text-green-300'
              : 'bg-yellow-500/30 border border-yellow-500/50 text-yellow-300'
              }`}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            {product.status}
          </motion.div>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <h3 className="text-xl font-bold text-white mb-2">{product.name}</h3>
            <p className="text-2xl font-bold text-gradient">{product.price}</p>
            <p className="text-sm text-white/60 mt-1">Created: {product.createdAt}</p>
            {isCommunity && (
              <p className="text-sm text-purple-bright italic mt-1">by {product.fanName}</p>
            )}
          </div>
          {product.tags && product.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {product.tags.slice(0, 3).map(tag => (
                <motion.span
                  key={tag}
                  className="px-3 py-1 bg-white/5 backdrop-blur-sm border border-white/10 rounded-full text-xs text-white/70"
                  whileHover={{ scale: 1.05, backgroundColor: "rgba(255, 255, 255, 0.1)" }}
                >
                  #{tag}
                </motion.span>
              ))}
            </div>
          )}
          <div className="flex gap-2 pt-2">
            <motion.button
              className="flex-1 glass-button py-2 text-sm"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Edit
            </motion.button>
            <motion.button
              className="flex-1 btn-danger py-2 text-sm"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Delete
            </motion.button>
          </div>
        </div>
      </CardSpotlight>
    );
  };

  const hasProducts = creatorProducts.length > 0;

  return (
    <div className="flex min-h-screen gradient-bg">
      <Sidebar user={user} />

      {/* Main Content */}
      <main className="ml-64 flex-1 p-8 max-w-full overflow-x-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center min-h-screen">
            <motion.div
              className="glass-card p-12 text-center"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <motion.div
                className="w-16 h-16 border-4 border-purple-bright/30 border-t-purple-bright rounded-full mx-auto mb-4"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              />
              <p className="text-white/60">Loading your products...</p>
            </motion.div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center min-h-screen">
            <motion.div
              className="glass-card p-12 text-center space-y-4"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <p className="text-red-300 text-lg">❌ {error}</p>
              <motion.button
                onClick={() => window.location.reload()}
                className="btn-primary"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Try Again
              </motion.button>
            </motion.div>
          </div>
        ) : (
          <>
            {!hasProducts ? (
              /* Show "Create your first product" splash when no products */
              <motion.div
                className="glass-card p-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h1 className="text-3xl font-bold text-white mb-2">
                      You're just a few steps away from launch!
                    </h1>
                    <p className="text-white/60">0% complete</p>
                  </div>
                  <motion.button
                    className="text-white/60 hover:text-white text-sm flex items-center gap-2"
                    whileHover={{ scale: 1.05 }}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Skip all
                  </motion.button>
                </div>

                {/* Progress Bar */}
                <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-8">
                  <motion.div
                    className="h-full bg-gradient-to-r from-green-500 to-emerald-500"
                    initial={{ width: 0 }}
                    animate={{ width: "0%" }}
                  />
                </div>

                {/* Step 1: Create your first product */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <motion.div
                        className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white font-semibold"
                        whileHover={{ scale: 1.1, backgroundColor: "rgba(139, 92, 246, 0.3)" }}
                      >
                        1
                      </motion.div>
                      <h2 className="text-xl font-semibold text-white">Create your first product</h2>
                    </div>
                    <div className="flex gap-3">
                      <motion.button
                        className="glass-button"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        Browse all
                      </motion.button>
                      <motion.button
                        onClick={handleCreateProduct}
                        className="btn-primary"
                        whileHover={{ scale: 1.05, boxShadow: "0 0 30px rgba(139, 92, 246, 0.6)" }}
                        whileTap={{ scale: 0.95 }}
                      >
                        Create product
                      </motion.button>
                    </div>
                  </div>

                  {/* Product Templates Grid */}
                  <div className="grid grid-cols-5 gap-4 mt-6">
                    {productTemplates.map((template, idx) => (
                      <motion.div
                        key={template.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                      >
                        <Card3D className="p-0 cursor-pointer">
                          <div
                            onClick={handleCreateProduct}
                          >
                            <div className="aspect-square bg-white/5 overflow-hidden rounded-t-3xl">
                              <motion.img
                                src={template.image}
                                alt={template.name}
                                className="w-full h-full object-cover"
                                whileHover={{ scale: 1.1 }}
                                transition={{ duration: 0.3 }}
                              />
                            </div>
                            <div className="p-3">
                              <h3 className="text-sm font-medium text-white mb-1 line-clamp-2">
                                {template.name}
                              </h3>
                              <p className="text-xs text-purple-bright font-semibold">
                                {template.price}
                              </p>
                            </div>
                          </div>
                        </Card3D>
                      </motion.div>
                    ))}
                  </div>

                  {/* Step 2 */}
                  <motion.div
                    className="flex items-center gap-3 mt-8 pt-6 border-t border-white/10"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 }}
                  >
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/60 font-semibold">
                      2
                    </div>
                    <h2 className="text-lg text-white/60">Customize the look of your site</h2>
                  </motion.div>
                </div>
              </motion.div>
            ) : (
              /* Show "Your Products" carousel when products exist */
              <div className="space-y-8">
                <motion.div
                  className="glass-card p-8 max-w-full"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h1 className="text-3xl font-bold text-white mb-2">Your Products</h1>
                      <p className="text-white/60">{creatorProducts.length} product{creatorProducts.length !== 1 ? 's' : ''} designed</p>
                    </div>
                    <div className="flex gap-3">
                      <motion.button
                        onClick={() => navigate('/creator/products')}
                        className="glass-button"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        View All
                      </motion.button>
                      <motion.button
                        onClick={handleCreateProduct}
                        className="btn-primary"
                        whileHover={{ scale: 1.05, boxShadow: "0 0 30px rgba(139, 92, 246, 0.6)" }}
                        whileTap={{ scale: 0.95 }}
                      >
                        + Create New Product
                      </motion.button>
                    </div>
                  </div>

                  {/* Horizontal Scrollable Product Carousel */}
                  <div className="relative -mx-8">
                    <div className="flex gap-6 overflow-x-auto px-8 pb-4 scrollbar-thin">
                      {creatorProducts.map((product, idx) => (
                        <motion.div
                          key={product.id}
                          className="flex-shrink-0 w-80"
                          initial={{ opacity: 0, x: 50 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.1 }}
                        >
                          <ProductCard product={product} isCommunity={false} />
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
