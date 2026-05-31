import mqtt, { MqttClient } from "mqtt";

let _client: MqttClient | null = null;

export function getMqttClient(): MqttClient {
  if (_client) return _client;

  const host = process.env.MQTT_HOST ?? "localhost";
  const port = parseInt(process.env.MQTT_PORT ?? "1883");

  _client = mqtt.connect(`mqtt://${host}:${port}`, {
    clientId: `nextjs-${Math.random().toString(16).slice(2, 8)}`,
    keepalive: 30,
    reconnectPeriod: 3000,
  });

  _client.on("connect", () => {
    console.log(`[mqtt] connected to ${host}:${port}`);
    _client!.subscribe("weather/live");
  });
  _client.on("error", (e) => console.error("[mqtt] error:", e.message));

  return _client;
}
