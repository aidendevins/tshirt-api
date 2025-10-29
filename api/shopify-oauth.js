import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// Shopify OAuth token exchange endpoint
router.post('/token', async (req, res) => {
  try {
    const { code, redirectUri } = req.body;
    
    console.log('OAuth token exchange request:', { code: code ? 'present' : 'missing', redirectUri });
    
    if (!code) {
      return res.status(400).json({ error: 'Authorization code is required' });
    }

    const shopifyStoreUrl = process.env.SHOPIFY_STORE_URL;
    const clientId = process.env.SHOPIFY_CLIENT_ID;
    const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;

    console.log('Environment variables:', {
      hasStoreUrl: !!shopifyStoreUrl,
      hasClientId: !!clientId,
      hasClientSecret: !!clientSecret,
      storeUrl: shopifyStoreUrl
    });

    if (!shopifyStoreUrl || !clientId || !clientSecret) {
      console.error('Missing Shopify configuration:', {
        SHOPIFY_STORE_URL: shopifyStoreUrl,
        SHOPIFY_CLIENT_ID: clientId,
        SHOPIFY_CLIENT_SECRET: clientSecret ? 'present' : 'missing'
      });
      return res.status(500).json({ error: 'Shopify configuration missing' });
    }

    // Exchange code for access token
    console.log('Making request to Shopify OAuth endpoint:', `${shopifyStoreUrl}/admin/oauth/access_token`);
    
    const response = await fetch(`${shopifyStoreUrl}/admin/oauth/access_token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code: code
      })
    });

    console.log('Shopify OAuth response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Shopify OAuth error response:', errorData);
      throw new Error(`Shopify OAuth error: ${response.status} - ${errorData.error_description || response.statusText}`);
    }

    const data = await response.json();
    console.log('Successfully received access token');
    
    res.json({
      access_token: data.access_token,
      scope: data.scope
    });

  } catch (error) {
    console.error('OAuth token exchange error:', error);
    res.status(500).json({ 
      error: 'Failed to exchange authorization code',
      message: error.message 
    });
  }
});

export default router;
