import { createBackup } from "../lib/backup.js";
import { uploadBackupOffsite } from "../lib/offsite-backup.js";

// Creates a consistent, integrity-verified snapshot and prunes old ones.
// Usage: RIAAYA_DB_PATH=/data/riaaya.sqlite RIAAYA_BACKUP_DIR=/data/backups node scripts/backup-database.mjs
try {
  const result = createBackup();
  console.log(`✓ backup ok: ${result.backupPath} (clinics=${result.clinicCount}, users=${result.userCount})`);
  const offsite = await uploadBackupOffsite({ backupPath: result.backupPath, stats: result });
  if (offsite.configured) {
    console.log(`✓ off-site backup ok: s3://${offsite.bucket}/${offsite.key}`);
  }
} catch (error) {
  console.error(`✗ backup failed: ${error.message}`);
  process.exitCode = 1;
}
