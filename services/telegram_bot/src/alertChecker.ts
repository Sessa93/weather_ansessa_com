import pg from "pg";
import { config } from "./config.js";
import { sendText } from "./telegram.js";

const pool = new pg.Pool({ connectionString: config.databaseUrl });

interface Alert {
  type: "warning" | "danger";
  key: string;
  message: string;
  emoji: string;
}

// Track which alerts are currently active so we don't spam
const activeAlerts = new Set<string>();

function checkThresholds(row: Record<string, number | null>): Alert[] {
  const alerts: Alert[] = [];

  // Extreme heat
  if (row.outside_temp !== null && row.outside_temp >= 35) {
    alerts.push({
      type: "danger",
      key: "heat",
      message: `🌡️ Caldo estremo: ${row.outside_temp.toFixed(1)}°C`,
      emoji: "🔴",
    });
  } else if (row.outside_temp !== null && row.outside_temp >= 32) {
    alerts.push({
      type: "warning",
      key: "heat",
      message: `🌡️ Temperatura alta: ${row.outside_temp.toFixed(1)}°C`,
      emoji: "🟡",
    });
  }

  // Freezing
  if (row.outside_temp !== null && row.outside_temp <= -5) {
    alerts.push({
      type: "danger",
      key: "freeze",
      message: `🥶 Gelo intenso: ${row.outside_temp.toFixed(1)}°C`,
      emoji: "🔴",
    });
  } else if (row.outside_temp !== null && row.outside_temp <= 0) {
    alerts.push({
      type: "warning",
      key: "freeze",
      message: `❄️ Gelo: ${row.outside_temp.toFixed(1)}°C`,
      emoji: "🟡",
    });
  }

  // High wind
  if (row.wind_gust !== null && row.wind_gust >= 80) {
    alerts.push({
      type: "danger",
      key: "wind",
      message: `💨 Raffiche di vento molto forti: ${row.wind_gust.toFixed(0)} km/h`,
      emoji: "🔴",
    });
  } else if (row.wind_gust !== null && row.wind_gust >= 50) {
    alerts.push({
      type: "warning",
      key: "wind",
      message: `💨 Forti raffiche di vento: ${row.wind_gust.toFixed(0)} km/h`,
      emoji: "🟡",
    });
  }

  // Heavy rain
  if (row.rain_rate !== null && row.rain_rate >= 50) {
    alerts.push({
      type: "danger",
      key: "rain",
      message: `🌧️ Pioggia molto intensa: ${row.rain_rate.toFixed(1)} mm/hr`,
      emoji: "🔴",
    });
  } else if (row.rain_rate !== null && row.rain_rate >= 20) {
    alerts.push({
      type: "warning",
      key: "rain",
      message: `🌧️ Pioggia intensa: ${row.rain_rate.toFixed(1)} mm/hr`,
      emoji: "🟡",
    });
  }

  // Low pressure (storm)
  if (row.barometer !== null && row.barometer < 990) {
    alerts.push({
      type: "warning",
      key: "pressure",
      message: `📉 Bassa pressione: ${row.barometer.toFixed(1)} mbar — possibile temporale`,
      emoji: "🟡",
    });
  }

  return alerts;
}

/** Check current conditions and broadcast new alerts to Telegram. */
export async function checkAndBroadcastAlerts(): Promise<void> {
  const chatIds = config.dailyChatIds;
  if (chatIds.length === 0) return;

  try {
    const { rows } = await pool.query(
      `SELECT outside_temp, wind_speed, wind_gust, rain_rate, humidity, barometer
       FROM weather_readings
       WHERE outside_temp IS NOT NULL
       ORDER BY timestamp DESC LIMIT 1`,
    );

    if (rows.length === 0) return;

    const currentAlerts = checkThresholds(rows[0]);
    const currentKeys = new Set(currentAlerts.map((a) => a.key));

    // Find newly triggered alerts (not already active)
    const newAlerts = currentAlerts.filter((a) => !activeAlerts.has(a.key));

    // Find cleared alerts
    for (const key of activeAlerts) {
      if (!currentKeys.has(key)) {
        activeAlerts.delete(key);
      }
    }

    // Mark new alerts as active and send them
    if (newAlerts.length > 0) {
      const header = "⚠️ *ALLERTA METEO*\n";
      const body = newAlerts.map((a) => `${a.emoji} ${a.message}`).join("\n");
      const text = header + body;

      for (const alert of newAlerts) {
        activeAlerts.add(alert.key);
      }

      for (const chatId of chatIds) {
        try {
          await sendText(chatId, text);
          console.log(`[alert] Sent ${newAlerts.length} alert(s) to ${chatId}`);
        } catch (err) {
          console.error(`[alert] Failed to send to ${chatId}:`, err);
        }
      }
    }
  } catch (err) {
    console.error("[alert] Error checking conditions:", err);
  }
}
