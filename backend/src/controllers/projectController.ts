// This file handles all project-related actions
// Create project, get projects, get one project

import { Request, Response } from 'express'
import prisma from '../lib/prisma'

// GET /api/projects
// Returns projects based on who is asking:
// - Admin: all projects
// - PM: only their own projects
// - Developer: projects where they have assigned tasks
export async function getAllProjects(req: Request, res: Response) {
  const user = req.user!

  try {
    let projects

    if (user.role === 'ADMIN') {
      // Admin sees everything
      projects = await prisma.project.findMany({
        include: {
          client: true,
          pm: { select: { id: true, name: true, email: true } },
          tasks: true
        },
        orderBy: { createdAt: 'desc' }
      })
    } else if (user.role === 'PM') {
      // PM sees only their projects
      projects = await prisma.project.findMany({
        where: { pmId: user.id },
        include: {
          client: true,
          pm: { select: { id: true, name: true, email: true } },
          tasks: true
        },
        orderBy: { createdAt: 'desc' }
      })
    } else {
      // Developer sees projects where they have tasks assigned
      projects = await prisma.project.findMany({
        where: {
          tasks: {
            some: { assignedToId: user.id }
          }
        },
        include: {
          client: true,
          pm: { select: { id: true, name: true, email: true } },
          tasks: {
            where: { assignedToId: user.id } // Only their tasks
          }
        },
        orderBy: { createdAt: 'desc' }
      })
    }

    return res.json({ projects })
  } catch (error) {
    console.error('Get projects error:', error)
    return res.status(500).json({ message: 'Failed to get projects.' })
  }
}

// GET /api/projects/:id
// Get one project by ID (with all its tasks and activity logs)
export async function getProjectById(req: Request, res: Response) {
  const { id } = req.params
  const user = req.user!

  try {
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        client: true,
        pm: { select: { id: true, name: true, email: true } },
        tasks: {
          include: {
            assignedTo: { select: { id: true, name: true, email: true } }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    })

    if (!project) {
      return res.status(404).json({ message: 'Project not found.' })
    }

    // PM can only see their own projects
    if (user.role === 'PM' && project.pmId !== user.id) {
      return res.status(403).json({ message: 'You can only view your own projects.' })
    }

    return res.json({ project })
  } catch (error) {
    console.error('Get project error:', error)
    return res.status(500).json({ message: 'Failed to get project.' })
  }
}

// POST /api/projects
// Create a new project (Admin and PM only)
export async function createProject(req: Request, res: Response) {
  const { name, description, clientId } = req.body
  const user = req.user!

  if (!name || !clientId) {
    return res.status(400).json({ message: 'Project name and client are required.' })
  }

  try {
    // Check if the client exists
    const client = await prisma.client.findUnique({ where: { id: clientId } })
    if (!client) {
      return res.status(404).json({ message: 'Client not found.' })
    }

    // The PM ID is either the logged-in PM or, if Admin creates it, still needs a PM
    // For simplicity: if Admin creates, they can specify pmId, else use their own
    const pmId = user.role === 'ADMIN' ? (req.body.pmId || user.id) : user.id

    const project = await prisma.project.create({
      data: {
        name,
        description,
        clientId,
        pmId
      },
      include: {
        client: true,
        pm: { select: { id: true, name: true, email: true } }
      }
    })

    return res.status(201).json({ message: 'Project created!', project })
  } catch (error) {
    console.error('Create project error:', error)
    return res.status(500).json({ message: 'Failed to create project.' })
  }
}

// GET /api/projects/clients
// Get all clients (for dropdown when creating a project)
export async function getAllClients(req: Request, res: Response) {
  try {
    const clients = await prisma.client.findMany({
      orderBy: { name: 'asc' }
    })
    return res.json({ clients })
  } catch (error) {
    return res.status(500).json({ message: 'Failed to get clients.' })
  }
}
