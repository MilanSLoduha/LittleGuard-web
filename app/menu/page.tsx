'use client'

import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import styles from './menu.module.css'
import router from 'next/dist/shared/lib/router/router'
import { signOut } from 'next-auth/react'

export default function menuPage() {
  const router = useRouter()

    const handleLogout = async () => {
        await signOut({ redirect: false })
        router.push('/login')
    }
    
    return (
    <div className={styles.menuContainer}>
      <header className={styles.header}>
        <div className={styles.logoContainer}>
          <Image
            src="./logo-w.svg"
            alt="Little Guard Logo"
            width={40}
            height={20}
          />
          <h1>Little Guard</h1>
        </div>
        <div className={styles.userInfo}>
          <span> email@gmail.com </span>
          <button onClick={handleLogout} className={styles.logoutButton}>
            Odhlásiť sa
          </button>
        </div>
      </header>

      <main className={styles.mainContent}>
        <section className={styles.pairingSection}>
          <h2>Párovanie zariadenia</h2>
          <p className={styles.instructions}>
                  1.  Zapnite kameru
            <br />2.  Pripojte sa na WIFI kamery
            <br />3. Zadajte do prehladača adresu 192.168.1.1
            <br />4. Vygenerujte tento KÓD a zadajte ho do webstránky kamery pre spárovanie s účtom
          </p>
          <div className={styles.codeContainer}>
            <div className={styles.codeDisplay}>
              <p>123456</p>
            </div>
            <button className={styles.codeButton}>
              Vygenerovať nový kód
            </button>
          </div>
        </section>

        <section className={styles.devicesSection}>
          <h2>Moje zariadenia</h2>
          
          <p>Žiadne zariadenia</p>
        </section>
      </main>
    </div>
  )
}