'use client'

import Image from "next/image";
import styles from './page.module.css'
import { useRouter } from 'next/navigation'
  
export default function Home() {
  const router = useRouter()
  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <h1>Little Guard</h1>
        <div className={styles.status}>
          {/* //todo replace with actual connection status */}
          <span className={true ? styles.connected : styles.disconnected}> 
            {true ? 'Pripojené' : 'Odpojené'}
          </span>
          <button onClick={() => router.push('/dashboard')} className={styles.dashboardButton}>
            Menu
          </button>
        </div>
      </header>
    </main>
  );
}
