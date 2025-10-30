'use client'

import { useState } from 'react'
import Image from 'next/image'
import styles from './register.module.css'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { signIn } from 'next-auth/react'

export default function RegisterPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (formData.password !== formData.confirmPassword) {
      setError('Heslá sa nezhodujú')
      return
    }
    
    setLoading(true)

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password
        })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Chyba pri registrácii')
        return
      }

      const result = await signIn('credentials', {
        email: formData.email,
        password: formData.password,
        redirect: false
      })

      if (result?.error) {
        setError('Registrácia úspešná, ale nepodarilo sa prihlásiť')
      } else {
        router.push('/')
        router.refresh()
      }
    } catch (error) {
      setError('Chyba pri registrácii')
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
        <h2 className={styles.authSubtitle}>Registrácia</h2>

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
              required
              placeholder="••••••••"
            />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="confirmPassword">Potvrďte heslo</label>
            <input
              id="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              required
              placeholder="••••••••"
            />
          </div>

          <button 
            type="submit" 
            className={styles.submitButton}
            disabled={loading}
          >
            {loading ? 'Registrovanie...' : 'Registrovať sa'}
          </button>
        </form>

        <p className={styles.authLink}>
          Už máte účet?{' '}
          <Link href="/login">Prihláste sa</Link>
        </p>
      </div>
    </div>
  )
}