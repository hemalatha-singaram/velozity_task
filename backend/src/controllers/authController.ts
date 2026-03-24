// This file handles everything about logging in, logging out, and refreshing tokens

import { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import prisma from '../lib/prisma'

// Helper function: create a short-lived access token (15 minutes)
function createAccessToken(user: { id: string; email: string; role: string; name: string }) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    process.env.JWT_SECRET as string,
    { expiresIn: '15m' } // Expires in 15 minutes
  )
}

// Helper function: create a long-lived refresh token (7 days)
function createRefreshToken(userId: string) {
  return jwt.sign(
    { id: userId },
    process.env.REFRESH_TOKEN_SECRET as string,
    { expiresIn: '7d' } // Expires in 7 days
  )
}

// POST /api/auth/login
// User sends { email, password } -> we check it and send back tokens
export async function login(req: Request, res: Response) {
  const { email, password } = req.body

  // Basic input check
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' })
  }

  try {
    // Find the user in the database by email
    const user = await prisma.user.findUnique({
      where: { email }
    })

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' })
    }

    // Compare the entered password with the hashed password in DB
    const isPasswordCorrect = await bcrypt.compare(password, user.password)

    if (!isPasswordCorrect) {
      return res.status(401).json({ message: 'Invalid email or password.' })
    }

    // Create the two tokens
    const accessToken = createAccessToken(user)
    const refreshToken = createRefreshToken(user.id)

    // Save refresh token in the database (so we can invalidate it on logout)
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7 days from now

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt
      }
    })

    // Store refresh token in an HttpOnly cookie (more secure than localStorage)
    // HttpOnly means JavaScript cannot access it - only the browser sends it automatically
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,    // JS cannot read this cookie
      secure: false,     // Set to true in production (HTTPS only)
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds
    })

    // Send access token and user info to the frontend
    return res.json({
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    })
  } catch (error) {
    console.error('Login error:', error)
    return res.status(500).json({ message: 'Something went wrong. Please try again.' })
  }
}

// POST /api/auth/refresh
// When access token expires, frontend calls this to get a new one
// The refresh token is automatically sent via cookie
export async function refreshAccessToken(req: Request, res: Response) {
  // Get the refresh token from the cookie
  const refreshToken = req.cookies.refreshToken

  if (!refreshToken) {
    return res.status(401).json({ message: 'No refresh token. Please log in.' })
  }

  try {
    // Verify the refresh token
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET as string) as { id: string }

    // Check if this token exists in database (wasn't deleted on logout)
    const tokenInDB = await prisma.refreshToken.findUnique({
      where: { token: refreshToken }
    })

    if (!tokenInDB) {
      return res.status(401).json({ message: 'Refresh token is invalid. Please log in again.' })
    }

    // Check if expired
    if (new Date() > tokenInDB.expiresAt) {
      await prisma.refreshToken.delete({ where: { token: refreshToken } })
      return res.status(401).json({ message: 'Session expired. Please log in again.' })
    }

    // Get user info
    const user = await prisma.user.findUnique({ where: { id: decoded.id } })

    if (!user) {
      return res.status(401).json({ message: 'User not found.' })
    }

    // Create a new access token
    const newAccessToken = createAccessToken(user)

    return res.json({ accessToken: newAccessToken })
  } catch (error) {
    return res.status(401).json({ message: 'Invalid refresh token. Please log in again.' })
  }
}

// POST /api/auth/logout
// Delete the refresh token from DB and clear the cookie
export async function logout(req: Request, res: Response) {
  const refreshToken = req.cookies.refreshToken

  if (refreshToken) {
    // Delete from database
    await prisma.refreshToken.deleteMany({
      where: { token: refreshToken }
    })
  }

  // Clear the cookie
  res.clearCookie('refreshToken')

  return res.json({ message: 'Logged out successfully.' })
}

// GET /api/auth/me
// Returns the currently logged-in user's info
// (req.user is set by the checkLogin middleware)
export async function getMe(req: Request, res: Response) {
  return res.json({ user: req.user })
}
