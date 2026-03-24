// This file holds the Socket.io server instance
// We create it here so both index.ts and taskController.ts can import it
// without causing a circular dependency (A imports B imports A = crash)

import { Server } from 'socket.io'

// Start with null - gets assigned in index.ts when server starts
let io: Server | null = null

// Called once in index.ts to store the io instance
export function setIO(instance: Server) {
  io = instance
}

// Called in controllers to emit events
export function getIO(): Server {
  if (!io) {
    throw new Error('Socket.io not initialized yet!')
  }
  return io
}
