// Shopify Admin API service - routes through backend
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// Helper function to make Shopify API requests via backend
const makeShopifyRequest = async (endpoint, method = 'GET', data = null) => {
  const url = `${API_BASE_URL}/api/shopify/${endpoint}`;
  
  const config = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (data && (method === 'POST' || method === 'PUT')) {
    config.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(url, config);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Shopify API Error: ${response.status} - ${errorData.message || response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Shopify API Request Failed:', error);
    throw error;
  }
};

// Create a custom collection for a creator (routes through backend)
export const createCreatorCollection = async (creatorData, collectionType) => {
  // This function is now handled by createCreatorCollections below
  // Kept for backwards compatibility but not recommended for direct use
  console.warn('createCreatorCollection is deprecated, use createCreatorCollections instead');
  return { success: false, error: 'Use createCreatorCollections instead' };
};

// Create both collections for a new creator via backend
export const createCreatorCollections = async (creatorData) => {
  try {
    console.log('Creating Shopify collections for creator:', creatorData.email);
    
    const response = await fetch(`${API_BASE_URL}/api/shopify/collections`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        creatorData: creatorData
      })
    });

    if (!response.ok) {
      throw new Error(`Collection creation failed: ${response.status}`);
    }

    const results = await response.json();
    
    if (results.allSuccessful) {
      console.log('Successfully created both collections:', {
        creatorId: results.creatorCollection.collectionId,
        communityId: results.communityCollection.collectionId
      });
    } else {
      console.error('Failed to create some collections:', results);
    }

    return results;

  } catch (error) {
    console.error('Error creating creator collections:', error);
    return {
      creatorCollection: { success: false, error: error.message },
      communityCollection: { success: false, error: error.message },
      allSuccessful: false
    };
  }
};

// Get collection by ID (routes through backend)
export const getCollection = async (collectionId) => {
  try {
    const response = await makeShopifyRequest(`collection/${collectionId}`, 'GET');
    return response.collection;
  } catch (error) {
    console.error('Failed to get collection:', error);
    throw error;
  }
};

// Update collection (routes through backend)
export const updateCollection = async (collectionId, updates) => {
  try {
    const response = await makeShopifyRequest(`collection/${collectionId}`, 'PUT', { updates });
    return response.collection;
  } catch (error) {
    console.error('Failed to update collection:', error);
    throw error;
  }
};

// Delete collection (routes through backend)
export const deleteCollection = async (collectionId) => {
  try {
    const response = await makeShopifyRequest(`collection/${collectionId}`, 'DELETE');
    return { success: true };
  } catch (error) {
    console.error('Failed to delete collection:', error);
    throw error;
  }
};
