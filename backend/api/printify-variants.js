import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// Cache for storing variants data to reduce API calls
let variantsCache = {
  data: null,
  timestamp: null,
  ttl: 60 * 60 * 1000 // 1 hour cache
};

// Get Printify variants for blueprint 6, print provider 99
router.get('/variants', async (req, res) => {
  try {
    const printifyApiKey = process.env.PRINTIFY_API_KEY;
    
    if (!printifyApiKey) {
      console.error('❌ PRINTIFY_API_KEY not found in environment variables');
      return res.status(500).json({ 
        error: 'Printify API key not configured',
        message: 'Please set PRINTIFY_API_KEY in your environment variables'
      });
    }

    // Check cache first
    const now = Date.now();
    if (variantsCache.data && variantsCache.timestamp && (now - variantsCache.timestamp < variantsCache.ttl)) {
      console.log('✅ Returning cached Printify variants');
      return res.json({
        ...variantsCache.data,
        cached: true,
        cachedAt: new Date(variantsCache.timestamp).toISOString()
      });
    }

    // Fetch from Printify API
    console.log('🔄 Fetching Printify variants from API...');
    const response = await fetch(
      'https://api.printify.com/v1/catalog/blueprints/6/print_providers/99/variants.json',
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${printifyApiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Printify API error: ${response.status} - ${response.statusText}`);
      console.error('Error details:', errorText);
      
      return res.status(response.status).json({
        error: 'Failed to fetch Printify variants',
        status: response.status,
        statusText: response.statusText,
        details: errorText
      });
    }

    const variantsData = await response.json();
    
    // Update cache
    variantsCache = {
      data: variantsData,
      timestamp: now,
      ttl: variantsCache.ttl
    };

    console.log('✅ Printify variants fetched successfully');
    res.json({
      ...variantsData,
      cached: false
    });

  } catch (error) {
    console.error('❌ Error fetching Printify variants:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Clear the cache (useful for debugging or manual refresh)
router.post('/variants/clear-cache', (req, res) => {
  variantsCache = {
    data: null,
    timestamp: null,
    ttl: 60 * 60 * 1000
  };
  console.log('🗑️ Printify variants cache cleared');
  res.json({ message: 'Cache cleared successfully' });
});

export default router;

