<template>
  <div class="video-chat">
    <!-- Connection Status -->
    <div class="status-bar">
      <div class="status-indicator" :class="connectionStatus">
        <span class="status-dot"></span>
        {{ statusMessage }}
        <span v-if="userId" class="user-id">({{ userId }})</span>
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
      <div class="video-wrapper remote-video" v-if="showRemoteVideo">
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
          <p v-if="!userId">
            Add ?user=dede or ?user=kia to the URL to start chatting
          </p>
          <p v-else>
            Click "Start Chat" to begin your video call
          </p>
          <button 
            @click="startCall" 
            class="start-button"
            :disabled="isConnecting || !userId"
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

    <!-- Chat Interface -->
    <div class="chat-container" v-if="isConnected || isConnecting">
      <div class="chat-header">
        <h3>💬 Chat</h3>
        <span class="chat-status">{{ chatMessages.length }} messages</span>
      </div>
      
      <div class="chat-messages" ref="chatMessages">
        <div 
          v-for="(message, index) in chatMessages" 
          :key="index"
          class="chat-message"
          :class="{ 'own-message': message.sender === userId }"
        >
          <div class="message-sender">{{ message.sender }}</div>
          <div class="message-text">{{ message.text }}</div>
          <div class="message-time">{{ formatTime(message.timestamp) }}</div>
        </div>
      </div>
      
      <div class="chat-input-container">
        <input 
          v-model="newMessage" 
          @keyup.enter="sendChatMessage"
          placeholder="Type a message..."
          class="chat-input"
          :disabled="!isConnected"
        />
        <button 
          @click="sendChatMessage" 
          class="send-button"
          :disabled="!isConnected || !newMessage.trim()"
        >
          📤
        </button>
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
import { ref, reactive, onMounted, onUnmounted, computed, nextTick } from 'vue'

export default {
  name: 'VideoChatProduction',
  setup() {
    // Refs for video elements
    const localVideo = ref(null)
    const remoteVideo = ref(null)
    const isConnected = ref(false)

    // Reactive state
    const state = reactive({
      isConnecting: false,
      isMuted: false,
      isVideoOn: true,
      connectionStatus: 'disconnected',
      statusMessage: 'Ready to start call',
      localStream: null,
      peerConnection: null,
      userId: null,
      pollingInterval: null,
      pendingIceCandidates: [],
      remoteStream: null,
      chatMessages: [],
      newMessage: '',
      friendUserId: null // Added for friend's user ID
    })

    // Computed properties
    const userId = computed(() => state.userId || '')
    const showRemoteVideo = computed(() => {
      return isConnected.value || state.isConnecting || !!state.peerConnection
    })

    // Initialize user ID from URL parameters
    const initializeUserId = () => {
      const urlParams = new URLSearchParams(window.location.search)
      const userIdParam = urlParams.get('user')
      
      if (userIdParam === 'dede' || userIdParam === 'kia') {
        state.userId = userIdParam
        console.log('✅ User ID set to:', state.userId)
        state.statusMessage = 'Ready to chat'
      } else {
        state.statusMessage = 'Invalid user ID. Use ?user=dede or ?user=kia'
        console.error('❌ Invalid user ID:', userIdParam)
      }
    }

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
        
        const setRemoteVideo = () => {
          if (remoteVideo.value && event.streams && event.streams[0]) {
            remoteVideo.value.srcObject = event.streams[0]
            state.remoteStream = event.streams[0]
            console.log('✅ Remote video stream set')
            return true
          } else {
            console.log('⏳ Remote video element not ready, will retry...')
            return false
          }
        }
        
        if (!setRemoteVideo()) {
          nextTick(() => {
            if (!setRemoteVideo()) {
              console.error('❌ Cannot set remote video stream after retry')
            }
          })
        }
      }

              // Handle ICE candidates
        state.peerConnection.onicecandidate = (event) => {
          if (event.candidate) {
            console.log('🧊 Sending ICE candidate')
            // Find the other user in the room
            const otherUser = getOtherUserInRoom()
            if (otherUser) {
              sendHttpMessage('ice-candidate', {
                candidate: event.candidate,
                to: otherUser
              })
            } else {
              console.log('⚠️ No target user found for ICE candidate')
            }
          }
        }

      // Handle connection state changes
      state.peerConnection.onconnectionstatechange = () => {
        console.log('🔗 Connection state changed:', state.peerConnection.connectionState)
        updateConnectionStatus()
      }

      // Handle ICE connection state changes
      state.peerConnection.oniceconnectionstatechange = () => {
        console.log('🧊 ICE connection state changed:', state.peerConnection.iceConnectionState)
        updateConnectionStatus()
      }
    }

    // Update connection status
    const updateConnectionStatus = () => {
      if (state.peerConnection) {
        const connectionState = state.peerConnection.connectionState
        const iceConnectionState = state.peerConnection.iceConnectionState

        if (connectionState === 'connected' && iceConnectionState === 'connected') {
          state.connectionStatus = 'connected'
          state.statusMessage = 'Connected'
          isConnected.value = true
          state.isConnecting = false
          console.log('✅ WebRTC connection established!')
          
          // Ensure remote video is set
          if (state.peerConnection.getReceivers) {
            const receivers = state.peerConnection.getReceivers()
            const videoReceiver = receivers.find(r => r.track && r.track.kind === 'video')
            if (videoReceiver && videoReceiver.track && remoteVideo.value) {
              const stream = new MediaStream([videoReceiver.track])
              remoteVideo.value.srcObject = stream
              state.remoteStream = stream
            } else if (state.remoteStream && remoteVideo.value) {
              remoteVideo.value.srcObject = state.remoteStream
            }
          }
        } else if (connectionState === 'connecting' || iceConnectionState === 'checking') {
          state.connectionStatus = 'connecting'
          state.statusMessage = `Connecting... (${connectionState}/${iceConnectionState})`
        } else if (connectionState === 'failed' || iceConnectionState === 'failed') {
          state.connectionStatus = 'failed'
          state.statusMessage = 'Connection Failed'
          isConnected.value = false
          state.isConnecting = false
        } else {
          state.statusMessage = `Status: ${connectionState}/${iceConnectionState}`
        }
      }
    }

    // Helper function to get the other user in the room
    const getOtherUserInRoom = () => {
      // For now, we'll use a simple approach - if we have a friend's ID stored
      // In a real app, you'd get this from the server
      if (state.friendUserId) {
        return state.friendUserId
      }
      // Fallback: if we're 'dede', send to 'kia', and vice versa
      return state.userId === 'dede' ? 'kia' : 'dede'
    }

    // Get user media
    const getUserMedia = async () => {
      try {
        console.log('🎥 Requesting camera and microphone access...')
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        })
        
        state.localStream = stream
        if (localVideo.value) {
          localVideo.value.srcObject = stream
        }
        
        // Add tracks to peer connection
        if (state.peerConnection) {
          stream.getTracks().forEach(track => {
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

    // Initialize HTTP polling signaling
    const initializeHttpPolling = () => {
      // First join the room
      joinRoom()
      
      // Then start polling
      state.pollingInterval = setInterval(pollMessages, 1000)
      console.log('🔄 Started HTTP polling for signaling')
    }

    // Join room
    const joinRoom = async () => {
      try {
        const response = await fetch('/api/socket', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'join',
            roomId: 'kids-room',
            userId: state.userId
          })
        })
        
        const data = await response.json()
        console.log('✅ Joined room:', data)
      } catch (error) {
        console.error('❌ Error joining room:', error)
      }
    }

    // Poll for messages
    const pollMessages = async () => {
      try {
        const response = await fetch('/api/socket', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'get-messages',
            roomId: 'kids-room',
            userId: state.userId
          })
        })
        
        const data = await response.json()
        
        if (data.messages) {
          console.log('📨 Polled messages:', data.messages.length)
          data.messages.forEach(handleMessage)
        }
      } catch (error) {
        console.error('❌ Error polling messages:', error)
      }
    }

    // Send HTTP message
    const sendHttpMessage = async (type, data) => {
      try {
        let action = type
        let messageData = data
        
        // Map message types to API actions
        if (type === 'offer') {
          action = 'offer'
          messageData = {
            targetUser: data.to,
            offer: data.offer
          }
        } else if (type === 'answer') {
          action = 'answer'
          messageData = {
            targetUser: data.to,
            answer: data.answer
          }
        } else if (type === 'ice-candidate') {
          action = 'ice-candidate'
          messageData = {
            candidate: data.candidate,
            to: data.to
          }
        } else if (type === 'chat-message') {
          action = 'chat-message'
          messageData = {
            message: data.text
          }
        }
        
        const response = await fetch('/api/socket', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action,
            roomId: 'kids-room',
            userId: state.userId,
            data: messageData
          })
        })
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
      } catch (error) {
        console.error('❌ Error sending message:', error)
      }
    }

    // Handle incoming messages
    const handleMessage = async (message) => {
      console.log('📨 Received message:', message.type)
      
      switch (message.type) {
        case 'user-joined':
          if (message.userId !== state.userId) {
            console.log('👋 Friend joined!')
            state.statusMessage = 'Friend joined! Creating connection...'
            isConnected.value = false
            state.isConnecting = true
            state.friendUserId = message.userId // Store friend's user ID
            
            if (state.userId < message.userId) {
              console.log('📤 Creating offer (our ID comes first)')
              setTimeout(() => {
                createOffer(message.userId)
              }, 100)
            } else {
              console.log('⏳ Waiting for offer (friend\'s ID comes first)')
              state.statusMessage = 'Friend joined! Waiting for connection...'
            }
          }
          break
          
        case 'offer':
          if (message.to === state.userId) {
            console.log('📨 Received offer from:', message.from)
            await handleOffer(message)
          }
          break
          
        case 'answer':
          if (message.to === state.userId) {
            console.log('📨 Received answer from:', message.from)
            await handleAnswer(message)
          }
          break
          
        case 'ice-candidate':
          if (message.from !== state.userId) {
            console.log('🧊 Received ICE candidate from:', message.from, 'to:', message.to)
            await handleIceCandidate(message)
          }
          break
          
        case 'user-left':
          if (message.userId !== state.userId) {
            console.log('👋 Friend left')
            state.statusMessage = 'Friend left the call'
            isConnected.value = false
            state.isConnecting = false
          }
          break
          
        case 'chat-message':
          if (message.from !== state.userId) {
            console.log('💬 Received chat message from:', message.from)
            addChatMessage(message.from, message.message)
          }
          break
          
        default:
          console.log('📨 Unknown message type:', message.type)
      }
    }

    // Handle offer
    const handleOffer = async (message) => {
      try {
        if (state.peerConnection.signalingState !== 'stable') {
          console.log('🔄 Signaling state not stable, rolling back...')
          await Promise.all([
            state.peerConnection.setLocalDescription({ type: 'rollback' }),
            state.peerConnection.setRemoteDescription(new RTCSessionDescription(message.offer))
          ])
        } else {
          await state.peerConnection.setRemoteDescription(new RTCSessionDescription(message.offer))
        }
        
        console.log('✅ Remote description set')
        
        // Add any pending ICE candidates
        while (state.pendingIceCandidates.length > 0) {
          const candidate = state.pendingIceCandidates.shift()
          await state.peerConnection.addIceCandidate(candidate)
          console.log('✅ Added pending ICE candidate')
        }
        
        // Create answer
        const answer = await state.peerConnection.createAnswer()
        await state.peerConnection.setLocalDescription(answer)
        
        console.log('📤 Sending answer')
        sendHttpMessage('answer', {
          answer: answer,
          to: message.from
        })
      } catch (error) {
        console.error('❌ Error handling offer:', error)
      }
    }

    // Handle answer
    const handleAnswer = async (message) => {
      try {
        if (state.peerConnection.signalingState === 'have-local-offer') {
          await state.peerConnection.setRemoteDescription(new RTCSessionDescription(message.answer))
          console.log('✅ Remote description set from answer')
          
          // Add any pending ICE candidates
          while (state.pendingIceCandidates.length > 0) {
            const candidate = state.pendingIceCandidates.shift()
            await state.peerConnection.addIceCandidate(candidate)
            console.log('✅ Added pending ICE candidate')
          }
        } else {
          console.log('⚠️ Ignoring answer - not in correct signaling state')
        }
      } catch (error) {
        console.error('❌ Error handling answer:', error)
      }
    }

    // Handle ICE candidate
    const handleIceCandidate = async (message) => {
      try {
        if (state.peerConnection.remoteDescription) {
          await state.peerConnection.addIceCandidate(new RTCIceCandidate(message.candidate))
          console.log('✅ ICE candidate added')
        } else {
          state.pendingIceCandidates.push(new RTCIceCandidate(message.candidate))
          console.log('⏳ ICE candidate queued')
        }
      } catch (error) {
        console.error('❌ Error adding ICE candidate:', error)
      }
    }

    // Create offer
    const createOffer = async (targetUserId) => {
      try {
        console.log('📤 Creating offer for:', targetUserId)
        
        const offer = await state.peerConnection.createOffer()
        await state.peerConnection.setLocalDescription(offer)
        
        console.log('📤 Sending offer')
        sendHttpMessage('offer', {
          offer: offer,
          to: targetUserId
        })
      } catch (error) {
        console.error('❌ Error creating offer:', error)
      }
    }

    // Start call
    const startCall = async () => {
      try {
        state.isConnecting = true
        state.statusMessage = 'Starting call...'
        
        // Initialize WebRTC
        initializeWebRTC()
        
        // Get user media
        await getUserMedia()
        
        // Initialize HTTP polling
        initializeHttpPolling()
        
        console.log('✅ Call started')
      } catch (error) {
        console.error('❌ Error starting call:', error)
        state.isConnecting = false
        state.statusMessage = 'Failed to start call'
      }
    }

    // End call
    const endCall = () => {
      console.log('📞 Ending call')
      
      // Leave the room
      leaveRoom()
      
      // Stop local stream
      if (state.localStream) {
        state.localStream.getTracks().forEach(track => track.stop())
        state.localStream = null
      }
      
      // Close peer connection
      if (state.peerConnection) {
        state.peerConnection.close()
        state.peerConnection = null
      }
      
      // Stop polling
      if (state.pollingInterval) {
        clearInterval(state.pollingInterval)
        state.pollingInterval = null
      }
      
      // Reset state
      isConnected.value = false
      state.isConnecting = false
      state.connectionStatus = 'disconnected'
      state.statusMessage = 'Disconnected'
      state.pendingIceCandidates = []
      state.remoteStream = null
      
      // Clear video elements
      if (localVideo.value) {
        localVideo.value.srcObject = null
      }
      if (remoteVideo.value) {
        remoteVideo.value.srcObject = null
      }
    }

    // Leave room
    const leaveRoom = async () => {
      try {
        const response = await fetch('/api/socket', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'leave',
            roomId: 'kids-room',
            userId: state.userId
          })
        })
        
        const data = await response.json()
        console.log('✅ Left room:', data)
      } catch (error) {
        console.error('❌ Error leaving room:', error)
      }
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

    // Chat functions
    const addChatMessage = (sender, text) => {
      state.chatMessages.push({
        sender,
        text,
        timestamp: new Date()
      })
      
      // Scroll to bottom
      nextTick(() => {
        const chatMessages = document.querySelector('.chat-messages')
        if (chatMessages) {
          chatMessages.scrollTop = chatMessages.scrollHeight
        }
      })
    }

    const sendChatMessage = () => {
      if (state.newMessage.trim() && isConnected.value) {
        sendHttpMessage('chat-message', {
          text: state.newMessage.trim()
        })
        
        addChatMessage(state.userId, state.newMessage.trim())
        state.newMessage = ''
      }
    }

    const formatTime = (timestamp) => {
      return new Date(timestamp).toLocaleTimeString()
    }

    // Lifecycle hooks
    onMounted(() => {
      initializeUserId()
    })

    onUnmounted(() => {
      endCall()
    })

    return {
      // Refs
      localVideo,
      remoteVideo,
      isConnected,
      
      // State
      isConnecting: computed(() => state.isConnecting),
      isMuted: computed(() => state.isMuted),
      isVideoOn: computed(() => state.isVideoOn),
      connectionStatus: computed(() => state.connectionStatus),
      statusMessage: computed(() => state.statusMessage),
      userId,
      showRemoteVideo,
      chatMessages: computed(() => state.chatMessages),
      newMessage: computed({
        get: () => state.newMessage,
        set: (value) => { state.newMessage = value }
      }),
      friendUserId: computed(() => state.friendUserId),
      
      // Methods
      startCall,
      endCall,
      toggleMute,
      toggleVideo,
      sendChatMessage,
      formatTime
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

.user-id {
  font-weight: bold;
  color: #007bff;
  margin-left: 0.5rem;
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

.chat-container {
  background: #f8f9fa;
  border-top: 1px solid #e9ecef;
  display: flex;
  flex-direction: column;
  height: 200px;
}

.chat-header {
  padding: 0.5rem 1rem;
  background: #e9ecef;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #dee2e6;
}

.chat-header h3 {
  margin: 0;
  font-size: 1rem;
  color: #495057;
}

.chat-status {
  font-size: 0.8rem;
  color: #6c757d;
}

.chat-messages {
  flex: 1;
  padding: 1rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.chat-message {
  background: white;
  padding: 0.5rem;
  border-radius: 8px;
  border: 1px solid #e9ecef;
  max-width: 80%;
}

.chat-message.own-message {
  align-self: flex-end;
  background: #007bff;
  color: white;
  border-color: #007bff;
}

.message-sender {
  font-size: 0.8rem;
  font-weight: bold;
  margin-bottom: 0.25rem;
}

.own-message .message-sender {
  color: rgba(255, 255, 255, 0.8);
}

.message-text {
  margin-bottom: 0.25rem;
  word-wrap: break-word;
}

.message-time {
  font-size: 0.7rem;
  opacity: 0.7;
}

.own-message .message-time {
  color: rgba(255, 255, 255, 0.7);
}

.chat-input-container {
  padding: 0.5rem 1rem;
  display: flex;
  gap: 0.5rem;
  border-top: 1px solid #e9ecef;
}

.chat-input {
  flex: 1;
  padding: 0.5rem;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  font-size: 0.9rem;
}

.chat-input:focus {
  outline: none;
  border-color: #007bff;
}

.chat-input:disabled {
  background: #f8f9fa;
  color: #6c757d;
}

.send-button {
  padding: 0.5rem 1rem;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
}

.send-button:hover:not(:disabled) {
  background: #0056b3;
}

.send-button:disabled {
  background: #6c757d;
  cursor: not-allowed;
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