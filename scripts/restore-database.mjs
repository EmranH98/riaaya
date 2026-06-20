import { listBackups, restoreBackup } from "../lib/backup.js";

// Restores a backup over the live database (safest path: stops the app first).
// Usage:
//   List:    node scripts/restore-database.mjs --list
//   Latest:  RIAAYA_DB_PATH=/data/riaaya.sqlite node scripts/restore-database.mjs latest
//   Named:   RIAAYA_DB_PATH=/data/riaaya.sqlite node scripts/restore-database.mjs /data/backups/riaaya-2026-06-20....sqlite
const arg = process.argv[2] || "latest";

if (arg === "--list") {
  const backups = listBackups();
  if (!backups.length) {
    console.log("No backups found in", process.env.RIAAYA_BACKUP_DIR || "(default backup dir)");
  } else {
    console.log("Available backups (newest first):");
    backups.forEach(b => console.log(`  ${b.name}  (${(b.size / 1024).toFixed(0)} KB)`));
  }
  process.exit(0);
}

try {
  const result = restoreBackup({ source: arg });
  console.log(`✓ restored from: ${result.sourcePath}`);
  if (result.preRestorePath) console.log(`  previous DB saved to: ${result.preRestorePath}`);
  console.log(`  restored DB verified — clinics=${result.restored.clinicCount}, users=${result.restored.userCount}`);
} catch (error) {
  console.error(`✗ restore failed: ${error.message}`);
  process.exitCode = 1;
}
