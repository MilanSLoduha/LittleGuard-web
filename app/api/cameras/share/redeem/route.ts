import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
	try {
		const session = await auth()

		if (!session || !session.user?.email) {
			return NextResponse.json(
				{ error: 'Unauthorized - Please log in' },
				{ status: 401 }
			)
		}

		const body = await req.json().catch(() => ({}))
		const code = typeof body.code === 'string' ? body.code.trim() : ''

		if (!code) {
			return NextResponse.json(
				{ error: 'Missing pairing code' },
				{ status: 400 }
			)
		}

		const user = await prisma.user.findUnique({
			where: { email: session.user.email },
			select: { id: true }
		})

		if (!user) {
			return NextResponse.json(
				{ error: 'User not found' },
				{ status: 404 }
			)
		}

		const shareCode = await prisma.cameraShareCode.findUnique({
			where: { code },
			include: {
				camera: true
			}
		})

		if (!shareCode) {
			return NextResponse.json(
				{ error: 'Invalid code' },
				{ status: 404 }
			)
		}

		if (new Date() > shareCode.expiresAt) {
			return NextResponse.json(
				{ error: 'Code expired' },
				{ status: 410 }
			)
		}

		if (shareCode.usedById && shareCode.usedById !== user.id) {
			return NextResponse.json(
				{ error: 'Code already used' },
				{ status: 409 }
			)
		}

		// Already has access?
		const alreadyHasAccess = await prisma.cameraAccess.findUnique({
			where: {
				cameraId_userId: {
					cameraId: shareCode.cameraId,
					userId: user.id
				}
			}
		})

		if (shareCode.camera.userId === user.id || alreadyHasAccess) {
			return NextResponse.json(
				{ error: 'Camera already available for this account' },
				{ status: 409 }
			)
		}

		await prisma.cameraAccess.create({
			data: {
				cameraId: shareCode.cameraId,
				userId: user.id,
				role: 'viewer'
			}
		})

		await prisma.cameraShareCode.update({
			where: { id: shareCode.id },
			data: {
				usedById: user.id,
				usedAt: new Date()
			}
		})

		return NextResponse.json({
			success: true,
			camera: {
				id: shareCode.camera.id,
				name: shareCode.camera.name,
				macAddress: shareCode.camera.macAddress
			}
		})
	} catch (error) {
		console.error('Error redeeming share code:', error)
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 }
		)
	}
}
