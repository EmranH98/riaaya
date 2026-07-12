#!/usr/bin/env node
import { isDeepStrictEqual } from "node:util";
import { createBackup } from "../lib/backup.js";
import { audit, databasePath, db, nowIso, setPlatformSetting } from "../lib/database.js";
import {
  CORE_RECORD_STORAGE_SETTING,
  persistClinicState,
  readClinicState,
  withImmediateTransaction
} from "../lib/clinic-record-store.js";
import { uploadBackupOffsite } from "../lib/offsite-backup.js";
import { ensureStateSnapshot } from "../lib/state-history.js";

const apply = process.argv.includes("--apply");
const pending = db.prepare(`
  select * from clinics
  where state_json is not null and coalesce(record_storage_version, 0) < 1
  order by created_at asc
`).all();

if (!pending.length) {
  console.log("Core-record migration: no clinics are pending.");
  if (apply) {
    setPlatformSetting(CORE_RECORD_STORAGE_SETTING, { enabled: true, activatedAt: nowIso() });
    console.log("Relational core-record storage is active for future clinic writes.");
  }
  process.exit(0);
}

console.log(`Core-record migration: ${pending.length} clinic(s) pending.`);
if (!apply) {
  console.log("Dry run only. Run npm run migrate:records -- --apply after confirming a current backup target.");
  process.exit(0);
}

if (!process.env.RIAAYA_ENCRYPTION_KEY) {
  throw new Error("RIAAYA_ENCRYPTION_KEY is required for encrypted record migration.");
}

const backup = createBackup({ databasePath });
console.log(`Verified pre-migration backup: ${backup.backupPath}`);
const offsite = await uploadBackupOffsite({ backupPath: backup.backupPath, stats: backup });
console.log(offsite.configured
  ? `Verified off-site pre-migration backup: s3://${offsite.bucket}/${offsite.key}`
  : "Off-site backup is not configured; the verified local backup is retained.");

const migrated = withImmediateTransaction(db, () => {
  let count = 0;
  for (const clinic of pending) {
    const state = readClinicState(db, clinic);
    const stateJson = JSON.stringify(state);
    const stateVersion = Number(clinic.state_version || 0);
    const updatedAt = nowIso();
    ensureStateSnapshot(clinic.id, stateVersion, stateJson);
    const result = persistClinicState(db, {
      clinicId: clinic.id,
      state,
      stateVersion,
      updatedAt
    });
    audit({
      clinicId: clinic.id,
      action: "migrate",
      entity: "clinic_record_storage",
      entityId: clinic.id,
      metadata: { storageVersion: 1, stateVersion }
    });
    const freshRow = db.prepare("select * from clinics where id = ?").get(clinic.id);
    const roundTrip = readClinicState(db, freshRow);
    if (!isDeepStrictEqual(roundTrip, result.fullState)) {
      throw new Error(`clinic_record_migration_verify_failed:${clinic.id}`);
    }
    count += 1;
    console.log(`Migrated clinic ${count}/${pending.length}: ${clinic.id}`);
  }
  setPlatformSetting(CORE_RECORD_STORAGE_SETTING, { enabled: true, activatedAt: nowIso() });
  return count;
});

console.log(`Core-record migration complete: ${migrated} clinic(s), backup retained at ${backup.backupPath}.`);
