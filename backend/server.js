import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files (for the frontend)
app.use(express.static(__dirname));

// Import and use the API handlers
import generateSDHandler from './api/generate-sd.js';
import shopifyCollectionsRouter from './api/shopify-collections.js';
import createProductRouter from './api/create-product.js';
import shopifyOrdersWebhook from './api/shopify-orders-webhook-v2.js';
import uploadDesignHandler from './api/upload-design.js';
import printifyVariantsRouter from './api/printify-variants.js';
import printifyUploadImageRouter from './api/printify-upload-image.js';
import printifyCreateProductRouter from './api/printify-create-product.js';
import printifyGetProductRouter from './api/printify-get-product.js';
import printifyPublishShopifyRouter from './api/printify-publish-shopify.js';
import printifyLinkShopifyRouter from './api/printify-link-shopify.js';
// import generateHandler from './api/generate.js';

// API Routes
app.post('/api/generate-sd', generateSDHandler);
app.post('/api/upload-design', uploadDesignHandler);
app.use('/api/shopify', shopifyCollectionsRouter);
app.use('/api/shopify', createProductRouter);
app.post('/api/shopify/orders-webhook', shopifyOrdersWebhook);
app.use('/api/printify', printifyVariantsRouter);
app.use('/api/printify', printifyUploadImageRouter);
app.use('/api/printify', printifyCreateProductRouter);
app.use('/api/printify', printifyGetProductRouter);
app.use('/api/printify', printifyPublishShopifyRouter);
app.use('/api/printify', printifyLinkShopifyRouter);
// app.post('/api/generate', generateHandler);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    endpoints: [
      '/api/generate-sd', 
      '/api/upload-design', 
      '/api/printify/variants',
      '/api/printify/upload-image',
      '/api/printify/create-product',
      '/api/printify/product/:productId',
      '/api/printify/publish-to-shopify',
      '/api/printify/link-to-shopify'
    ]
  });
});

// Health check as root endpoint (backend is API-only)
app.get('/', (req, res) => {
  res.json({ 
    message: 'T-Shirt API Backend',
    status: 'Running',
    endpoints: {
      health: '/health',
      generateDesign: 'POST /api/generate-sd',
      uploadDesign: 'POST /api/upload-design',
      shopifyCollections: 'POST /api/shopify/collections',
      createProduct: 'POST /api/shopify/create-product',
      shopifyWebhook: 'POST /api/shopify/orders-webhook',
      printifyVariants: 'GET /api/printify/variants',
      printifyUploadImage: 'POST /api/printify/upload-image',
      printifyCreateProduct: 'POST /api/printify/create-product',
      printifyGetProduct: 'GET /api/printify/product/:productId',
      printifyPublishShopify: 'POST /api/printify/publish-to-shopify',
      printifyLinkShopify: 'POST /api/printify/link-to-shopify'
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: err.message 
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Endpoint not found',
    availableEndpoints: [
      '/api/generate-sd', 
      '/api/upload-design', 
      '/api/printify/variants',
      '/api/printify/upload-image',
      '/api/printify/create-product',
      '/api/printify/product/:productId',
      '/api/printify/publish-to-shopify',
      '/api/printify/link-to-shopify',
      '/health'
    ]
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 T-Shirt Backend Server running on http://localhost:${PORT}`);
  console.log(`📱 Frontend should be running on http://localhost:3000`);
  console.log(`🔗 API endpoints:`);
  console.log(`   - POST http://localhost:${PORT}/api/generate-sd`);
  console.log(`   - POST http://localhost:${PORT}/api/upload-design`);
  console.log(`   - POST http://localhost:${PORT}/api/shopify/orders-webhook`);
  console.log(`   - GET  http://localhost:${PORT}/api/printify/variants`);
  console.log(`   - POST http://localhost:${PORT}/api/printify/upload-image`);
  console.log(`   - POST http://localhost:${PORT}/api/printify/create-product`);
  console.log(`   - GET  http://localhost:${PORT}/api/printify/product/:productId`);
  console.log(`   - POST http://localhost:${PORT}/api/printify/publish-to-shopify`);
  console.log(`   - POST http://localhost:${PORT}/api/printify/link-to-shopify`);
  console.log(`   - GET  http://localhost:${PORT}/health`);
  console.log(`\n💡 Make sure you have the following environment variables set:`);
  console.log(`   - GEMINI_API_KEY`);
  console.log(`   - SHOPIFY_ADMIN_ACCESS_TOKEN`);
  console.log(`   - SHOPIFY_STORE_URL`);
  console.log(`   - PRINTIFY_API_KEY`);
  console.log(`   - PRINTIFY_SHOP_ID`);
  console.log(`   - REPLICATE_API_TOKEN (optional, for fallback)`);
  console.log(`\n🌍 Backend server is ready to accept requests!`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});
