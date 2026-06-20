// Self-booting end-to-end test. Spins up the real server against a throwaway
// database and exercises the flows that protect clinics: auth, multi-tenant
// isolation, owner controls, CSRF, password policy, and backup/restore.
//
//   node scripts/e2e-test.mjs
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createBackup, restoreBackup } from "../lib/backup.js";

const dir = mkdtempSync(join(tmpdir(), "riaaya-e2e-"));
const dbPath = join(dir, "r.sqlite");
const backupDir = join(dir, "backups");
const PORT = 4801 + Math.floor(process.hrtime()[1] % 150);
const base = `http://localhost:${PORT}`;
const OWNER = { email: "e2e-owner@test.local", password: "E2eOwner!2026X" };

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

async function waitForHealth(timeoutMs = 12000) {
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
    NODE_ENV: "development"
  },
  stdio: ["ignore", "pipe", "pipe"]
});
let serverLog = "";
server.stdout.on("data", d => { serverLog += d; });
server.stderr.on("data", d => { serverLog += d; });

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

  // ── Clinic A admin creates a restricted user with column permissions ──────
  const newUser = await adminA.fetch("/api/clinic-users", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-CSRF-Token": adminALogin.csrf },
    body: JSON.stringify({
      email: "reception-a@e2e.local", name: "Reception", role: "data_entry",
      password: "ReceptPass!2026X", permissionFeatures: [], workingDays: [0,1,2,3,4],
      allowedColumnIds: ["laser-men"], calendarScope: "today"
    })
  });
  const newUserBody = await newUser.json().catch(() => ({}));
  ok(newUser.status === 200 || newUser.status === 201, "clinic A admin creates a restricted user");
  ok(JSON.stringify(newUserBody.user?.allowedColumnIds || []) === JSON.stringify(["laser-men"]), "allowedColumnIds persists for the new user");

  // ── Owner can reset a clinic admin password; old password stops working ───
  const reset = await owner.fetch(`/api/owner/clinics/${clinicA.body.clinic.id}/reset-admin-password`, {
    method: "POST", headers: { "X-CSRF-Token": ownerLogin.csrf }
  });
  const resetBody = await reset.json().catch(() => ({}));
  ok(reset.status === 200 && resetBody.temporaryPassword, "owner resets clinic A admin password");
  const oldPw = await login(jar(), "admin-a@e2e.local", "ClinicPass!2026X");
  ok(oldPw.status === 401, "old admin password no longer works after reset");
  const newPw = await login(jar(), "admin-a@e2e.local", resetBody.temporaryPassword);
  ok(newPw.status === 200, "temporary password works after reset");

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
