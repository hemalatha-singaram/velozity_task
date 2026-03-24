// This file has two middleware functions:
// 1. checkLogin - verifies the JWT token (are you logged in?)
// 2. checkRole  - verifies the user has the right role (are you allowed?)

import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

// We extend the Request object to carry user info after login check
// This is TypeScript telling us: req.user might exist on requests
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string
        email: string
        role: string
        name: string
      }
    }
  }
}

// checkLogin - runs before any protected route
// It reads the Authorization header, checks the JWT token, and saves user info on req.user
export function checkLogin(req: Request, res: Response, next: NextFunction) {
  // The token is sent in the header like: Authorization: Bearer <token>
  const authHeader = req.headers['authorization']

  if (!authHeader) {
    return res.status(401).json({ message: 'No token provided. Please log in.' })
  }

  // Split "Bearer <token>" to get just the token part
  const token = authHeader.split(' ')[1]

  if (!token) {
    return res.status(401).json({ message: 'Invalid token format.' })
  }

  try {
    // Verify the token using our secret key from .env
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
      id: string
      email: string
      role: string
      name: string
    }

    // Attach user info to the request so controllers can use it
    req.user = decoded

    // Move on to the next function (the actual route handler)
    next()
  } catch (error) {
    return res.status(401).json({ message: 'Token is invalid or expired. Please log in again.' })
  }
}

// checkRole - runs after checkLogin
// It checks if the logged-in user has the required role
// Usage: checkRole('ADMIN') or checkRole('ADMIN', 'PM')
export function checkRole(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    // req.user was set by checkLogin above
    if (!req.user) {
      return res.status(401).json({ message: 'Not logged in.' })
    }

    // Check if this user's role is in the allowed roles list
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Access denied. This action requires one of: ${allowedRoles.join(', ')}`
      })
    }

    // Role is fine, continue
    next()
  }
}
