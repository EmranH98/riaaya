// Bounded per-clinic history of clinic-state versions. Every write to
// clinics.state_json records the exact state at that version, so when a save
// arrives based on an older version we can recover the writer's base and
// three-way merge instead of rejecting the save and losing someone's work.
import { gzipSync, gunzipSync } from "node:zlib";
import { db, nowIso } from "./database.js";
import { decryptBlob, encryptBlob, isEncryptedBlob } from "./security.js";

// How many versions back a stale client can still merge from. Older bases
// fall back to the 409 + reload path. Compressed snapshots are ~5-10% of the
// raw state, so this stays a few MB per clinic even at the 4MB state cap.
const KEEP_VERSIONS = 200;

db.exec(`
  create table if not exists clinic_state_history (
    clinic_id text not null references clinics(id) on delete cascade,
    version integer not null,
    state_gz blob not null,
    created_at text not null,
    primary key (clinic_id, version)
  );
`);

// Record the state that existed at `version` if we have not already. Called
// on reads as well as writes, so any version a client loads stays available
// as a merge base for as long as the retention window allows.
export function ensureStateSnapshot(clinicId, version, stateJson) {
  if (!clinicId || !Number.isInteger(version) || !stateJson) return;
  const exists = db.prepare(
    "select 1 from clinic_state_history where clinic_id = ? and version = ?"
  ).get(clinicId, version);
  if (exists) return;
  // Snapshots carry full PHI — gzip then encrypt at rest (stored as an "e1:"
  // string in the blob column). Legacy raw-gzip rows still read below.
  const packed = encryptBlob(gzipSync(Buffer.from(stateJson, "utf8")).toString("base64"));
  db.prepare(`
    insert or ignore into clinic_state_history (clinic_id, version, state_gz, created_at)
    values (?, ?, ?, ?)
  `).run(clinicId, version, packed, nowIso());
}

// Record a freshly written version and drop snapshots past the retention window.
export function saveStateSnapshot(clinicId, version, stateJson) {
  ensureStateSnapshot(clinicId, version, stateJson);
  if (!clinicId || !Number.isInteger(version)) return;
  db.prepare("delete from clinic_state_history where clinic_id = ? and version <= ?")
    .run(clinicId, version - KEEP_VERSIONS);
}

export function getStateSnapshot(clinicId, version) {
  const row = db.prepare(
    "select state_gz from clinic_state_history where clinic_id = ? and version = ?"
  ).get(clinicId, version);
  if (!row?.state_gz) return null;
  try {
    // New rows: "e1:" encrypted → base64 gzip. Legacy rows: raw gzip Buffer.
    const gz = (typeof row.state_gz === "string" && isEncryptedBlob(row.state_gz))
      ? Buffer.from(decryptBlob(row.state_gz), "base64")
      : row.state_gz;
    return JSON.parse(gunzipSync(gz).toString("utf8"));
  } catch {
    return null;
  }
}
