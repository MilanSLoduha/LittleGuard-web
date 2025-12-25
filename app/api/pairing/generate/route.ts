import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
	try {
		const session = await auth()

		console.log('Session:', session)

		if (!session || !session.user?.email) {
			console.log('No session or email')
			return NextResponse.json(
				{ error: 'Unauthorized - Please log in' },
				{ status: 401 }
			)
		}

		const user = await prisma.user.findUnique({
			where: { email: session.user.email }
		})

		if (!user) {
			return NextResponse.json(
				{ error: 'User not found' },
				{ status: 404 }
			)
		}

		const code = Math.floor(100000 + Math.random() * 900000).toString()

		const expiresAt = new Date()
		expiresAt.setMinutes(expiresAt.getMinutes() + 10)

		const pairingCode = await prisma.pairingCode.create({
			data: {
				code,
				userId: user.id,
				expiresAt
			}
		})

		return NextResponse.json({
			code: pairingCode.code,
			expiresAt: pairingCode.expiresAt
		})

	} catch (error) {
		console.error('Error generating pairing code:', error)
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 }
		)
	}
}
