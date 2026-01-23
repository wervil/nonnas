import { Server as ServerIO } from 'socket.io'
import type { NextApiRequest, NextApiResponse } from 'next'
import type { Server as NetServer } from 'http'
import { Server as SocketIOServer } from 'socket.io'

// Extend the NextApiResponse type to include the socket server
type NextApiResponseWithSocket = NextApiResponse & {
    socket: {
        server: NetServer & {
            io: SocketIOServer
        }
    }
}

export const config = {
    api: {
        bodyParser: false,
    },
}

const ioHandler = (req: NextApiRequest, res: NextApiResponseWithSocket) => {
    if (!res.socket.server.io) {
        const path = '/api/socket'
        console.log(`* Starting Socket.io server on ${path}`)

        // Create the Socket.IO server
        const io = new ServerIO(res.socket.server, {
            path: path,
            addTrailingSlash: false,
            cors: {
                origin: '*',
                methods: ['GET', 'POST'],
            },
        })

        // Event handlers
        io.on('connection', (socket) => {
            console.log('User connected:', socket.id)

            // Join a conversation room
            socket.on('join-conversation', (conversationId: string) => {
                socket.join(conversationId)
                console.log(`User ${socket.id} joined room ${conversationId}`)
            })

            // Handle sending messages
            socket.on('send-message', (message) => {
                const room = message.conversation_id.toString();
                console.log(`Broadcasting message to room ${room}`);
                socket.to(room).emit('new-message', message);
            })

            socket.on('disconnect', () => {
                console.log('User disconnected:', socket.id)
            })
        })

        res.socket.server.io = io
    } else {
        // console.log('Socket.io server already running')
    }

    res.end()
}

export default ioHandler
