import { Router } from 'express'
import { getNotifications, markOneAsRead, markAllAsRead } from '../controllers/notificationController'
import { checkLogin } from '../middleware/authMiddleware'

const router = Router()

router.use(checkLogin)

router.get('/', getNotifications)
router.patch('/read-all', markAllAsRead)
router.patch('/:id/read', markOneAsRead)

export default router
