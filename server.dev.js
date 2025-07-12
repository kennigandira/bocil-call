const express = require('express')
const http = require('http')
const WebSocket = require('ws')
const cors = require('cors')

const app = express()
const server = http.createServer(app)

// Enable CORS for development
app.use(cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true
}))

// WebSocket server for signaling
const wss = new WebSocket.Server({ server })

// Store connected users and rooms
const rooms = new Map()
const users = new Map()

console.log('🔧 Development signaling server starting...')

wss.on('connection', (ws, req) => {
    console.log('🔌 New WebSocket connection')

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message)
            console.log('📨 Received message:', data.type)

            switch (data.type) {
                case 'join-room':
                    handleJoinRoom(ws, data)
                    break
                case 'offer':
                    handleOffer(ws, data)
                    break
                case 'answer':
                    handleAnswer(ws, data)
                    break
                case 'ice-candidate':
                    handleIceCandidate(ws, data)
                    break
                case 'chat-message':
                    handleChatMessage(ws, data)
                    break
                default:
                    console.log('❌ Unknown message type:', data.type)
            }
        } catch (error) {
            console.error('❌ Error parsing message:', error)
        }
    })

    ws.on('close', () => {
        handleUserDisconnect(ws)
    })

    ws.on('error', (error) => {
        console.error('❌ WebSocket error:', error)
    })
})

function handleJoinRoom(ws, data) {
    const { roomId, userId } = data

    // Store user info
    ws.userId = userId
    ws.roomId = roomId
    users.set(userId, ws)

    // Get or create room
    if (!rooms.has(roomId)) {
        rooms.set(roomId, new Set())
    }
    const room = rooms.get(roomId)
    room.add(userId)

    console.log(`👤 User ${userId} joined room ${roomId}`)
    console.log(`📊 Room ${roomId} now has ${room.size} users`)

    // Notify other users in the room
    room.forEach(userIdInRoom => {
        if (userIdInRoom !== userId) {
            const userWs = users.get(userIdInRoom)
            if (userWs && userWs.readyState === WebSocket.OPEN) {
                userWs.send(JSON.stringify({
                    type: 'user-joined',
                    userId: userId
                }))
            }
        }
    })

    // If there are 2 users, start connection
    if (room.size === 2) {
        const [user1, user2] = Array.from(room)
        console.log(`🔗 Starting connection between ${user1} and ${user2}`)
    }
}

function handleOffer(ws, data) {
    const { to, offer } = data
    const from = ws.userId

    console.log(`📤 Offer received from ${from} to ${to}`)

    const targetWs = users.get(to)
    if (targetWs && targetWs.readyState === WebSocket.OPEN) {
        targetWs.send(JSON.stringify({
            type: 'offer',
            from: from,
            to: to,
            offer: offer
        }))
    }
}

function handleAnswer(ws, data) {
    const { to, answer } = data
    const from = ws.userId

    console.log(`📤 Answer received from ${from} to ${to}`)

    const targetWs = users.get(to)
    if (targetWs && targetWs.readyState === WebSocket.OPEN) {
        targetWs.send(JSON.stringify({
            type: 'answer',
            from: from,
            to: to,
            answer: answer
        }))
    }
}

function handleIceCandidate(ws, data) {
    const { to, candidate } = data
    const from = ws.userId

    console.log(`🧊 ICE candidate broadcast from ${from} to ${to}`)

    const targetWs = users.get(to)
    if (targetWs && targetWs.readyState === WebSocket.OPEN) {
        targetWs.send(JSON.stringify({
            type: 'ice-candidate',
            from: from,
            to: to,
            candidate: candidate
        }))
    }
}

function handleChatMessage(ws, data) {
    const { text, targetUser } = data
    const from = ws.userId

    console.log(`💬 Chat message from ${from}: ${text}`)

    // Broadcast to all users in the same room
    const room = rooms.get(ws.roomId)
    if (room) {
        room.forEach(userIdInRoom => {
            if (userIdInRoom !== from) {
                const userWs = users.get(userIdInRoom)
                if (userWs && userWs.readyState === WebSocket.OPEN) {
                    userWs.send(JSON.stringify({
                        type: 'chat-message',
                        from: from,
                        text: text
                    }))
                }
            }
        })
    }
}

function handleUserDisconnect(ws) {
    const userId = ws.userId
    const roomId = ws.roomId

    if (userId) {
        console.log(`👋 User ${userId} disconnected`)

        // Remove from users
        users.delete(userId)

        // Remove from room
        if (roomId && rooms.has(roomId)) {
            const room = rooms.get(roomId)
            room.delete(userId)

            console.log(`📊 Room ${roomId} now has ${room.size} users`)

            // Notify other users
            room.forEach(userIdInRoom => {
                const userWs = users.get(userIdInRoom)
                if (userWs && userWs.readyState === WebSocket.OPEN) {
                    userWs.send(JSON.stringify({
                        type: 'user-left',
                        userId: userId
                    }))
                }
            })

            // Delete empty room
            if (room.size === 0) {
                rooms.delete(roomId)
                console.log(`🗑️ Room ${roomId} deleted (empty)`)
            }
        }
    }
}

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        environment: 'development',
        connections: wss.clients.size,
        rooms: rooms.size
    })
})

// Start server
const PORT = process.env.PORT || 3001

server.listen(PORT, () => {
    console.log(`🔧 Development signaling server running on port ${PORT}`)
    console.log(`📊 Health check available at http://localhost:${PORT}/health`)
})

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 Received SIGTERM, shutting down gracefully...')
    server.close(() => {
        console.log('✅ Server closed')
        process.exit(0)
    })
})

process.on('SIGINT', () => {
    console.log('🛑 Received SIGINT, shutting down gracefully...')
    server.close(() => {
        console.log('✅ Server closed')
        process.exit(0)
    })
}) 