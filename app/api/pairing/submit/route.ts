import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * HTTP endpoint pre ESP kameru na odoslanie párovacieho kódu
 * Používa sa ako fallback, ak MQTT zlyhá
 */
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
	try {
		const body = await req.json()
		const { code, mac } = body

		console.log('Pairing submission received:', { code, mac })

		if (!code || !mac) {
			return NextResponse.json(
				{ error: 'Missing required fields: code and mac' },
				{ status: 400 }
			)
		}

		// Nájdi párovací kód
		const pairingCode = await prisma.pairingCode.findUnique({
			where: { code },
			include: { user: true }
		})

		if (!pairingCode) {
			console.log('Pairing code not found:', code)
			return NextResponse.json(
				{ error: 'Invalid pairing code' },
				{ status: 404 }
			)
		}

		// Skontroluj expiráciu
		if (new Date() > pairingCode.expiresAt) {
			console.log('Pairing code expired:', code)
			return NextResponse.json(
				{ error: 'Pairing code expired' },
				{ status: 410 }
			)
		}

		// Skontroluj, či už bol použitý
		if (pairingCode.used) {
			console.log('Pairing code already used:', code)
			return NextResponse.json(
				{ error: 'Pairing code already used' },
				{ status: 409 }
			)
		}

		// Skontroluj, či kamera s touto MAC adresou už existuje
		const existingCamera = await prisma.camera.findUnique({
			where: { macAddress: mac }
		})

		if (existingCamera) {
			console.log('Camera already exists:', mac)
			return NextResponse.json(
				{ error: 'Camera already paired with another account' },
				{ status: 409 }
			)
		}

		// Vytvor kameru a označ kód ako použitý
		const camera = await prisma.camera.create({
			data: {
				macAddress: mac,
				userId: pairingCode.userId,
				name: `Camera ${mac.slice(-8)}`,
				isOnline: true
			}
		})

		await prisma.pairingCode.update({
			where: { code },
			data: { used: true }
		})

		console.log('Camera paired successfully:', camera.id)

		return NextResponse.json({
			success: true,
			camera: {
				id: camera.id,
				name: camera.name,
				macAddress: camera.macAddress
			}
		})

	} catch (error) {
		console.error('Error in pairing submission:', error)
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 }
		)
	}
}
