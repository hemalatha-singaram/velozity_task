// This file creates test data in the database
// Run it with: npx prisma db seed

import { PrismaClient, Role, TaskStatus, Priority } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting seed...')

  // Delete everything first (so we can run seed multiple times cleanly)
  await prisma.activityLog.deleteMany()
  await prisma.notification.deleteMany()
  await prisma.task.deleteMany()
  await prisma.project.deleteMany()
  await prisma.client.deleteMany()
  await prisma.refreshToken.deleteMany()
  await prisma.user.deleteMany()

  console.log('Old data cleared.')

  // Hash the password "password123" for all users
  const hashedPassword = await bcrypt.hash('password123', 10)

  // ------- CREATE USERS -------

  // 1 Admin
  const admin = await prisma.user.create({
    data: {
      name: 'Admin User',
      email: 'admin@velozity.com',
      password: hashedPassword,
      role: Role.ADMIN
    }
  })

  // 2 Project Managers
  const pm1 = await prisma.user.create({
    data: {
      name: 'Priya Sharma',
      email: 'priya@velozity.com',
      password: hashedPassword,
      role: Role.PM
    }
  })

  const pm2 = await prisma.user.create({
    data: {
      name: 'Rahul Verma',
      email: 'rahul@velozity.com',
      password: hashedPassword,
      role: Role.PM
    }
  })

  // 4 Developers
  const dev1 = await prisma.user.create({
    data: {
      name: 'Ravi Kumar',
      email: 'ravi@velozity.com',
      password: hashedPassword,
      role: Role.DEVELOPER
    }
  })

  const dev2 = await prisma.user.create({
    data: {
      name: 'Sneha Patel',
      email: 'sneha@velozity.com',
      password: hashedPassword,
      role: Role.DEVELOPER
    }
  })

  const dev3 = await prisma.user.create({
    data: {
      name: 'Arjun Nair',
      email: 'arjun@velozity.com',
      password: hashedPassword,
      role: Role.DEVELOPER
    }
  })

  const dev4 = await prisma.user.create({
    data: {
      name: 'Meera Iyer',
      email: 'meera@velozity.com',
      password: hashedPassword,
      role: Role.DEVELOPER
    }
  })

  console.log('Users created.')

  // ------- CREATE CLIENTS -------

  const client1 = await prisma.client.create({
    data: { name: 'TechCorp India', email: 'contact@techcorp.in' }
  })

  const client2 = await prisma.client.create({
    data: { name: 'StartupXYZ', email: 'hello@startupxyz.com' }
  })

  const client3 = await prisma.client.create({
    data: { name: 'MegaRetail Ltd', email: 'it@megaretail.com' }
  })

  console.log('Clients created.')

  // ------- CREATE PROJECTS -------

  const project1 = await prisma.project.create({
    data: {
      name: 'TechCorp Website Redesign',
      description: 'Complete redesign of TechCorp website with new branding',
      clientId: client1.id,
      pmId: pm1.id
    }
  })

  const project2 = await prisma.project.create({
    data: {
      name: 'StartupXYZ Mobile App',
      description: 'React Native mobile app for iOS and Android',
      clientId: client2.id,
      pmId: pm1.id
    }
  })

  const project3 = await prisma.project.create({
    data: {
      name: 'MegaRetail Inventory System',
      description: 'Internal inventory management dashboard',
      clientId: client3.id,
      pmId: pm2.id
    }
  })

  console.log('Projects created.')

  // ------- CREATE TASKS FOR PROJECT 1 -------

  const pastDate = new Date('2024-01-01') // Already overdue

  const task1 = await prisma.task.create({
    data: {
      title: 'Design homepage mockup',
      description: 'Create Figma mockup for the new homepage',
      status: TaskStatus.DONE,
      priority: Priority.HIGH,
      dueDate: new Date('2025-12-01'),
      projectId: project1.id,
      assignedToId: dev1.id
    }
  })

  const task2 = await prisma.task.create({
    data: {
      title: 'Build navigation component',
      description: 'Responsive navbar with dropdown menus',
      status: TaskStatus.IN_REVIEW,
      priority: Priority.MEDIUM,
      dueDate: new Date('2026-03-30'),
      projectId: project1.id,
      assignedToId: dev1.id
    }
  })

  const task3 = await prisma.task.create({
    data: {
      title: 'Set up deployment pipeline',
      description: 'CI/CD using GitHub Actions',
      status: TaskStatus.IN_PROGRESS,
      priority: Priority.CRITICAL,
      dueDate: new Date('2026-03-28'),
      projectId: project1.id,
      assignedToId: dev2.id
    }
  })

  // OVERDUE TASK 1
  const task4 = await prisma.task.create({
    data: {
      title: 'Fix login bug on mobile',
      description: 'Login button not working on iOS Safari',
      status: TaskStatus.OVERDUE,
      priority: Priority.CRITICAL,
      dueDate: pastDate,
      isOverdue: true,
      projectId: project1.id,
      assignedToId: dev2.id
    }
  })

  const task5 = await prisma.task.create({
    data: {
      title: 'Write API documentation',
      description: 'Document all REST endpoints using Swagger',
      status: TaskStatus.TODO,
      priority: Priority.LOW,
      dueDate: new Date('2026-04-15'),
      projectId: project1.id,
      assignedToId: dev3.id
    }
  })

  // ------- CREATE TASKS FOR PROJECT 2 -------

  const task6 = await prisma.task.create({
    data: {
      title: 'Set up React Native project',
      description: 'Initialize project with Expo and configure navigation',
      status: TaskStatus.DONE,
      priority: Priority.HIGH,
      dueDate: new Date('2025-11-01'),
      projectId: project2.id,
      assignedToId: dev3.id
    }
  })

  const task7 = await prisma.task.create({
    data: {
      title: 'Build user authentication screens',
      description: 'Login, signup, forgot password screens',
      status: TaskStatus.IN_PROGRESS,
      priority: Priority.HIGH,
      dueDate: new Date('2026-04-01'),
      projectId: project2.id,
      assignedToId: dev3.id
    }
  })

  // OVERDUE TASK 2
  const task8 = await prisma.task.create({
    data: {
      title: 'Integrate payment gateway',
      description: 'Razorpay integration for in-app purchases',
      status: TaskStatus.OVERDUE,
      priority: Priority.CRITICAL,
      dueDate: pastDate,
      isOverdue: true,
      projectId: project2.id,
      assignedToId: dev4.id
    }
  })

  const task9 = await prisma.task.create({
    data: {
      title: 'Push notifications setup',
      description: 'Firebase Cloud Messaging integration',
      status: TaskStatus.TODO,
      priority: Priority.MEDIUM,
      dueDate: new Date('2026-04-20'),
      projectId: project2.id,
      assignedToId: dev4.id
    }
  })

  const task10 = await prisma.task.create({
    data: {
      title: 'App store submission',
      description: 'Submit to Apple App Store and Google Play',
      status: TaskStatus.TODO,
      priority: Priority.LOW,
      dueDate: new Date('2026-05-01'),
      projectId: project2.id,
      assignedToId: dev4.id
    }
  })

  // ------- CREATE TASKS FOR PROJECT 3 -------

  const task11 = await prisma.task.create({
    data: {
      title: 'Database schema design',
      description: 'Design PostgreSQL schema for inventory system',
      status: TaskStatus.DONE,
      priority: Priority.HIGH,
      dueDate: new Date('2025-10-15'),
      projectId: project3.id,
      assignedToId: dev1.id
    }
  })

  const task12 = await prisma.task.create({
    data: {
      title: 'Build product listing page',
      description: 'Table view with search, filter, sort',
      status: TaskStatus.IN_REVIEW,
      priority: Priority.HIGH,
      dueDate: new Date('2026-03-25'),
      projectId: project3.id,
      assignedToId: dev2.id
    }
  })

  const task13 = await prisma.task.create({
    data: {
      title: 'Stock alert system',
      description: 'Email alerts when stock goes below threshold',
      status: TaskStatus.TODO,
      priority: Priority.MEDIUM,
      dueDate: new Date('2026-04-10'),
      projectId: project3.id,
      assignedToId: dev1.id
    }
  })

  const task14 = await prisma.task.create({
    data: {
      title: 'Reports and analytics dashboard',
      description: 'Charts showing sales trends and inventory movement',
      status: TaskStatus.TODO,
      priority: Priority.MEDIUM,
      dueDate: new Date('2026-04-25'),
      projectId: project3.id,
      assignedToId: dev2.id
    }
  })

  const task15 = await prisma.task.create({
    data: {
      title: 'Export to Excel feature',
      description: 'Allow managers to export inventory data to Excel',
      status: TaskStatus.IN_PROGRESS,
      priority: Priority.LOW,
      dueDate: new Date('2026-04-05'),
      projectId: project3.id,
      assignedToId: dev1.id
    }
  })

  console.log('Tasks created.')

  // ------- CREATE ACTIVITY LOGS -------
  // These are pre-existing logs so the feed is not empty on first load

  const logs = [
    {
      description: 'Ravi Kumar moved "Design homepage mockup" from TODO → DONE',
      userId: dev1.id,
      taskId: task1.id,
      projectId: project1.id,
      createdAt: new Date('2025-12-01T10:30:00')
    },
    {
      description: 'Sneha Patel moved "Set up deployment pipeline" from TODO → IN_PROGRESS',
      userId: dev2.id,
      taskId: task3.id,
      projectId: project1.id,
      createdAt: new Date('2026-03-10T09:00:00')
    },
    {
      description: 'Ravi Kumar moved "Build navigation component" from IN_PROGRESS → IN_REVIEW',
      userId: dev1.id,
      taskId: task2.id,
      projectId: project1.id,
      createdAt: new Date('2026-03-18T14:00:00')
    },
    {
      description: 'Arjun Nair moved "Set up React Native project" from IN_PROGRESS → DONE',
      userId: dev3.id,
      taskId: task6.id,
      projectId: project2.id,
      createdAt: new Date('2025-11-01T11:00:00')
    },
    {
      description: 'Arjun Nair moved "Build user authentication screens" from TODO → IN_PROGRESS',
      userId: dev3.id,
      taskId: task7.id,
      projectId: project2.id,
      createdAt: new Date('2026-03-15T10:00:00')
    },
    {
      description: 'Ravi Kumar moved "Database schema design" from IN_PROGRESS → DONE',
      userId: dev1.id,
      taskId: task11.id,
      projectId: project3.id,
      createdAt: new Date('2025-10-15T15:00:00')
    },
    {
      description: 'Sneha Patel moved "Build product listing page" from IN_PROGRESS → IN_REVIEW',
      userId: dev2.id,
      taskId: task12.id,
      projectId: project3.id,
      createdAt: new Date('2026-03-20T13:00:00')
    },
    {
      description: 'Ravi Kumar moved "Export to Excel feature" from TODO → IN_PROGRESS',
      userId: dev1.id,
      taskId: task15.id,
      projectId: project3.id,
      createdAt: new Date('2026-03-22T09:30:00')
    }
  ]

  for (const log of logs) {
    await prisma.activityLog.create({ data: log })
  }

  console.log('Activity logs created.')

  // ------- CREATE SOME NOTIFICATIONS -------

  await prisma.notification.createMany({
    data: [
      {
        message: 'You have been assigned "Build navigation component"',
        userId: dev1.id,
        isRead: true
      },
      {
        message: 'You have been assigned "Set up deployment pipeline"',
        userId: dev2.id,
        isRead: true
      },
      {
        message: '"Build navigation component" has been moved to In Review',
        userId: pm1.id,
        isRead: false
      },
      {
        message: '"Build product listing page" has been moved to In Review',
        userId: pm2.id,
        isRead: false
      }
    ]
  })

  console.log('Notifications created.')
  console.log('-----------------------------------')
  console.log('Seed complete! Login credentials:')
  console.log('Admin  -> admin@velozity.com / password123')
  console.log('PM 1   -> priya@velozity.com / password123')
  console.log('PM 2   -> rahul@velozity.com / password123')
  console.log('Dev 1  -> ravi@velozity.com  / password123')
  console.log('Dev 2  -> sneha@velozity.com / password123')
  console.log('Dev 3  -> arjun@velozity.com / password123')
  console.log('Dev 4  -> meera@velozity.com / password123')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
