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

    // Nájdi usera; ak chýba tabuľka CameraAccess (nemigrované), fallback na pôvodný dotaz
    let user: any = null
    try {
      user = await prisma.user.findUnique({
        where: { email: session.user.email },
        include: {
          cameras: {
            orderBy: { createdAt: 'desc' }
          },
          cameraAccesses: {
            orderBy: { createdAt: 'desc' },
            include: { camera: true }
          }
        }
      })
    } catch (err) {
      if (typeof err === 'object' && err !== null && 'code' in err && (err as any).code === 'P2021') {
        // Tabuľka CameraAccess ešte neexistuje (neprebehol migrate)
        user = await prisma.user.findUnique({
          where: { email: session.user.email },
          include: {
            cameras: {
              orderBy: { createdAt: 'desc' }
            }
          }
        })
      } else {
        throw err
      }
    }

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const ownedCameras = user.cameras ?? []
    const sharedCameras = (user.cameraAccesses ?? [])
      .map((access: { camera: Camera | null }) => access.camera)
      .filter((camera: Camera | null): camera is Camera => Boolean(camera))
    const uniqueCamerasMap = new Map<string, Camera>()

    ;[...ownedCameras, ...sharedCameras].forEach((camera: any) => {
      if (camera && !uniqueCamerasMap.has(camera.id)) {
        uniqueCamerasMap.set(camera.id, camera)
      }
    })

    const cameras = Array.from(uniqueCamerasMap.values())

    return NextResponse.json({
      cameras: cameras.map((camera: Camera) => ({
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
