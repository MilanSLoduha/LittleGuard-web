import { PrismaClient } from '@prisma/client'
import { Pool } from '@neondatabase/serverless'
import { PrismaNeon } from '@prisma/adapter-neon'
import ws from 'ws'

const globalForPrisma = global as unknown as { prisma: PrismaClient }

function createPrismaClient() {
	// Use Neon serverless driver for Vercel edge runtime
	if (process.env.DATABASE_URL?.includes('neon.tech')) {
		const pool = new Pool({ connectionString: process.env.DATABASE_URL })
		pool.on('error', (err) => console.error('Neon pool error:', err))

		// @ts-ignore - ws is needed for local development with Neon
		if (typeof WebSocket === 'undefined') {
			global.WebSocket = ws as any
		}

		const adapter = new PrismaNeon(pool)
		return new PrismaClient({ adapter })
	}

	return new PrismaClient()
}

export const prisma = globalForPrisma.prisma || createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
