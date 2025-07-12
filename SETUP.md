# Bocil Call - Setup Guide

A simple video chat platform for two kids built with Vue.js and WebRTC.

## Prerequisites

- Bun (recommended) or Node.js 18+
- If using Node.js, use `nvm use 20` if you have nvm

## Installation

1. Install dependencies:
```bash
# Using Bun (recommended)
bun install

# Or using npm
npm install
```

## Development

### Option 1: Full Development (Recommended)
Run both the frontend and signaling server:
```bash
# Using Bun (recommended)
bun run dev:full

# Or using npm
npm run dev:full
```

This will start:
- Frontend: http://localhost:3000
- Signaling Server: http://localhost:3001

### Option 2: Frontend Only
If you want to test with a deployed signaling server:
```bash
# Using Bun
bun run dev

# Or using npm
npm run dev
```

### Option 3: Signaling Server Only
If you want to run just the signaling server:
```bash
# Using Bun
bun run server

# Or using npm
npm run server
```

## Testing

1. Open two browser tabs/windows
2. Navigate to http://localhost:3000 in both
3. Allow camera and microphone permissions
4. Click "Start Chat" in both tabs
5. The video call should automatically connect

## Production Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Vercel will automatically detect the configuration and deploy

### Environment Variables

For production, set these environment variables in Vercel:
- `NODE_ENV=production`
- `VITE_SOCKET_URL` (if using a different signaling server)

## Features

- ✅ Real-time video chat
- ✅ Audio mute/unmute
- ✅ Video on/off
- ✅ Connection status indicator
- ✅ Kid-friendly interface
- ✅ Mobile responsive
- ✅ Zero-cost deployment

## Troubleshooting

### Camera/Microphone Access
- Make sure to allow camera and microphone permissions
- Try refreshing the page if permissions are denied

### Connection Issues
- Check that both users are on the same room ('kids-room')
- Ensure the signaling server is running
- Check browser console for error messages

### Development Issues
- Make sure you're using Bun or Node.js 18+
- Clear browser cache if changes don't appear
- Check that both frontend and server are running
- If using Bun, make sure it's properly installed: `curl -fsSL https://bun.sh/install | bash`

## File Structure

```
bocil-call/
├── src/
│   ├── components/
│   │   └── VideoChat.vue      # Main video chat component
│   ├── App.vue                # Main app component
│   ├── main.js               # Vue app entry point
│   └── style.css             # Global styles
├── api/
│   └── socket.js             # Vercel serverless function
├── server.js                 # Development signaling server
├── package.json              # Dependencies and scripts
├── vite.config.js           # Vite configuration
├── vercel.json              # Vercel deployment config
└── index.html               # HTML entry point
```

## Security Notes

- This is designed for family use only
- No user authentication required
- All video/audio is peer-to-peer (not stored on server)
- Uses free STUN servers for NAT traversal 