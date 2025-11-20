import pkg from '@prisma/client'

// support environments where PrismaClient is exported as a named export or as the default export
const PrismaClient = (pkg as any).PrismaClient ?? (pkg as any).default

const globalForPrisma = global as unknown as { prisma: any }

export const prisma = globalForPrisma.prisma || new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma