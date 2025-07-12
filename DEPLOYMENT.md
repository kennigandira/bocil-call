# Deployment Guide - Make Bocil Call Global

## 🚀 Quick Deployment to Vercel

### Step 1: Prepare Your Code
```bash
# Make sure you're in the project directory
cd bocil-call

# Install dependencies
bun install

# Build the project
bun run build
```

### Step 2: Push to GitHub
```bash
# Initialize git (if not already done)
git init
git add .
git commit -m "Initial commit: Video chat for kids"

# Create a new repository on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/bocil-call.git
git push -u origin main
```

### Step 3: Deploy to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Sign up/Login with GitHub
3. Click "New Project"
4. Import your `bocil-call` repository
5. Vercel will automatically detect the configuration
6. Click "Deploy"

### Step 4: Get Your Global URL
After deployment, you'll get a URL like:
```
https://bocil-call-abc123.vercel.app
```

### Step 5: Share with Kids
- **Kid 1**: Visit the Vercel URL
- **Kid 2**: Visit the same Vercel URL
- Both kids can now chat from anywhere in the world! 🌍

## 🔧 Alternative: Local Network Testing

### For Same Network Testing:
```bash
# Find your local IP
ifconfig | grep "inet " | grep -v 127.0.0.1

# Share this URL with kids on same WiFi:
http://YOUR_IP:3000
```

### For Internet Testing (Ngrok):
```bash
# Install ngrok
brew install ngrok

# Start your dev server
bun run dev:full

# In another terminal, create tunnel
ngrok http 3000

# Share the ngrok URL (e.g., https://abc123.ngrok.io)
```

## 🌐 How It Works Globally

### Before Deployment:
```
Kid 1 (Country A)     ❌     Kid 2 (Country B)
localhost:3000         ❌     localhost:3000
(Same computer only)   ❌     (Same computer only)
```

### After Vercel Deployment:
```
Kid 1 (Country A)     ✅     Kid 2 (Country B)
https://bocil-call.vercel.app  ✅  https://bocil-call.vercel.app
(Anywhere in world)   ✅     (Anywhere in world)
```

## 🔒 Security & Privacy

### What's Secure:
- ✅ Video/audio is peer-to-peer (not stored on server)
- ✅ No user accounts or personal data
- ✅ HTTPS enforced by Vercel
- ✅ Only signaling data passes through server

### For Family Use:
- ✅ Simple room-based access
- ✅ No authentication required
- ✅ Both kids join same 'kids-room'
- ✅ Perfect for family video calls

## 🛠 Troubleshooting

### If Vercel Deployment Fails:
1. Check that all files are committed to GitHub
2. Ensure `vercel.json` is in the root directory
3. Verify `package.json` has correct build script
4. Check Vercel logs for specific errors

### If Connection Doesn't Work:
1. Both kids must visit the same URL
2. Allow camera/microphone permissions
3. Check browser console for errors
4. Try refreshing the page

### If Video/Audio Issues:
1. Check internet connection quality
2. Try different browsers (Chrome recommended)
3. Ensure camera/microphone are working
4. Check browser permissions

## 📱 Mobile Access

The app works on mobile browsers too!
- Kid 1: Visit Vercel URL on phone
- Kid 2: Visit same URL on phone/computer
- Works across different devices

## 🎯 Success Checklist

- [ ] Code pushed to GitHub
- [ ] Vercel deployment successful
- [ ] Both kids can access the URL
- [ ] Camera/microphone permissions granted
- [ ] Video call connects successfully
- [ ] Audio and video working
- [ ] Controls (mute, video on/off) working

Once deployed, your kids can have video calls from anywhere in the world! 🌍✨ 