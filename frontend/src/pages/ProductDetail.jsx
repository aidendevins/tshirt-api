import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getProductByHandle } from '../services/shopify';
import { getCreatorByUsername } from '../services/creator';

export default function ProductDetail() {
    const { handle, username } = useParams();
    const [product, setProduct] = useState(null);
    const [creator, setCreator] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [selectedVariant, setSelectedVariant] = useState(null);

    useEffect(() => {
        const loadData = async () => {
            if (!handle || !username) return;

            setIsLoading(true);
            setError(null);

            try {
                // Fetch product and creator in parallel
                const [productData, creatorData] = await Promise.all([
                    getProductByHandle(handle),
                    getCreatorByUsername(username)
                ]);

                setProduct(productData);
                setCreator(creatorData);

                if (productData.variants && productData.variants.length > 0) {
                    setSelectedVariant(productData.variants[0]);
                }
            } catch (err) {
                console.error('Error loading data:', err);
                setError('Failed to load product details');
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, [handle, username]);

    if (isLoading) {
        return (
            <div className="min-h-screen gradient-bg flex items-center justify-center">
                <div className="w-16 h-16 border-4 border-purple-bright/30 border-t-purple-bright rounded-full animate-spin"></div>
            </div>
        );
    }

    if (error || !product) {
        return (
            <div className="min-h-screen gradient-bg flex items-center justify-center">
                <div className="glass-card p-12 text-center">
                    <h1 className="text-3xl font-bold text-white mb-4">404</h1>
                    <p className="text-white/60">{error || 'Product not found'}</p>
                    <Link to="/" className="btn-primary mt-6 inline-block">Go Home</Link>
                </div>
            </div>
        );
    }

    const nextImage = () => {
        setCurrentImageIndex((prev) => (prev + 1) % product.images.length);
    };

    const prevImage = () => {
        setCurrentImageIndex((prev) => (prev - 1 + product.images.length) % product.images.length);
    };

    return (
        <div className="min-h-screen gradient-bg pt-40 pb-20 px-4">
            <div className="max-w-7xl mx-auto">
                <Link
                    to={`/${username}`}
                    className="inline-flex items-center gap-2 text-white/60 hover:text-white mb-8 transition-colors group"
                >
                    <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Back to {creator?.businessName || 'Store'}
                </Link>

                <div className="grid lg:grid-cols-2 gap-12">
                    {/* Image Carousel */}
                    <div className="space-y-4">
                        <div className="glass-card p-0 overflow-hidden relative aspect-square group">
                            <AnimatePresence>
                                <motion.img
                                    key={currentImageIndex}
                                    src={product.images[currentImageIndex]?.src}
                                    alt={product.images[currentImageIndex]?.alt || product.title}
                                    className="w-full h-full object-cover absolute inset-0"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                />
                            </AnimatePresence>

                            {product.images.length > 1 && (
                                <>
                                    <button
                                        onClick={prevImage}
                                        className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 hover:bg-black/70 backdrop-blur-sm rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                        </svg>
                                    </button>
                                    <button
                                        onClick={nextImage}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 hover:bg-black/70 backdrop-blur-sm rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </button>
                                </>
                            )}
                        </div>

                        {/* Thumbnails */}
                        {product.images.length > 1 && (
                            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin">
                                {product.images.map((img, index) => (
                                    <button
                                        key={img.id}
                                        onClick={() => setCurrentImageIndex(index)}
                                        className={`relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden border-2 transition-colors ${currentImageIndex === index ? 'border-purple-bright' : 'border-transparent hover:border-white/20'
                                            }`}
                                    >
                                        <img src={img.src} alt={img.alt} className="w-full h-full object-cover" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Product Info */}
                    <div className="space-y-8">
                        <div>
                            <h1 className="text-4xl font-bold text-white mb-2">{product.title}</h1>
                            <div className="flex items-center gap-4 text-lg">
                                <span className="text-purple-bright font-bold text-2xl">
                                    ${selectedVariant?.price || '0.00'}
                                </span>
                                {creator && (
                                    <span className="text-white/60">
                                        by <Link to={`/${username}`} className="text-white hover:text-purple-bright transition-colors border-b border-white/20 hover:border-purple-bright">
                                            {creator.businessName}
                                        </Link>
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Options / Variants */}
                        {product.options.map(option => (
                            <div key={option.id} className="space-y-3">
                                <h3 className="text-sm font-medium text-white/80 uppercase tracking-wider">{option.name}</h3>
                                <div className="flex flex-wrap gap-3">
                                    {option.values.map(value => (
                                        <button
                                            key={value}
                                            className="px-4 py-2 rounded-full border border-white/10 hover:border-purple-bright/50 hover:bg-purple-bright/10 transition-all text-white/80"
                                        >
                                            {value}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}

                        {/* Add to Cart */}
                        <div className="pt-4">
                            <button className="w-full btn-primary py-4 text-lg font-semibold shadow-lg shadow-purple-bright/20">
                                Add to Cart
                            </button>
                            <p className="text-center text-white/40 text-sm mt-4">
                                Free shipping on orders over $50
                            </p>
                        </div>

                        {/* Description */}
                        <div className="border-t border-white/10 pt-8">
                            <h3 className="text-xl font-bold text-white mb-4">Description</h3>
                            <div
                                className="prose prose-invert max-w-none text-white/70"
                                dangerouslySetInnerHTML={{ __html: product.descriptionHtml }}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
