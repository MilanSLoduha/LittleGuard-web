'use client'

import { useState } from 'react'
import Image from 'next/image'
import styles from './login.module.css'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { signIn } from 'next-auth/react'

export default function LoginPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const trimmedEmail = formData.email.trim()
    if (trimmedEmail.length === 0) {
      setError('Email je povinný')
      setLoading(false)
      return
    }
    if (trimmedEmail.length > 40) {
      setError('Email môže mať najviac 40 znakov')
      setLoading(false)
      return
    }
    if (formData.password.length < 4 || formData.password.length > 32) {
      setError('Heslo musí mať 4 až 32 znakov')
      setLoading(false)
      return
    }

    try {
      const result = await signIn('credentials', {
        email: trimmedEmail,
        password: formData.password,
        redirect: false
      })

      if (result?.error) {
        setError('Nesprávny email alebo heslo')
      } else {
        router.push('/menu')
      }
    } catch (error) {
      setError('Chyba pri prihlásení')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.authContainer}>
      <div className={styles.authCard}>
        <div className={styles.logoContainer}>
          <Image
            src="./logo-w.svg"
            alt="Little Guard Logo"
            width={40}
            height={20}
          />
          <h1>Little Guard</h1>
        </div>
        <h2 className={styles.authSubtitle}>Prihlásenie</h2>

        <form onSubmit={handleSubmit} className={styles.authForm}>
          {error && (
            <div className={styles.error}>
              {error}
            </div>
          )}

          <div className={styles.formGroup}>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              maxLength={40}
              required
              placeholder="vas@email.com"
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="password">Heslo</label>
            <input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              minLength={4}
              maxLength={32}
              required
              placeholder="********"
            />
          </div>

          <button
            type="submit"
            className={styles.submitButton}
            disabled={loading}
          >
            {loading ? 'Prihlasovanie...' : 'Prihlásiť sa'}
          </button>
        </form>

        <p className={styles.authLink}>
          Ešte nemáte účet?{' '}
          <Link href="/register">Zaregistrujte sa</Link>
        </p>
      </div>
    </div>
  )
}
