'use client'

import Image from "next/image";
import styles from './page.module.css'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
  
export default function Home() {
  const router = useRouter()
  const [temperature, setTemperature] = useState('--.-')
  const [motion, setMotion] = useState('---')
  const [lastMotion, setLastMotion] = useState('---')
  const [selectedMode, setSelectedMode] = useState('mode1')
  const [selectedResolution, setSelectedResolution] = useState('resolution1')
  const [quality, setQuality] = useState(10)
  const [brightness, setBrightness] = useState(0)
  const [contrast, setContrast] = useState(0)
  const [phoneNumber, setPhoneNumber] = useState('')
  const [sendSMS, setSendSMS] = useState(false)
  const [sendEmail, setSendEmail] = useState(false)
  const [horizontalFlip, setHorizontalFlip] = useState(false)
  const [hwDownscale, setHwDownscale] = useState(false)
  const [awb, setAwb] = useState(false)
  const [aec, setAec] = useState(false)
  const [notificatinonDays, setNotificationDays] = useState({
    monday: false,
    tuesday: false,
    wednesday: false,
    thursday: false,
    friday: false,
    saturday: false,
    sunday: false
  })

  const handleDayNotification = (day: keyof typeof notificatinonDays) => {
    const days = Object.keys(notificatinonDays);
    const foundDay = days.find(d => d === day);
    if (foundDay) {
      const newNotificationDays = { ...notificatinonDays };
      const oldValue = newNotificationDays[foundDay as keyof typeof notificatinonDays];
      const newValue = !oldValue;
      newNotificationDays[foundDay as keyof typeof notificatinonDays] = newValue;
      setNotificationDays(newNotificationDays);
    }
  }


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

        <div className={styles.sidebar}>

          <div className={styles.card}>
            <div className={styles.block}>
              <h2>Údaje</h2>

              <div className={styles.infoBox}>
                <span>Teplota:</span>
                <p>{temperature} °  C</p>
              </div>

              <div className={styles.infoBox}>
                <span>Pohyb:</span>
                <p>{motion}</p>
              </div>

              <div className={styles.infoBox}>
                <span>Posledný pohyb:</span>
                <p>{lastMotion}</p>
              </div>

            </div>
            <div className={styles.block}>

              <h2>Nastavenia</h2>

              <div className={styles.selectionBox}>
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
              </div>

              <div className={styles.selectionBox}>
                <label>Rozlíšenie:</label>
                <select 
                  value={selectedResolution} 
                  onChange={(e) => setSelectedResolution(e.target.value)}
                  className={styles.select}
                >
                  <option value="resolution1" className={styles.option}>UXGA(1600x1200)</option>
                  <option value="resolution2" className={styles.option}>SXGA(1280x1024)</option>
                  <option value="resolution3" className={styles.option}>XGA(1024x768)</option>
                  <option value="resolution4" className={styles.option}>SVGA(800x600)</option>
                  <option value="resolution5" className={styles.option}>VGA(640x480)</option>
                  <option value="resolution6" className={styles.option}>CIF(400x296)</option>
                </select>
              </div>

              <label>Kvalita:</label>
              <input 
                type="range"
                min="10"
                max="63"
                value = {quality}
                onChange={(e) => setQuality(Number(e.target.value))}
                className={styles.slider}
              />

              <div className={styles.switchBox}>
                <label>Hotizontálne prevrátenie:</label>
                <input
                  type="checkbox"
                  checked= {horizontalFlip}
                  onChange={(e) => setHorizontalFlip(Boolean(e.target.checked))}
                  className={styles.switch}
                />
              </div>

              <div className={styles.switchBox}>
                <label>Hardvérové znižovanie rozlíšenia:</label>
                <input
                  type="checkbox"
                  checked= {hwDownscale}
                  onChange={(e) => setHwDownscale(Boolean(e.target.checked))}
                  className={styles.switch}
                />
              </div>

              <div className={styles.switchBox}>
                <label>Softvérové ladenie bielej:</label>
                <input
                  type="checkbox"
                  checked= {awb}
                  onChange={(e) => setAwb(Boolean(e.target.checked))}
                  className={styles.switch}
                />
              </div>

              <div className={styles.switchBox}>
                <label>Softvérové ladenie expozície:</label>
                <input
                  type="checkbox"
                  checked= {aec}
                  onChange={(e) => setAec(Boolean(e.target.checked))}
                  className={styles.switch}
                />
              </div>

              <label>Svetlosť:</label>
              <input 
                type="range"
                min="-2"
                max="2"
                value = {brightness}
                onChange={(e) => setBrightness(Number(e.target.value))}
                className={styles.slider}
              />

              <label>Kontrast:</label>
              <input 
                type="range"
                min="-2"
                max="2"
                value = {contrast}
                onChange={(e) => setContrast(Number(e.target.value))}
                className={styles.slider}
              />
            </div>

            <div className={styles.block}>
              <h2>Upozornenia</h2>
              <div className={styles.switchBox}>
                <label>Tel. číslo:</label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+421 XXX XXX XXX"
                  className={styles.input}
                />                
              </div>

              <div className={styles.switchBox}>
                <label>Posielať SMS:</label>
                <input
                  type="checkbox"
                  checked={sendSMS}
                  onChange={(e) => setSendSMS(e.target.checked)}
                  className={styles.switch}
                />
              </div> 

              <label>Dni pre upozornenia</label>
              <div className={styles.daysContainer}>
                <label className={styles.dayCheckbox}>
                  <input 
                    type="checkbox"
                    checked={notificatinonDays.monday}
                    onChange={() => handleDayNotification('monday')}
                  />
                  <span>Po</span>
                </label>
                <label className={styles.dayCheckbox}>
                  <input 
                    type="checkbox"
                    checked={notificatinonDays.tuesday}
                    onChange={() => handleDayNotification('tuesday')}
                  />
                  <span>Ut</span>
                </label>
                <label className={styles.dayCheckbox}>
                  <input 
                    type="checkbox"
                    checked={notificatinonDays.wednesday}
                    onChange={() => handleDayNotification('wednesday')}
                  />
                  <span>St</span>
                </label>
                <label className={styles.dayCheckbox}>
                  <input 
                    type="checkbox"
                    checked={notificatinonDays.thursday}
                    onChange={() => handleDayNotification('thursday')}
                  />
                  <span>Št</span>
                </label>
                <label className={styles.dayCheckbox}>
                  <input 
                    type="checkbox"
                    checked={notificatinonDays.friday}
                    onChange={() => handleDayNotification('friday')}
                  />
                  <span>Pi</span>
                </label>
                <label className={styles.dayCheckbox}>
                  <input 
                    type="checkbox"
                    checked={notificatinonDays.saturday}
                    onChange={() => handleDayNotification('saturday')}
                  />
                  <span>So</span>
                </label>
                <label className={styles.dayCheckbox}>
                  <input 
                    type="checkbox"
                    checked={notificatinonDays.sunday}
                    onChange={() => handleDayNotification('sunday')}
                  />
                  <span>Ne</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
