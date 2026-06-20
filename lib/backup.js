import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { DatabaseSync } from "node:sqlite";

// Tables every healthy RIAAYA database must contain — used to reject a corrupt
// or wrong-schema file before we ever restore it over live data.
const REQUIRED_TABLES = ["clinics", "users", "sessions", "audit_logs"];

export function backupDir() {
  return process.env.RIAAYA_BACKUP_DIR || join(process.cwd(), "backups", "database");
}

export function listBackups(directory = backupDir()) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory)
    .filter(name => name.startsWith("riaaya-") && name.endsWith(".sqlite"))
    .map(name => ({ name, path: join(directory, name), size: statSync(join(directory, name)).size }))
    .sort((a, b) => (a.name < b.name ? 1 : -1)); // newest first
}

// Open a sqlite file and confirm it is structurally sound and is actually a
// RIAAYA database. Throws on any problem.
export function verifyDatabaseFile(filePath) {
  if (!existsSync(filePath)) throw new Error(`backup_not_found: ${filePath}`);
  const probe = new DatabaseSync(filePath, { readOnly: true });
  try {
    const integrity = probe.prepare("pragma integrity_check").get();
    const result = integrity?.integrity_check || integrity?.["integrity_check"];
    if (result !== "ok") throw new Error(`integrity_check_failed: ${result}`);
    const tables = new Set(
      probe.prepare("select name from sqlite_master where type = 'table'").all().map(row => row.name)
    );
    const missing = REQUIRED_TABLES.filter(table => !tables.has(table));
    if (missing.length) throw new Error(`missing_tables: ${missing.join(", ")}`);
    const clinicCount = probe.prepare("select count(*) as total from clinics").get()?.total ?? 0;
    const userCount = probe.prepare("select count(*) as total from users").get()?.total ?? 0;
    return { ok: true, clinicCount: Number(clinicCount), userCount: Number(userCount) };
  } finally {
    probe.close();
  }
}

// Create a consistent, verified snapshot of the live database. Returns the path.
export function createBackup({ databasePath = process.env.RIAAYA_DB_PATH, directory = backupDir(), retention = Number(process.env.RIAAYA_BACKUP_RETENTION || 30) } = {}) {
  if (!databasePath) throw new Error("RIAAYA_DB_PATH must point to the database to back up.");
  if (!existsSync(databasePath)) throw new Error(`database_not_found: ${databasePath}`);
  mkdirSync(directory, { recursive: true });
  const stamp = new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-");
  const backupPath = join(directory, `riaaya-${stamp}.sqlite`);

  const database = new DatabaseSync(databasePath);
  try {
    // VACUUM INTO writes a clean single-file copy with no WAL sidecar — safe to ship off-site.
    database.exec(`vacuum into '${backupPath.replaceAll("'", "''")}'`);
  } finally {
    database.close();
  }

  // Never keep a snapshot we can't prove is restorable.
  const stats = verifyDatabaseFile(backupPath);

  const keep = Math.max(Number(retention) || 30, 1);
  listBackups(directory).slice(keep).forEach(backup => rmSync(backup.path));

  return { backupPath, ...stats };
}

// Restore a backup over the live database. Snapshots the current DB first
// (pre-restore safety copy) and verifies the backup before touching live data.
export function restoreBackup({ source, databasePath = process.env.RIAAYA_DB_PATH, directory = backupDir() } = {}) {
  if (!databasePath) throw new Error("RIAAYA_DB_PATH must point to the database to restore into.");
  let sourcePath = source;
  if (!sourcePath || sourcePath === "latest") {
    const [newest] = listBackups(directory);
    if (!newest) throw new Error("no_backups_available");
    sourcePath = newest.path;
  }
  // 1. Prove the backup is good BEFORE we overwrite anything.
  const verified = verifyDatabaseFile(sourcePath);

  // 2. Safety-net the current database so a bad restore is reversible.
  let preRestorePath = null;
  if (existsSync(databasePath)) {
    const stamp = new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-");
    preRestorePath = join(directory, `pre-restore-${stamp}.sqlite`);
    mkdirSync(dirname(preRestorePath), { recursive: true });
    copyFileSync(databasePath, preRestorePath);
  }

  // 3. Overwrite the live DB and drop stale WAL/SHM sidecars so the restored file is authoritative.
  mkdirSync(dirname(databasePath), { recursive: true });
  copyFileSync(sourcePath, databasePath);
  [`${databasePath}-wal`, `${databasePath}-shm`].forEach(side => {
    if (existsSync(side)) rmSync(side);
  });

  // 4. Confirm the live DB now verifies.
  const restored = verifyDatabaseFile(databasePath);
  return { sourcePath, preRestorePath, restored, verifiedSource: verified };
}
