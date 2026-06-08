export function deploymentMode() {
  const explicit = String(process.env.RIAAYA_DEPLOYMENT_MODE || "").trim().toLowerCase();
  if (explicit) return explicit;
  const ownerEmail = String(process.env.RIAAYA_OWNER_EMAIL || "").trim().toLowerCase();
  return ownerEmail === "preview-owner@riaaya.local" ? "preview" : "production";
}

export function storageModeForPath(path = "") {
  const value = String(path || "");
  if (!value) return "unknown";
  if (value.startsWith("/tmp/") || value.includes("/tmp/")) return "ephemeral";
  if (value.includes("/data/") || value.startsWith("/var/") || value.includes("/mnt/")) return "persistent";
  return process.env.NODE_ENV === "production" ? "unknown" : "local_development";
}

export function hasManagedDatabaseProvider() {
  return Boolean(process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.TURSO_DATABASE_URL);
}

export function isCloudBackedStorage() {
  return process.env.RIAAYA_CLOUD_BACKED === "true" || hasManagedDatabaseProvider();
}

export function allowsEphemeralStorage() {
  return process.env.RIAAYA_ALLOW_EPHEMERAL_STORAGE === "true" || deploymentMode() === "preview";
}

export function storageReadiness({ databasePath = "", backupPath = "" } = {}) {
  const databaseMode = storageModeForPath(databasePath);
  const backupMode = storageModeForPath(backupPath);
  const managedDatabase = hasManagedDatabaseProvider();
  const cloudBacked = isCloudBackedStorage();
  const ephemeralAllowed = allowsEphemeralStorage();
  const durableSqlite = databaseMode === "persistent" || databaseMode === "local_development";
  const backupTarget = Boolean(backupPath && backupMode !== "ephemeral");
  const safeForRealData = (cloudBacked || managedDatabase || durableSqlite)
    && (cloudBacked || managedDatabase || backupTarget)
    && deploymentMode() !== "preview";

  return {
    deploymentMode: deploymentMode(),
    databaseMode,
    backupMode,
    managedDatabase,
    cloudBacked,
    ephemeralAllowed,
    backupTarget,
    safeForRealData,
    demoOnly: databaseMode === "ephemeral" && !managedDatabase && !cloudBacked
  };
}

export function assertRealDataStorageReady({ databasePath = "", backupPath = "" } = {}) {
  if (process.env.NODE_ENV !== "production") return;

  const readiness = storageReadiness({ databasePath, backupPath });
  if (readiness.safeForRealData || readiness.ephemeralAllowed) return;

  const errors = [];
  if (readiness.databaseMode === "ephemeral") {
    errors.push("RIAAYA_DB_PATH points to temporary storage. Use /data/riaaya.sqlite with a persistent disk before real patient data.");
  } else if (readiness.databaseMode !== "persistent" && !readiness.managedDatabase && !readiness.cloudBacked) {
    errors.push("RIAAYA_DB_PATH must point to durable storage, or configure a managed cloud database.");
  }

  if (!readiness.managedDatabase && !readiness.cloudBacked && !readiness.backupTarget) {
    errors.push("RIAAYA_BACKUP_DIR must point to durable storage, such as /data/backups.");
  }

  if (errors.length) {
    throw new Error(`Real patient data storage is not ready:\n- ${errors.join("\n- ")}`);
  }
}
