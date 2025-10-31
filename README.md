# T-Shirt Platform - Multi-Vendor E-commerce with AI Design Forking

A comprehensive platform where creators can design t-shirts, customers can fork designs using AI (Gemini Flash 2.5), and all designs are managed through Shopify collections.

## 🏗️ Architecture

```
tshirt-platform/
├── frontend/                 # React frontend application
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── pages/          # Page components
│   │   ├── services/       # API services
│   │   ├── firebase/       # Firebase configuration
│   │   └── utils/          # Utility functions
│   ├── editor/             # Design editor (Polotno)
│   └── package.json
├── backend/                 # Express.js backend API
│   ├── api/                # API route handlers
│   │   ├── generate-sd.js
│   │   ├── shopify-*.js
│   │   └── ...
│   ├── server.js           # Main backend server
│   └── package.json
├── package.json            # Root package.json with scripts
└── server.js              # Production server
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Firebase project
- Shopify store with Admin API access
- Gemini API key

### Development Setup

1. **Install dependencies:**
   ```bash
   npm run setup
   ```

2. **Set up environment variables:**
   
   Create `.env` files in both `frontend/` and `backend/` directories:
   
   **backend/.env:**
   ```env
   GEMINI_API_KEY=your_gemini_api_key
   SHOPIFY_ADMIN_ACCESS_TOKEN=your_shopify_admin_token
   SHOPIFY_STORE_URL=https://your-store.myshopify.com
   SHOPIFY_WEBHOOK_SECRET=your_webhook_secret
   PRINTIFY_API_KEY=your_printify_api_key
   PRINTIFY_SHOP_ID=your_printify_shop_id
   REPLICATE_API_TOKEN=your_replicate_token
   ```
   
   **frontend/.env:**
   ```env
   VITE_FIREBASE_API_KEY=your_firebase_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   VITE_SHOPIFY_ADMIN_TOKEN=your_shopify_admin_token
   VITE_SHOPIFY_STORE_URL=https://your-store.myshopify.com
   ```

3. **Start development servers:**
   ```bash
   npm run dev
   ```
   
   Or use the convenience script:
   ```bash
   ./start-dev.sh
   ```

This will start:
- Frontend: http://localhost:3000
- Backend: http://localhost:5000

## 📁 Project Structure

### Frontend (`/frontend`)
- **React 19** with Vite
- **Firebase** for authentication and data storage
- **React Router** for navigation
- **Polotno** for design editing
- **Responsive design** with modern UI

### Backend (`/backend`)
- **Express.js** API server
- **Shopify Admin API** integration
- **Gemini AI** for design forking
- **Printify** for order fulfillment
- **Webhook handling** for order processing

## 🔧 Available Scripts

### Root Level
- `npm run dev` - Start both frontend and backend in development
- `npm run build` - Build frontend for production
- `npm run start` - Start production server
- `npm run setup` - Install all dependencies
- `npm run clean` - Clean all node_modules

### Frontend
- `npm run dev` - Start Vite dev server (port 3000)
- `npm run build` - Build for production
- `npm run preview` - Preview production build

### Backend
- `npm run dev` - Start with nodemon (port 5000)
- `npm run start` - Start production server

## 🌟 Features

### For Creators
- **Account Registration** with automatic Shopify collection creation
- **Design Upload** and management
- **Community Design Approval** system
- **Dashboard** with analytics

### For Customers
- **Browse Designs** from all creators
- **AI Design Forking** using Gemini Flash 2.5
- **Custom Design Creation** with Polotno editor
- **Purchase** with automatic fulfillment

### For Platform
- **Multi-vendor Management** through Shopify collections
- **AI Integration** for design enhancement
- **Order Processing** with Printify
- **Community Design Workflow**

## 🔄 Development Workflow

1. **Frontend Development:**
   - Make changes in `/frontend/src/`
   - Hot reload available at http://localhost:3000
   - API calls automatically proxied to backend

2. **Backend Development:**
   - Make changes in `/backend/api/`
   - Server restarts automatically with nodemon
   - API available at http://localhost:5000

3. **Full Stack Testing:**
   - Both servers run simultaneously
   - Frontend proxies API calls to backend
   - Real-time testing of complete workflow

## 🚀 Deployment

### Production Build
```bash
npm run build
npm run start
```

### Environment Variables
Ensure all production environment variables are set in your deployment platform.

## 📝 API Endpoints

### Backend API (Port 5000)
- `POST /api/generate-sd` - Generate designs with AI
- `POST /api/shopify/orders-webhook` - Handle order webhooks
- `GET /api/shopify/creator-products/:id` - Get creator products
- `POST /api/shopify/collections` - Create collections
- `GET /health` - Health check

### Frontend (Port 3000)
- All routes handled by React Router
- API calls proxied to backend

## 🔧 Troubleshooting

### Common Issues
1. **Port conflicts:** Ensure ports 3000 and 5000 are available
2. **Environment variables:** Check all required env vars are set
3. **Dependencies:** Run `npm run setup` to install all dependencies
4. **Firebase config:** Verify Firebase project settings

### Development Tips
- Use browser dev tools for frontend debugging
- Check backend console for API errors
- Use network tab to monitor API calls
- Check Firebase console for authentication issues

## 📚 Next Steps

- [ ] Implement AI design forking with Gemini
- [ ] Add community design approval workflow
- [ ] Create customer-facing product browser
- [ ] Add admin dashboard for platform management
- [ ] Implement real-time notifications
- [ ] Add analytics and reporting

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.