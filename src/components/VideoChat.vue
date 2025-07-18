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
import { ref, reactive, onMounted, onUnmounted, computed, nextTick, watch } from 'vue'

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
      userId: null,
      pollingInterval: null,
      socket: null, // Added for WebSocket
      pendingIceCandidates: [], // Added for queuing ICE candidates
      remoteStream: null, // Store remote stream for later use
      chatMessages: [], // Chat messages
      newMessage: '' // Current message being typed
    })

    // Computed property for safe user ID access
    const userId = computed(() => state.userId || '')
    
    // Computed property to show remote video when we have a peer connection
    const showRemoteVideo = computed(() => {
      return state.isConnected || state.isConnecting || !!state.peerConnection
    })

    // Initialize user ID from URL parameters
    const initializeUserId = () => {
      const urlParams = new URLSearchParams(window.location.search)
      const userIdParam = urlParams.get('user')
      
      // Only accept "dede" and "kia" as valid user IDs
      if (userIdParam === 'dede' || userIdParam === 'kia') {
        state.userId = userIdParam
        console.log('✅ User ID set to:', state.userId)
        state.statusMessage = 'Ready to chat'
      } else {
        // Show error for invalid user ID
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
      console.debug('boi', state.peerConnection)
      
      // Handle incoming streams
      state.peerConnection.ontrack = (event) => {
        console.log('🎥 Received remote track:', event.track.kind)
        console.log('📺 Remote video element:', remoteVideo.value)
        console.log('📺 Remote streams:', event.streams)
        
        // Try to set the remote video stream
        const setRemoteVideo = () => {
          if (remoteVideo.value && event.streams && event.streams[0]) {
            remoteVideo.value.srcObject = event.streams[0]
            state.remoteStream = event.streams[0] // Store for later use
            console.log('✅ Remote video stream set')
            return true
          } else {
            console.log('⏳ Remote video element not ready, will retry...')
            return false
          }
        }
        
        // Try immediately
        if (!setRemoteVideo()) {
          // If failed, try again after DOM update
          nextTick(() => {
            if (!setRemoteVideo()) {
              console.error('❌ Cannot set remote video stream after retry:', {
                remoteVideo: remoteVideo.value,
                streams: event.streams
              })
            }
          })
        }
      }

      // Handle ICE candidates
      state.peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('🧊 Sending ICE candidate')
          sendMessage('ice-candidate', {
            candidate: event.candidate,
            targetUser: 'broadcast' // Send to all other users
          })
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
        const signalingState = state.peerConnection.signalingState

        console.log('🔍 Connection Status Update:', {
          connectionState,
          iceConnectionState,
          signalingState,
          isConnected: state.isConnected,
          isConnecting: state.isConnecting
        })

        console.log('🔍 Checking connection condition:', {
          connectionState,
          iceConnectionState,
          condition: connectionState === 'connected' && iceConnectionState === 'connected',
          currentIsConnected: state.isConnected
        })
        
        if (connectionState === 'connected' && iceConnectionState === 'connected') {
          console.log('✅ Condition met! Setting isConnected to true')
          state.connectionStatus = 'connected'
          state.statusMessage = 'Connected'
          state.isConnected = true
          state.isConnecting = false
          console.log('✅ WebRTC connection established!')
          
          // Ensure remote video is set if we have streams
          if (state.peerConnection.getReceivers) {
            const receivers = state.peerConnection.getReceivers()
            console.log('📺 Checking receivers:', receivers.length)
            const videoReceiver = receivers.find(r => r.track && r.track.kind === 'video')
            if (videoReceiver && videoReceiver.track && remoteVideo.value) {
              const stream = new MediaStream([videoReceiver.track])
              remoteVideo.value.srcObject = stream
              state.remoteStream = stream
              console.log('✅ Set remote video stream on connection')
            } else if (state.remoteStream && remoteVideo.value) {
              // Use stored remote stream
              remoteVideo.value.srcObject = state.remoteStream
              console.log('✅ Set stored remote video stream on connection')
            } else {
              console.log('❌ No video receiver or remote video element:', {
                videoReceiver: !!videoReceiver,
                hasTrack: videoReceiver?.track,
                remoteVideo: !!remoteVideo.value,
                hasRemoteStream: !!state.remoteStream
              })
            }
          }
        } else if (connectionState === 'connecting' || iceConnectionState === 'checking') {
          state.connectionStatus = 'connecting'
          state.statusMessage = `Connecting... (${connectionState}/${iceConnectionState})`
          console.log('🔄 WebRTC connecting...')
        } else if (connectionState === 'failed' || iceConnectionState === 'failed') {
          state.connectionStatus = 'failed'
          state.statusMessage = 'Connection Failed'
          state.isConnected = false
          state.isConnecting = false
          console.log('❌ WebRTC connection failed')
        } else {
          // Log other states for debugging
          state.statusMessage = `Status: ${connectionState}/${iceConnectionState}`
          console.log('ℹ️ Other connection state:', {
            connectionState,
            iceConnectionState,
            signalingState
          })
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
        
        // If we already have a remote description, we need to create a new offer
        if (state.peerConnection.remoteDescription && state.peerConnection.remoteDescription.type === 'answer') {
          console.log('🔄 Creating new offer after adding tracks')
          createOffer(state.userId === 'dede' ? 'kia' : 'dede')
        }
        
        return stream
      } catch (error) {
        console.error('❌ Error accessing media devices:', error)
        alert('Please allow camera and microphone access to use the video chat.')
        throw error
      }
    }

    // Initialize signaling based on environment
    const initializeSignaling = () => {
      // Use WebSocket for local development, HTTP polling for production
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        initializeWebSocket()
      } else {
        initializeHttpPolling()
      }
    }

    // Initialize WebSocket signaling (for local development)
    const initializeWebSocket = () => {
      console.log('🔌 Connecting to WebSocket signaling server...')
      
      // Connect to local WebSocket server
      const socket = new WebSocket('ws://localhost:3001')
      
      socket.onopen = () => {
        console.log('✅ WebSocket connected')
        state.socket = socket
        
        // Set the user ID for this connection
        socket.userId = state.userId
        
        // Join the room
        socket.send(JSON.stringify({
          type: 'join-room',
          roomId: 'kids-room',
          userId: state.userId
        }))
      }
      
      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          handleWebSocketMessage(message)
        } catch (error) {
          console.error('❌ Error parsing WebSocket message:', error)
        }
      }
      
      socket.onerror = (error) => {
        console.error('❌ WebSocket error:', error)
      }
      
      socket.onclose = () => {
        console.log('🔌 WebSocket disconnected')
        state.socket = null
      }
    }

    // Initialize HTTP polling signaling (for production)
    const initializeHttpPolling = () => {
      state.pollingInterval = setInterval(pollMessages, 1000)
      console.log('🔄 Started HTTP polling for signaling')
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
          data.messages.forEach(handleMessage)
        }
      } catch (error) {
        console.error('❌ Error polling messages:', error)
      }
    }

    // Handle incoming messages
    const handleMessage = async (message) => {
      console.log('📨 Received message:', message.type)
      
      switch (message.type) {
        case 'user-joined':
          if (message.userId !== state.userId) {
            console.log('👋 Friend joined!')
            console.log('🔍 User ID comparison:', {
              ourId: state.userId,
              friendId: message.userId,
              ourIdFirst: state.userId < message.userId
            })
            state.statusMessage = 'Friend joined! Creating connection...'
            
            // Reset connection state when friend joins
            state.isConnected = false
            state.isConnecting = true
            
            // Only create offer if our ID comes first alphabetically
            // This ensures only one user creates the offer
            if (state.userId < message.userId) {
              console.log('📤 Creating offer (our ID comes first)')
              // Small delay to ensure both users are ready
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
            console.log('📋 Answer details:', {
              from: message.from,
              hasAnswer: !!message.answer,
              answerType: message.answer?.type
            })
            await handleAnswer(message)
          }
          break
          
        case 'ice-candidate':
          if (message.from !== state.userId) {
            console.log('🧊 Received ICE candidate from:', message.from)
            await handleIceCandidate(message)
          }
          break
          
        case 'user-left':
          if (message.userId !== state.userId) {
            console.log('👋 Friend left')
            state.statusMessage = 'Friend left the call'
            state.isConnected = false
            state.isConnecting = false
          }
          break
        case 'chat-message':
          if (message.from !== state.userId) {
            console.log('💬 Received chat message from:', message.from)
            addChatMessage(message.from, message.text)
          }
          break
        default:
          console.log('📨 Unknown message type:', message.type)
      }
    }

    // Handle WebSocket messages
    const handleWebSocketMessage = (message) => {
      console.log('📨 Received WebSocket message:', message)
      
      switch (message.type) {
        case 'offer':
          if (message.to === state.userId) {
            console.log('📨 Received offer from:', message.from)
            handleOffer(message)
          }
          break
        case 'answer':
          if (message.to === state.userId) {
            console.log('📨 Received answer from:', message.from)
            console.log('📋 Answer details:', {
              from: message.from,
              hasAnswer: !!message.answer,
              answerType: message.answer?.type
            })
            handleAnswer(message)
          }
          break
        case 'ice-candidate':
          if (message.from !== state.userId) {
            console.log('🧊 Received ICE candidate from:', message.from)
            handleIceCandidate(message)
          }
          break
        case 'user-joined':
          if (message.userId !== state.userId) {
            console.log('👋 Friend joined!')
            console.log('🔍 User ID comparison:', {
              ourId: state.userId,
              friendId: message.userId,
              ourIdFirst: state.userId < message.userId
            })
            state.statusMessage = 'Friend joined! Creating connection...'
            
            // Reset connection state when friend joins
            state.isConnected = false
            state.isConnecting = true
            
            // Only create offer if our ID comes first alphabetically
            // This ensures only one user creates the offer
            if (state.userId < message.userId) {
              console.log('📤 Creating offer (our ID comes first)')
              // Small delay to ensure both users are ready
              setTimeout(() => {
                createOffer(message.userId)
              }, 100)
            } else {
              console.log('⏳ Waiting for offer (friend\'s ID comes first)')
              state.statusMessage = 'Friend joined! Waiting for connection...'
            }
          }
          break
        case 'user-left':
          if (message.userId !== state.userId) {
            console.log('👋 Friend left')
            state.statusMessage = 'Friend left the call'
            state.isConnected = false
            state.isConnecting = false
          }
          break
        case 'chat-message':
          if (message.from !== state.userId) {
            console.log('💬 Received chat message from:', message.from)
            addChatMessage(message.from, message.text)
          }
          break
        default:
          console.log('📨 Unknown message type:', message.type)
      }
    }

    // Send message to signaling server
    const sendMessage = async (action, data = {}) => {
      try {
        if (state.socket) {
          state.socket.send(JSON.stringify({
            type: action,
            roomId: 'kids-room',
            userId: state.userId,
            data
          }))
        } else {
          await fetch('/api/socket', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action,
              roomId: 'kids-room',
              userId: state.userId,
              data
            })
          })
        }
      } catch (error) {
        console.error('❌ Error sending message:', error)
      }
    }

    // Create and send offer
    const createOffer = async (targetUser) => {
      try {
        // Don't create offer if we're already negotiating
        if (state.peerConnection.signalingState !== 'stable') {
          console.log('⏳ Skipping offer creation - already negotiating')
          return
        }
        
        console.log('📤 Creating offer for user:', targetUser)
        const offer = await state.peerConnection.createOffer()
        await state.peerConnection.setLocalDescription(offer)
        console.log('📤 Sending offer to:', targetUser)
        
        await sendMessage('offer', {
          offer: offer,
          targetUser: targetUser
        })
        
        console.log('✅ Offer sent successfully, waiting for answer...')
      } catch (error) {
        console.error('❌ Error creating offer:', error)
        // If there's an error, try to recover
        if (error.name === 'InvalidStateError') {
          console.log('🔄 Attempting to recover from offer creation error...')
          try {
            await state.peerConnection.setLocalDescription({ type: 'rollback' })
            const offer = await state.peerConnection.createOffer()
            await state.peerConnection.setLocalDescription(offer)
            await sendMessage('offer', {
              offer: offer,
              targetUser: targetUser
            })
            console.log('✅ Offer sent successfully after recovery, waiting for answer...')
          } catch (recoveryError) {
            console.error('❌ Failed to recover from offer creation error:', recoveryError)
          }
        }
      }
    }

    // Handle incoming offer
    const handleOffer = async (message) => {
      try {
        console.log('📨 Received offer from:', message.from)
        
        // If we're already negotiating, we might need to rollback
        if (state.peerConnection.signalingState !== 'stable') {
          console.log('🔄 Rolling back due to negotiation conflict')
          try {
            await state.peerConnection.setLocalDescription({ type: 'rollback' })
          } catch (rollbackError) {
            console.log('ℹ️ Rollback failed, continuing...')
          }
        }
        
        await state.peerConnection.setRemoteDescription(message.offer)
        console.log('✅ Set remote description (offer)')
        
        const answer = await state.peerConnection.createAnswer()
        await state.peerConnection.setLocalDescription(answer)
        console.log('📤 Sending answer to:', message.from)
        
        await sendMessage('answer', {
          answer: answer,
          targetUser: message.from
        })

        // Add pending ICE candidates after remote description is set
        await addPendingIceCandidates()
      } catch (error) {
        console.error('❌ Error handling offer:', error)
        // If it's a state error, just log it and continue
        if (error.name === 'InvalidStateError') {
          console.log('ℹ️ Offer already processed, continuing...')
          return
        }
        // If there's a negotiation conflict, try to recover
        if (error.name === 'InvalidAccessError' && error.message.includes('m-lines')) {
          console.log('🔄 Attempting to recover from negotiation conflict...')
          try {
            await state.peerConnection.setLocalDescription({ type: 'rollback' })
            await state.peerConnection.setRemoteDescription(message.offer)
            const answer = await state.peerConnection.createAnswer()
            await state.peerConnection.setLocalDescription(answer)
            await sendMessage('answer', {
              answer: answer,
              targetUser: message.from
            })
            await addPendingIceCandidates()
          } catch (recoveryError) {
            console.error('❌ Failed to recover from negotiation conflict:', recoveryError)
          }
        }
      }
    }

    // Handle incoming answer
    const handleAnswer = async (message) => {
      try {
        console.log('📨 Received answer from:', message.from)
        console.log('🔧 Setting remote description with answer...')
        await state.peerConnection.setRemoteDescription(message.answer)
        console.log('✅ Set remote description (answer)')
        console.log('📦 Adding pending ICE candidates...')
        // Add pending ICE candidates after remote description is set
        await addPendingIceCandidates()
        console.log('✅ Answer handling completed')
      } catch (error) {
        console.error('❌ Error handling answer:', error)
        // If it's a state error, just log it and continue
        if (error.name === 'InvalidStateError') {
          console.log('ℹ️ Answer already processed, continuing...')
        }
      }
    }

    // Handle incoming ICE candidate
    const handleIceCandidate = async (message) => {
      try {
        // Only add ICE candidates if we have a remote description
        if (state.peerConnection.remoteDescription) {
          await state.peerConnection.addIceCandidate(message.candidate)
          console.log('✅ Added ICE candidate')
        } else {
          console.log('⏳ Queuing ICE candidate (waiting for remote description)')
          // Queue the candidate to add later
          if (!state.pendingIceCandidates) {
            state.pendingIceCandidates = []
          }
          state.pendingIceCandidates.push(message.candidate)
        }
      } catch (error) {
        console.error('❌ Error adding ICE candidate:', error)
      }
    }

    // Add pending ICE candidates after remote description is set
    const addPendingIceCandidates = async () => {
      if (state.pendingIceCandidates && state.pendingIceCandidates.length > 0) {
        console.log('📦 Adding pending ICE candidates:', state.pendingIceCandidates.length)
        for (const candidate of state.pendingIceCandidates) {
          try {
            await state.peerConnection.addIceCandidate(candidate)
            console.log('✅ Added pending ICE candidate')
          } catch (error) {
            console.error('❌ Error adding pending ICE candidate:', error)
          }
        }
        state.pendingIceCandidates = []
      }
    }

    // Start the call
    const startCall = async () => {
      try {
        // Check if user ID is valid
        if (!state.userId) {
          state.statusMessage = 'Invalid user ID. Use ?user=dede or ?user=kia'
          return
        }
        
        console.log('🚀 Starting call with user ID:', state.userId)
        
        // Reset connection state
        state.isConnected = false
        state.isConnecting = true
        state.statusMessage = 'Getting ready...'
        
        // Clear pending ICE candidates
        state.pendingIceCandidates = []
        
        // Close existing connections
        if (state.peerConnection) {
          state.peerConnection.close()
        }
        if (state.socket) {
          state.socket.close()
        }
        
        // Initialize WebRTC and signaling
        initializeWebRTC()
        initializeSignaling()
        
        // Get user media first
        await getUserMedia()
        
        // Join the room after getting media
        await sendMessage('join', {})
        
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
      
      // Clear chat messages
      state.chatMessages = []
      state.newMessage = ''
      
      if (state.pollingInterval) {
        clearInterval(state.pollingInterval)
        state.pollingInterval = null
      }
      
      if (state.socket) {
        state.socket.close()
        state.socket = null
      }
      
      // Leave the room
      sendMessage('leave', {})
      
      state.isConnected = false
      state.isConnecting = false
      state.connectionStatus = 'disconnected'
      state.statusMessage = 'Call ended'
      
      // Clear video elements
      if (localVideo.value) localVideo.value.srcObject = null
      if (remoteVideo.value) remoteVideo.value.srcObject = null
    }

    // Chat functions
    const addChatMessage = (sender, text) => {
      state.chatMessages.push({
        sender,
        text,
        timestamp: new Date()
      })
      
      // Scroll to bottom of chat
      nextTick(() => {
        const chatMessages = document.querySelector('.chat-messages')
        if (chatMessages) {
          chatMessages.scrollTop = chatMessages.scrollHeight
        }
      })
    }

    const sendChatMessage = async () => {
      console.debug('====', {state})
      if (!state.newMessage.trim() || !state.isConnected) return
      const messageText = state.newMessage.trim()
      state.newMessage = ''

      
      // Add message to local chat
      addChatMessage(state.userId, messageText)
      
      // Send message to signaling server
      try {
        await sendMessage('chat-message', {
          text: messageText,
          targetUser: 'broadcast' // Send to all users in room
        })
        console.log('💬 Sent chat message:', messageText)
      } catch (error) {
        console.error('❌ Error sending chat message:', error)
      }
    }

    const formatTime = (timestamp) => {
      return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
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
      // Close WebSocket connection
      if (state.socket) {
        state.socket.close()
      }
    })

    // Initialize user ID when component mounts
    onMounted(() => {
      initializeUserId()
    })
    
    // Watch for remote video element availability
    watch(remoteVideo, (newElement) => {
      if (newElement && state.remoteStream) {
        console.log('📺 Remote video element became available, setting stream')
        newElement.srcObject = state.remoteStream
      }
    })

    return {
      // Refs
      localVideo,
      remoteVideo,
      
      // Computed
      showRemoteVideo,
      
      // State
      isConnected: computed(() => state.isConnected),
      isConnecting: computed(() => state.isConnecting),
      isMuted: computed(() => state.isMuted),
      isVideoOn: computed(() => state.isVideoOn),
      connectionStatus: computed(() => state.connectionStatus),
      statusMessage: computed(() => state.statusMessage),
      userId, // Add computed userId
      
      // Chat state
      chatMessages: computed(() => state.chatMessages),
      newMessage: computed({
        get: () => state.newMessage,
        set: (value) => { state.newMessage = value }
      }),
      
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