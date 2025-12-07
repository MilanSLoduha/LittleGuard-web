import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

export async function PATCH(
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

    const body = await req.json()
    const { name } = body

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Invalid name provided' },
        { status: 400 }
      )
    }

    // Only owner can rename
    const camera = await prisma.camera.findFirst({
      where: {
        id: id,
        user: {
          email: session.user.email
        }
      }
    })

    if (!camera) {
      return NextResponse.json(
        { error: 'Camera not found or access denied' },
        { status: 404 }
      )
    }

    const updatedCamera = await prisma.camera.update({
      where: { id: id },
      data: { name: name.trim() }
    })

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

export async function GET(
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

    const camera = await prisma.camera.findFirst({
      where: {
        id,
        OR: [
          { userId: user.id },
          { accesses: { some: { userId: user.id } } }
        ]
      }
    })

    if (!camera) {
      return NextResponse.json(
        { error: 'Camera not found or access denied' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      camera: {
        id: camera.id,
        name: camera.name,
        macAddress: camera.macAddress
      }
    })
  } catch (error) {
    console.error('Error fetching camera by id:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
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

    const body = await req.json().catch(() => ({}))
    if (!body?.confirm || body.confirm !== 'Odstran') {
      return NextResponse.json(
        { error: 'Pre potvrdenie odpárovania je potrebné zadať text \"Odstran\"' },
        { status: 400 }
      )
    }

    const camera = await prisma.camera.findUnique({ where: { id } })

    if (!camera) {
      return NextResponse.json(
        { error: 'Camera not found or access denied' },
        { status: 404 }
      )
    }

    // Owner deletes the camera (and all shares/accesses)
    if (camera.userId === user.id) {
      await prisma.cameraShareCode.deleteMany({ where: { cameraId: id } }).catch(() => {})
      await prisma.cameraAccess.deleteMany({ where: { cameraId: id } }).catch(() => {})
      await prisma.camera.delete({ where: { id } })
      return NextResponse.json({ success: true, removed: 'camera' })
    }

    // Shared user: remove only their access
    const access = await prisma.cameraAccess.findUnique({
      where: {
        cameraId_userId: {
          cameraId: id,
          userId: user.id
        }
      }
    })

    if (!access) {
      return NextResponse.json(
        { error: 'Camera not found or access denied' },
        { status: 404 }
      )
    }

    await prisma.cameraAccess.delete({
      where: {
        cameraId_userId: {
          cameraId: id,
          userId: user.id
        }
      }
    })

    return NextResponse.json({ success: true, removed: 'access' })
  } catch (error) {
    console.error('Error deleting camera:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
