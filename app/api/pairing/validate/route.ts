import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
	try {
		const body = await req.json()
		const { code, macAddress } = body

		if (!code || !macAddress) {
			return NextResponse.json(
				{ error: 'Missing required fields: code and macAddress' },
				{ status: 400 }
			)
		}

		// Nájdi párovací kód
		const pairingCode = await prisma.pairingCode.findUnique({
			where: { code },
			include: { user: true }
		})

		if (!pairingCode) {
			return NextResponse.json(
				{ error: 'Invalid pairing code' },
				{ status: 404 }
			)
		}

		// Skontroluj expiráciu
		if (new Date() > pairingCode.expiresAt) {
			return NextResponse.json(
				{ error: 'Pairing code expired' },
				{ status: 410 }
			)
		}

		// Skontroluj, či už bol použitý
		if (pairingCode.used) {
			return NextResponse.json(
				{ error: 'Pairing code already used' },
				{ status: 409 }
			)
		}

		// Skontroluj, či kamera s touto MAC adresou už existuje
		const existingCamera = await prisma.camera.findUnique({
			where: { macAddress }
		})

		if (existingCamera) {
			return NextResponse.json(
				{ error: 'Camera already paired with another account' },
				{ status: 409 }
			)
		}

		// Vytvor kameru a označ kód ako použitý
		const camera = await prisma.camera.create({
			data: {
				macAddress,
				userId: pairingCode.userId,
				name: `Camera ${macAddress.slice(-4)}`,
				isOnline: true
			}
		})

		await prisma.pairingCode.update({
			where: { code },
			data: { used: true }
		})

		return NextResponse.json({
			success: true,
			camera: {
				id: camera.id,
				name: camera.name,
				macAddress: camera.macAddress
			}
		})

	} catch (error) {
		console.error('Error validating pairing code:', error)
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 }
		)
	}
}
