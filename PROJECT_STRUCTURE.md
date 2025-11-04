# 🎨 T-Shirt API - Project Structure & Routes

## 📁 Project Architecture

```
tshirt-api/
├── backend/              # Express.js API Server
│   ├── api/             # API route handlers
│   │   ├── generate-sd.js
│   │   ├── generate.js
│   │   ├── get-design.js
│   │   ├── shopify-collections.js
│   │   ├── shopify-orders-webhook-v2.js
│   │   ├── shopify-orders-webhook.js
│   │   └── upload-design.js
│   ├── find-variant.js
│   ├── get-product-details.js
│   ├── server.js        # Main Express server
│   ├── package.json
│   └── .env             # Backend environment variables
│
├── frontend/            # React + Vite Frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── CreatorDashboard.jsx
│   │   │   ├── CreatorLogin.jsx
│   │   │   ├── Footer.jsx
│   │   │   ├── Header.jsx
│   │   │   └── ProductDesigner.jsx
│   │   ├── pages/
│   │   │   ├── Creator.jsx
│   │   │   ├── Landing.jsx
│   │   │   ├── ProductDesigner.jsx
│   │   │   └── UserLogin.jsx
│   │   ├── services/
│   │   │   ├── creatorProducts.js
│   │   │   ├── shopify-admin.js
│   │   │   └── shopify.js
│   │   ├── firebase/
│   │   │   ├── auth.js
│   │   │   └── config.js
│   │   ├── App.jsx      # Main app with routing
│   │   ├── main.jsx     # Entry point
│   │   └── index.css
│   ├── dist/            # Built frontend (generated)
│   ├── package.json
│   └── .env             # Frontend environment variables
│
├── vercel.json          # Vercel deployment config
├── start.sh             # Local development startup script
└── ENVIRONMENT_SETUP.md # Environment setup guide
```

---

## 🔌 Backend API Routes

**Base URL (Local):** `http://localhost:8000`

### Core API Endpoints

#### AI Design Generation
- **POST** `/api/generate-sd`
  - Generate t-shirt design using Stable Diffusion
  - Body: `{ prompt: string }`
  - Handler: `backend/api/generate-sd.js`

- **POST** `/api/generate` *(commented out)*
  - Alternative generation endpoint
  - Handler: `backend/api/generate.js`

#### Design Management
- **POST** `/api/upload-design`
  - Upload design image
  - Body: `{ image: base64 }`
  - Handler: `backend/api/upload-design.js`

#### Shopify Integration
- **POST** `/api/shopify/test-token`
  - Test Shopify access token validity
  - Body: `{ accessToken: string }`

- **POST** `/api/shopify/collections`
  - Create Shopify collections for creators
  - Body: `{ creatorData: object }`

- **GET** `/api/shopify/creator-products/:creatorId`
  - Get all products for a specific creator
  - Returns: `{ creatorProducts: [], communityProducts: [] }`

- **POST** `/api/shopify/orders-webhook`
  - Webhook for Shopify order events
  - Triggers Printify order creation
  - Handler: `backend/api/shopify-orders-webhook-v2.js`

#### Health Check
- **GET** `/health`
  - Server health check
  - Returns: `{ status: 'OK', timestamp: ISO8601 }`

---

## 🎨 Frontend Routes

**Base URL (Local):** `http://localhost:3000`

### Page Routes (React Router)

- **/** - Landing page
  - Component: `pages/Landing.jsx`
  - Public homepage

- **/creator** - Creator dashboard
  - Component: `pages/Creator.jsx`
  - Shows creator login/dashboard
  - Displays creator's products

- **/creator/design** - Product designer
  - Component: `pages/ProductDesigner.jsx`
  - AI-powered t-shirt design tool
  - Canvas-based editor with drag/drop

- **/login** - User login
  - Component: `pages/UserLogin.jsx`
  - Firebase authentication

- **\*** - Catch all
  - Redirects to `/`

---

## 🔄 API Service Layer (Frontend)

### `services/creatorProducts.js`
```javascript
fetchCreatorProducts(creatorId)
  → GET /api/shopify/creator-products/:creatorId
```

### `services/shopify-admin.js`
- `createCreatorCollection(creatorData, collectionType)`
- Uses VITE_SHOPIFY_ACCESS_TOKEN

### `services/shopify.js`
- Shopify Storefront API integration
- Collection management

---

## 🔐 Environment Variables

### Backend (`.env` in `backend/`)
```env
PORT=8000
NODE_ENV=development

# Shopify
SHOPIFY_STORE_URL=https://your-store.myshopify.com
SHOPIFY_ADMIN_ACCESS_TOKEN=shpat_...
SHOPIFY_WEBHOOK_SECRET=...

# Printify
PRINTIFY_API_KEY=...
PRINTIFY_SHOP_ID=...

# AI Services
GEMINI_API_KEY=...
REPLICATE_API_TOKEN=...

# Firebase (optional for backend)
FIREBASE_PROJECT_ID=...
FIREBASE_PRIVATE_KEY=...
FIREBASE_CLIENT_EMAIL=...
```

### Frontend (`.env` in `frontend/`)
```env
# API
VITE_API_BASE_URL=http://localhost:8000

# Firebase
VITE_FIREBASE_WEB_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...

# Shopify (frontend)
VITE_SHOPIFY_STORE_URL=...
VITE_SHOPIFY_CLIENT_ID=...
VITE_SHOPIFY_ACCESS_TOKEN=...
VITE_SHOPIFY_ADMIN_TOKEN=...
```

---

## 🚀 Development Workflow

### Start Both Servers
```bash
./start.sh
```

### Start Backend Only
```bash
cd backend
npm run dev
# Runs on http://localhost:8000
```

### Start Frontend Only
```bash
cd frontend
npm run dev
# Runs on http://localhost:3000
```

---

## 📦 Key Dependencies

### Backend
- **express** - Web framework
- **@google/generative-ai** - Gemini AI integration
- **replicate** - Stable Diffusion API
- **@vercel/blob** - File storage
- **cors** - Cross-origin requests
- **firebase** - Authentication
- **dotenv** - Environment variables

### Frontend
- **react** v19 - UI framework
- **react-router-dom** - Client-side routing
- **vite** - Build tool & dev server
- **firebase** - Authentication

---

## 🔧 API Flow Examples

### Creating a Design
```
User → Frontend Designer Component
       ↓ (prompt)
       POST /api/generate-sd
       ↓
       Backend → Gemini AI / Replicate
       ↓
       Returns design image URL
       ↓
       Frontend displays on canvas
```

### Creator Dashboard Load
```
User → /creator page
       ↓
       Firebase Auth Check
       ↓ (creatorId)
       GET /api/shopify/creator-products/:creatorId
       ↓
       Backend → Shopify API
       ↓
       Returns products array
       ↓
       Display in CreatorDashboard
```

### Order Webhook Flow
```
Shopify Order Created
       ↓
       POST /api/shopify/orders-webhook
       ↓
       Verify Shopify HMAC
       ↓
       Extract design + shipping info
       ↓
       Create Printify Order
       ↓
       Printify fulfills order
```

---

## 🌐 Deployment

### Frontend (Vercel)
- Build command: `cd frontend && npm install && npm run build`
- Output directory: `frontend/dist`
- Environment: Set all `VITE_*` variables in Vercel dashboard

### Backend (Separate Vercel Project or Other Host)
- Deploy `backend/` as standalone Node.js app
- Set all backend environment variables
- Update frontend `VITE_API_BASE_URL` to backend URL

---

## 📝 Notes

- Frontend and backend run on different ports in development
- Frontend proxies API calls via Vite config
- All API routes are prefixed with `/api`
- Shopify webhooks require HMAC verification
- Firebase handles creator authentication
- Designs stored in Vercel Blob Storage

