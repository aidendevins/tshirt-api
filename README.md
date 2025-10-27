# 🎨 T-Shirt Design Generator API

A powerful AI-powered t-shirt design generator with multiple AI models and a beautiful web interface.

## 🚀 Quick Start

### Option 1: Using the startup script (Recommended)
```bash
./start.sh
```

### Option 2: Manual setup
```bash
# Install dependencies
npm install

# Copy environment template
cp env.example .env

# Edit .env with your API keys
# Required: GEMINI_API_KEY
# Optional: REPLICATE_API_TOKEN

# Start the server
npm start
```

## 🔧 Environment Setup

1. **Get your Gemini API key:**
   - Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Create a new API key
   - Copy it to your `.env` file

2. **Optional - Get Replicate API token:**
   - Visit [Replicate](https://replicate.com/account/api-tokens)
   - Create a new token
   - Add it to your `.env` file

## 📁 Project Structure

```
tshirt-api/
├── api/
│   ├── generate-sd.js    # Gemini Flash 2.0 API endpoint
│   └── generate.js       # DALL-E 3 API endpoint
├── server.js            # Express server for local hosting
├── index.html           # Frontend interface
├── package.json         # Dependencies and scripts
├── start.sh            # Startup script
└── env.example         # Environment variables template
```

## 🌐 API Endpoints

### POST `/api/generate-sd`
- **Description**: Generate designs using Gemini Flash 2.0
- **Body**: 
  ```json
  {
    "prompt": "Your design description",
    "image": "base64_image_data (optional)"
  }
  ```

### POST `/api/generate`
- **Description**: Generate designs using DALL-E 3
- **Body**: 
  ```json
  {
    "prompt": "Your design description"
  }
  ```

### GET `/health`
- **Description**: Health check endpoint
- **Response**: Server status and available endpoints

## 🎨 Features

- **Dual AI Models**: Switch between Gemini Flash 2.0 and DALL-E 3
- **Image Upload**: Upload reference images for Gemini analysis
- **Real-time Generation**: Live preview of generated designs
- **Download Support**: Download generated images
- **Responsive Design**: Works on desktop and mobile
- **Error Handling**: Comprehensive error messages

## 🔧 Development

### Available Scripts
- `npm start` - Start the server
- `npm run dev` - Start in development mode
- `npm run serve` - Alternative start command

### Server Configuration
- **Port**: 3000 (configurable via PORT env variable)
- **CORS**: Enabled for all origins
- **File Upload**: 50MB limit for images
- **Static Files**: Serves frontend from root

## 🛠️ Troubleshooting

### Common Issues

1. **"No .env file found"**
   - Run `cp env.example .env`
   - Edit `.env` with your API keys

2. **"Please configure your API keys"**
   - Make sure your `.env` file has valid API keys
   - Check that `GEMINI_API_KEY` is set correctly

3. **"Module not found" errors**
   - Run `npm install` to install dependencies

4. **Port already in use**
   - Change the PORT in your `.env` file
   - Or kill the process using port 3000

### API Key Setup
1. Get your Gemini API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Add it to your `.env` file: `GEMINI_API_KEY=your_actual_key_here`
3. Restart the server

## 📱 Usage

1. Open your browser to `http://localhost:3000`
2. Choose your AI model (Gemini Flash 2.0 or DALL-E 3)
3. Enter your design prompt
4. Optionally upload a reference image (Gemini only)
5. Click "Generate Design"
6. Download your generated design

## 🔒 Security Notes

- Never commit your `.env` file to version control
- Keep your API keys secure
- The server runs on localhost by default for security

## 📄 License

This project is open source and available under the MIT License.
