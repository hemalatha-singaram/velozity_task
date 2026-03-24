import { Router } from 'express'
import { getDashboardStats } from '../controllers/dashboardController'
import { checkLogin } from '../middleware/authMiddleware'

const router = Router()

router.get('/', checkLogin, getDashboardStats)

export default router
