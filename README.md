RFC: Simple Video Chat Platform for Two Kids
Document Information

Title: Simple Video Chat Platform for Two Kids
Status: Draft
Author: Parent/Developer
Created: July 2025
Target: Cursor Editor Implementation

1. Overview
Purpose
Create a minimal, free web-based video chat platform exclusively for two children (son and nephew) living in different countries.
Goals

Zero-cost deployment and hosting
Simple user interface suitable for kids
Reliable peer-to-peer video communication
Minimal setup and maintenance

Non-Goals

Multi-user support beyond 2 participants
Advanced features (screen sharing, file transfer, etc.)
User authentication/registration system
Mobile app development

2. Technical Architecture
2.1 Tech Stack
Frontend: HTML5, CSS3, Vanilla JavaScript
Backend: Node.js with Socket.io (for signaling)
Deployment: Vercel (free tier)
WebRTC: Browser native APIs
STUN/TURN: Google's free public servers
2.2 System Components
Frontend Application

Location: /public/index.html
Dependencies: None (vanilla JS)
Features:

Video call interface
Camera/microphone controls
Connection status display
Simple UI for kids



Signaling Server

Location: /api/socket.js (Vercel serverless function)
Dependencies: socket.io
Purpose: Facilitate WebRTC handshake between peers

WebRTC Connection

Type: Peer-to-peer
Signaling: Via WebSocket
Media: Audio + Video
Fallback: STUN servers for NAT traversal

3. File Structure
video-chat/
├── public/
│   ├── index.html          # Main chat interface
│   ├── style.css           # Styling
│   └── script.js           # WebRTC + UI logic
├── api/
│   └── socket.js           # Signaling server (Vercel function)
├── package.json            # Dependencies
├── vercel.json             # Deployment config
└── README.md               # Setup instructions
4. Core Features
4.1 Essential Features (MVP)

 Start/end video call
 Audio mute/unmute
 Video on/off
 Connection status indicator
 Auto-connect when both users join

4.2 Nice-to-Have Features (Future)

 Chat messages
 Simple games overlay
 Call recording
 Picture-in-picture mode

5. User Flow
5.1 Connection Process

User A visits the website
User A clicks "Start Chat"
Browser requests camera/microphone permissions
User A waits for User B
User B visits the same website
User B clicks "Start Chat"
WebRTC connection established automatically
Both users can see/hear each other

5.2 During Call

Users can mute/unmute audio
Users can turn video on/off
Users can end the call
Connection status is always visible

6. Technical Implementation
6.1 WebRTC Flow
javascript// Simplified WebRTC implementation
const peerConnection = new RTCPeerConnection({
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' }
  ]
});

// 1. Get user media
navigator.mediaDevices.getUserMedia({ video: true, audio: true })

// 2. Create offer/answer
peerConnection.createOffer()

// 3. Exchange ICE candidates via signaling server
socket.emit('ice-candidate', candidate)

// 4. Establish connection
peerConnection.addStream(localStream)
6.2 Signaling Server (Vercel Serverless)
javascript// api/socket.js
export default function handler(req, res) {
  if (req.method === 'GET') {
    // WebSocket upgrade for Socket.io
    // Handle offer/answer/ice-candidate messages
  }
}
6.3 Deployment Configuration
json// vercel.json
{
  "functions": {
    "api/socket.js": {
      "runtime": "nodejs18.x"
    }
  }
}
7. Security Considerations
7.1 Privacy

No user data stored on server
Peer-to-peer connection (no media through server)
No user registration required

7.2 Access Control

Simple room-based access (both users join same room)
No authentication (family use only)
HTTPS enforced by Vercel

8. Deployment Strategy
8.1 Development

Clone/download code
Run npm install
Test locally with npm run dev
Use ngrok for testing across networks

8.2 Production

Push to GitHub repository
Connect Vercel to GitHub
Auto-deploy on push to main branch
Share vercel.app URL with family

9. Cost Analysis
9.1 Hosting Costs

Vercel: Free tier (unlimited personal projects)
Domain: Optional (.vercel.app domain included)
STUN servers: Free (Google public servers)
Total monthly cost: $0

9.2 Bandwidth

Video calls are peer-to-peer
Signaling server uses minimal bandwidth
Vercel free tier limits should be sufficient

10. Testing Strategy
10.1 Local Testing

Test with two browser tabs
Test camera/microphone access
Test connection establishment

10.2 Remote Testing

Test with different networks
Test with family members
Test connection stability

11. Maintenance
11.1 Monitoring

Check Vercel deployment status
Monitor for WebRTC connection issues
Keep dependencies updated

11.2 Updates

Add features based on kids' feedback
Update UI for better usability
Fix bugs as they arise

12. Implementation Steps
Phase 1: Basic Setup (Day 1)

Create project structure
Set up HTML interface
Implement getUserMedia
Deploy to Vercel

Phase 2: WebRTC Implementation (Day 2-3)

Set up signaling server
Implement peer connection
Handle offer/answer exchange
Test connection establishment

Phase 3: UI Polish (Day 4-5)

Add control buttons
Implement status indicators
Style for kid-friendly interface
Test with family members

13. Success Criteria

 Both kids can successfully connect from different countries
 Video and audio quality is acceptable
 Interface is simple enough for kids to use independently
 Connection is stable for 30+ minute calls
 Zero ongoing costs

14. Future Enhancements
Short-term (1-2 months)

Add text chat
Implement call history
Add fun video filters

Long-term (3-6 months)

Screen sharing capability
Simple drawing/whiteboard
Game integration
Mobile app consideration


Note for Cursor Editor: This RFC provides a complete specification for implementing a simple video chat platform. The architecture is designed to be free, simple, and maintainable. All code should be vanilla JavaScript to minimize dependencies and complexity.