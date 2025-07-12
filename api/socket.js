import { Server } from 'socket.io'

const ioHandler = (req, res) => {
    if (!res.socket.server.io) {
        const io = new Server(res.socket.server, {
            cors: {
                origin: process.env.NODE_ENV === 'production'
                    ? ['https://your-domain.vercel.app']
                    : ['http://localhost:3000'],
                methods: ['GET', 'POST']
            }
        })

        // Store connected users by room
        const rooms = new Map()

        io.on('connection', (socket) => {
            console.log('User connected:', socket.id)

            // Join a room
            socket.on('join-room', (roomId) => {
                socket.join(roomId)

                // Get or create room
                if (!rooms.has(roomId)) {
                    rooms.set(roomId, new Set())
                }
                const room = rooms.get(roomId)
                room.add(socket.id)

                console.log(`User ${socket.id} joined room ${roomId}`)
                console.log(`Room ${roomId} now has ${room.size} users`)

                // Notify other users in the room
                socket.to(roomId).emit('user-joined', { userId: socket.id })

                // If there are already users in the room, start the connection process
                if (room.size > 1) {
                    // Get the first user in the room (excluding the new user)
                    const otherUsers = Array.from(room).filter(id => id !== socket.id)
                    if (otherUsers.length > 0) {
                        const targetUser = otherUsers[0]

                        // Notify the new user to create an offer
                        socket.emit('create-offer', { targetUser })

                        // Notify the existing user that a new user joined
                        socket.to(targetUser).emit('user-joined-room', {
                            newUserId: socket.id
                        })
                    }
                }
            })

            // Handle WebRTC offer
            socket.on('offer', (data) => {
                console.log('Offer received from', socket.id, 'to', data.targetUser)
                socket.to(data.targetUser).emit('offer', {
                    offer: data.offer,
                    from: socket.id
                })
            })

            // Handle WebRTC answer
            socket.on('answer', (data) => {
                console.log('Answer received from', socket.id, 'to', data.targetUser)
                socket.to(data.targetUser).emit('answer', {
                    answer: data.answer,
                    from: socket.id
                })
            })

            // Handle ICE candidates
            socket.on('ice-candidate', (data) => {
                console.log('ICE candidate from', socket.id)
                if (data.targetUser === 'broadcast') {
                    // Broadcast to all other users in the same room
                    socket.broadcast.emit('ice-candidate', {
                        candidate: data.candidate,
                        from: socket.id
                    })
                } else {
                    // Send to specific user
                    socket.to(data.targetUser).emit('ice-candidate', {
                        candidate: data.candidate,
                        from: socket.id
                    })
                }
            })

            // Handle disconnection
            socket.on('disconnect', () => {
                console.log('User disconnected:', socket.id)

                // Remove user from all rooms
                for (const [roomId, room] of rooms.entries()) {
                    if (room.has(socket.id)) {
                        room.delete(socket.id)

                        // Notify other users in the room
                        socket.to(roomId).emit('user-left', { userId: socket.id })

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
            })
        })

        res.socket.server.io = io
    }

    res.end()
}

export default ioHandler 