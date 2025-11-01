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
  sendCommand: (command: { type: string; [key: string]: any }) => void
}

export function useMQTT(): MQTTData {
  const [temperature, setTemperature] = useState<number | null>(null)
  const [motion, setMotion] = useState(false)
  const [lastMotion, setLastMotion] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [settings, setSettings] = useState<CameraSettings | null>(null)
  const clientRef = useRef<MqttClient | null>(null)

  const sendCommand = useCallback((command: { type: string; [key: string]: any }) => {
    if (clientRef.current && isConnected) {
      const topic = process.env.NEXT_PUBLIC_MQTT_TOPIC_COMMAND;
      if (topic) {
        clientRef.current.publish(topic, JSON.stringify(command))
        console.log('Command sent:', command)
      }
    }
  }, [isConnected])

  useEffect(() => {
    const broker = process.env.NEXT_PUBLIC_MQTT_BROKER
    const username = process.env.NEXT_PUBLIC_MQTT_USERNAME
    const password = process.env.NEXT_PUBLIC_MQTT_PASSWORD

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

    client.on('connect', () => {
      setIsConnected(true)

      const tempTopic = process.env.NEXT_PUBLIC_MQTT_TOPIC_TEMPERATURE
      const motionTopic = process.env.NEXT_PUBLIC_MQTT_TOPIC_MOTION
      const settingsTopic = process.env.NEXT_PUBLIC_MQTT_TOPIC_SETTINGS
      const lastMotionTopic = process.env.NEXT_PUBLIC_MQTT_TOPIC_LAST_MOTION

      if (!tempTopic || !motionTopic || !settingsTopic || !lastMotionTopic) {
        console.error('MQTT topics are not defined')
        return
      }

      client.subscribe([tempTopic, motionTopic, settingsTopic, lastMotionTopic], { qos: 1 }, (err) => {
        if (err) {
          console.error('Subscribe error:', err)
        } else {
          console.log('Subscribed to topics:', [tempTopic, motionTopic, settingsTopic, lastMotionTopic])
        }
      })
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
          const parsedSettings = JSON.parse(data)
          setSettings(parsedSettings)
        } catch (e) {
          console.error('Failed to parse settings:', e)
        }
      }
    })

    client.on('error', (err) => {
      console.error('MQTT error:', err)
      setIsConnected(false)
    })

    client.on('offline', () => {
      console.log('MQTT offline')
      setIsConnected(false)
    })

    client.on('reconnect', () => {
      console.log('MQTT reconnecting...')
    })

    return () => {
      if (clientRef.current) {
        clientRef.current.end()
        clientRef.current = null
      }
    }
  }, [])

  return {
    temperature,
    motion,
    lastMotion,
    isConnected,
    settings,
    sendCommand,
  }
}
