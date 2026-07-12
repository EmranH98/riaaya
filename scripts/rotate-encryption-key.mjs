#!/usr/bin/env node
// Re-encrypt everything at rest with the CURRENT RIAAYA_ENCRYPTION_KEY.
//
// Two uses:
//   1. First migration of a legacy plaintext DB — just set RIAAYA_ENCRYPTION_KEY
//      and run; plaintext state is wrapped in ciphertext.
//   2. Key rotation after a leak — set RIAAYA_ENCRYPTION_KEY to the NEW key and
//      RIAAYA_ENCRYPTION_KEY_OLD to the leaked one, run this, then remove the
//      OLD var. Reads try both keys; writes use the new one.
//
// Usage: RIAAYA_DB_PATH=/data/riaaya.sqlite RIAAYA_ENCRYPTION_KEY=<new> \
//        [RIAAYA_ENCRYPTION_KEY_OLD=<old>] node scripts/rotate-encryption-key.mjs
import { gzipSync, gunzipSync } from "node:zlib";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { db } from "../lib/database.js";
import { photosDir } from "../lib/backup.js";
import {
  decryptBlob, encryptBlob, isEncryptedBlob,
  decryptBinary, encryptBinary, decryptSecret, encryptSecret
} from "../lib/security.js";

if (!process.env.RIAAYA_ENCRYPTION_KEY) {
  console.error("RIAAYA_ENCRYPTION_KEY must be set (the key to encrypt WITH).");
  process.exit(1);
}

let clinics = 0, records = 0, history = 0, secrets = 0, integrations = 0, photos = 0;

function rotateDatabase() {
  db.exec("begin immediate");
  try {
  // 1. Clinic state blobs
  for (const row of db.prepare("select id, state_json from clinics").all()) {
    if (row.state_json == null) continue;
    const plaintext = decryptBlob(row.state_json); // handles old-key / plaintext
    db.prepare("update clinics set state_json = ? where id = ?").run(encryptBlob(plaintext), row.id);
    clinics += 1;
  }
  // 2. Individually encrypted relational clinic records.
  for (const table of ["clinic_patients", "clinic_bookings", "clinic_operations", "clinic_operation_payments"]) {
    for (const row of db.prepare(`select clinic_id, id, payload_cipher from ${table}`).all()) {
      const plaintext = decryptBlob(row.payload_cipher);
      db.prepare(`update ${table} set payload_cipher = ? where clinic_id = ? and id = ?`)
        .run(encryptBlob(plaintext), row.clinic_id, row.id);
      records += 1;
    }
  }
  // 3. State-history snapshots (gzip, possibly already e1-encrypted)
  for (const row of db.prepare("select clinic_id, version, state_gz from clinic_state_history").all()) {
    if (row.state_gz == null) continue;
    const gz = (typeof row.state_gz === "string" && isEncryptedBlob(row.state_gz))
      ? Buffer.from(decryptBlob(row.state_gz), "base64")
      : row.state_gz;
    // Validate it gunzips, then re-encrypt with the current key.
    const json = gunzipSync(gz).toString("utf8");
    const repacked = encryptBlob(gzipSync(Buffer.from(json, "utf8")).toString("base64"));
    db.prepare("update clinic_state_history set state_gz = ? where clinic_id = ? and version = ?")
      .run(repacked, row.clinic_id, row.version);
    history += 1;
  }
  // 4. Per-user encrypted secrets (2FA)
  for (const row of db.prepare("select id, totp_secret_cipher, totp_pending_cipher from users").all()) {
    const next = {};
    if (row.totp_secret_cipher) next.totp_secret_cipher = encryptSecret(decryptSecret(row.totp_secret_cipher));
    if (row.totp_pending_cipher) next.totp_pending_cipher = encryptSecret(decryptSecret(row.totp_pending_cipher));
    if (Object.keys(next).length) {
      db.prepare("update users set totp_secret_cipher = coalesce(?, totp_secret_cipher), totp_pending_cipher = coalesce(?, totp_pending_cipher) where id = ?")
        .run(next.totp_secret_cipher ?? null, next.totp_pending_cipher ?? null, row.id);
      secrets += 1;
    }
  }
  // 5. Per-clinic provider credentials (WhatsApp, SMS, JoFotara)
  for (const row of db.prepare("select clinic_id, provider, secret_cipher from clinic_integrations where secret_cipher is not null and secret_cipher != ''").all()) {
    const plaintext = decryptSecret(row.secret_cipher);
    if (!plaintext) throw new Error(`integration_secret_decrypt_failed:${row.clinic_id}:${row.provider}`);
    db.prepare("update clinic_integrations set secret_cipher = ? where clinic_id = ? and provider = ?")
      .run(encryptSecret(plaintext), row.clinic_id, row.provider);
    integrations += 1;
  }
    db.exec("commit");
  } catch (error) {
    try { db.exec("rollback"); } catch { /* preserve the original failure */ }
    throw error;
  }
}

try {
  rotateDatabase();
} catch (error) {
  console.error("✗ database rotation failed (transaction rolled back):", error.message);
  process.exit(1);
}

function listPhotoFiles(root) {
  if (!existsSync(root)) return [];
  const files = [];
  const stack = [root];
  while (stack.length) {
    const directory = stack.pop();
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) stack.push(path);
      else if (entry.isFile() && /\.(jpg|png|webp)$/i.test(entry.name)) files.push(path);
    }
  }
  return files;
}

try {
  for (const path of listPhotoFiles(photosDir())) {
    const plaintext = decryptBinary(readFileSync(path));
    const rotated = encryptBinary(plaintext);
    writeFileSync(path, rotated);
    if (!decryptBinary(readFileSync(path)).equals(plaintext)) throw new Error(`photo_verify_failed:${path}`);
    photos += 1;
  }
} catch (error) {
  console.error("✗ photo rotation stopped. Keep RIAAYA_ENCRYPTION_KEY_OLD set and rerun:", error.message);
  process.exit(1);
}

console.log(`✓ re-encrypted: ${clinics} clinic shells, ${records} clinic records, ${history} history snapshots, ${secrets} user secrets, ${integrations} integration secrets, ${photos} photos.`);
console.log("If this was a key rotation, verify the app and a photo, then remove RIAAYA_ENCRYPTION_KEY_OLD.");
