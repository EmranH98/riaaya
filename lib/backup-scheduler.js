import { archivePhotos, createBackup } from "./backup.js";
import { reportEvent } from "./monitor.js";
import { uploadBackupOffsite, uploadFileOffsite } from "./offsite-backup.js";

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

  const runBackup = async () => {
    try {
      const result = createBackup();
      console.log(`[backup-scheduler] ✓ ${result.backupPath} (clinics=${result.clinicCount}, users=${result.userCount})`);
      reportEvent("info", "backup_ok", { clinics: result.clinicCount, users: result.userCount });

      // Patient photos: their own verified archive, backed up locally AND
      // off-site so a disk loss can't destroy the clinical record.
      try {
        const photos = archivePhotos();
        if (photos) {
          console.log(`[backup-scheduler] photos ✓ ${photos.archivePath} (${photos.size} bytes)`);
          const photoOffsite = await uploadFileOffsite({ filePath: photos.archivePath, contentType: "application/gzip" });
          if (photoOffsite.configured) {
            console.log(`[backup-scheduler] photos off-site ✓ ${photoOffsite.key}`);
            reportEvent("info", "photo_backup_offsite_ok", { key: photoOffsite.key });
          }
        }
      } catch (error) {
        console.error(`[backup-scheduler] ✗ PHOTO BACKUP FAILED: ${error.message}`);
        reportEvent("critical", "photo_backup_failed", { message: String(error?.message || error).slice(0, 300) });
      }

      try {
        const offsite = await uploadBackupOffsite({ backupPath: result.backupPath, stats: result });
        if (offsite.configured) {
          console.log(`[backup-scheduler] off-site ✓ s3://${offsite.bucket}/${offsite.key}`);
          reportEvent("info", "backup_offsite_ok", { key: offsite.key });
        }
      } catch (error) {
        console.error(`[backup-scheduler] ✗ OFF-SITE BACKUP FAILED: ${error.message}`);
        reportEvent("critical", "backup_offsite_failed", { message: String(error?.message || error).slice(0, 300) });
      }
    } catch (error) {
      // critical → also fires the alert webhook so a failing backup can't go unnoticed.
      console.error(`[backup-scheduler] ✗ BACKUP FAILED: ${error.message}`);
      reportEvent("critical", "backup_failed", { message: String(error?.message || error).slice(0, 300) });
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
