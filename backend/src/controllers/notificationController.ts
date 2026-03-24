// This handles getting and marking notifications

import { Request, Response } from 'express'
import prisma from '../lib/prisma'

// GET /api/notifications
// Get all notifications for the logged-in user
export async function getNotifications(req: Request, res: Response) {
  const user = req.user!

  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' }
    })

    // Also count how many are unread (for the badge number)
    const unreadCount = notifications.filter(n => !n.isRead).length

    return res.json({ notifications, unreadCount })
  } catch (error) {
    return res.status(500).json({ message: 'Failed to get notifications.' })
  }
}

// PATCH /api/notifications/:id/read
// Mark one notification as read
export async function markOneAsRead(req: Request, res: Response) {
  const { id } = req.params
  const user = req.user!

  try {
    // Make sure this notification belongs to the logged-in user
    const notification = await prisma.notification.findFirst({
      where: { id, userId: user.id }
    })

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found.' })
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { isRead: true }
    })

    return res.json({ notification: updated })
  } catch (error) {
    return res.status(500).json({ message: 'Failed to mark notification as read.' })
  }
}

// PATCH /api/notifications/read-all
// Mark all notifications as read
export async function markAllAsRead(req: Request, res: Response) {
  const user = req.user!

  try {
    await prisma.notification.updateMany({
      where: { userId: user.id, isRead: false },
      data: { isRead: true }
    })

    return res.json({ message: 'All notifications marked as read.' })
  } catch (error) {
    return res.status(500).json({ message: 'Failed to mark notifications as read.' })
  }
}
