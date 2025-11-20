import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

interface Camera {
  id: string
  name: string
  macAddress: string
  isOnline: boolean
  lastSeen: Date
  createdAt: Date
}

export async function GET(req: NextRequest) {
	try {
		const session = await auth()

		if (!session || !session.user?.email) {
			return NextResponse.json(
				{ error: 'Unauthorized - Please log in' },
				{ status: 401 }
			)
		}

		// Nájdi usera
		const user = await prisma.user.findUnique({
			where: { email: session.user.email },
			include: {
				cameras: {
					orderBy: { createdAt: 'desc' }
				}
			}
		})

		if (!user) {
			return NextResponse.json(
				{ error: 'User not found' },
				{ status: 404 }
			)
		}

		return NextResponse.json({
			cameras: user.cameras.map((camera: Camera) => ({
				id: camera.id,
				name: camera.name,
				macAddress: camera.macAddress,
				isOnline: camera.isOnline,
				lastSeen: camera.lastSeen,
				createdAt: camera.createdAt
			}))
		})

	} catch (error) {
		console.error('Error fetching cameras:', error)
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 }
		)
	}
}
