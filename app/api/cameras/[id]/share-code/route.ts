import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

function generateCode(length = 8) {
	const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
	let result = ''
	for (let i = 0; i < length; i++) {
		result += chars[Math.floor(Math.random() * chars.length)]
	}
	return result
}

export async function POST(
	req: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const { id } = await params
		const session = await auth()

		if (!session || !session.user?.email) {
			return NextResponse.json(
				{ error: 'Unauthorized - Please log in' },
				{ status: 401 }
			)
		}

		const owner = await prisma.user.findUnique({
			where: { email: session.user.email },
			select: { id: true }
		})

		if (!owner) {
			return NextResponse.json(
				{ error: 'User not found' },
				{ status: 404 }
			)
		}

		const camera = await prisma.camera.findFirst({
			where: {
				id,
				userId: owner.id
			},
			select: { id: true }
		})

		if (!camera) {
			return NextResponse.json(
				{ error: 'Camera not found or access denied' },
				{ status: 404 }
			)
		}

		const code = generateCode(8)
		const expiresAt = new Date()
		expiresAt.setHours(expiresAt.getHours() + 12)

		const shareCode = await prisma.cameraShareCode.create({
			data: {
				code,
				cameraId: camera.id,
				createdById: owner.id,
				expiresAt
			}
		})

		return NextResponse.json({
			code: shareCode.code,
			expiresAt: shareCode.expiresAt
		})
	} catch (error) {
		console.error('Error generating share code:', error)
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 }
		)
	}
}
