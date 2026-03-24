import { Router } from 'express'
import { login, logout, refreshAccessToken, getMe } from '../controllers/authController'
import { checkLogin } from '../middleware/authMiddleware'

const router = Router()

// Public routes (no login needed)
router.post('/login', login)
router.post('/refresh', refreshAccessToken)
router.post('/logout', logout)

// Protected route (must be logged in)
router.get('/me', checkLogin, getMe)

export default router
