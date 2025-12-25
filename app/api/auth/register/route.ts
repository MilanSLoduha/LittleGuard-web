import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()

    const normalizedEmail = typeof email === 'string' ? email.trim() : ''
    const passwordValue = typeof password === 'string' ? password : ''

    if (!normalizedEmail || !passwordValue) {
      return NextResponse.json(
        { error: 'Email a heslo sú povinné' },
        { status: 400 }
      )
    }

    if (normalizedEmail.length > 40) {
      return NextResponse.json(
        { error: 'Email môže mať najviac 40 znakov' },
        { status: 400 }
      )
    }

    if (passwordValue.length < 4 || passwordValue.length > 32) {
      return NextResponse.json(
        { error: 'Heslo musí mať 4 až 32 znakov' },
        { status: 400 }
      )
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'Používateľ s týmto emailom už existuje' },
        { status: 400 }
      )
    }

    const hashedPassword = await bcrypt.hash(passwordValue, 10)

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        password: hashedPassword,
      },
      select: {
        id: true,
        email: true
      }
    })

    return NextResponse.json({
      success: true,
      user
    })

  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'Chyba pri registrácii' },
      { status: 500 }
    )
  }
}
