import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(
	req: NextRequest,
	{ params }: { params: { id: string } }
) {
	try {
		const session = await auth()
		console.log('Session in PATCH:', session)

		if (!session || !session.user?.email) {
			console.log('No session or email')
			return NextResponse.json(
				{ error: 'Unauthorized - Please log in' },
				{ status: 401 }
			)
		}

		const body = await req.json()
		const { name } = body
		console.log('Updating camera', params.id, 'to name:', name)

		if (!name || typeof name !== 'string' || name.trim().length === 0) {
			return NextResponse.json(
				{ error: 'Invalid name provided' },
				{ status: 400 }
			)
		}

		// Nájdi kameru a over či patrí používateľovi
		const camera = await prisma.camera.findFirst({
			where: {
				id: params.id,
				user: {
					email: session.user.email
				}
			}
		})

		if (!camera) {
			console.log('Camera not found for user:', session.user.email)
			return NextResponse.json(
				{ error: 'Camera not found or access denied' },
				{ status: 404 }
			)
		}

		// Aktualizuj názov kamery
		const updatedCamera = await prisma.camera.update({
			where: { id: params.id },
			data: { name: name.trim() }
		})

		console.log('Camera updated successfully:', updatedCamera.name)
		return NextResponse.json({
			success: true,
			camera: {
				id: updatedCamera.id,
				name: updatedCamera.name,
				macAddress: updatedCamera.macAddress
			}
		})

	} catch (error) {
		console.error('Error updating camera name:', error)
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 }
		)
	}
}