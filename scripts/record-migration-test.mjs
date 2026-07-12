#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { isDeepStrictEqual } from "node:util";
import { DatabaseSync } from "node:sqlite";

const directory = mkdtempSync(join(tmpdir(), "riaaya-record-migration-"));
const databasePath = join(directory, "legacy.sqlite");
const backupPath = join(directory, "backups");
const encryptionKey = "record-migration-test-key-at-least-32-characters";
const env = {
  ...process.env,
  NODE_ENV: "development",
  RIAAYA_DB_PATH: databasePath,
  RIAAYA_BACKUP_DIR: backupPath,
  RIAAYA_ENCRYPTION_KEY: encryptionKey,
  RIAAYA_OWNER_EMAIL: "migration-owner@test.local",
  RIAAYA_OWNER_PASSWORD: "MigrationOwner!2026X",
  RIAAYA_OWNER_SYNC: "true",
  RIAAYA_AUTO_MIGRATE_RECORDS: "",
  LITESTREAM_BUCKET: "",
  LITESTREAM_ENDPOINT: "",
  LITESTREAM_ACCESS_KEY_ID: "",
  LITESTREAM_SECRET_ACCESS_KEY: ""
};
Object.assign(process.env, env);

let passed = 0;
function ok(condition, message) {
  if (!condition) throw new Error(`ASSERT FAILED: ${message}`);
  passed += 1;
}

try {
  const { db } = await import(`../lib/database.js?record-migration=${Date.now()}`);
  const { encryptBlob, decryptBlob } = await import(`../lib/security.js?record-migration=${Date.now()}`);
  const legacyState = {
    settings: { clinicName: "Migration Clinic", activeDate: "2026-07-12" },
    patients: [
      { id: "patient-2", name: "Second" },
      { id: "patient-1", name: "First" }
    ],
    bookings: [
      { id: "booking-2", patientId: "patient-2", patient: "Second", date: "2026-07-14", time: "10:00", status: "confirmed" },
      { id: "booking-1", patientId: "patient-1", patient: "First", date: "2026-07-13", time: "09:00", status: "scheduled" }
    ],
    entries: [
      {
        id: "operation-2", patientId: "patient-2", patient: "Second", date: "2026-07-14",
        serviceId: "service-2", service: "Service 2", amount: 70,
        paymentBreakdown: { cash: 20, card: 50, transfer: 0 }, paymentMethod: "mixed",
        paymentLog: [{ date: "2026-07-14", cash: 20, card: 50, transfer: 0, amount: 70, note: "Collected" }]
      },
      {
        id: "operation-1", patientId: "patient-1", patient: "First", date: "2026-07-13",
        serviceId: "service-1", service: "Service 1", amount: 30,
        paymentBreakdown: { cash: 30, card: 0, transfer: 0 }, paymentMethod: "cash"
      }
    ]
  };
  const now = new Date().toISOString();
  db.prepare(`
    insert into clinics (id, name, slug, status, state_json, state_version, created_at, updated_at)
    values (?, ?, ?, 'active', ?, 7, ?, ?)
  `).run("clinic-migration", "Migration Clinic", "migration-clinic", encryptBlob(JSON.stringify(legacyState)), now, now);
  const {
    CORE_RECORD_STORAGE_SETTING,
    persistClinicStateCompatible
  } = await import(`../lib/clinic-record-store.js?record-compatibility=${Date.now()}`);
  const legacyRow = db.prepare("select * from clinics where id = 'clinic-migration'").get();
  const preMigrationState = structuredClone(legacyState);
  preMigrationState.settings.language = "ar";
  const compatibleResult = persistClinicStateCompatible(db, {
    clinicRow: legacyRow,
    clinicId: legacyRow.id,
    state: preMigrationState,
    stateVersion: 8,
    updatedAt: now
  });
  const compatibleRow = db.prepare("select * from clinics where id = 'clinic-migration'").get();
  ok(compatibleResult.recordStorageVersion === 0 && Number(compatibleRow.record_storage_version) === 0, "ordinary saves remain legacy until the backup-first migration is activated");
  ok(isDeepStrictEqual(JSON.parse(decryptBlob(compatibleRow.state_json)), preMigrationState), "pre-migration save keeps a complete rollback-compatible state blob");
  db.close();

  const migration = spawnSync(process.execPath, ["scripts/migrate-core-records.mjs", "--apply"], {
    cwd: new URL("..", import.meta.url).pathname,
    env,
    encoding: "utf8"
  });
  ok(migration.status === 0, `migration command succeeds: ${migration.stderr || migration.stdout}`);

  const probe = new DatabaseSync(databasePath);
  const clinic = probe.prepare("select * from clinics where id = 'clinic-migration'").get();
  const manifest = probe.prepare("select * from clinic_record_manifests where clinic_id = 'clinic-migration'").get();
  const { readClinicState } = await import(`../lib/clinic-record-store.js?record-migration=${Date.now()}`);
  const roundTrip = readClinicState(probe, clinic);
  ok(Number(clinic.record_storage_version) === 1 && Number(clinic.record_storage_synced_version) === 8, "legacy clinic is marked relational at the original state version");
  ok(isDeepStrictEqual(roundTrip, preMigrationState), "migration preserves every record and original array order");
  ok(Number(manifest.patient_count) === 2 && Number(manifest.booking_count) === 2 && Number(manifest.operation_count) === 2 && Number(manifest.payment_count) === 3, "manifest counts every migrated record and payment row");
  const shell = JSON.parse(decryptBlob(clinic.state_json));
  ok(!("patients" in shell) && !("bookings" in shell) && !("entries" in shell), "monolithic state shell no longer duplicates core collections");
  ok(readdirSync(backupPath).some(name => name.startsWith("riaaya-") && name.endsWith(".sqlite")), "verified pre-migration backup is retained");
  const migrationVersion = Number(probe.prepare("select max(version) as version from schema_migrations").get()?.version || 0);
  ok(migrationVersion >= 2, "relational schema migration is recorded");
  const activation = JSON.parse(probe.prepare("select value_json from platform_settings where key = ?").get(CORE_RECORD_STORAGE_SETTING)?.value_json || "{}");
  ok(activation.enabled === true, "successful migration activates relational storage for future clinic writes");
  probe.close();
  console.log(`✓ record migration passed — ${passed} assertions`);
} finally {
  rmSync(directory, { recursive: true, force: true });
}
