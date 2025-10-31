# 🔐 Environment Variables Setup Guide

## 📁 File Locations

You need to create **TWO** `.env` files:

1. **`/backend/.env`** - Backend API keys and secrets
2. **`/frontend/.env`** - Frontend environment variables

## 🔑 Backend Environment Variables (`/backend/.env`)

Create this file: `/backend/.env`

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Shopify Configuration
SHOPIFY_STORE_URL=https://your-store.myshopify.com
SHOPIFY_CLIENT_ID=your_shopify_client_id
SHOPIFY_CLIENT_SECRET=your_shopify_client_secret
SHOPIFY_ADMIN_ACCESS_TOKEN=your_shopify_admin_access_token
SHOPIFY_WEBHOOK_SECRET=your_shopify_webhook_secret

# Printify Configuration
PRINTIFY_API_KEY=your_printify_api_key
PRINTIFY_SHOP_ID=your_printify_shop_id

# AI Services
GEMINI_API_KEY=your_gemini_api_key
REPLICATE_API_TOKEN=your_replicate_api_token

# Firebase (if used in backend)
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_PRIVATE_KEY=your_firebase_private_key
FIREBASE_CLIENT_EMAIL=your_firebase_client_email
```

## 🎨 Frontend Environment Variables (`/frontend/.env`)

Create this file: `/frontend/.env`

```env
# Firebase Configuration
VITE_FIREBASE_WEB_API_KEY=your_firebase_web_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
VITE_FIREBASE_APP_ID=your_firebase_app_id

# Shopify Configuration (for frontend API calls)
VITE_SHOPIFY_STORE_URL=https://your-store.myshopify.com
VITE_SHOPIFY_CLIENT_ID=your_shopify_client_id
VITE_SHOPIFY_CLIENT_SECRET=your_shopify_client_secret
VITE_SHOPIFY_ACCESS_TOKEN=your_shopify_access_token
VITE_SHOPIFY_ADMIN_TOKEN=your_shopify_admin_token

# API Configuration
VITE_API_BASE_URL=http://localhost:5000
```

## 🔍 Complete List of API Keys Used

### Backend API Keys (`process.env.*`)

| Variable | Used In | Purpose |
|----------|---------|---------|
| `PORT` | server.js | Backend server port |
| `NODE_ENV` | server.js | Environment mode |
| `SHOPIFY_STORE_URL` | shopify-*.js | Your Shopify store URL |
| `SHOPIFY_CLIENT_ID` | shopify-oauth.js | Shopify OAuth client ID |
| `SHOPIFY_CLIENT_SECRET` | shopify-oauth.js | Shopify OAuth client secret |
| `SHOPIFY_ADMIN_ACCESS_TOKEN` | shopify-collections.js | Shopify Admin API token |
| `SHOPIFY_WEBHOOK_SECRET` | shopify-orders-webhook*.js | Webhook verification |
| `PRINTIFY_API_KEY` | shopify-orders-webhook*.js | Printify API key |
| `PRINTIFY_SHOP_ID` | shopify-orders-webhook*.js | Printify shop ID |
| `GEMINI_API_KEY` | generate-sd.js | Google Gemini AI API |
| `REPLICATE_API_TOKEN` | generate*.js | Replicate AI API |

### Frontend Environment Variables (`import.meta.env.VITE_*`)

| Variable | Used In | Purpose |
|----------|---------|---------|
| `VITE_FIREBASE_WEB_API_KEY` | firebase/config.js | Firebase web API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | firebase/config.js | Firebase auth domain |
| `VITE_FIREBASE_PROJECT_ID` | firebase/config.js | Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | firebase/config.js | Firebase storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | firebase/config.js | Firebase messaging sender ID |
| `VITE_FIREBASE_APP_ID` | firebase/config.js | Firebase app ID |
| `VITE_SHOPIFY_STORE_URL` | shopify-*.js | Shopify store URL |
| `VITE_SHOPIFY_CLIENT_ID` | shopify-oauth.js | Shopify OAuth client ID |
| `VITE_SHOPIFY_CLIENT_SECRET` | shopify-oauth.js | Shopify OAuth client secret |
| `VITE_SHOPIFY_ACCESS_TOKEN` | shopify.js | Shopify access token |
| `VITE_SHOPIFY_ADMIN_TOKEN` | shopify-admin.js | Shopify admin token |

## 🚀 Quick Setup Commands

1. **Create backend .env file:**
   ```bash
   cp backend/env.example backend/.env
   ```

2. **Create frontend .env file:**
   ```bash
   cp frontend/env.example frontend/.env
   ```

3. **Edit the files with your actual API keys:**
   ```bash
   # Edit backend environment variables
   nano backend/.env
   
   # Edit frontend environment variables
   nano frontend/.env
   ```

## 🔒 Security Notes

- **Never commit `.env` files to git**
- **Add `.env` to your `.gitignore`**
- **Use different API keys for development and production**
- **Keep your API keys secure and rotate them regularly**

## ✅ Verification

After setting up your environment variables:

1. **Test backend:**
   ```bash
   cd backend && npm run dev
   # Check: http://localhost:5000/health
   ```

2. **Test frontend:**
   ```bash
   cd frontend && npm run dev
   # Check: http://localhost:3000
   ```

3. **Test full stack:**
   ```bash
   npm run dev
   # Both servers should start successfully
   ```

## 🆘 Troubleshooting

- **"API key not found" errors:** Check your `.env` file exists and has the correct variable names
- **CORS errors:** Ensure frontend is running on port 3000 and backend on port 5000
- **Firebase errors:** Verify all Firebase environment variables are set correctly
- **Shopify errors:** Check your Shopify API credentials and permissions
