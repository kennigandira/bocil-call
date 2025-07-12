// Simple HTTP-based signaling for Vercel serverless
const rooms = new Map()

export default function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

    if (req.method === 'OPTIONS') {
        res.status(200).end()
        return
    }

    const { action, roomId, userId, data } = req.body || {}

    console.log('API call:', { action, roomId, userId })

    switch (action) {
        case 'join':
            handleJoin(res, roomId, userId)
            break
        case 'leave':
            handleLeave(res, roomId, userId)
            break
        case 'offer':
            handleOffer(res, roomId, userId, data)
            break
        case 'answer':
            handleAnswer(res, roomId, userId, data)
            break
        case 'ice-candidate':
            handleIceCandidate(res, roomId, userId, data)
            break
        case 'chat-message':
            handleChatMessage(res, roomId, userId, data)
            break
        case 'get-messages':
            handleGetMessages(res, roomId, userId)
            break
        default:
            res.status(400).json({ error: 'Invalid action' })
    }
}

function handleJoin(res, roomId, userId) {
    if (!rooms.has(roomId)) {
        rooms.set(roomId, {
            users: new Set(),
            messages: []
        })
    }

    const room = rooms.get(roomId)
    room.users.add(userId)

    // Notify other users
    const otherUsers = Array.from(room.users).filter(id => id !== userId)
    if (otherUsers.length > 0) {
        room.messages.push({
            type: 'user-joined',
            userId: userId,
            timestamp: Date.now()
        })
    }

    console.log(`User ${userId} joined room ${roomId}, total users: ${room.users.size}`)
    res.json({ success: true, roomSize: room.users.size })
}

function handleLeave(res, roomId, userId) {
    const room = rooms.get(roomId)
    if (room) {
        room.users.delete(userId)
        room.messages.push({
            type: 'user-left',
            userId: userId,
            timestamp: Date.now()
        })

        if (room.users.size === 0) {
            rooms.delete(roomId)
            console.log(`Room ${roomId} deleted (empty)`)
        }
    }

    res.json({ success: true })
}

function handleOffer(res, roomId, userId, data) {
    const room = rooms.get(roomId)
    if (room) {
        room.messages.push({
            type: 'offer',
            from: userId,
            to: data.targetUser,
            offer: data.offer,
            timestamp: Date.now()
        })
    }

    res.json({ success: true })
}

function handleAnswer(res, roomId, userId, data) {
    const room = rooms.get(roomId)
    if (room) {
        room.messages.push({
            type: 'answer',
            from: userId,
            to: data.targetUser,
            answer: data.answer,
            timestamp: Date.now()
        })
    }

    res.json({ success: true })
}

function handleIceCandidate(res, roomId, userId, data) {
    const room = rooms.get(roomId)
    if (room) {
        room.messages.push({
            type: 'ice-candidate',
            from: userId,
            to: data.to, // Include the target user
            candidate: data.candidate,
            timestamp: Date.now()
        })
    }

    res.json({ success: true })
}

function handleChatMessage(res, roomId, userId, data) {
    const room = rooms.get(roomId)
    if (room) {
        room.messages.push({
            type: 'chat-message',
            from: userId,
            message: data.message,
            timestamp: Date.now()
        })
    }

    res.json({ success: true })
}

function handleGetMessages(res, roomId, userId) {
    const room = rooms.get(roomId)
    if (!room) {
        res.json({ messages: [] })
        return
    }

    // Get messages for this user
    const userMessages = room.messages.filter(msg =>
        msg.to === userId ||
        msg.to === undefined || // Include broadcast messages (like ICE candidates)
        (msg.type === 'user-joined' && msg.userId !== userId) ||
        (msg.type === 'user-left' && msg.userId !== userId) ||
        (msg.type === 'chat-message' && msg.from !== userId) // Include chat messages from others
    )

    res.json({ messages: userMessages })
} 