// Self-booting concurrent-edit test. Spins up the real server against a
// throwaway database and proves that two people editing the same clinic at
// once no longer lose each other's work: stale saves are three-way merged
// per record instead of rejected or force-overwritten.
//
//   node scripts/concurrency-test.mjs
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const dir = mkdtempSync(join(tmpdir(), "riaaya-conc-"));
const dbPath = join(dir, "r.sqlite");
const PORT = 4961 + Math.floor(process.hrtime()[1] % 150);
const base = `http://localhost:${PORT}`;
const OWNER = { email: "conc-owner@test.local", password: "ConcOwner!2026X" };

let passed = 0;
const ok = (cond, msg) => { if (!cond) throw new Error(`ASSERT FAILED: ${msg}`); passed += 1; console.log(`  ✓ ${msg}`); };

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

async function getState(client) {
  const res = await client.fetch("/api/clinic-state");
  const body = await res.json();
  return { status: res.status, state: body.state, version: body.stateVersion };
}

async function putState(client, csrf, state, stateVersion) {
  const res = await client.fetch("/api/clinic-state", {
    method: "PUT",
    headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf },
    body: JSON.stringify({ state, stateVersion })
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
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
    RIAAYA_OWNER_EMAIL: OWNER.email,
    RIAAYA_OWNER_PASSWORD: OWNER.password,
    RIAAYA_OWNER_SYNC: "true",
    RIAAYA_DISABLE_RATE_LIMIT: "1",
    NODE_ENV: "development"
  },
  stdio: ["ignore", "pipe", "pipe"]
});
let serverLog = "";
server.stdout.on("data", d => { serverLog += d; });
server.stderr.on("data", d => { serverLog += d; });

const booking = (id, patient, extra = {}) => ({
  id, patient, phone: "0790000000", service: "فحص", serviceId: "svc-1",
  date: "2026-07-10", time: "10:00", status: "confirmed", doctorId: "", specialistId: "",
  expectedAmount: 0, createdAt: "2026-07-03T10:00:00.000Z", ...extra
});

async function run() {
  await waitForHealth();

  // ── Setup: owner creates a clinic with an admin ────────────────────────────
  const owner = jar();
  const ownerLogin = await login(owner, OWNER.email, OWNER.password);
  ok(ownerLogin.status === 200, "owner logs in");
  const created = await owner.fetch("/api/owner/clinics", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-CSRF-Token": ownerLogin.csrf },
    body: JSON.stringify({ clinicName: "Concurrency Clinic", plan: "professional", adminName: "Admin", adminEmail: "conc-admin@test.local", adminPassword: "ClinicPass!2026X" })
  });
  const createdBody = await created.json();
  ok(created.status === 201 && createdBody.clinic?.slug, "owner creates the test clinic");
  const slug = createdBody.clinic.slug;

  // Two "devices" logged in as the clinic admin.
  const deviceA = jar();
  const deviceB = jar();
  const loginA = await login(deviceA, "conc-admin@test.local", "ClinicPass!2026X");
  const loginB = await login(deviceB, "conc-admin@test.local", "ClinicPass!2026X");
  ok(loginA.status === 200 && loginB.status === 200, "both devices log in");

  // Seed a starting state through device A.
  const seedA = await getState(deviceA);
  const seed = {
    settings: { clinicName: "Concurrency Clinic", activeDate: "2026-07-03" },
    bookings: [booking("bk-1", "مريض أساسي")],
    patients: [{ id: "pt-1", name: "مريض أساسي", phone: "0791111111" }],
    entries: [], staff: [], services: [], expenses: []
  };
  const seeded = await putState(deviceA, loginA.csrf, seed, seedA.version);
  ok(seeded.status === 200 && !seeded.body.merged, "device A seeds the initial state");

  // ── Scenario 1: add vs add — both records must survive ────────────────────
  const a1 = await getState(deviceA);
  const b1 = await getState(deviceB);
  ok(a1.version === b1.version, "both devices load the same version");

  const stateA1 = structuredClone(a1.state);
  stateA1.bookings.push(booking("bk-A", "حجز من الجهاز A"));
  const saveA1 = await putState(deviceA, loginA.csrf, stateA1, a1.version);
  ok(saveA1.status === 200 && !saveA1.body.merged, "device A saves a new booking (fast path)");

  const stateB1 = structuredClone(b1.state);
  stateB1.bookings.push(booking("bk-B", "حجز من الجهاز B"));
  const saveB1 = await putState(deviceB, loginB.csrf, stateB1, b1.version);
  ok(saveB1.status === 200, "device B's stale save is accepted, not rejected");
  ok(saveB1.body.merged === true, "device B's save is flagged as merged");
  const mergedIds = (saveB1.body.state?.bookings || []).map(b => b.id);
  ok(mergedIds.includes("bk-A") && mergedIds.includes("bk-B"), "BOTH new bookings survive the merge");

  // ── Scenario 2: edit vs edit on different records ──────────────────────────
  const a2 = await getState(deviceA);
  const b2 = await getState(deviceB);
  const stateA2 = structuredClone(a2.state);
  stateA2.bookings.find(b => b.id === "bk-A").patient = "A عدّل حجزه";
  await putState(deviceA, loginA.csrf, stateA2, a2.version);

  const stateB2 = structuredClone(b2.state);
  stateB2.bookings.find(b => b.id === "bk-B").patient = "B عدّل حجزه";
  const saveB2 = await putState(deviceB, loginB.csrf, stateB2, b2.version);
  ok(saveB2.status === 200 && saveB2.body.merged, "stale edit on a different record merges");
  const afterB2 = saveB2.body.state.bookings;
  ok(afterB2.find(b => b.id === "bk-A")?.patient === "A عدّل حجزه", "device A's edit survives device B's save");
  ok(afterB2.find(b => b.id === "bk-B")?.patient === "B عدّل حجزه", "device B's edit is applied in the same merge");

  // ── Scenario 3: edit vs edit on the SAME record — deterministic winner ────
  const a3 = await getState(deviceA);
  const b3 = await getState(deviceB);
  const stateA3 = structuredClone(a3.state);
  stateA3.bookings.find(b => b.id === "bk-1").notes = "ملاحظة من A";
  await putState(deviceA, loginA.csrf, stateA3, a3.version);
  const stateB3 = structuredClone(b3.state);
  stateB3.bookings.find(b => b.id === "bk-1").notes = "ملاحظة من B";
  const saveB3 = await putState(deviceB, loginB.csrf, stateB3, b3.version);
  ok(saveB3.status === 200 && saveB3.body.merged, "same-record conflict still merges");
  ok(saveB3.body.state.bookings.find(b => b.id === "bk-1")?.notes === "ملاحظة من B", "same-record conflict resolves to the later save (per-record last-write-wins)");

  // ── Scenario 4: delete vs edit — the edit wins, data is never lost ────────
  const a4 = await getState(deviceA);
  const b4 = await getState(deviceB);
  const stateA4 = structuredClone(a4.state);
  stateA4.bookings.find(b => b.id === "bk-B").patient = "B محدث بعد الحذف";
  await putState(deviceA, loginA.csrf, stateA4, a4.version);
  const stateB4 = structuredClone(b4.state);
  stateB4.bookings = stateB4.bookings.filter(b => b.id !== "bk-B");
  const saveB4 = await putState(deviceB, loginB.csrf, stateB4, b4.version);
  ok(saveB4.status === 200 && saveB4.body.merged, "stale delete merges");
  ok(saveB4.body.state.bookings.some(b => b.id === "bk-B"), "a record edited by the other user survives a stale delete");

  // Clean delete still works: delete with a fresh base removes the record.
  const a5 = await getState(deviceA);
  const stateA5 = structuredClone(a5.state);
  stateA5.bookings = stateA5.bookings.filter(b => b.id !== "bk-B");
  const saveA5 = await putState(deviceA, loginA.csrf, stateA5, a5.version);
  ok(saveA5.status === 200 && !saveA5.body.merged, "up-to-date delete is applied on the fast path");
  const check5 = await getState(deviceA);
  ok(!check5.state.bookings.some(b => b.id === "bk-B"), "cleanly deleted record stays deleted");

  // ── Scenario 5: settings — two users change different settings keys ───────
  const a6 = await getState(deviceA);
  const b6 = await getState(deviceB);
  const stateA6 = structuredClone(a6.state);
  stateA6.settings.reportDateFrom = "2026-07-01";
  await putState(deviceA, loginA.csrf, stateA6, a6.version);
  const stateB6 = structuredClone(b6.state);
  stateB6.settings.scheduleSlotMinutes = 20;
  const saveB6 = await putState(deviceB, loginB.csrf, stateB6, b6.version);
  ok(saveB6.status === 200 && saveB6.body.merged, "stale settings change merges");
  ok(saveB6.body.state.settings.reportDateFrom === "2026-07-01" && saveB6.body.state.settings.scheduleSlotMinutes === 20, "both settings changes survive (per-key merge)");

  // ── Scenario 6: a public online booking no longer breaks logged-in saves ──
  const a7 = await getState(deviceA);
  const pub = await fetch(`${base}/api/public/clinic/${slug}/booking`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ patient: "مريض من الموقع", phone: "0793333333", date: "2026-07-12", time: "11:00", serviceName: "فحص" })
  });
  const pubBody = await pub.json();
  ok(pub.status === 201 && pubBody.bookingId, "public online booking is created");
  const stateA7 = structuredClone(a7.state);
  stateA7.patients.push({ id: "pt-2", name: "مريض جديد", phone: "0794444444" });
  const saveA7 = await putState(deviceA, loginA.csrf, stateA7, a7.version);
  ok(saveA7.status === 200 && saveA7.body.merged, "save based on the pre-booking version merges instead of failing");
  ok(saveA7.body.state.bookings.some(b => b.id === pubBody.bookingId), "the online booking survives the clinic save");
  ok(saveA7.body.state.patients.some(p => p.id === "pt-2"), "the clinic edit survives alongside the online booking");

  // ── Scenario 7: hopelessly stale base still 409s (reload fallback) ────────
  const tooOld = await putState(deviceB, loginB.csrf, { bookings: [] }, -5);
  ok(tooOld.status === 409, "a base version with no snapshot is still rejected with 409");

  // ── Scenario 8: version ahead of the server (post-restore) is rejected ────
  const ahead = await putState(deviceB, loginB.csrf, { bookings: [] }, 999999);
  ok(ahead.status === 409, "a version newer than the server's is rejected with 409");

  console.log(`\nALL CONCURRENCY TESTS PASSED (${passed} assertions)`);
}

run()
  .catch(error => {
    console.error(`\n${error.message}`);
    console.error(serverLog.split("\n").slice(-15).join("\n"));
    process.exitCode = 1;
  })
  .finally(() => {
    server.kill();
    rmSync(dir, { recursive: true, force: true });
  });
