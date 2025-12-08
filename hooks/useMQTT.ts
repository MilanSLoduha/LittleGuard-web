import { useEffect, useState, useCallback, useRef } from 'react'
import mqtt, { MqttClient } from 'mqtt'

interface CameraSettings {
  mode?: string
  resolution?: string
  quality?: number
  motorPan?: number
  motorTilt?: number
  hFlip?: boolean
  vFlip?: boolean
  hwDownscale?: boolean
  awb?: boolean
  aec?: boolean
  brightness?: number
  contrast?: number
  phoneNumber?: string
  emailAddress?: string
  sendSMS?: boolean
  sendEmail?: boolean
  monday?: boolean
  tuesday?: boolean
  wednesday?: boolean
  thursday?: boolean
  friday?: boolean
  saturday?: boolean
  sunday?: boolean
  startTime?: string
  endTime?: string
}

interface MQTTData {
  temperature: number | null
  motion: boolean
  lastMotion: string | null
  isConnected: boolean
  settings: CameraSettings | null
  sendCommand: (command: { type: string; [key: string]: any }) => void
  streamControll: (number: 1 | 0) => void
  saveSnapshot: (message: string) => void
}

const normalizeMac = (mac?: string | null) => (mac ? mac.replace(/[^a-fA-F0-9]/g, '').toLowerCase() : '')

export function useMQTT(macAddress?: string): MQTTData {
  const [temperature, setTemperature] = useState<number | null>(null)
  const [motion, setMotion] = useState(false)
  const [lastMotion, setLastMotion] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [settings, setSettings] = useState<CameraSettings | null>(null)
  const clientRef = useRef<MqttClient | null>(null)
  const defaultSettingsTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const topicRoot = process.env.NEXT_PUBLIC_MQTT_TOPIC_ROOT || 'littleguard'
  const macNormalized = normalizeMac(macAddress)
  const topicPrefix = `${topicRoot}/${macNormalized || '+'}`
  const topics = {
    temperature: `${topicPrefix}/temperature`,
    motion: `${topicPrefix}/motion`,
    lastMotion: `${topicPrefix}/last_motion`,
    settings: `${topicPrefix}/settings`,
    command: `${topicPrefix}/command`,
    stream: `${topicPrefix}/stream_control`,
    snapshot: `${topicPrefix}/snapshot`,
  }
  const canPublish = macNormalized.length > 0

  const sendCommand = useCallback(
    (command: { type: string; [key: string]: any }) => {
      if (clientRef.current && isConnected && clientRef.current.connected && topics?.command && canPublish) {
        clientRef.current.publish(topics.command, JSON.stringify(command))
        console.log('Command sent:', command)
      } else {
        console.warn('MQTT client not connected, cannot send command')
      }
    },
    [isConnected, topics?.command, canPublish]
  )

  const streamControll = useCallback(
    (param: 1 | 0) => {
      if (clientRef.current && isConnected && clientRef.current.connected && topics?.stream && canPublish) {
        clientRef.current.publish(topics.stream, param.toString())
      } else {
        console.warn('MQTT client not connected, cannot control stream')
      }
    },
    [isConnected, topics?.stream, canPublish]
  )

  const saveSnapshot = useCallback(
    (message: string) => {
      if (clientRef.current && isConnected && clientRef.current.connected && topics?.snapshot && canPublish) {
        clientRef.current.publish(topics.snapshot, message.toString())
      } else {
        console.warn('MQTT client not connected, cannot save snapshot')
      }
    },
    [isConnected, topics?.snapshot, canPublish]
  )

  useEffect(() => {
    const broker = process.env.NEXT_PUBLIC_MQTT_BROKER
    const username = process.env.NEXT_PUBLIC_MQTT_USERNAME
    const password = process.env.NEXT_PUBLIC_MQTT_PASSWORD

    if (!broker || !username || !password) {
      console.log('MQTT credentials not configured or topics not ready, skipping connection')
      return
    }

    const options: mqtt.IClientOptions = {
      protocol: 'wss',
      ...(username && { username }),
      ...(password && { password }),
      clean: true,
      reconnectPeriod: 5000,
    }

    const client = mqtt.connect(broker, options)
    clientRef.current = client

    setTemperature(null)
    setMotion(false)
    setLastMotion(null)
    setSettings(null)
    setIsConnected(false)

    defaultSettingsTimeoutRef.current = setTimeout(() => {
      if (settings === null) {
        const defaultSettings: CameraSettings = {
          mode: 'mode1',
          resolution: '5',
          quality: 12,
          hFlip: false,
          hwDownscale: false,
          awb: true,
          aec: true,
          brightness: 0,
          contrast: 0,
          phoneNumber: '',
          sendSMS: false,
          sendEmail: false,
          monday: false,
          tuesday: false,
          wednesday: false,
          thursday: false,
          friday: false,
          saturday: false,
          sunday: false,
          startTime: '00:00',
          endTime: '23:59',
        }
        setSettings(defaultSettings)
        console.log('Nastavenie default nastavenia po 10 sekundach - ziadne MQTT setings neprisli')
      }
    }, 10000)

    client.on('connect', () => {
      console.log('MQTT connected successfully')
      setIsConnected(true)

      const tempTopic = topics?.temperature
      const motionTopic = topics?.motion
      const settingsTopic = topics?.settings
      const lastMotionTopic = topics?.lastMotion
      const commandTopic = topics?.command

      if (!tempTopic || !motionTopic || !settingsTopic || !lastMotionTopic || !commandTopic) {
        console.error('MQTT topics are not defined')
        return
      }

      setTimeout(() => {
        if (clientRef.current && client.connected) {
          client.subscribe([tempTopic, motionTopic, settingsTopic, lastMotionTopic], { qos: 1 }, (err) => {
            if (err) {
              console.error('Subscribe error:', err)
            } else {
              console.log('Subscribed to topics:', [tempTopic, motionTopic, settingsTopic, lastMotionTopic])
            }
          })
        } else {
          console.warn('MQTT client not connected, skipping subscription')
        }

        if (canPublish) {
          setTimeout(() => {
            if (clientRef.current && client.connected && commandTopic) {
              const requestPayload = JSON.stringify({ type: 'get_settings' })
              clientRef.current.publish(commandTopic, requestPayload)
              console.log('Requested camera settings over MQTT')
            }
          }, 500)
        } else {
          console.log('Skipping get_settings publish because MAC is unknown (wildcard subscribe only)')
        }
      }, 1000)
    })

    client.on('message', (topic, message) => {
      const data = message.toString()
      console.log('MQTT message:', topic, data)

      const tempTopic = topics?.temperature
      const motionTopic = topics?.motion
      const lastMotionTopic = topics?.lastMotion
      const settingsTopic = topics?.settings

      console.log('🔍 Comparing:', { topic, tempTopic, motionTopic, lastMotionTopic, settingsTopic })

      if (topic === tempTopic) {
        const temp = parseFloat(data)
        if (!isNaN(temp)) {
          setTemperature(temp)
        }
      } else if (topic === lastMotionTopic) {
        setLastMotion(data)
      } else if (topic === motionTopic) {
        setMotion(data === '1')
      } else if (topic === settingsTopic) {
        try {
          if (typeof data === 'string' && data.length > 0) {
            const trimmedData = data.trim()
            if (
              trimmedData.length > 1 &&
              ((trimmedData.startsWith('{') && trimmedData.endsWith('}')) ||
                (trimmedData.startsWith('[') && trimmedData.endsWith(']')))
            ) {
              const parsedSettings = JSON.parse(trimmedData)
              if (parsedSettings !== null && typeof parsedSettings === 'object' && !Array.isArray(parsedSettings)) {
                setSettings(parsedSettings)
                console.log('Successfuly parsed setings:', parsedSettings)
                if (defaultSettingsTimeoutRef.current) {
                  clearTimeout(defaultSettingsTimeoutRef.current)
                  defaultSettingsTimeoutRef.current = null
                }
              } else {
                console.log('Parsed setings is not a valid object:', parsedSettings)
              }
            } else {
              console.log('Received non-JSON formatted settings data:', trimmedData.substring(0, 50) + '...')
            }
          } else {
            console.log('Received invalid settings data type or empty:', typeof data, data ? `"${data}"` : 'empty')
          }
        } catch (e) {
          console.error('Failed to parse settings JSON:', e instanceof Error ? e.message : String(e), 'Raw data:', data ? `"${data}"` : 'empty')
        }
      }
    })

    client.on('error', (err) => {
      console.error('MQTT connection error:', err)
      setIsConnected(false)
    })

    client.on('offline', () => {
      console.log('MQTT client went offline')
      setIsConnected(false)
    })

    client.on('close', () => {
      console.log('MQTT connection closed')
      setIsConnected(false)
    })

    client.on('reconnect', () => {
      console.log('MQTT attempting to reconnect...')
    })

    client.on('disconnect', (packet) => {
      console.log('MQTT client disconnected:', packet)
      setIsConnected(false)
    })

    return () => {
      if (clientRef.current) {
        console.log('Cleaning up MQTT client')
        clientRef.current.end(true) // Force disconnect
        clientRef.current = null
        setIsConnected(false)
      }
      if (defaultSettingsTimeoutRef.current) {
        clearTimeout(defaultSettingsTimeoutRef.current)
        defaultSettingsTimeoutRef.current = null
      }
    }
  }, [topicPrefix, macNormalized])

  return {
    temperature,
    motion,
    lastMotion,
    isConnected,
    settings,
    sendCommand,
    streamControll,
    saveSnapshot,
  }
}
