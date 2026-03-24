// This manages the WebSocket connection for the whole app
// Any component can use useSocket() to get the socket and listen for events

import React, { createContext, useContext, useEffect, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAuth } from './AuthContext'

interface SocketContextType {
  socket: Socket | null
}

const SocketContext = createContext<SocketContextType>({ socket: null })

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [socket, setSocket] = useState<Socket | null>(null)

  useEffect(() => {
    // Only connect if user is logged in
    if (!user) {
      // If user logs out, disconnect the socket
      if (socket) {
        socket.disconnect()
        setSocket(null)
      }
      return
    }

    const token = localStorage.getItem('accessToken')

    // Connect to the WebSocket server
    // We pass the JWT token so the server knows who we are
    const newSocket = io('http://localhost:5000', {
      auth: { token }
    })

    newSocket.on('connect', () => {
      console.log('WebSocket connected!')
    })

    newSocket.on('disconnect', () => {
      console.log('WebSocket disconnected')
    })

    setSocket(newSocket)

    // Cleanup: disconnect when component unmounts or user logs out
    return () => {
      newSocket.disconnect()
    }
  }, [user]) // Re-run when user changes (login/logout)

  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  )
}

// Custom hook for components to use the socket
export function useSocket() {
  return useContext(SocketContext)
}
