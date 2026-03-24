// This returns dashboard stats specific to each user's role

import { Request, Response } from 'express'
import prisma from '../lib/prisma'

// GET /api/dashboard
// Returns different data depending on the role
export async function getDashboardStats(req: Request, res: Response) {
  const user = req.user!

  try {
    if (user.role === 'ADMIN') {
      // Admin sees everything
      const totalProjects = await prisma.project.count()

      const tasksByStatus = await prisma.task.groupBy({
        by: ['status'],
        _count: { status: true }
      })

      const overdueCount = await prisma.task.count({
        where: { isOverdue: true }
      })

      const totalUsers = await prisma.user.count()

      return res.json({
        role: 'ADMIN',
        totalProjects,
        tasksByStatus,
        overdueCount,
        totalUsers
      })
    }

    if (user.role === 'PM') {
      // PM sees their own projects summary
      const myProjects = await prisma.project.findMany({
        where: { pmId: user.id },
        include: { tasks: true }
      })

      const tasksByPriority = await prisma.task.groupBy({
        by: ['priority'],
        where: {
          project: { pmId: user.id }
        },
        _count: { priority: true }
      })

      // Tasks due this week
      const today = new Date()
      const nextWeek = new Date()
      nextWeek.setDate(today.getDate() + 7)

      const dueSoon = await prisma.task.findMany({
        where: {
          project: { pmId: user.id },
          dueDate: { gte: today, lte: nextWeek },
          status: { not: 'DONE' }
        },
        include: {
          assignedTo: { select: { id: true, name: true } },
          project: { select: { id: true, name: true } }
        },
        orderBy: { dueDate: 'asc' }
      })

      return res.json({
        role: 'PM',
        totalProjects: myProjects.length,
        tasksByPriority,
        dueSoon
      })
    }

    if (user.role === 'DEVELOPER') {
      // Developer sees their own tasks sorted by priority then due date
      const myTasks = await prisma.task.findMany({
        where: { assignedToId: user.id },
        include: {
          project: { select: { id: true, name: true } }
        },
        orderBy: [
          { priority: 'desc' },
          { dueDate: 'asc' }
        ]
      })

      const tasksByStatus = await prisma.task.groupBy({
        by: ['status'],
        where: { assignedToId: user.id },
        _count: { status: true }
      })

      return res.json({
        role: 'DEVELOPER',
        myTasks,
        tasksByStatus
      })
    }
  } catch (error) {
    console.error('Dashboard error:', error)
    return res.status(500).json({ message: 'Failed to load dashboard.' })
  }
}
