import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve built frontend files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(join(__dirname, 'frontend/dist')));
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// In production, serve the React app for all non-API routes
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(join(__dirname, 'frontend/dist/index.html'));
  });
} else {
  // In development, redirect to frontend dev server
  app.get('*', (req, res) => {
    res.redirect('http://localhost:3000');
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: err.message 
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 T-Shirt Platform Server running on http://localhost:${PORT}`);
  console.log(`📱 Frontend: http://localhost:3000 (dev) or http://localhost:${PORT} (prod)`);
  console.log(`🔧 Backend: http://localhost:5000`);
  console.log(`\n💡 To start development:`);
  console.log(`   npm run dev`);
  console.log(`\n🌍 Server is ready!`);
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
