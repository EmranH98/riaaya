# RIAAYA — Monitoring & Alerting

Goal: know something is wrong **before a clinic tells you**.

## What's built in (code)
Every notable event is emitted as a structured JSON log line (`[monitor] {...}`)
and high-severity events are also pushed to an alert webhook if one is set:

| Event | Level | Fires when |
|---|---|---|
| `server_boot` | info | the server starts |
| `unhandled_request_error` | error | a request throws (500) |
| `uncaught_exception` / `unhandled_rejection` | critical | the process is about to crash |
| `backup_ok` / `backup_failed` | info / critical | the auto-backup runs |
| `login_brute_force_suspected` | security | an email/IP trips the login rate limit |
| `db_size_high` / `db_size_critical` | warn / critical | the DB file nears the disk limit |
| `db_file_missing` | critical | the DB file disappears (disk lost) |

Errors/critical/security also go to the webhook (with a 5-min per-event cooldown
so you don't get spammed).

## Turn on alerts (your steps — ~5 min total)
1. **Webhook (Slack or Discord):**
   - Slack: create an *Incoming Webhook*, copy its URL.
   - Discord: Channel → Integrations → *New Webhook*, copy URL (append `/slack` for Slack-format).
   - In Render env: `RIAAYA_ALERT_WEBHOOK=<that url>` → redeploy. You'll now get a ping on backup failures, crashes, and brute-force attempts.
2. **Uptime (UptimeRobot, free):** add an HTTP monitor on `https://<your-domain>/healthz`, interval 1–5 min, alert to email/SMS. This catches "the whole site is down / a deploy crashed."
3. *(optional)* **DB size alert tuning:** `RIAAYA_DB_WARN_MB=700` (default) warns before a 1 GB disk fills.

## Optional env
- `RIAAYA_ALERT_WEBHOOK` — Slack/Discord/generic incoming webhook for high-severity alerts.
- `RIAAYA_SERVICE_NAME` — label shown in alerts (default `riaaya`).
- `RIAAYA_DB_WARN_MB` — DB-size warning threshold in MB (default 700).

`/healthz` and `/readyz` already exist for external uptime checks.
