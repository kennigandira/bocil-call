const express = require('express')
const { createServer } = require('http')
const WebSocket = require('ws')
const cors = require('cors')

const app = express()
const server = createServer(app)

// Enable CORS
app.use(cors({
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST']
}))

// Create WebSocket server
const wss = new WebSocket.Server({ server })

// Store connected users by room
const rooms = new Map()

wss.on('connection', (ws) => {
    console.log('User connected:', ws.id)
    // Don't generate random ID here, wait for user to send their ID

    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data)
            handleMessage(ws, message)
        } catch (error) {
            console.error('Error parsing message:', error)
        }
    })

    ws.on('close', () => {
        console.log('User disconnected:', ws.id)
        handleDisconnect(ws)
    })
})

// Handle incoming messages
const handleMessage = (ws, message) => {
    switch (message.type) {
        case 'join-room':
            handleJoinRoom(ws, message)
            break
        case 'offer':
            handleOffer(ws, message)
            break
        case 'answer':
            handleAnswer(ws, message)
            break
        case 'ice-candidate':
            handleIceCandidate(ws, message)
            break
    }
}

// Handle room joining
const handleJoinRoom = (ws, message) => {
    const roomId = message.roomId
    const userId = message.userId

    // Set the user ID for this connection
    ws.id = userId

    // Get or create room
    if (!rooms.has(roomId)) {
        rooms.set(roomId, new Set())
    }
    const room = rooms.get(roomId)
    room.add(ws)

    console.log(`User ${ws.id} joined room ${roomId}`)
    console.log(`Room ${roomId} now has ${room.size} users`)

    // If there are already users in the room, start the connection process
    if (room.size > 1) {
        // Get the first user in the room (excluding the new user)
        const otherUsers = Array.from(room).filter(user => user !== ws)
        if (otherUsers.length > 0) {
            const targetUser = otherUsers[0]

            console.log(`Starting connection between ${ws.id} and ${targetUser.id}`)

            // Notify the new user to create an offer
            ws.send(JSON.stringify({
                type: 'user-joined',
                userId: targetUser.id
            }))

            // Notify the existing user that a new user joined
            targetUser.send(JSON.stringify({
                type: 'user-joined',
                userId: ws.id
            }))
        }
    } else {
        // First user in room, notify them
        ws.send(JSON.stringify({
            type: 'user-joined',
            userId: ws.id
        }))
    }
}

// Handle WebRTC offer
const handleOffer = (ws, message) => {
    const targetUser = findUserById(message.data.targetUser)
    if (targetUser) {
        console.log('Offer received from', ws.id, 'to', targetUser.id)
        targetUser.send(JSON.stringify({
            type: 'offer',
            offer: message.data.offer,
            from: ws.id,
            to: targetUser.id
        }))
    }
}

// Handle WebRTC answer
const handleAnswer = (ws, message) => {
    const targetUser = findUserById(message.data.targetUser)
    if (targetUser) {
        console.log('Answer received from', ws.id, 'to', targetUser.id)
        targetUser.send(JSON.stringify({
            type: 'answer',
            answer: message.data.answer,
            from: ws.id,
            to: targetUser.id
        }))
    }
}

// Handle ICE candidates
const handleIceCandidate = (ws, message) => {
    if (message.data.targetUser === 'broadcast') {
        // Broadcast to all other users in the same room
        for (const [roomId, room] of rooms.entries()) {
            if (room.has(ws)) {
                room.forEach(user => {
                    if (user !== ws) {
                        console.log('ICE candidate broadcast from', ws.id, 'to', user.id)
                        user.send(JSON.stringify({
                            type: 'ice-candidate',
                            candidate: message.data.candidate,
                            from: ws.id,
                            to: user.id
                        }))
                    }
                })
                break
            }
        }
    } else {
        // Send to specific user
        const targetUser = findUserById(message.data.targetUser)
        if (targetUser) {
            console.log('ICE candidate from', ws.id, 'to', targetUser.id)
            targetUser.send(JSON.stringify({
                type: 'ice-candidate',
                candidate: message.data.candidate,
                from: ws.id,
                to: targetUser.id
            }))
        }
    }
}

// Find user by ID
const findUserById = (userId) => {
    for (const room of rooms.values()) {
        for (const user of room) {
            if (user.id === userId) {
                return user
            }
        }
    }
    return null
}

// Handle disconnection
const handleDisconnect = (ws) => {
    // Remove user from all rooms
    for (const [roomId, room] of rooms.entries()) {
        if (room.has(ws)) {
            room.delete(ws)

            // Notify other users in the room
            room.forEach(user => {
                user.send(JSON.stringify({
                    type: 'user-left',
                    userId: ws.id
                }))
            })

            // Clean up empty rooms
            if (room.size === 0) {
                rooms.delete(roomId)
                console.log(`Room ${roomId} deleted (empty)`)
            } else {
                console.log(`Room ${roomId} now has ${room.size} users`)
            }
            break
        }
    }
}

const PORT = process.env.PORT || 3001

server.listen(PORT, () => {
    console.log(`Signaling server running on port ${PORT}`)
})

