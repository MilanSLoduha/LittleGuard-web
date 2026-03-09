'use client'

import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import styles from './menu.module.css'
import { signOut, useSession } from 'next-auth/react'
import { useMQTT } from '@/hooks/useMQTT'

interface Camera {
  id: string
  name: string
  macAddress: string
  isOnline: boolean
  lastSeen: Date
  createdAt: Date
}

export default function menuPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { settings, isConnected } = useMQTT()

  const [random, setRandom] = useState('------')
  const [isGenerating, setIsGenerating] = useState(false)
  const [pairingSuccess, setPairingSuccess] = useState(false)
  const [pairingError, setPairingError] = useState<string | null>(null)
  const [cameras, setCameras] = useState<Camera[]>([])
  const [loadingCameras, setLoadingCameras] = useState(true)
  const [editingCamera, setEditingCamera] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [editError, setEditError] = useState<string | null>(null)
  const [editSuccess, setEditSuccess] = useState<string | null>(null)
  const [unpairingCamera, setUnpairingCamera] = useState<string | null>(null)
  const [unpairConfirm, setUnpairConfirm] = useState('')
  const [unpairError, setUnpairError] = useState<string | null>(null)
  const [unpairSuccess, setUnpairSuccess] = useState<string | null>(null)
  const [shareCode, setShareCode] = useState('')
  const [shareStatus, setShareStatus] = useState<string | null>(null)
  const [shareError, setShareError] = useState<string | null>(null)
  const [shareLoading, setShareLoading] = useState(false)
  const [pairingInProgress, setPairingInProgress] = useState(false)

  const handleLogout = async () => {
    await signOut({ redirect: false })
    router.push('/login')
  }

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/login')
    }
  }, [session, status, router])

  const fetchCameras = async () => {
    if (status !== 'authenticated') return
    try {
      const response = await fetch('/api/cameras')
      if (response.ok) {
        const data = await response.json()
        setCameras(data.cameras)
      } else {
        console.error('Failed to fetch cameras: ', response.status)
      }
    } catch (error) {
      console.error('Error fetching cameras:', error)
    } finally {
      setLoadingCameras(false)
    }
  }

  const startEditingName = (cameraId: string, currentName: string) => {
    setEditingCamera(cameraId)
    setEditingName(currentName)
    setEditError(null)
    setEditSuccess(null)
  }

  const saveCameraName = async (cameraId: string) => {
    setEditError(null)
    setEditSuccess(null)

    try {
      const response = await fetch(`/api/cameras/${cameraId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editingName })
      })

      if (response.ok) {
        setEditSuccess('Názov kamery úspešne aktualizovaný')
        setEditingCamera(null)
        setEditingName('')
        fetchCameras()
      } else {
        const error = await response.json()
        setEditError('Chyba pri aktualizácii nazvu kamery: ' + (error.error || 'Neznáma chyba'))
      }
    } catch (error) {
      console.error('Error updating camera name:', error)
      setEditError('Chyba pri aktualizácii názvu kamery')
    }
  }

  const cancelEditing = () => {
    setEditingCamera(null)
    setEditingName('')
    setEditError(null)
    setEditSuccess(null)
  }

  const startUnpairing = (cameraId: string) => {
    setUnpairingCamera(cameraId)
    setUnpairConfirm('')
    setUnpairError(null)
    setUnpairSuccess(null)
    setEditingCamera(null)
  }

  const cancelUnpairing = () => {
    setUnpairingCamera(null)
    setUnpairConfirm('')
    setUnpairError(null)
    setUnpairSuccess(null)
  }

  const redeemShareCode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!shareCode.trim()) return
    setShareLoading(true)
    setShareStatus(null)
    setShareError(null)

    try {
      const response = await fetch('/api/cameras/share/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: shareCode.trim() })
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        setShareError(data?.error || 'Nepodarilo sa pridať kameru')
        return
      }

      setShareStatus(`Kamera pridaná: ${data?.camera?.name || ''}`)
      setShareCode('')
      fetchCameras()
    } catch (error) {
      console.error('Error redeeming share code:', error)
      setShareError('Chyba pri spracovaní kódu')
    } finally {
      setShareLoading(false)
    }
  }

  const unpairCamera = async (cameraId: string) => {
    if (unpairConfirm !== 'Odstran') {
      setUnpairError('Pre potvrdenie napíš "Odstran"')
      return
    }

    setUnpairError(null)
    setUnpairSuccess(null)

    try {
      const response = await fetch(`/api/cameras/${cameraId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: unpairConfirm })
      })

      if (response.ok) {
        setUnpairSuccess('Kamera úspešne odstránená')
        setUnpairingCamera(null)
        setUnpairConfirm('')
        fetchCameras()
      } else {
        const error = await response.json()
        setUnpairError('Chyba pri odparovaní: ' + (error.error || 'Neznáma chyba'))
      }
    } catch (error) {
      console.error('Error unpairing camera:', error)
      setUnpairError('Chyba pri odparovaní kamery')
    }
  }

  const goToStream = (cameraId: string) => {
    localStorage.setItem('selectedCameraId', cameraId)
    router.push('/stream')
  }

  const randomNumber = async () => {
    setIsGenerating(true)
    setPairingError(null)
    setPairingSuccess(false)
    setPairingInProgress(false)

    try {
      const response = await fetch('/api/pairing/generate', { method: 'POST' })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate pairing code')
      }
      const data = await response.json()
      setRandom(data.code)
      setPairingInProgress(true)
    } catch (error) {
      console.error('Error generating code:', error)
      setPairingError(error instanceof Error ? error.message : 'Chyba pri generovaní kódu')
      setRandom('------')
      setPairingInProgress(false)
    } finally {
      setIsGenerating(false)
    }
  }

  const safeParseJSON = (value: unknown) => {
    if (value === null || value === undefined) return null
    if (typeof value !== 'string') return null
    const trimmed = value.trim()
    if (trimmed.length === 0) return null
    try {
      return JSON.parse(trimmed)
    } catch {
      return null
    }
  }

  useEffect(() => {
    if (settings && random !== '------') {
      let receivedData: any = settings
      if (typeof settings === 'object' && 'code' in settings) {
        receivedData = settings
      } else if (typeof settings === 'string') {
        const parsed = safeParseJSON(settings)
        if (parsed) {
          receivedData = parsed
        } else {
          receivedData = { code: String(settings).trim() }
        }
      }
      if (receivedData.code === random) {
        validatePairing(receivedData.code, receivedData.mac || 'UNKNOWN')
      }
    }
  }, [settings, random])

  const validatePairing = async (code: string, macAddress: string) => {
    try {
      const response = await fetch('/api/pairing/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, macAddress })
      })
      if (response.ok) {
        setPairingSuccess(true)
        setPairingError(null)
        setPairingInProgress(false)
        setRandom('------')
        fetchCameras()
      } else {
        const error = await response.json()
        setPairingError(error.error || 'Párovanie zlyhalo')
      }
    } catch (error) {
      console.error('Error validating pairing:', error)
      setPairingError('Chyba pri párovaní')
    }
  }

  // Load cameras only when authenticated
  useEffect(() => {
    if (status === 'authenticated') {
      fetchCameras()
    }
  }, [status])

  // Refresh on successful pairing
  useEffect(() => {
    if (pairingSuccess && status === 'authenticated') {
      fetchCameras()
    }
  }, [pairingSuccess, status])

  // Polling počas párovania (kamera môže párovať aj cez HTTP submit bez MQTT potvrdenia)
  useEffect(() => {
    if (status !== 'authenticated' || !pairingInProgress || random === '------') {
      return
    }

    const intervalId = setInterval(() => {
      fetchCameras()
    }, 3000)

    const timeoutId = setTimeout(() => {
      setPairingInProgress(false)
    }, 120000)

    return () => {
      clearInterval(intervalId)
      clearTimeout(timeoutId)
    }
  }, [status, pairingInProgress, random])

  if (status === 'loading') {
    return (
      <main className={styles.main}>
        <div className={styles.loading}>
          <p>Načitavam...</p>
        </div>
      </main>
    )
  }

  if (!session) {
    return null
  }

  return (
    <div className={styles.menuContainer}>
      <header className={styles.header}>
        <div className={styles.logoContainer}>
          <Image src="./logo-w.svg" alt="Little Guard Logo" width={40} height={20} />
          <h1>Little Guard</h1>
        </div>
        <div className={styles.userInfo}>
          <span>{session?.user?.email || 'Načítavam...'}</span>
          <button onClick={handleLogout} className={styles.logoutButton}>
            Odhlásiť sa
          </button>
        </div>
      </header>

      <main className={styles.mainContent}>
        <section className={styles.pairingSection}>
          <h2>Párovanie zariadenia</h2>
          <p className={styles.instructions}>
            1. Zapnite kameru (prvý štart)
            <br />2. Pripojte sa na WiFi kamery (T-SIMCAM-Setup-xxxx)
            <br />3. Zadajte do prehliadača adresu 192.168.4.1
            <br />4. Vygenerujte tento kód a zadajte ho do webstránky kamery pre spárovanie s účtom
          </p>
          {isConnected ? (
            <p className={styles.mqttStatus}>MQTT pripojené</p>
          ) : (
            <p className={styles.mqttStatusOffline}>MQTT nepripojené</p>
          )}
          {pairingSuccess && <p className={styles.successMessage}>Kamera úspešne spárovaná!</p>}
          {pairingError && <p className={styles.errorMessage}>{pairingError}</p>}
          <div className={styles.codeContainer}>
            <div className={styles.codeDisplay}>
              <p>{random}</p>
            </div>
            <button className={styles.codeButton} onClick={randomNumber} disabled={isGenerating}>
              {isGenerating ? 'Generujem...' : 'Vygenerovať nový kód'}
            </button>
          </div>
        </section>

        <section className={styles.devicesSection}>
          <h2>Moje zariadenia</h2>
          {editSuccess && <p className={styles.successMessage}>{editSuccess}</p>}
          {editError && <p className={styles.errorMessage}>{editError}</p>}
          {unpairSuccess && <p className={styles.successMessage}>{unpairSuccess}</p>}
          {unpairError && <p className={styles.errorMessage}>{unpairError}</p>}
          {loadingCameras ? (
            <p>Načítavam zariadenia...</p>
          ) : cameras.length === 0 ? (
            <p>Žiadne zariadenia</p>
          ) : (
            <div className={styles.camerasList}>
              {cameras.map((camera) => (
                <div key={camera.id} className={styles.cameraCard}>
                  <div className={styles.cameraInfo}>
                    {editingCamera === camera.id ? (
                      <div className={styles.nameEdit}>
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          className={styles.nameInput}
                          autoFocus
                        />
                        <button onClick={() => saveCameraName(camera.id)} className={styles.saveButton}>
                          OK
                        </button>
                        <button onClick={cancelEditing} className={styles.cancelButton}>
                          X
                        </button>
                      </div>
                    ) : (
                      <h3>{camera.name}</h3>
                    )}
                  </div>
                  <div className={styles.cameraActions}>
                    <button
                      className={styles.cameraButton}
                      onClick={() => startEditingName(camera.id, camera.name)}
                      disabled={editingCamera !== null || unpairingCamera !== null}
                    >
                      Zmeniť názov
                    </button>
                    <button className={styles.cameraButton} onClick={() => goToStream(camera.id)}>
                      Stream
                    </button>
                    {unpairingCamera === camera.id ? (
                      <div className={styles.nameEdit}>
                        <input
                          type="text"
                          value={unpairConfirm}
                          onChange={(e) => setUnpairConfirm(e.target.value)}
                          placeholder='Napiste "Odstran"'
                          className={styles.nameInput}
                          autoFocus
                        />
                        <button
                          className={styles.saveButton}
                          onClick={() => unpairCamera(camera.id)}
                          disabled={unpairConfirm !== 'Odstran'}
                        >
                          Odparovať
                        </button>
                        <button className={styles.cancelButton} onClick={cancelUnpairing}>
                          X
                        </button>
                      </div>
                    ) : (
                      <button
                        className={styles.cameraButton}
                        onClick={() => startUnpairing(camera.id)}
                        disabled={editingCamera !== null}
                      >
                        Odparovať
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className={styles.shareSection}>
          <h2>Pridať už sparovanú kameru</h2>
          <p className={styles.instructions}>
            Zadajte zdieľaný kód zo stránky stream a sprístupnite si kameru v tomto účte.
          </p>
          {shareStatus && <p className={styles.successMessage}>{shareStatus}</p>}
          {shareError && <p className={styles.errorMessage}>{shareError}</p>}
          <form className={styles.shareForm} onSubmit={redeemShareCode}>
            <input
              type="text"
              value={shareCode}
              onChange={(e) => setShareCode(e.target.value)}
              className={styles.shareInput}
            />
            <button type="submit" className={styles.shareButton} disabled={shareLoading || !shareCode.trim()}>
              {shareLoading ? 'Pridávam...' : 'Pridať kameru'}
            </button>
          </form>
        </section>
      </main>
    </div>
  )
}
