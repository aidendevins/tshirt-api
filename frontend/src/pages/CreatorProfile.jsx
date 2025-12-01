import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getCreatorByUsername } from '../services/creator';
import { fetchCreatorProducts, formatProductData } from '../services/creatorProducts';
import ProfileHeader from '../components/Creator/ProfileHeader';
import ProductTabs from '../components/Creator/ProductTabs';

export default function CreatorProfile() {
    const { username } = useParams();
    const [creator, setCreator] = useState(null);
    const [products, setProducts] = useState({ featured: [], all: [], community: [] });
    const [activeTab, setActiveTab] = useState('all');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const loadData = async () => {
            if (!username) return;

            setIsLoading(true);
            setError(null);

            console.log('Loading profile for username:', username);

            try {
                // 1. Fetch Creator Data
                const creatorData = await getCreatorByUsername(username);

                if (!creatorData) {
                    setError('Creator not found');
                    return;
                }

                setCreator(creatorData);

                // 2. Fetch Products
                const productsData = await fetchCreatorProducts(creatorData.uid);

                if (productsData.error) {
                    console.warn('Error fetching products:', productsData.error);
                    // Don't block the page, just show empty products
                } else {
                    const formattedCreatorProducts = (productsData.creatorProducts || []).map(formatProductData);
                    const formattedCommunityProducts = (productsData.communityProducts || []).map(formatProductData);

                    setProducts({
                        featured: formattedCreatorProducts.slice(0, 4), // Mock featured as first 4
                        all: formattedCreatorProducts,
                        community: formattedCommunityProducts
                    });
                }

            } catch (err) {
                console.error('Error loading profile:', err);
                if (err.code === 'permission-denied') {
                    setError('Missing permissions. Please update Firestore Security Rules to allow public read access to "creators" collection.');
                } else {
                    setError('Failed to load profile');
                }
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, [username]);

    if (isLoading) {
        return (
            <div className="min-h-screen gradient-bg flex items-center justify-center">
                <div className="w-16 h-16 border-4 border-purple-bright/30 border-t-purple-bright rounded-full animate-spin"></div>
            </div>
        );
    }

    if (error || !creator) {
        return (
            <div className="min-h-screen gradient-bg flex items-center justify-center">
                <div className="glass-card p-12 text-center">
                    <h1 className="text-3xl font-bold text-white mb-4">404</h1>
                    <p className="text-white/60">{error || 'Creator not found'}</p>
                </div>
            </div>
        );
    }

    const getActiveProducts = () => {
        switch (activeTab) {
            case 'featured': return products.featured;
            case 'community': return products.community;
            default: return products.all;
        }
    };

    const currentProducts = getActiveProducts();

    return (
        <div className="min-h-screen gradient-bg pb-20">
            <ProfileHeader creator={creator} />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <ProductTabs
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                    counts={{
                        featured: products.featured.length,
                        all: products.all.length,
                        community: products.community.length
                    }}
                />

                {/* Product Grid */}
                {currentProducts.length === 0 ? (
                    <div className="text-center py-20">
                        <p className="text-white/40 text-lg">No products found in this section.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {currentProducts.map((product) => (
                            <Link key={product.id} to={`/${username}/${product.handle}`} className="block">
                                <div className="glass-card p-0 overflow-hidden hover:shadow-glow-lg transition-all duration-300 hover:scale-105 group cursor-pointer h-full">
                                    <div className="relative aspect-square">
                                        <img
                                            src={product.image}
                                            alt={product.name}
                                            className="w-full h-full object-cover"
                                        />
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                                    </div>
                                    <div className="p-4">
                                        <h3 className="text-lg font-bold text-white mb-1 truncate">{product.name}</h3>
                                        <p className="text-purple-bright font-semibold">{product.price}</p>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
