// Self-booting end-to-end test. Spins up the real server against a throwaway
// database and exercises the flows that protect clinics: auth, multi-tenant
// isolation, owner controls, CSRF, password policy, and backup/restore.
//
//   node scripts/e2e-test.mjs
import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { createBackup, restoreBackup } from "../lib/backup.js";
import { totpCode } from "../lib/totp.js";

const dir = mkdtempSync(join(tmpdir(), "riaaya-e2e-"));
const dbPath = join(dir, "r.sqlite");
const backupDir = join(dir, "backups");
const PORT = 4801 + Math.floor(process.hrtime()[1] % 150);
const base = `http://localhost:${PORT}`;
const OWNER = { email: "e2e-owner@test.local", password: "E2eOwner!2026X" };
const OLD_ENCRYPTION_KEY = "e2e-old-encryption-key-2026-at-least-32-chars";
const NEW_ENCRYPTION_KEY = "e2e-new-encryption-key-2026-at-least-32-chars";

let passed = 0;
const ok = (cond, msg) => { if (!cond) throw new Error(`ASSERT FAILED: ${msg}`); passed += 1; };

// Minimal cookie jar so a logged-in identity persists across requests.
function jar() {
  const cookies = new Map();
  return {
    async fetch(path, opts = {}) {
      const headers = { ...(opts.headers || {}) };
      if (cookies.size) headers.Cookie = [...cookies].map(([k, v]) => `${k}=${v}`).join("; ");
      const res = await fetch(`${base}${path}`, { ...opts, headers, redirect: "manual" });
      (res.headers.getSetCookie?.() || []).forEach(line => {
        const [pair] = line.split(";");
        const idx = pair.indexOf("=");
        cookies.set(pair.slice(0, idx).trim(), pair.slice(idx + 1).trim());
      });
      return res;
    }
  };
}

async function login(client, email, password) {
  const res = await client.fetch("/api/auth/login", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, csrf: body.csrfToken, body };
}

async function waitForHealth(timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try { if ((await fetch(`${base}/healthz`)).ok) return true; } catch {}
    await new Promise(r => setTimeout(r, 200));
  }
  throw new Error("server did not become healthy");
}

const server = spawn(process.execPath, ["server.mjs"], {
  cwd: new URL("..", import.meta.url).pathname,
  env: {
    ...process.env,
    PORT: String(PORT),
    RIAAYA_DB_PATH: dbPath,
    RIAAYA_BACKUP_DIR: backupDir,
    RIAAYA_OWNER_EMAIL: OWNER.email,
    RIAAYA_OWNER_PASSWORD: OWNER.password,
    RIAAYA_OWNER_SYNC: "true",
    RIAAYA_ENCRYPTION_KEY: OLD_ENCRYPTION_KEY,
    RIAAYA_DISABLE_RATE_LIMIT: "1",
    NODE_ENV: "development"
  },
  stdio: ["ignore", "pipe", "pipe"]
});
let serverLog = "";
server.stdout.on("data", d => { serverLog += d; });
server.stderr.on("data", d => { serverLog += d; });

async function stopServer() {
  if (server.exitCode !== null) return;
  await new Promise(resolve => {
    server.once("exit", resolve);
    server.kill();
  });
}

async function run() {
  await waitForHealth();

  // ── Owner auth ────────────────────────────────────────────────────────────
  const owner = jar();
  const badLogin = await login(owner, OWNER.email, "wrong-password");
  ok(badLogin.status === 401, "owner login with wrong password is rejected");
  const ownerLogin = await login(owner, OWNER.email, OWNER.password);
  ok(ownerLogin.status === 200 && ownerLogin.csrf, "owner logs in and gets a CSRF token");

  // ── Owner creates two clinics ─────────────────────────────────────────────
  async function createClinic(name, adminEmail) {
    const res = await owner.fetch("/api/owner/clinics", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-CSRF-Token": ownerLogin.csrf },
      body: JSON.stringify({ clinicName: name, plan: "professional", adminName: "Admin", adminEmail, adminPassword: "ClinicPass!2026X" })
    });
    return { status: res.status, body: await res.json().catch(() => ({})) };
  }
  const clinicA = await createClinic("E2E Clinic A", "admin-a@e2e.local");
  const clinicB = await createClinic("E2E Clinic B", "admin-b@e2e.local");
  ok(clinicA.status === 201 && clinicA.body.clinic?.id, "owner creates clinic A");
  ok(clinicB.status === 201 && clinicB.body.clinic?.id, "owner creates clinic B");

  // ── Weak password rejected when creating a clinic ─────────────────────────
  const weak = await owner.fetch("/api/owner/clinics", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-CSRF-Token": ownerLogin.csrf },
    body: JSON.stringify({ clinicName: "Weak", plan: "starter", adminName: "X", adminEmail: "weak@e2e.local", adminPassword: "123" })
  });
  ok(weak.status === 400, "weak admin password is rejected");

  // ── Owner list shows both clinics + revenue ───────────────────────────────
  const list = await (await owner.fetch("/api/owner/clinics")).json();
  ok((list.clinics || []).length >= 2, "owner sees both clinics");
  ok(typeof list.mrr === "number" && list.mrr > 0, "owner sees MRR computed");

  // ── Clinic A admin logs in ────────────────────────────────────────────────
  const adminA = jar();
  const adminALogin = await login(adminA, "admin-a@e2e.local", "ClinicPass!2026X");
  ok(adminALogin.status === 200 && adminALogin.csrf, "clinic A admin logs in");

  // ── CSRF is enforced on state changes ─────────────────────────────────────
  const noCsrf = await adminA.fetch("/api/clinic-state", {
    method: "PUT", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ state: {}, stateVersion: 0 })
  });
  ok(noCsrf.status === 403, "state write without CSRF token is rejected");

  // ── TENANT ISOLATION: clinic admin cannot reach owner endpoints ───────────
  const ownerProbe = await adminA.fetch("/api/owner/clinics");
  ok(ownerProbe.status === 403, "clinic admin is blocked from owner API (no cross-tenant/platform access)");
  // Clinic A admin's state is its own only
  const stateA = await (await adminA.fetch("/api/clinic-state")).json();
  ok(stateA.clinic?.id === clinicA.body.clinic.id, "clinic A admin only sees clinic A state");

  // ── State schema rejects malformed records before they reach SQLite ───────
  const invalidStateResponse = await adminA.fetch("/api/clinic-state", {
    method: "PUT",
    headers: { "Content-Type": "application/json", "X-CSRF-Token": adminALogin.csrf },
    body: JSON.stringify({ state: { patients: {} }, stateVersion: stateA.stateVersion })
  });
  const invalidStateBody = await invalidStateResponse.json();
  ok(
    invalidStateResponse.status === 422 && invalidStateBody.error === "invalid_clinic_state_schema",
    "malformed clinic state is rejected by the versioned schema"
  );

  // ── State is encrypted at rest, including merge-history snapshots ─────────
  const seededState = {
    ...(stateA.state || {}),
    settings: { clinicName: "E2E Clinic A", activeDate: "2026-07-12" },
    patients: [{ id: "patient-secret", name: "Secret Patient", phone: "0791234567", email: "secret@example.com" }]
  };
  const seedStateResponse = await adminA.fetch("/api/clinic-state", {
    method: "PUT",
    headers: { "Content-Type": "application/json", "X-CSRF-Token": adminALogin.csrf },
    body: JSON.stringify({ state: seededState, stateVersion: stateA.stateVersion })
  });
  const seedStateBody = await seedStateResponse.json();
  ok(seedStateResponse.status === 200, "clinic state saves successfully");
  const inspectionDb = new DatabaseSync(dbPath);
  const storedState = inspectionDb.prepare("select state_json from clinics where id = ?").get(clinicA.body.clinic.id)?.state_json;
  const storedHistory = inspectionDb.prepare("select state_gz from clinic_state_history where clinic_id = ? order by version desc limit 1").get(clinicA.body.clinic.id)?.state_gz;
  const appliedMigrations = Number(inspectionDb.prepare("select count(*) as count from schema_migrations").get()?.count || 0);
  inspectionDb.close();
  ok(typeof storedState === "string" && storedState.startsWith("e1:"), "clinic state is ciphertext on disk");
  ok(typeof storedHistory === "string" && storedHistory.startsWith("e1:"), "state history is ciphertext on disk");
  ok(appliedMigrations >= 1, "database schema migrations are recorded");

  // ── Clinic A admin creates a restricted user with column permissions ──────
  const newUser = await adminA.fetch("/api/clinic-users", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-CSRF-Token": adminALogin.csrf },
    body: JSON.stringify({
      email: "reception-a@e2e.local", name: "Reception", role: "data_entry",
      password: "ReceptPass!2026X", permissionFeatures: ["patients_page", "edit_patient_information"], workingDays: [0,1,2,3,4],
      allowedColumnIds: ["laser-men"], calendarScope: "today"
    })
  });
  const newUserBody = await newUser.json().catch(() => ({}));
  ok(newUser.status === 200 || newUser.status === 201, "clinic A admin creates a restricted user");
  ok(JSON.stringify(newUserBody.user?.allowedColumnIds || []) === JSON.stringify(["laser-men"]), "allowedColumnIds persists for the new user");

  // Hidden contact fields survive edits by a user who cannot see them.
  const receptionA = jar();
  const receptionLogin = await login(receptionA, "reception-a@e2e.local", "ReceptPass!2026X");
  const restrictedStateResponse = await receptionA.fetch("/api/clinic-state");
  const restrictedState = await restrictedStateResponse.json();
  const restrictedPatient = restrictedState.state?.patients?.find(patient => patient.id === "patient-secret");
  ok(restrictedStateResponse.status === 200 && restrictedPatient && !restrictedPatient.phone && !restrictedPatient.email, "restricted user cannot read patient contact fields");
  restrictedPatient.name = "Edited Without Contact Access";
  const restrictedSave = await receptionA.fetch("/api/clinic-state", {
    method: "PUT",
    headers: { "Content-Type": "application/json", "X-CSRF-Token": receptionLogin.csrf },
    body: JSON.stringify({ state: restrictedState.state, stateVersion: restrictedState.stateVersion })
  });
  ok(restrictedSave.status === 200, "restricted user can save an allowed patient edit");
  const adminStateAfterRestrictedEdit = await (await adminA.fetch("/api/clinic-state")).json();
  const preservedPatient = adminStateAfterRestrictedEdit.state.patients.find(patient => patient.id === "patient-secret");
  ok(preservedPatient.phone === "0791234567" && preservedPatient.email === "secret@example.com", "hidden patient contact fields are preserved during restricted edits");

  // Photos are encrypted on disk, but authenticated reads return the original.
  const pngBytes = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");
  const photoUpload = await adminA.fetch("/api/patient-photos", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-CSRF-Token": adminALogin.csrf },
    body: JSON.stringify({ dataUrl: `data:image/png;base64,${pngBytes.toString("base64")}` })
  });
  const photoBody = await photoUpload.json();
  ok(photoUpload.status === 200 && photoBody.id, "patient photo uploads");
  const photoPath = join(dir, "photos", clinicA.body.clinic.id, photoBody.id);
  const encryptedPhoto = readFileSync(photoPath);
  ok(!encryptedPhoto.subarray(0, 8).equals(pngBytes.subarray(0, 8)), "patient photo is ciphertext on disk");
  const photoRead = await adminA.fetch(`/api/patient-photos/${photoBody.id}`);
  ok(photoRead.status === 200 && Buffer.from(await photoRead.arrayBuffer()).equals(pngBytes), "authorized photo read decrypts the original image");

  // A provider credential gives key rotation a real integration secret to test.
  const integrationSave = await adminA.fetch("/api/clinic-integrations", {
    method: "PUT",
    headers: { "Content-Type": "application/json", "X-CSRF-Token": adminALogin.csrf },
    body: JSON.stringify({ provider: "sms", config: { endpoint: "https://sms.example.test/send", senderId: "RIAAYA" }, secret: "integration-secret-value" })
  });
  ok(integrationSave.status === 200, "clinic integration secret saves encrypted");

  // ── Owner-controlled per-clinic 2FA requirement ───────────────────────────
  const adminB = jar();
  const adminBLogin = await login(adminB, "admin-b@e2e.local", "ClinicPass!2026X");
  ok(adminBLogin.status === 200 && adminBLogin.csrf, "clinic B admin logs in");
  const require2fa = await owner.fetch(`/api/owner/clinics/${clinicB.body.clinic.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", "X-CSRF-Token": ownerLogin.csrf },
    body: JSON.stringify({ require2fa: true })
  });
  const require2faBody = await require2fa.json().catch(() => ({}));
  ok(require2fa.status === 200 && require2faBody.clinic?.require2fa === true, "owner turns on require-2FA for clinic B");
  const sessionAfter2fa = await (await adminB.fetch("/api/auth/session")).json();
  ok(sessionAfter2fa.clinic?.require2fa === true, "clinic B session sees require2fa=true");
  const blockedState = await adminB.fetch("/api/clinic-state");
  const blockedStateBody = await blockedState.json();
  ok(blockedState.status === 403 && blockedStateBody.error === "two_factor_enrollment_required", "required 2FA blocks patient-data reads before enrollment");

  const setup2fa = await adminB.fetch("/api/auth/2fa/setup", {
    method: "POST", headers: { "Content-Type": "application/json", "X-CSRF-Token": adminBLogin.csrf }, body: "{}"
  });
  const setup2faBody = await setup2fa.json();
  const enrollmentCode = totpCode(setup2faBody.secret);
  const enable2fa = await adminB.fetch("/api/auth/2fa/enable", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-CSRF-Token": adminBLogin.csrf },
    body: JSON.stringify({ code: enrollmentCode })
  });
  ok(setup2fa.status === 200 && enable2fa.status === 200, "clinic B admin enrolls in required 2FA");
  ok((await adminB.fetch("/api/clinic-state")).status === 200, "patient-data reads resume after 2FA enrollment");

  // The enrollment code itself is already consumed and cannot be replayed.
  const challengeClient = jar();
  const challengeLogin = await login(challengeClient, "admin-b@e2e.local", "ClinicPass!2026X");
  ok(challengeLogin.body.twoFactorRequired === true && challengeLogin.body.challengeId, "2FA login returns a short-lived challenge");
  const replayCode = await challengeClient.fetch("/api/auth/2fa/verify", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ challengeId: challengeLogin.body.challengeId, code: enrollmentCode })
  });
  const replayBody = await replayCode.json();
  ok(replayCode.status === 401 && replayBody.error === "code_already_used", "a consumed TOTP code cannot be replayed");
  const nextCode = totpCode(setup2faBody.secret, Date.now() + 30_000);
  const complete2fa = await challengeClient.fetch("/api/auth/2fa/verify", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ challengeId: challengeLogin.body.challengeId, code: nextCode })
  });
  ok(complete2fa.status === 200, "a fresh TOTP code completes login");

  const clinicsAfter2fa = await (await owner.fetch("/api/owner/clinics")).json();
  const clinicARow = (clinicsAfter2fa.clinics || []).find(c => c.id === clinicA.body.clinic.id);
  ok(clinicARow && clinicARow.require2fa === false, "clinic A is unaffected by clinic B's 2FA policy");

  // ── Owner can reset a clinic admin password; old password stops working ───
  const reset = await owner.fetch(`/api/owner/clinics/${clinicA.body.clinic.id}/reset-admin-password`, {
    method: "POST", headers: { "X-CSRF-Token": ownerLogin.csrf }
  });
  const resetBody = await reset.json().catch(() => ({}));
  ok(reset.status === 200 && resetBody.temporaryPassword, "owner resets clinic A admin password");
  const oldPw = await login(jar(), "admin-a@e2e.local", "ClinicPass!2026X");
  ok(oldPw.status === 401, "old admin password no longer works after reset");
  const tempAdmin = jar();
  const newPw = await login(tempAdmin, "admin-a@e2e.local", resetBody.temporaryPassword);
  ok(newPw.status === 200 && newPw.body.user?.mustChangePassword === true, "temporary password creates a restricted session");
  const tempRead = await tempAdmin.fetch("/api/clinic-state");
  const tempReadBody = await tempRead.json();
  ok(tempRead.status === 403 && tempReadBody.error === "password_change_required", "temporary-password session cannot read patient data");
  const permanentPassword = "PermanentClinic!2026X";
  const permanentChange = await tempAdmin.fetch("/api/auth/change-password", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-CSRF-Token": newPw.csrf },
    body: JSON.stringify({ oldPassword: resetBody.temporaryPassword, newPassword: permanentPassword })
  });
  ok(permanentChange.status === 200, "temporary password can be replaced with a permanent password");
  ok((await tempAdmin.fetch("/api/clinic-state")).status === 200, "patient-data reads resume after the required password change");

  // ── Self-service password reset (email mock logs the link) ────────────────
  const forgot = await (jar()).fetch("/api/auth/forgot-password", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "reception-a@e2e.local" })
  });
  ok(forgot.status === 200, "forgot-password returns 200 (no account enumeration)");
  // Unknown emails also return 200 (must not leak which emails exist).
  const forgotUnknown = await (jar()).fetch("/api/auth/forgot-password", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "nobody@e2e.local" })
  });
  ok(forgotUnknown.status === 200, "forgot-password for unknown email also returns 200");

  await new Promise(r => setTimeout(r, 300)); // let the mock email log flush
  const link = [...serverLog.matchAll(/link: (http\S+token=\S+)/g)].pop()?.[1];
  ok(Boolean(link), "reset link is generated and logged in mock mode");
  const resetToken = new URL(link).searchParams.get("token");
  const doReset = await (jar()).fetch("/api/auth/reset-password", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: resetToken, password: "FreshReset!2026X" })
  });
  ok(doReset.status === 200, "reset-password with a valid token + strong password succeeds");
  const afterReset = await login(jar(), "reception-a@e2e.local", "FreshReset!2026X");
  ok(afterReset.status === 200, "the new password logs in after self-service reset");
  const reuse = await (jar()).fetch("/api/auth/reset-password", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: resetToken, password: "Another!Pass2026X" })
  });
  ok(reuse.status === 401, "reset token is single-use (reuse rejected)");

  // ── Backup + restore round-trips against the live DB ──────────────────────
  const backup = createBackup({ databasePath: dbPath, directory: backupDir });
  ok(backup.userCount >= 3, "backup captures the seeded users");
  const restored = restoreBackup({ source: "latest", databasePath: dbPath, directory: backupDir });
  ok(restored.restored.clinicCount >= 2, "restore verifies clinics present");

  // ── Encryption-key rotation covers state, integrations, and photos ────────
  await stopServer();
  const rotation = spawnSync(process.execPath, ["scripts/rotate-encryption-key.mjs"], {
    cwd: new URL("..", import.meta.url).pathname,
    env: {
      ...process.env,
      NODE_ENV: "development",
      RIAAYA_DB_PATH: dbPath,
      RIAAYA_BACKUP_DIR: backupDir,
      RIAAYA_OWNER_EMAIL: OWNER.email,
      RIAAYA_OWNER_PASSWORD: OWNER.password,
      RIAAYA_ENCRYPTION_KEY: NEW_ENCRYPTION_KEY,
      RIAAYA_ENCRYPTION_KEY_OLD: OLD_ENCRYPTION_KEY
    },
    encoding: "utf8"
  });
  ok(rotation.status === 0, `key rotation succeeds: ${rotation.stderr || rotation.stdout}`);

  process.env.RIAAYA_ENCRYPTION_KEY = NEW_ENCRYPTION_KEY;
  delete process.env.RIAAYA_ENCRYPTION_KEY_OLD;
  const cryptoHelpers = await import(`../lib/security.js?e2e-rotation=${Date.now()}`);
  const rotatedDb = new DatabaseSync(dbPath);
  const rotatedStateCipher = rotatedDb.prepare("select state_json from clinics where id = ?").get(clinicA.body.clinic.id)?.state_json;
  const rotatedIntegrationCipher = rotatedDb.prepare("select secret_cipher from clinic_integrations where clinic_id = ? and provider = 'sms'").get(clinicA.body.clinic.id)?.secret_cipher;
  rotatedDb.close();
  const rotatedState = JSON.parse(cryptoHelpers.decryptBlob(rotatedStateCipher));
  ok(rotatedState.patients?.some(patient => patient.id === "patient-secret"), "rotated clinic state decrypts with the new key");
  ok(cryptoHelpers.decryptSecret(rotatedIntegrationCipher) === "integration-secret-value", "rotated integration secret decrypts with the new key");
  ok(cryptoHelpers.decryptBinary(readFileSync(photoPath)).equals(pngBytes), "rotated patient photo decrypts with the new key");

  console.log(`\n✓ e2e passed — ${passed} assertions`);
}

run()
  .then(() => { server.kill(); rmSync(dir, { recursive: true, force: true }); process.exit(0); })
  .catch(err => {
    console.error(`\n✗ e2e FAILED: ${err.message}`);
    if (serverLog) console.error("--- server log tail ---\n" + serverLog.split("\n").slice(-15).join("\n"));
    server.kill();
    rmSync(dir, { recursive: true, force: true });
    process.exit(1);
  });
