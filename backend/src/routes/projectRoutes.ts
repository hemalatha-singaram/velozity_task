import { Router } from 'express'
import { getAllProjects, getProjectById, createProject, getAllClients } from '../controllers/projectController'
import { checkLogin, checkRole } from '../middleware/authMiddleware'

const router = Router()

// All project routes require login
router.use(checkLogin)

router.get('/', getAllProjects)                                    // All roles
router.get('/clients', getAllClients)                             // For dropdown
router.get('/:id', getProjectById)                               // All roles
router.post('/', checkRole('ADMIN', 'PM'), createProject)        // Admin + PM only

export default router
