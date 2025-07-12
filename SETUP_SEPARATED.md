# Bocil Call - Separated Development & Production Setup

This project now has separate configurations for development and production environments to provide better isolation and debugging capabilities.

## 🏗️ Architecture Overview

### Development Environment
- **Frontend**: Vue.js with Vite dev server (port 3000)
- **Signaling**: WebSocket server (port 3001)
- **Component**: `VideoChatLocal.vue` (WebSocket signaling)
- **Build**: `vite.config.dev.js`

### Production Environment
- **Frontend**: Static files served by Vercel
- **Signaling**: HTTP polling via Vercel serverless functions
- **Component**: `VideoChatProduction.vue` (HTTP polling)
- **Build**: `vite.config.prod.js`

## 🚀 Quick Start

### Prerequisites
- Node.js 20+ (use `nvm use 20`)
- Bun (optional, for faster development)

### Development Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start development environment:**
   ```bash
   # Option 1: Start both frontend and signaling server
   npm run dev:full
   
   # Option 2: Start only frontend (if server is already running)
   npm run dev:local
   
   # Option 3: Start only signaling server
   npm run server:dev
   ```

3. **Access the application:**
   - Frontend: http://localhost:3000
   - Signaling server health: http://localhost:3001/health

4. **Test with two browser tabs:**
   - Tab 1: http://localhost:3000/?user=dede
   - Tab 2: http://localhost:3000/?user=kia

### Production Setup

1. **Build for production:**
   ```bash
   npm run build:prod
   ```

2. **Deploy to Vercel:**
   ```bash
   vercel --prod
   ```

## 📁 File Structure

```
bocil-call/
├── src/
│   ├── components/
│   │   ├── VideoChatLocal.vue      # Development component (WebSocket)
│   │   ├── VideoChatProduction.vue # Production component (HTTP polling)
│   │   └── VideoChat.vue          # Legacy component (deprecated)
│   ├── config/
│   │   └── environment.js         # Environment detection
│   ├── App.vue                    # Dynamic component loading
│   └── main.js
├── api/
│   └── socket.js                  # Vercel serverless function
├── server.js                      # Legacy server
├── server.dev.js                  # Development WebSocket server
├── vite.config.js                 # Default config
├── vite.config.dev.js             # Development config
├── vite.config.prod.js            # Production config
└── package.json
```

## 🔧 Configuration Files

### Development Configuration (`vite.config.dev.js`)
- Includes WebSocket server proxy
- Development-specific optimizations
- Hot module replacement enabled

### Production Configuration (`vite.config.prod.js`)
- Optimized for static deployment
- No WebSocket dependencies
- Production-specific optimizations

### Environment Detection (`src/config/environment.js`)
- Automatically detects development vs production
- Provides appropriate component and signaling method
- Handles fallback scenarios

## 🎯 Available Scripts

### Development Scripts
```bash
npm run dev:local          # Start Vite dev server with dev config
npm run dev:full           # Start both frontend and signaling server
npm run server:dev         # Start development WebSocket server
npm run build:dev          # Build for development
npm run preview:dev        # Preview development build
```

### Production Scripts
```bash
npm run build:prod         # Build for production
npm run build              # Default build (production)
npm run preview            # Preview production build
```

### Utility Scripts
```bash
npm run clean              # Clean build artifacts
npm run server:node        # Run server with Node.js (not Bun)
```

## 🔍 Environment Detection

The application automatically detects the environment:

- **Development**: `localhost`, `127.0.0.1`, or any hostname containing `localhost`
- **Production**: Any other hostname (Vercel, custom domain, etc.)

### Environment Indicators

The app displays environment information in the header:
- 🟢 **Development**: Green badge with "Development" and "WebSocket" signaling
- 🟠 **Production**: Orange badge with "Production" and "HTTP Polling" signaling

## 🐛 Troubleshooting

### Development Issues

1. **Port conflicts:**
   ```bash
   # Kill processes on ports 3000 and 3001
   lsof -ti:3000 | xargs kill -9
   lsof -ti:3001 | xargs kill -9
   ```

2. **Node.js version issues:**
   ```bash
   nvm use 20
   npm install
   ```

3. **Syntax errors with Bun:**
   ```bash
   # Use Node.js instead of Bun
   npm run server:node
   ```

### Production Issues

1. **Build errors:**
   ```bash
   npm run clean
   npm install
   npm run build:prod
   ```

2. **Deployment issues:**
   - Check `vercel.json` configuration
   - Ensure all files are committed
   - Verify environment variables

## 🔄 Migration from Legacy Setup

If you're migrating from the old single-component setup:

1. **Backup your current setup:**
   ```bash
   cp src/components/VideoChat.vue src/components/VideoChat.vue.backup
   ```

2. **Update your imports:**
   - The app now automatically uses the correct component
   - No manual component selection needed

3. **Test both environments:**
   - Development: `npm run dev:full`
   - Production: `npm run build:prod && npm run preview`

## 📊 Benefits of Separation

### Development Benefits
- **Better debugging**: Clear separation of concerns
- **Faster development**: Hot reload for both frontend and server
- **Isolated testing**: Test WebSocket and HTTP polling separately
- **Environment-specific features**: Development-only features (health checks, detailed logging)

### Production Benefits
- **Optimized builds**: No unnecessary dependencies
- **Better performance**: Smaller bundle size
- **Reliable deployment**: Serverless-compatible signaling
- **Scalability**: HTTP polling works with Vercel's serverless functions

## 🎯 Next Steps

1. **Test the separated setup** with two browser tabs
2. **Deploy to production** and verify HTTP polling works
3. **Monitor both environments** for any issues
4. **Consider adding more environment-specific features** as needed

## 📝 Notes

- The legacy `VideoChat.vue` component is kept for reference but not used
- Environment detection happens at runtime, not build time
- Both environments support the same user experience
- Chat functionality works in both environments
- WebRTC connection logic is identical in both components 