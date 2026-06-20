import { createBackup } from "./backup.js";

// Opt-in automatic backups, so durability does not depend on remembering to run
// a cron job. Enable by setting RIAAYA_BACKUP_INTERVAL_HOURS (e.g. 6) in the
// environment. A failure is logged loudly but never crashes the server.
export function startBackupScheduler() {
  const hours = Number(process.env.RIAAYA_BACKUP_INTERVAL_HOURS || 0);
  if (!hours || hours <= 0) return null;
  if (!process.env.RIAAYA_DB_PATH) {
    console.warn("[backup-scheduler] RIAAYA_BACKUP_INTERVAL_HOURS set but RIAAYA_DB_PATH is missing — scheduler disabled.");
    return null;
  }

  const intervalMs = Math.max(hours, 0.25) * 60 * 60 * 1000;

  const runBackup = () => {
    try {
      const result = createBackup();
      console.log(`[backup-scheduler] ✓ ${result.backupPath} (clinics=${result.clinicCount}, users=${result.userCount})`);
    } catch (error) {
      // Surface clearly so a monitor/log alert can catch backup failures.
      console.error(`[backup-scheduler] ✗ BACKUP FAILED: ${error.message}`);
    }
  };

  // First backup shortly after boot, then on the configured interval.
  const startupTimer = setTimeout(runBackup, 60 * 1000);
  const timer = setInterval(runBackup, intervalMs);
  timer.unref?.();
  startupTimer.unref?.();
  console.log(`[backup-scheduler] enabled — every ${hours}h to ${process.env.RIAAYA_BACKUP_DIR || "default backup dir"}`);
  return timer;
}
