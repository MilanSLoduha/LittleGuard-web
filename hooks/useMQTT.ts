import { useEffect, useState, useCallback, useRef } from 'react'
import mqtt, { MqttClient } from 'mqtt'

interface CameraSettings {
  mode?: string
  resolution?: string
  quality?: number
  hFlip?: boolean
  hwDownscale?: boolean
  awb?: boolean
  aec?: boolean
  brightness?: number
  contrast?: number
  phoneNumber?: string
  sendSMS?: boolean
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
  sendCommand: (command: { type: string;[key: string]: any }) => void
  streamControll: (number: 1 | 0) => void
  saveSnapshot: (message: string) => void
}

export function useMQTT(): MQTTData {
  const [temperature, setTemperature] = useState<number | null>(null)
  const [motion, setMotion] = useState(false)
  const [lastMotion, setLastMotion] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [settings, setSettings] = useState<CameraSettings | null>(null)
  const clientRef = useRef<MqttClient | null>(null)

  const sendCommand = useCallback((command: { type: string;[key: string]: any }) => {
    if (clientRef.current && isConnected && clientRef.current.connected) {
      const topic = process.env.NEXT_PUBLIC_MQTT_TOPIC_COMMAND;
      if (topic) {
        clientRef.current.publish(topic, JSON.stringify(command))
        console.log('Command sent:', command)
      }
    } else {
      console.warn('MQTT client not connected, cannot send command')
    }
  }, [isConnected])

  const streamControll = useCallback((param: 1 | 0) => {
    if (clientRef.current && isConnected && clientRef.current.connected) {
      const topic = process.env.NEXT_PUBLIC_MQTT_TOPIC_STREAM_CONTROL;
      if (topic) {
        clientRef.current.publish(topic, param.toString())
      }
    } else {
      console.warn('MQTT client not connected, cannot control stream')
    }
  }, [isConnected])

  const saveSnapshot = useCallback((message: string) => {
    if (clientRef.current && isConnected && clientRef.current.connected) {
      const topic = process.env.NEXT_PUBLIC_MQTT_TOPIC_SNAPSHOT;
      if (topic) {
        clientRef.current.publish(topic, message.toString())
      }
    } else {
      console.warn('MQTT client not connected, cannot save snapshot')
    }
  }, [isConnected])

  useEffect(() => {
    const broker = process.env.NEXT_PUBLIC_MQTT_BROKER
    const username = process.env.NEXT_PUBLIC_MQTT_USERNAME
    const password = process.env.NEXT_PUBLIC_MQTT_PASSWORD

    if (!broker || !username || !password) {
      console.log('MQTT credentials not configured, skipping connection')
      return
    }

    const options: mqtt.IClientOptions = {
      protocol: 'wss',
      ...(username && { username }),
      ...(password && { password }),
      clean: true,
      reconnectPeriod: 5000,
    }

    if (!broker) {
      console.error('MQTT broker URL is not defined')
      return
    }
    const client = mqtt.connect(broker, options)
    clientRef.current = client

    const defaultSettingsTimeout = setTimeout(() => {
      if (settings === null) {
        const defaultSettings: CameraSettings = {
          mode: "default",
          resolution: "640x480",
          quality: 80,
          hFlip: false,
          hwDownscale: false,
          awb: true,
          aec: true,
          brightness: 50,
          contrast: 50,
          phoneNumber: "",
          sendSMS: false,
          monday: true,
          tuesday: true,
          wednesday: true,
          thursday: true,
          friday: true,
          saturday: false,
          sunday: false,
          startTime: "08:00",
          endTime: "18:00"
        }
        setSettings(defaultSettings)
        console.log('Nastavené default nastavenia po 5 sekundách')
      }
    }, 5000)

    client.on('connect', () => {
      console.log('MQTT connected successfully')
      setIsConnected(true)

      const tempTopic = process.env.NEXT_PUBLIC_MQTT_TOPIC_TEMPERATURE
      const motionTopic = process.env.NEXT_PUBLIC_MQTT_TOPIC_MOTION
      const settingsTopic = process.env.NEXT_PUBLIC_MQTT_TOPIC_SETTINGS
      const lastMotionTopic = process.env.NEXT_PUBLIC_MQTT_TOPIC_LAST_MOTION

      if (!tempTopic || !motionTopic || !settingsTopic || !lastMotionTopic) {
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
      }, 1000)
    })

    client.on('message', (topic, message) => {
      const data = message.toString()
      console.log('MQTT message:', topic, data)

      const tempTopic = process.env.NEXT_PUBLIC_MQTT_TOPIC_TEMPERATURE
      const motionTopic = process.env.NEXT_PUBLIC_MQTT_TOPIC_MOTION
      const lastMotionTopic = process.env.NEXT_PUBLIC_MQTT_TOPIC_LAST_MOTION
      const settingsTopic = process.env.NEXT_PUBLIC_MQTT_TOPIC_SETTINGS

      console.log('🔍 Comparing:', { topic, tempTopic, motionTopic, lastMotionTopic, settingsTopic })

      if (topic === tempTopic) {
        const temp = parseFloat(data)
        if (!isNaN(temp)) {
          setTemperature(temp)
        }
      }
      else if (topic === lastMotionTopic) {
        setLastMotion(data)
      }
      else if (topic === motionTopic) {
        setMotion(data === '1')
      }
      else if (topic === settingsTopic) {
        try {
          if (typeof data === 'string' && data.length > 0) {
            const trimmedData = data.trim()
            if (trimmedData.length > 1 &&
              ((trimmedData.startsWith('{') && trimmedData.endsWith('}')) ||
                (trimmedData.startsWith('[') && trimmedData.endsWith(']')))) {
              const parsedSettings = JSON.parse(trimmedData)
              if (parsedSettings !== null && typeof parsedSettings === 'object' && !Array.isArray(parsedSettings)) {
                setSettings(parsedSettings)
                console.log('Successfuly parsed setings:', parsedSettings)
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
      clearTimeout(defaultSettingsTimeout)
    }
  }, [])

  return {
    temperature,
    motion,
    lastMotion,
    isConnected,
    settings,
    sendCommand,
    streamControll,
    saveSnapshot
  }
}
