// This handles all task operations
// The most important part: when a task status changes,
// we log it in the database AND send a real-time WebSocket event

import { Request, Response } from 'express'
import prisma from '../lib/prisma'
import { getIO } from '../lib/socket' // Import WebSocket helper

// Human-readable status labels
const statusLabels: Record<string, string> = {
  TODO: 'To Do',
  IN_PROGRESS: 'In Progress',
  IN_REVIEW: 'In Review',
  DONE: 'Done',
  OVERDUE: 'Overdue'
}

// GET /api/tasks?projectId=xxx&status=xxx&priority=xxx
// Get tasks with optional filters
export async function getTasks(req: Request, res: Response) {
  const user = req.user!
  const { projectId, status, priority } = req.query

  try {
    // Build the filter object based on query params
    const where: any = {}

    if (projectId) where.projectId = projectId as string
    if (status) where.status = status as string
    if (priority) where.priority = priority as string

    // Role-based filtering
    if (user.role === 'DEVELOPER') {
      // Developer can only see their own tasks
      where.assignedToId = user.id
    } else if (user.role === 'PM') {
      // PM can only see tasks in their own projects
      where.project = { pmId: user.id }
    }
    // Admin sees everything - no extra filter needed

    const tasks = await prisma.task.findMany({
      where,
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        project: { select: { id: true, name: true } }
      },
      orderBy: [
        { priority: 'desc' },  // Critical first
        { dueDate: 'asc' }     // Earliest due date first
      ]
    })

    return res.json({ tasks })
  } catch (error) {
    console.error('Get tasks error:', error)
    return res.status(500).json({ message: 'Failed to get tasks.' })
  }
}

// POST /api/tasks
// Create a new task (Admin and PM only)
export async function createTask(req: Request, res: Response) {
  const { title, description, projectId, assignedToId, priority, dueDate } = req.body
  const user = req.user!

  if (!title || !projectId) {
    return res.status(400).json({ message: 'Task title and project are required.' })
  }

  try {
    // PM can only create tasks in their own projects
    if (user.role === 'PM') {
      const project = await prisma.project.findUnique({ where: { id: projectId } })
      if (!project || project.pmId !== user.id) {
        return res.status(403).json({ message: 'You can only create tasks in your own projects.' })
      }
    }

    const task = await prisma.task.create({
      data: {
        title,
        description,
        projectId,
        assignedToId: assignedToId || null,
        priority: priority || 'MEDIUM',
        dueDate: dueDate ? new Date(dueDate) : null
      },
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        project: { select: { id: true, name: true } }
      }
    })

    // If a developer was assigned, create a notification for them
    if (assignedToId) {
      const notification = await prisma.notification.create({
        data: {
          message: `You have been assigned "${title}"`,
          userId: assignedToId
        }
      })

      // Send real-time notification to that developer via WebSocket
      getIO().to(`user_${assignedToId}`).emit('new_notification', notification)
    }

    return res.status(201).json({ message: 'Task created!', task })
  } catch (error) {
    console.error('Create task error:', error)
    return res.status(500).json({ message: 'Failed to create task.' })
  }
}

// PATCH /api/tasks/:id/status
// Update task status - THE CORE REAL-TIME FEATURE
export async function updateTaskStatus(req: Request, res: Response) {
  const { id } = req.params
  const { status } = req.body
  const user = req.user!

  const validStatuses = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE']
  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({ message: 'Invalid status.' })
  }

  try {
    // Get the task with its project and assignee info
    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        project: { select: { id: true, name: true, pmId: true } },
        assignedTo: { select: { id: true, name: true } }
      }
    })

    if (!task) {
      return res.status(404).json({ message: 'Task not found.' })
    }

    // Developer can only update tasks assigned to them
    if (user.role === 'DEVELOPER' && task.assignedToId !== user.id) {
      return res.status(403).json({ message: 'You can only update your own tasks.' })
    }

    // PM can only update tasks in their own projects
    if (user.role === 'PM' && task.project.pmId !== user.id) {
      return res.status(403).json({ message: 'You can only update tasks in your projects.' })
    }

    const oldStatus = task.status

    // Update the task status in database
    const updatedTask = await prisma.task.update({
      where: { id },
      data: { status: status as any },
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        project: { select: { id: true, name: true } }
      }
    })

    // Create an activity log entry (REQUIRED BY ASSIGNMENT - stored in DB)
    const logDescription = `${user.name} moved "${task.title}" from ${statusLabels[oldStatus]} → ${statusLabels[status]}`

    const activityLog = await prisma.activityLog.create({
      data: {
        description: logDescription,
        userId: user.id,
        taskId: id,
        projectId: task.projectId
      },
      include: {
        user: { select: { id: true, name: true } }
      }
    })

    // ------- REAL-TIME WEBSOCKET UPDATES -------

    // 1. Send activity to the global admin feed
    getIO().to('role_ADMIN').emit('activity_update', activityLog)

    // 2. Send activity to PM's feed (only for their project)
    getIO().to(`project_${task.projectId}`).emit('activity_update', activityLog)

    // 3. Send task update to everyone viewing this project
    getIO().to(`project_${task.projectId}`).emit('task_updated', updatedTask)

    // 4. If moved to IN_REVIEW, notify the PM
    if (status === 'IN_REVIEW' && task.project.pmId) {
      const pmNotification = await prisma.notification.create({
        data: {
          message: `"${task.title}" has been moved to In Review`,
          userId: task.project.pmId
        }
      })
      getIO().to(`user_${task.project.pmId}`).emit('new_notification', pmNotification)
    }

    // 5. Send updated notification count to the user who made the change
    getIO().to(`user_${user.id}`).emit('activity_update', activityLog)

    return res.json({ message: 'Task status updated!', task: updatedTask, activityLog })
  } catch (error) {
    console.error('Update task status error:', error)
    return res.status(500).json({ message: 'Failed to update task status.' })
  }
}

// GET /api/tasks/:id/activity
// Get the activity log for a specific task
export async function getTaskActivity(req: Request, res: Response) {
  const { id } = req.params

  try {
    const logs = await prisma.activityLog.findMany({
      where: { taskId: id },
      include: {
        user: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'desc' }
    })

    return res.json({ logs })
  } catch (error) {
    return res.status(500).json({ message: 'Failed to get activity.' })
  }
}

// GET /api/tasks/activity/feed
// Get the activity feed based on user's role
// Admin -> all activity
// PM -> only their projects
// Developer -> only their tasks
export async function getActivityFeed(req: Request, res: Response) {
  const user = req.user!

  try {
    const where: any = {}

    if (user.role === 'PM') {
      // Only activity from projects this PM manages
      where.project = { pmId: user.id }
    } else if (user.role === 'DEVELOPER') {
      // Only activity on tasks assigned to this developer
      where.task = { assignedToId: user.id }
    }
    // Admin: no filter (sees everything)

    // Return last 20 activity events (for missed event catchup)
    const logs = await prisma.activityLog.findMany({
      where,
      include: {
        user: { select: { id: true, name: true } },
        task: { select: { id: true, title: true } },
        project: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 20 // Last 20 events
    })

    return res.json({ logs })
  } catch (error) {
    console.error('Activity feed error:', error)
    return res.status(500).json({ message: 'Failed to get activity feed.' })
  }
}

// GET /api/tasks/users
// Get all developers (for assignment dropdown)
export async function getDevelopers(req: Request, res: Response) {
  try {
    const developers = await prisma.user.findMany({
      where: { role: 'DEVELOPER' },
      select: { id: true, name: true, email: true }
    })
    return res.json({ developers })
  } catch (error) {
    return res.status(500).json({ message: 'Failed to get developers.' })
  }
}
