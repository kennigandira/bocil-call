<template>
  <div class="video-chat">
    <!-- Connection Status -->
    <div class="status-bar">
      <div class="status-indicator" :class="connectionStatus">
        <span class="status-dot"></span>
        {{ statusMessage }}
      </div>
    </div>

    <!-- Video Container -->
    <div class="video-container">
      <!-- Local Video -->
      <div class="video-wrapper local-video">
        <video 
          ref="localVideo" 
          autoplay 
          muted 
          playsinline
          class="video-element"
        ></video>
        <div class="video-label">You</div>
      </div>

      <!-- Remote Video -->
      <div class="video-wrapper remote-video" v-if="isConnected">
        <video 
          ref="remoteVideo" 
          autoplay 
          playsinline
          class="video-element"
        ></video>
        <div class="video-label">Friend</div>
      </div>

      <!-- Waiting Screen -->
      <div class="waiting-screen" v-if="!isConnected && !isConnecting">
        <div class="waiting-content">
          <div class="waiting-icon">📞</div>
          <h2>Ready to Chat!</h2>
          <p>Click "Start Chat" to begin your video call</p>
          <button 
            @click="startCall" 
            class="start-button"
            :disabled="isConnecting"
          >
            {{ isConnecting ? 'Connecting...' : 'Start Chat' }}
          </button>
        </div>
      </div>

      <!-- Connecting Screen -->
      <div class="connecting-screen" v-if="isConnecting">
        <div class="connecting-content">
          <div class="connecting-icon">⏳</div>
          <h2>Connecting...</h2>
          <p>Waiting for your friend to join</p>
          <div class="loading-spinner"></div>
        </div>
      </div>
    </div>

    <!-- Control Buttons -->
    <div class="controls" v-if="isConnected || isConnecting">
      <button 
        @click="toggleMute" 
        class="control-button"
        :class="{ active: !isMuted }"
        title="Mute/Unmute"
      >
        {{ isMuted ? '🔇' : '🔊' }}
      </button>
      
      <button 
        @click="toggleVideo" 
        class="control-button"
        :class="{ active: isVideoOn }"
        title="Turn Video On/Off"
      >
        {{ isVideoOn ? '📹' : '📷' }}
      </button>
      
      <button 
        @click="endCall" 
        class="control-button end-call"
        title="End Call"
      >
        ❌
      </button>
    </div>
  </div>
</template>

<script>
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { io } from 'socket.io-client'

export default {
  name: 'VideoChat',
  setup() {
    // Refs for video elements
    const localVideo = ref(null)
    const remoteVideo = ref(null)

    // Reactive state
    const state = reactive({
      isConnected: false,
      isConnecting: false,
      isMuted: false,
      isVideoOn: true,
      connectionStatus: 'disconnected',
      statusMessage: 'Disconnected',
      localStream: null,
      peerConnection: null,
      socket: null
    })

    // WebRTC configuration
    const rtcConfig = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    }

    // Initialize WebRTC
    const initializeWebRTC = () => {
      state.peerConnection = new RTCPeerConnection(rtcConfig)
      
      // Handle incoming streams
      state.peerConnection.ontrack = (event) => {
        console.log('🎥 Received remote track:', event.track.kind)
        if (remoteVideo.value) {
          remoteVideo.value.srcObject = event.streams[0]
          console.log('✅ Remote video stream set')
        }
      }

      // Handle ICE candidates
      state.peerConnection.onicecandidate = (event) => {
        if (event.candidate && state.socket) {
          console.log('🧊 Sending ICE candidate')
          state.socket.emit('ice-candidate', {
            candidate: event.candidate,
            targetUser: 'broadcast' // Will be handled by server to send to all other users in room
          })
        }
      }

      // Handle connection state changes
      state.peerConnection.onconnectionstatechange = () => {
        updateConnectionStatus()
      }
    }

    // Update connection status
    const updateConnectionStatus = () => {
      if (state.peerConnection) {
        const connectionState = state.peerConnection.connectionState
        const iceConnectionState = state.peerConnection.iceConnectionState

        console.log('Connection state:', connectionState, 'ICE state:', iceConnectionState)

        if (connectionState === 'connected' && iceConnectionState === 'connected') {
          state.connectionStatus = 'connected'
          state.statusMessage = 'Connected'
          state.isConnected = true
          state.isConnecting = false
          console.log('✅ WebRTC connection established!')
        } else if (connectionState === 'connecting' || iceConnectionState === 'checking') {
          state.connectionStatus = 'connecting'
          state.statusMessage = 'Connecting...'
          console.log('🔄 WebRTC connecting...')
        } else if (connectionState === 'failed' || iceConnectionState === 'failed') {
          state.connectionStatus = 'failed'
          state.statusMessage = 'Connection Failed'
          state.isConnected = false
          state.isConnecting = false
          console.log('❌ WebRTC connection failed')
        }
      }
    }

    // Get user media
    const getUserMedia = async () => {
      try {
        console.log('🎥 Requesting camera and microphone access...')
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        })
        
        console.log('✅ Got media stream with tracks:', stream.getTracks().map(t => t.kind))
        state.localStream = stream
        if (localVideo.value) {
          localVideo.value.srcObject = stream
          console.log('✅ Set local video stream')
        }
        
        // Add tracks to peer connection
        if (state.peerConnection) {
          stream.getTracks().forEach(track => {
            console.log('➕ Adding track to peer connection:', track.kind)
            state.peerConnection.addTrack(track, stream)
          })
        }
        
        return stream
      } catch (error) {
        console.error('❌ Error accessing media devices:', error)
        alert('Please allow camera and microphone access to use the video chat.')
        throw error
      }
    }

    // Initialize socket connection
    const initializeSocket = () => {
      // Use production API endpoint for Vercel deployment
      const socketUrl = import.meta.env.VITE_SOCKET_URL || 
        (window.location.hostname === 'localhost' ? 'http://localhost:3001' : '/api/socket')
      state.socket = io(socketUrl)

      state.socket.on('connect', () => {
        console.log('Connected to signaling server')
        state.statusMessage = 'Connected to server'
      })

      state.socket.on('disconnect', () => {
        console.log('Disconnected from signaling server')
        state.statusMessage = 'Disconnected from server'
        state.connectionStatus = 'disconnected'
      })

      // Handle WebRTC signaling
      state.socket.on('offer', async (data) => {
        try {
          console.log('📨 Received offer from:', data.from)
          await state.peerConnection.setRemoteDescription(data.offer)
          console.log('✅ Set remote description (offer)')
          
          const answer = await state.peerConnection.createAnswer()
          await state.peerConnection.setLocalDescription(answer)
          console.log('📤 Sending answer to:', data.from)
          
          state.socket.emit('answer', {
            answer: answer,
            targetUser: data.from
          })
        } catch (error) {
          console.error('❌ Error handling offer:', error)
        }
      })

      state.socket.on('answer', async (data) => {
        try {
          console.log('📨 Received answer from:', data.from)
          await state.peerConnection.setRemoteDescription(data.answer)
          console.log('✅ Set remote description (answer)')
        } catch (error) {
          console.error('❌ Error handling answer:', error)
        }
      })

      state.socket.on('ice-candidate', async (data) => {
        try {
          console.log('🧊 Received ICE candidate from:', data.from)
          await state.peerConnection.addIceCandidate(data.candidate)
          console.log('✅ Added ICE candidate')
        } catch (error) {
          console.error('❌ Error adding ICE candidate:', error)
        }
      })

      // Handle create offer request
      state.socket.on('create-offer', async (data) => {
        try {
          console.log('📤 Creating offer for user:', data.targetUser)
          const offer = await state.peerConnection.createOffer()
          await state.peerConnection.setLocalDescription(offer)
          console.log('📤 Sending offer to:', data.targetUser)
          state.socket.emit('offer', {
            offer: offer,
            targetUser: data.targetUser
          })
        } catch (error) {
          console.error('❌ Error creating offer:', error)
        }
      })

      // Handle user joined room
      state.socket.on('user-joined-room', (data) => {
        console.log('New user joined room:', data.newUserId)
        state.statusMessage = 'Friend joined! Creating connection...'
      })

      // Handle user joined (when someone else joins)
      state.socket.on('user-joined', (data) => {
        console.log('Another user joined:', data.userId)
        state.statusMessage = 'Friend joined! Waiting for connection...'
      })

      // Handle room events
      state.socket.on('user-joined', () => {
        console.log('Another user joined the room')
        state.statusMessage = 'Friend joined!'
      })

      state.socket.on('user-left', () => {
        console.log('User left the room')
        state.statusMessage = 'Friend left the call'
        state.isConnected = false
        state.isConnecting = false
      })
    }

    // Start the call
    const startCall = async () => {
      try {
        state.isConnecting = true
        state.statusMessage = 'Getting ready...'
        
        // Initialize WebRTC and socket
        initializeWebRTC()
        initializeSocket()
        
        // Get user media
        await getUserMedia()
        
        // Join the room
        state.socket.emit('join-room', 'kids-room')
        
        state.statusMessage = 'Waiting for friend...'
        
      } catch (error) {
        console.error('Error starting call:', error)
        state.isConnecting = false
        state.statusMessage = 'Failed to start call'
      }
    }

    // End the call
    const endCall = () => {
      if (state.localStream) {
        state.localStream.getTracks().forEach(track => track.stop())
        state.localStream = null
      }
      
      if (state.peerConnection) {
        state.peerConnection.close()
        state.peerConnection = null
      }
      
      if (state.socket) {
        state.socket.disconnect()
        state.socket = null
      }
      
      state.isConnected = false
      state.isConnecting = false
      state.connectionStatus = 'disconnected'
      state.statusMessage = 'Call ended'
      
      // Clear video elements
      if (localVideo.value) localVideo.value.srcObject = null
      if (remoteVideo.value) remoteVideo.value.srcObject = null
    }

    // Toggle mute
    const toggleMute = () => {
      if (state.localStream) {
        const audioTrack = state.localStream.getAudioTracks()[0]
        if (audioTrack) {
          audioTrack.enabled = !audioTrack.enabled
          state.isMuted = !audioTrack.enabled
        }
      }
    }

    // Toggle video
    const toggleVideo = () => {
      if (state.localStream) {
        const videoTrack = state.localStream.getVideoTracks()[0]
        if (videoTrack) {
          videoTrack.enabled = !videoTrack.enabled
          state.isVideoOn = videoTrack.enabled
        }
      }
    }

    // Cleanup on unmount
    onUnmounted(() => {
      endCall()
    })

    return {
      // Refs
      localVideo,
      remoteVideo,
      
      // State
      isConnected: ref(state.isConnected),
      isConnecting: ref(state.isConnecting),
      isMuted: ref(state.isMuted),
      isVideoOn: ref(state.isVideoOn),
      connectionStatus: ref(state.connectionStatus),
      statusMessage: ref(state.statusMessage),
      
      // Methods
      startCall,
      endCall,
      toggleMute,
      toggleVideo
    }
  }
}
</script>

<style scoped>
.video-chat {
  background: white;
  border-radius: 20px;
  box-shadow: 0 20px 40px rgba(0,0,0,0.1);
  overflow: hidden;
  max-width: 800px;
  width: 100%;
  min-height: 600px;
  display: flex;
  flex-direction: column;
}

.status-bar {
  background: #f8f9fa;
  padding: 1rem;
  border-bottom: 1px solid #e9ecef;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  color: #6c757d;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #6c757d;
}

.status-indicator.connected .status-dot {
  background: #28a745;
}

.status-indicator.connecting .status-dot {
  background: #ffc107;
  animation: pulse 1.5s infinite;
}

.status-indicator.failed .status-dot {
  background: #dc3545;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.video-container {
  flex: 1;
  position: relative;
  background: #000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.video-wrapper {
  position: relative;
  border-radius: 10px;
  overflow: hidden;
}

.local-video {
  position: absolute;
  top: 20px;
  right: 20px;
  width: 200px;
  height: 150px;
  z-index: 10;
}

.remote-video {
  width: 100%;
  height: 100%;
}

.video-element {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.video-label {
  position: absolute;
  bottom: 10px;
  left: 10px;
  background: rgba(0,0,0,0.7);
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.8rem;
}

.waiting-screen,
.connecting-screen {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: white;
  text-align: center;
}

.waiting-icon,
.connecting-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.waiting-content h2,
.connecting-content h2 {
  margin: 0 0 0.5rem 0;
  font-size: 2rem;
}

.waiting-content p,
.connecting-content p {
  margin: 0 0 2rem 0;
  opacity: 0.8;
}

.start-button {
  background: #28a745;
  color: white;
  border: none;
  padding: 1rem 2rem;
  border-radius: 50px;
  font-size: 1.1rem;
  cursor: pointer;
  transition: all 0.3s ease;
}

.start-button:hover:not(:disabled) {
  background: #218838;
  transform: translateY(-2px);
}

.start-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(255,255,255,0.3);
  border-top: 4px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.controls {
  background: #f8f9fa;
  padding: 1.5rem;
  display: flex;
  justify-content: center;
  gap: 1rem;
  border-top: 1px solid #e9ecef;
}

.control-button {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  border: none;
  background: #e9ecef;
  font-size: 1.5rem;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.control-button:hover {
  background: #dee2e6;
  transform: scale(1.1);
}

.control-button.active {
  background: #28a745;
  color: white;
}

.control-button.end-call {
  background: #dc3545;
  color: white;
}

.control-button.end-call:hover {
  background: #c82333;
}

@media (max-width: 768px) {
  .video-chat {
    border-radius: 0;
    min-height: 100vh;
  }
  
  .local-video {
    width: 120px;
    height: 90px;
    top: 10px;
    right: 10px;
  }
  
  .controls {
    padding: 1rem;
  }
  
  .control-button {
    width: 50px;
    height: 50px;
    font-size: 1.2rem;
  }
}
</style> 