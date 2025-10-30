import mqtt from 'mqtt'

let client: mqtt.MqttClient | null = null

export function getMqttClient() {
  if (!client) {
    client = mqtt.connect('ws://broker.hivemq.com:8000/mqtt', {
      clientId: `littleguard_${Math.random().toString(16).substr(2, 8)}`,
      clean: true,
      reconnectPeriod: 1000,
    })
  }
  return client
}