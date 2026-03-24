import { Router } from 'express'
import {
  getTasks,
  createTask,
  updateTaskStatus,
  getTaskActivity,
  getActivityFeed,
  getDevelopers
} from '../controllers/taskController'
import { checkLogin, checkRole } from '../middleware/authMiddleware'

const router = Router()

// All task routes require login
router.use(checkLogin)

router.get('/', getTasks)                                             // All roles (filtered by role)
router.get('/feed', getActivityFeed)                                  // Activity feed (role filtered)
router.get('/users', getDevelopers)                                   // Get developer list
router.post('/', checkRole('ADMIN', 'PM'), createTask)               // Admin + PM only
router.patch('/:id/status', updateTaskStatus)                         // All roles (filtered)
router.get('/:id/activity', getTaskActivity)                         // All roles

export default router
