// This is the main file that starts our backend server

import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import dotenv from 'dotenv'

// Load all the variables from .env file (like DATABASE_URL, JWT_SECRET etc)
dotenv.config()

// Import our route files
import authRoutes from './routes/authRoutes'
import projectRoutes from './routes/projectRoutes'
import taskRoutes from './routes/taskRoutes'
import notificationRoutes from './routes/notificationRoutes'
import dashboardRoutes from './routes/dashboardRoutes'

// Import WebSocket setup function
import { setupSocket } from './socket/socketHandler'
import { setIO } from './lib/socket'

// Import the background job that checks for overdue tasks
import { startOverdueJob } from './jobs/overdueJob'

// Create the Express app
const app = express()

// Wrap it in an HTTP server (required for WebSocket to work)
const httpServer = createServer(app)

// Create the WebSocket server on top of the HTTP server
const io = new Server(httpServer, {
  cors: {
    origin: 'http://localhost:5173', // Our frontend URL
    credentials: true               // Allow cookies to be sent
  }
})

// ------- MIDDLEWARE -------
// These run on every single request before it reaches any route

// Allow requests from our frontend (CORS = Cross Origin Resource Sharing)
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}))

// Let us read JSON from request body (e.g. when frontend sends { email, password })
app.use(express.json())

// Let us read cookies (needed for refresh token stored in cookie)
app.use(cookieParser())

// ------- ROUTES -------
// Each route handles a different part of the app

app.use('/api/auth', authRoutes)               // Login, logout, refresh
app.use('/api/projects', projectRoutes)        // Create, read projects
app.use('/api/tasks', taskRoutes)              // Create, read, update tasks
app.use('/api/notifications', notificationRoutes) // Get and mark notifications
app.use('/api/dashboard', dashboardRoutes)     // Dashboard stats per role

// Simple health check route to confirm server is running
app.get('/api/health', (req, res) => {
  res.json({ message: 'Server is running!' })
})

// ------- START WEBSOCKET -------
setIO(io) // Store io so controllers can use it
setupSocket(io)

// ------- START BACKGROUND JOB -------
startOverdueJob()

// ------- START SERVER -------
const PORT = process.env.PORT || 5000

httpServer.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`)
})
