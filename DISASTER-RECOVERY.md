# RIAAYA — Backup & Disaster Recovery Runbook

The clinic database is a single SQLite file at `RIAAYA_DB_PATH` (production: `/data/riaaya.sqlite` on the Render persistent disk). Patient data lives here, so backups and a **tested** restore are mandatory before any real clinic.

## 1. Backups

### On-disk snapshots (built in)
`npm run backup` creates a consistent, **integrity-verified** snapshot via `VACUUM INTO`, prunes to the newest `RIAAYA_BACKUP_RETENTION` (default 30), and refuses to keep a snapshot it cannot re-open.

### Automatic backups (recommended)
Set in the Render dashboard env:
```
RIAAYA_BACKUP_INTERVAL_HOURS=6
```
The server then snapshots ~1 min after boot and every 6h. Failures are logged as `[backup-scheduler] ✗ BACKUP FAILED` — wire a log alert to that string.

### Off-site copies (required before 100 clinics)
On-disk backups die with the disk. RIAAYA can upload each verified backup snapshot to an S3-compatible bucket after `VACUUM INTO` and integrity verification succeeds.

Set these in Render:
```
LITESTREAM_BUCKET=your-bucket-name
LITESTREAM_ENDPOINT=https://your-s3-compatible-endpoint
LITESTREAM_ACCESS_KEY_ID=...
LITESTREAM_SECRET_ACCESS_KEY=...
LITESTREAM_REGION=auto
LITESTREAM_PREFIX=riaaya/backups
```

Cloudflare R2 works well for a small pilot. Each backup upload writes:
- `riaaya/backups/riaaya-<timestamp>.sqlite`
- `riaaya/backups/latest.json`

Until off-site is on, **also** download a backup weekly to your own laptop.

## 2. Restore

> Stop or scale the service to 0 first so nothing writes mid-restore.

```bash
# See what you have
RIAAYA_DB_PATH=/data/riaaya.sqlite RIAAYA_BACKUP_DIR=/data/backups npm run restore -- --list

# Restore the newest good backup (auto-saves the current DB as pre-restore-*.sqlite first)
RIAAYA_DB_PATH=/data/riaaya.sqlite RIAAYA_BACKUP_DIR=/data/backups npm run restore -- latest

# Or a specific file
... npm run restore -- /data/backups/riaaya-2026-06-20T....sqlite
```
The restore **verifies the backup before overwriting**, snapshots the current DB to `pre-restore-*.sqlite`, swaps the file, clears stale `-wal`/`-shm`, and verifies the result. Then restart the service and confirm `/healthz` returns 200.

## 3. Monthly restore drill (do not skip)
Once a month, restore the latest backup into a **throwaby** path and boot against it:
```bash
cp /data/backups/<newest>.sqlite /tmp/drill.sqlite
RIAAYA_DB_PATH=/tmp/drill.sqlite PORT=4999 node server.mjs   # expect health 200, then Ctrl-C
```
A backup you have never restored is not a backup. This exact flow is covered by `npm run check` indirectly and was validated with a corrupt-then-restore test.

## 4. What is NOT yet automated (your action)
- [ ] Set `RIAAYA_BACKUP_INTERVAL_HOURS` in Render.
- [ ] Provision an off-site bucket + S3-compatible credentials.
- [ ] Put a monthly restore-drill reminder on the calendar.
- [ ] For 100 clinics, evaluate managed Postgres with point-in-time recovery (see roadmap).
