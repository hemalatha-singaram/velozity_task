// This file creates ONE shared Prisma client
// We import this wherever we need to talk to the database

import { PrismaClient } from '@prisma/client'

// Create one prisma instance and reuse it everywhere
const prisma = new PrismaClient()

export default prisma
