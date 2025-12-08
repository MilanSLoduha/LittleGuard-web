'use client'

import Image from "next/image";
import styles from './page.module.css'
import { useRouter } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { useMQTT } from '@/hooks/useMQTT'
import { useSession } from 'next-auth/react'
import * as Ably from 'ably'

export default function StreamPage() {
	const router = useRouter()
	const { data: session, status } = useSession()

	const [selectedCamera, setSelectedCamera] = useState<{ id: string, name: string, macAddress: string } | null>(null)

	const [selectedMode, setSelectedMode] = useState('mode1')
	const [selectedResolution, setSelectedResolution] = useState('1')
	const [quality, setQuality] = useState(10)
	const [brightness, setBrightness] = useState(0)
	const [contrast, setContrast] = useState(0)
	const [motorPan, setMotorPan] = useState(0)
	const [motorTilt, setMotorTilt] = useState(0)
	const [phoneNumber, setPhoneNumber] = useState('')
	const [sendSMS, setSendSMS] = useState(false)
	const [sendEmail, setSendEmail] = useState(false)
	const [emailAddress, setEmailAddress] = useState('')
	const [horizontalFlip, setHorizontalFlip] = useState(false)
	const [verticalFlip, setVerticalFlip] = useState(false)
	const [hwDownscale, setHwDownscale] = useState(false)
	const [awb, setAwb] = useState(false)
	const [aec, setAec] = useState(false)
	const [startTime, setStartTime] = useState('00:00')
	const [endTime, setEndTime] = useState('23:59')
	const [notificatinonDays, setNotificationDays] = useState({
		monday: false,
		tuesday: false,
		wednesday: false,
		thursday: false,
		friday: false,
		saturday: false,
		sunday: false
	})
	const [shareCode, setShareCode] = useState<string | null>(null)
	const [shareExpiry, setShareExpiry] = useState<string | null>(null)
	const [shareLoading, setShareLoading] = useState(false)
	const [shareError, setShareError] = useState<string | null>(null)

	const [streamON, setStreamON] = useState<1 | 0>(0)
	const ablyRef = useRef<Ably.Realtime | null>(null)
	const ablyChannelRef = useRef<string | null>(null)

	const ablyOwnedRef = useRef<boolean>(false)
	const [ablyConnected, setAblyConnected] = useState(false)
	const imgRef = useRef<HTMLImageElement>(null)
	const [hasFrame, setHasFrame] = useState(false)

	const cameraMac = selectedCamera?.macAddress
	const normalizedMac = cameraMac ? cameraMac.replace(/[^a-fA-F0-9]/g, '').toLowerCase() : ''
	const ablyChannelName = normalizedMac ? `camera-stream-${normalizedMac}` : null
	const { temperature, motion, lastMotion, isConnected, settings, sendCommand, streamControll, saveSnapshot } = useMQTT(cameraMac)

	//auth
	useEffect(() => {
		if (status === 'loading') return

		if (!session) {
			router.push('/')
			return
		}
	}, [session, status, router])

	// Načítaj vybranú kameru z localStorage
	useEffect(() => {
		const cameraId = localStorage.getItem('selectedCameraId')
		if (cameraId) {
			// názov kamery
			fetch(`/api/cameras/${cameraId}`)
				.then(async res => {
					if (!res.ok) {
						console.warn('Camera API returned non-OK status:', res.status)
						return null
					}
					const contentType = res.headers.get('content-type') || ''
					if (!contentType.includes('application/json')) {
						console.warn('Camera API returned non-JSON response, content-type:', contentType)
						return null
					}
					const text = await res.text()
					if (!text || text.trim().length === 0) {
						console.warn('Camera API returned empty body')
						return null
					}
					try {
						return JSON.parse(text)
					} catch (err) {
						console.error('Failed to parse camera API JSON:', err, 'Raw:', text)
						return null
					}
				})
				.then(data => {
					if (data && data.camera) {
						setSelectedCamera({ id: cameraId, name: data.camera.name, macAddress: data.camera.macAddress })
					}
				})
				.catch(err => console.error('Error fetching camera:', err))
		}
	}, [])

	// Ably
	useEffect(() => {
		if (status !== 'authenticated' || !ablyChannelName) {
			return
		}

		if (ablyRef.current) {
			return
		}

		const ablyKey = process.env.NEXT_PUBLIC_ABLY_KEY
		if (!ablyKey || ablyKey.length === 0) {
			console.warn('NEXT_PUBLIC_ABLY_KEY is not configured, skipping Ably client creation')
			return
		}
		const realtimeClient = new Ably.Realtime({ key: ablyKey });

		ablyRef.current = realtimeClient;
		ablyOwnedRef.current = true
		realtimeClient.connection.on('connected', () => {
			console.log('Ably connected')
			setAblyConnected(true)
		})

		realtimeClient.connection.on('disconnected', () => {
			console.log('Ably disconnected')
			setAblyConnected(false)
		})

		realtimeClient.connection.on('failed', (stateChange) => {
			console.error('Ably connection failed:', stateChange)
			setAblyConnected(false)
		})

		realtimeClient.connection.on('closed', (stateChange) => {
			console.log('Ably connection closed:', realtimeClient.connection.state, stateChange)
			setAblyConnected(false)
		})

		realtimeClient.connection.on('suspended', (stateChange) => {
			console.warn('Ably connection suspended:', realtimeClient.connection.state, stateChange)
			setAblyConnected(false)
		})

		const channel = realtimeClient.channels.get(ablyChannelName);
		ablyChannelRef.current = ablyChannelName;

		channel.subscribe((message) => {
			const dt = message.data;
			const typeInfo = dt instanceof ArrayBuffer
				? 'ArrayBuffer'
				: (ArrayBuffer.isView(dt) ? `TypedArray(${dt.constructor?.name})` : typeof dt);
			console.log('Ably msg', message.name, 'data type:', typeInfo);
		});

		channel.subscribe('frame', (message) => {
			const raw = message.data;
			let data: any = raw;

			if (raw instanceof ArrayBuffer || ArrayBuffer.isView(raw)) {
				try {
					const decoder = new TextDecoder();
					const text = decoder.decode(raw as ArrayBuffer);
					data = JSON.parse(text);
					console.log('Ably frame decoded from binary, len', text.length);
				} catch (err) {
					console.warn('Failed to decode binary Ably frame', err);
					data = null;
				}
			} else if (typeof raw === 'string') {
				try {
					data = JSON.parse(raw);
					console.log('Ably frame raw string len', raw.length);
				} catch (err) {
					console.warn('Ably frame payload is string and JSON.parse failed:', err, 'raw start:', raw?.slice?.(0, 120));
					data = null;
				}
			} else {
				console.log('Ably frame raw type', typeof raw, raw);
			}

			const imgBase64 =
				(data && data.image) ? data.image :
					(data && data.data && data.data.image) ? data.data.image :
						null;

			if (imgBase64) {
				const ImageUrl = `data:image/jpeg;base64,${imgBase64}`;
				if (imgRef.current) {
					imgRef.current.src = ImageUrl;
				}
				if (!hasFrame) setHasFrame(true);
			} else {
				console.log('No image in data after parsing:', data);
			}
		})

		return () => {
			console.log('Cleaning up Ably client instance - closing connection')
			try {
				if (channel) {
					channel.unsubscribe()
				}
				if (ablyRef.current) {
					ablyRef.current.close()
				}
			} catch (err) {
				console.warn('Error during Ably cleanup:', err)
			} finally {
				ablyRef.current = null
				ablyChannelRef.current = null
				ablyOwnedRef.current = false
				setAblyConnected(false)
			}
		}
	}, [status, ablyChannelName])

	// Cleanup
	useEffect(() => {
		return () => {
			console.log('Component unmounting, cleaning up Ably client')
			try {
				if (ablyRef.current) {
					const client = ablyRef.current
					const channelName = ablyChannelRef.current || (ablyChannelName ?? 'camera-stream')
					const channel = client.channels.get(channelName)
					channel.unsubscribe()
					client.close()
				}
			} catch (err) {
				console.warn('Error during component cleanup:', err)
			} finally {
				ablyRef.current = null
				setAblyConnected(false)
				ablyOwnedRef.current = false
			}
		}
	}, [])

	// Načítaj nastavenia z MQTT
	useEffect(() => {
		if (settings) {
			if (settings.mode) setSelectedMode(settings.mode)
			if (settings.resolution) setSelectedResolution(settings.resolution)
			if (settings.quality !== undefined) setQuality(settings.quality)
			if (settings.brightness !== undefined) setBrightness(settings.brightness)
			if (settings.contrast !== undefined) setContrast(settings.contrast)
			if (settings.motorPan !== undefined) setMotorPan(settings.motorPan)
			if (settings.motorTilt !== undefined) setMotorTilt(settings.motorTilt)
			if (settings.phoneNumber) setPhoneNumber(settings.phoneNumber)
			if (settings.sendSMS !== undefined) setSendSMS(settings.sendSMS)
			if (settings.sendEmail !== undefined) setSendEmail(settings.sendEmail)
			if (settings.emailAddress) setEmailAddress(settings.emailAddress)
			if (settings.hFlip !== undefined) setHorizontalFlip(settings.hFlip)
			if (settings.vFlip !== undefined) setVerticalFlip(settings.vFlip)
			if (settings.hwDownscale !== undefined) setHwDownscale(settings.hwDownscale)
			if (settings.awb !== undefined) setAwb(settings.awb)
			if (settings.aec !== undefined) setAec(settings.aec)
			if (settings.startTime) setStartTime(settings.startTime)
			if (settings.endTime) setEndTime(settings.endTime)

			setNotificationDays({
				monday: settings.monday ?? false,
				tuesday: settings.tuesday ?? false,
				wednesday: settings.wednesday ?? false,
				thursday: settings.thursday ?? false,
				friday: settings.friday ?? false,
				saturday: settings.saturday ?? false,
				sunday: settings.sunday ?? false
			})
		}
	}, [settings])

	// Ak sa session načítava alebo nie je prihlásený- loading
	if (status === 'loading' || !session) {
		return (
			<main className={styles.main}>
				<div className={styles.loading}>
					<p>Načítavam...</p>
				</div>
			</main>
		)
	}

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

	const handleSendSettings = () => {
		sendCommand({
			type: 'settings',
			mode: selectedMode,
			resolution: selectedResolution,
			quality: quality,
			brightness: brightness,
			contrast: contrast,
			horizontalFlip: horizontalFlip,
			verticalFlip: verticalFlip,
			hwDownscale: hwDownscale,
			awb: awb,
			aec: aec,
			phoneNumber: phoneNumber,
			emailAddress: emailAddress,
			sendSMS: sendSMS,
			sendEmail: sendEmail,
			monday: notificatinonDays.monday,
			tuesday: notificatinonDays.tuesday,
			wednesday: notificatinonDays.wednesday,
			thursday: notificatinonDays.thursday,
			friday: notificatinonDays.friday,
			saturday: notificatinonDays.saturday,
			sunday: notificatinonDays.sunday,
			startTime: startTime,
			endTime: endTime
		})
	}

	const handleSendMotor = () => {
		sendCommand({
			type: 'motor',
			pan: motorPan,
			tilt: motorTilt
		})
	}

	const handleGenerateShareCode = async () => {
		if (!selectedCamera) return
		setShareLoading(true)
		setShareError(null)
		setShareCode(null)
		setShareExpiry(null)

		try {
			const response = await fetch(`/api/cameras/${selectedCamera.id}/share-code`, {
				method: 'POST'
			})
			const data = await response.json().catch(() => ({}))

			if (!response.ok) {
				setShareError(data?.error || 'Nepodarilo sa vygenerovať kód')
				return
			}

			setShareCode(data.code || null)
			setShareExpiry(data.expiresAt || null)
		} catch (error) {
			console.error('Error generating share code:', error)
			setShareError('Chyba pri generovaní kódu')
		} finally {
			setShareLoading(false)
		}
	}


	return (
		<main className={styles.main}>
			<header className={styles.header}>
				<div className={styles.logoContainer}>
					<Image
						src="../logo-w.svg"
						alt="Little Guard Logo"
						width={40}
						height={20}
					/>
					<h1>Little Guard</h1>
					{selectedCamera && (
						<span className={styles.cameraName}>- {selectedCamera.name}</span>
					)}
				</div>
				<div className={styles.status}>
					<span className={(isConnected && ablyConnected) ? styles.connected : styles.disconnected}>
						{(isConnected && ablyConnected) ? 'Pripojené' : 'Odpojené'}
					</span>
					<button onClick={() => router.push('/menu')} className={styles.menuButton}>
						Menu
					</button>
				</div>
			</header>
			<div className={styles.grid}>
				{/* Camera Stream */}
				<div className={styles.streamCard}>
					<div className={styles.streamWrapper}>
						<img
							ref={imgRef}
							className={styles.streamImg}
						/>
						{!hasFrame && <div className={styles.streamOverlay}></div>}
					</div>
					<div className={styles.streamButtons}>
						<button className={styles.menuButton} onClick={() => {
							const newStream: 0 | 1 = streamON === 1 ? 0 : 1;
							setStreamON(newStream);
							streamControll(newStream)
						}}>{streamON ? <h1>||</h1> : <h1>&#9658;</h1>}</button>
						<button className={styles.menuButton} onClick={() => {
							saveSnapshot("snapshot");
						}}>Uložiť snapshot</button>
					</div>
				</div>

				<div className={styles.sidebar}>

					<div className={styles.card}>
						<div className={styles.block}>
							<h2>Údaje</h2>

							<div className={styles.infoBox}>
								<span>Teplota:</span>
								<p>{temperature !== null ? `${temperature} °C` : '--.-'}</p>
							</div>

							<div className={styles.infoBox}>
								<span>Pohyb:</span>
								<p>{motion ? 'Detekovaný' : 'Žiadny'}</p>
							</div>

							<div className={styles.infoBox}>
								<span>Posledný pohyb:</span>
								<p>{lastMotion || 'Žiadny'}</p>
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
									<option value="1" className={styles.option}>UXGA(1600x1200)</option>
									<option value="2" className={styles.option}>SXGA(1280x1024)</option>
									<option value="3" className={styles.option}>XGA(1024x768)</option>
									<option value="4" className={styles.option}>SVGA(800x600)</option>
									<option value="5" className={styles.option}>VGA(640x480)</option>
									<option value="6" className={styles.option}>CIF(400x296)</option>
								</select>
							</div>

							<label>Kvalita:</label>
							<input
								type="range"
								min="10"
								max="63"
								value={quality}
								onChange={(e) => setQuality(Number(e.target.value))}
								className={styles.slider}
							/>

							<div className={styles.switchBox}>
								<label>Hotizontálne prevrátenie:</label>
								<input
									type="checkbox"
									checked={horizontalFlip}
									onChange={(e) => setHorizontalFlip(Boolean(e.target.checked))}
									className={styles.switch}
								/>
							</div>

							<div className={styles.switchBox}>
								<label>Vertikálne prevrátenie:</label>
								<input
									type="checkbox"
									checked={verticalFlip}
									onChange={(e) => setVerticalFlip(Boolean(e.target.checked))}
									className={styles.switch}
								/>
							</div>

							<div className={styles.switchBox}>
								<label>Hardvérové znižovanie rozlíšenia:</label>
								<input
									type="checkbox"
									checked={hwDownscale}
									onChange={(e) => setHwDownscale(Boolean(e.target.checked))}
									className={styles.switch}
								/>
							</div>

							<div className={styles.switchBox}>
								<label>Softvérové ladenie bielej:</label>
								<input
									type="checkbox"
									checked={awb}
									onChange={(e) => setAwb(Boolean(e.target.checked))}
									className={styles.switch}
								/>
							</div>

							<div className={styles.switchBox}>
								<label>Softvérové ladenie expozície:</label>
								<input
									type="checkbox"
									checked={aec}
									onChange={(e) => setAec(Boolean(e.target.checked))}
									className={styles.switch}
								/>
							</div>

							<label>Svetlosť:</label>
							<input
								type="range"
								min="-2"
								max="2"
								value={brightness}
								onChange={(e) => setBrightness(Number(e.target.value))}
								className={styles.slider}
							/>

							<label>Kontrast:</label>
							<input
								type="range"
								min="-2"
								max="2"
								value={contrast}
								onChange={(e) => setContrast(Number(e.target.value))}
								className={styles.slider}
							/>
						</div>

						<div className={styles.block}>
							<h2>Motory</h2>
							<label>Pan (do strán)</label>
							<input
								type="range"
								min="-180"
								max="180"
								value={motorPan}
								onChange={(e) => setMotorPan(Number(e.target.value))}
								className={styles.slider}
							/>
							<label>Tilt (hore/dole)</label>
							<input
								type="range"
								min="-90"
								max="90"
								value={motorTilt}
								onChange={(e) => setMotorTilt(Number(e.target.value))}
								className={styles.slider}
							/>
							<button className={styles.saveButton} onClick={handleSendMotor}>
								Poslať pohyb
							</button>
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
								<label>Email:</label>
								<input
									type="email"
									value={emailAddress}
									onChange={(e) => setEmailAddress(e.target.value)}
									placeholder="example@gmail.com"
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

							<div className={styles.switchBox}>
								<label>Posielať Email:</label>
								<input
									type="checkbox"
									checked={sendEmail}
									onChange={(e) => setSendEmail(e.target.checked)}
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


							<div className={styles.switchBox}>
								<label>Od:</label>
								<input
									type="time"
									value={startTime}
									onChange={(e) => setStartTime(e.target.value)}
									className={styles.input}
								/>
								<label>Do:</label>
								<input
									type="time"
									value={endTime}
									onChange={(e) => setEndTime(e.target.value)}
									className={styles.input}
								/>
							</div>
						</div>
						<div className={styles.block}>
							<h2>Zdieľanie kamery</h2>
							{shareError && <p className={styles.errorText}>{shareError}</p>}
							{shareCode && (
								<div className={styles.shareCodeBox}>
									<span className={styles.shareCode}>{shareCode}</span>
								</div>
							)}
							<button
								className={styles.generateButton}
								onClick={handleGenerateShareCode}
								disabled={!selectedCamera || shareLoading}
							>
								{shareLoading ? 'Generujem...' : 'Kód'}
							</button>
						</div>
					</div>
					<button onClick={handleSendSettings} className={styles.saveButton}>
						Uložiť nastavenia
					</button>
				</div>
			</div>
		</main>
	);
}
