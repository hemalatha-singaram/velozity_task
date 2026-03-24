// This file manages all WebSocket connections
//
// HOW IT WORKS:
// When a user opens the website, their browser connects to this WebSocket server
// We put them in "rooms" based on their role and which project they are viewing
// When a task changes, we send the update to the right rooms only
//
// ROOMS:
// - role_ADMIN        -> all admin users join this room
// - project_<id>      -> users join when viewing a specific project
// - user_<id>         -> each user has a personal room for notifications

import { Server, Socket } from 'socket.io'
import jwt from 'jsonwebtoken'

export function setupSocket(io: Server) {
  // This runs when any browser connects to the WebSocket
  io.on('connection', (socket: Socket) => {
    console.log('A user connected:', socket.id)

    // The frontend sends the JWT access token when connecting
    // We verify it to know who this socket belongs to
    const token = socket.handshake.auth.token as string

    if (!token) {
      console.log('Socket connected without token - disconnecting')
      socket.disconnect()
      return
    }

    let user: { id: string; role: string; name: string }

    try {
      user = jwt.verify(token, process.env.JWT_SECRET as string) as any
    } catch (err) {
      console.log('Invalid socket token - disconnecting')
      socket.disconnect()
      return
    }

    console.log(`User ${user.name} (${user.role}) connected via WebSocket`)

    // Put user in their personal room (for notifications)
    socket.join(`user_${user.id}`)

    // If admin, join the global admin feed room
    if (user.role === 'ADMIN') {
      socket.join('role_ADMIN')
    }

    // Frontend sends this event when a user navigates to a project page
    // We add them to that project's room so they get live updates
    socket.on('join_project', (projectId: string) => {
      socket.join(`project_${projectId}`)
      console.log(`${user.name} joined project room: ${projectId}`)
    })

    // Frontend sends this when user leaves a project page
    socket.on('leave_project', (projectId: string) => {
      socket.leave(`project_${projectId}`)
      console.log(`${user.name} left project room: ${projectId}`)
    })

    // When user disconnects (closes browser tab etc.)
    socket.on('disconnect', () => {
      console.log(`User ${user.name} disconnected`)
    })
  })
}
