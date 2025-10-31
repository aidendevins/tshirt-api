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
import shopifyOrdersWebhook from './api/shopify-orders-webhook-v2.js';
import uploadDesignHandler from './api/upload-design.js';
// import generateHandler from './api/generate.js';

// API Routes
app.post('/api/generate-sd', generateSDHandler);
app.post('/api/upload-design', uploadDesignHandler);
app.use('/api/shopify', shopifyCollectionsRouter);
app.post('/api/shopify/orders-webhook', shopifyOrdersWebhook);
// app.post('/api/generate', generateHandler);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    endpoints: ['/api/generate-sd', '/api/upload-design']
  });
});

// Frontend routes
app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'index.html'));
});

// Test frontend route
app.get('/test', (req, res) => {
  res.sendFile(join(__dirname, 'test.html'));
});

// Serve static files from frontend directory (CSS, JS, images, etc.)
app.use('/frontend', express.static(join(__dirname, 'frontend')));

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
    availableEndpoints: ['/api/generate-sd', '/api/upload-design', '/health']
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
  console.log(`   - GET  http://localhost:${PORT}/health`);
  console.log(`\n💡 Make sure you have the following environment variables set:`);
  console.log(`   - GEMINI_API_KEY`);
  console.log(`   - SHOPIFY_ADMIN_ACCESS_TOKEN`);
  console.log(`   - SHOPIFY_STORE_URL`);
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
