'use client'

import Image from "next/image";
import styles from './page.module.css'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
  
export default function Home() {
  const router = useRouter()
  const [selectedMode, setSelectedMode] = useState('mode1')
  const [selectedResolution, setSelectedResolution] = useState('resolution1')

  return (
    <main className={styles.main}>
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
        <div className={styles.status}>
          {/* //todo replace with actual connection status */}
          <span className={true ? styles.connected : styles.disconnected}> 
            {true ? 'Pripojené' : 'Odpojené'}
          </span>
          <button onClick={() => router.push('/menu')} className={styles.menuButton}>
            Menu
          </button>
        </div>
      </header>
      <div className={styles.grid}>
        {/* Camera Stream */}
        <div className={styles.card + ' ' + styles.streamCard}>
          <iframe 
            width="100%" 
            height="600"
            src="https://www.youtube.com/watch?v=glb33DUAfB4"
            title="video test"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
          {/* Todo */}
        </div>

        {/* Temperature & Motion */}
        <div className={styles.sidebar}>
          {/* Todo */}
          
          {/* Motor Control */}
          <div className={styles.card}>
            <h2>Údaje</h2>
            <p>Teplota:</p>
            <p>Pohyb:</p>
            <p>Posledný pohyb:</p>
            <h2>Nastavenia</h2>
            <label>Režim:</label>
            <select 
              value={selectedMode} 
              onChange={(e) => setSelectedMode(e.target.value)}
              className={styles.select}
            >
              <option value="mode1">Možnosť 1</option>
              <option value="mode2">Možnosť 2</option>
              <option value="mode3">Možnosť 3</option>
            </select>
            <br />
            <label>Kvalita:</label>
            <select 
              value={selectedResolution} 
              onChange={(e) => setSelectedResolution(e.target.value)}
              className={styles.select}
            >
              <option value="resolution1">UXGA(1600x1200)</option>
              <option value="resolution2">SXGA(1280x1024)</option>
              <option value="resolution3">XGA(1024x768)</option>
              <option value="resolution4">SVGA(800x600)</option>
              <option value="resolution5">VGA(640x480)</option>
              <option value="resolution6">CIF(400x296)</option>
            </select>

          </div>
        </div>
      </div>
    </main>
  );
}
