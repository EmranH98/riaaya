import { mkdirSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

const databasePath = process.env.RIAAYA_DB_PATH;
if (!databasePath) {
  throw new Error("RIAAYA_DB_PATH must point to the production SQLite database.");
}

const backupDirectory = process.env.RIAAYA_BACKUP_DIR || join(process.cwd(), "backups", "database");
const retention = Math.max(Number(process.env.RIAAYA_BACKUP_RETENTION || 30), 1);
const stamp = new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-");
const backupPath = join(backupDirectory, `riaaya-${stamp}.sqlite`);

mkdirSync(backupDirectory, { recursive: true });
const database = new DatabaseSync(databasePath);
database.exec(`vacuum into '${backupPath.replaceAll("'", "''")}'`);
database.close();

const backups = readdirSync(backupDirectory)
  .filter(name => name.startsWith("riaaya-") && name.endsWith(".sqlite"))
  .sort()
  .reverse();

backups.slice(retention).forEach(name => rmSync(join(backupDirectory, name)));
console.log(backupPath);
