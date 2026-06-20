import { statSync } from "node:fs";

// Lightweight observability: every notable event is emitted as a single
// structured JSON log line (parseable by Render log drains / log-based alerts),
// and high-severity events are also pushed to an alert webhook when configured.
//
// Optional env:
//   RIAAYA_ALERT_WEBHOOK   Slack / Discord / generic incoming-webhook URL.
//   RIAAYA_SERVICE_NAME    label shown in alerts (default "riaaya").
//   RIAAYA_DB_WARN_MB      warn when the DB file exceeds this many MB (default 700).

const WEBHOOK = process.env.RIAAYA_ALERT_WEBHOOK || "";
const SERVICE = process.env.RIAAYA_SERVICE_NAME || "riaaya";
const ALERTING_LEVELS = new Set(["error", "security", "critical"]);

// Don't spam the webhook: collapse identical alerts within a cooldown window.
const lastAlertAt = new Map();
const ALERT_COOLDOWN_MS = 5 * 60 * 1000;

export function reportEvent(level, event, detail = {}) {
  const entry = { ts: new Date().toISOString(), level, event, service: SERVICE, ...detail };
  const line = `[monitor] ${JSON.stringify(entry)}`;
  if (ALERTING_LEVELS.has(level)) console.error(line);
  else console.log(line);

  if (WEBHOOK && ALERTING_LEVELS.has(level)) {
    const key = `${level}:${event}`;
    const now = Date.now();
    if (now - (lastAlertAt.get(key) || 0) > ALERT_COOLDOWN_MS) {
      lastAlertAt.set(key, now);
      pushWebhook(entry).catch(() => { /* never let alerting break the request */ });
    }
  }
  return entry;
}

async function pushWebhook(entry) {
  const emoji = entry.level === "security" ? "🔐" : entry.level === "critical" ? "🚨" : "⚠️";
  const text = `${emoji} *${entry.service}* [${entry.level}] ${entry.event}\n\`\`\`${JSON.stringify(entry, null, 2)}\`\`\``;
  // Slack uses "text"; Discord uses "content" — sending both keys works for either.
  await fetch(WEBHOOK, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, content: text })
  });
}

// Periodically watch the database file size and alert before the disk fills up
// (a full disk turns every write into a 500). Returns the timer (unref'd).
export function startResourceMonitor({ databasePath = process.env.RIAAYA_DB_PATH, intervalMs = 30 * 60 * 1000 } = {}) {
  if (!databasePath) return null;
  const warnMb = Number(process.env.RIAAYA_DB_WARN_MB || 700);
  const criticalMb = warnMb * 1.3;

  const check = () => {
    let sizeMb = 0;
    try {
      sizeMb = statSync(databasePath).size / (1024 * 1024);
    } catch {
      reportEvent("critical", "db_file_missing", { databasePath });
      return;
    }
    const rounded = Math.round(sizeMb * 10) / 10;
    if (sizeMb >= criticalMb) reportEvent("critical", "db_size_critical", { sizeMb: rounded, thresholdMb: criticalMb });
    else if (sizeMb >= warnMb) reportEvent("warn", "db_size_high", { sizeMb: rounded, thresholdMb: warnMb });
  };

  const startup = setTimeout(check, 2 * 60 * 1000);
  const timer = setInterval(check, intervalMs);
  startup.unref?.();
  timer.unref?.();
  return timer;
}
