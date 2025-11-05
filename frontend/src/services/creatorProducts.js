// Service to fetch creator's products from Shopify collections
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export const fetchCreatorProducts = async (creatorId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/shopify/creator-products/${creatorId}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch products: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching creator products:', error);
    return {
      creatorProducts: [],
      communityProducts: [],
      error: error.message
    };
  }
};

// Format product data for display
export const formatProductData = (product) => {
  return {
    id: product.id,
    name: product.title,
    price: `$${parseFloat(product.price).toFixed(2)}`,
    status: product.status === 'active' ? 'Active' : 'Draft',
    image: product.image,
    handle: product.handle,
    createdAt: new Date(product.createdAt).toLocaleDateString(),
    vendor: product.vendor,
    productType: product.productType,
    tags: product.tags ? product.tags.split(',').map(tag => tag.trim()) : [],
    // For community products
    fanName: product.fanName || 'Unknown Fan'
  };
};
