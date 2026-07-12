import { randomUUID } from "node:crypto";
import { db, publicLandingSettings } from "../lib/database.js";
import { ensureStateSnapshot, saveStateSnapshot } from "../lib/state-history.js";
import { safeText } from "../lib/security.js";
import { persistClinicStateCompatible, readClinicState, withImmediateTransaction } from "../lib/clinic-record-store.js";

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(payload));
}

/* ── Rate-limit: max 10 public booking POSTs per IP per hour (in-memory) ── */
const rateMap = new Map();
function isRateLimited(ip) {
  const now = Date.now();
  const window = 60 * 60 * 1000;
  const entry = rateMap.get(ip) || { count: 0, start: now };
  if (now - entry.start > window) { rateMap.set(ip, { count: 1, start: now }); return false; }
  if (entry.count >= 10) return true;
  entry.count++;
  rateMap.set(ip, entry);
  return false;
}

function buildTimeSlots(start, end, gap) {
  const slots = [];
  const [sh, sm] = (start || "09:00").split(":").map(Number);
  const [eh, em] = (end   || "17:00").split(":").map(Number);
  let min = sh * 60 + sm;
  const endMin = eh * 60 + em;
  while (min < endMin) {
    slots.push(`${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`);
    min += (gap || 30);
  }
  return slots;
}

const ACTIVE_BOOKING_STATUSES = new Set(["scheduled", "confirmed", "arrived", "pending_confirmation"]);

function bookingServiceKey(booking = {}) {
  return String(booking.serviceId || booking.service || booking.serviceName || "__unassigned").trim() || "__unassigned";
}

function bookingActiveForPublicSlot(booking = {}) {
  return ACTIVE_BOOKING_STATUSES.has(String(booking.status || "scheduled"));
}

function bookedSlotMap(bookings = []) {
  return bookings
    .filter(booking => bookingActiveForPublicSlot(booking) && booking.date && booking.time)
    .reduce((map, booking) => {
      const serviceKey = bookingServiceKey(booking);
      map[serviceKey] = map[serviceKey] || {};
      map[serviceKey][booking.date] = map[serviceKey][booking.date] || [];
      if (!map[serviceKey][booking.date].includes(booking.time)) map[serviceKey][booking.date].push(booking.time);
      return map;
    }, {});
}

function slotUnavailable(bookings = [], candidate = {}) {
  const candidateKey = bookingServiceKey(candidate);
  return bookings.some(booking => (
    bookingActiveForPublicSlot(booking)
    && booking.date === candidate.date
    && booking.time === candidate.time
    && bookingServiceKey(booking) === candidateKey
  ));
}

/* ── GET /api/public/clinic/:slug ─────────────────────────────────────── */
function handleGetClinic(slug, res) {
  const row = db.prepare(
    "select * from clinics where slug = ?"
  ).get(slug);

  if (!row || row.status === "suspended" || row.status === "cancelled") {
    sendJson(res, 404, { error: "clinic_not_found" });
    return;
  }

  const state = readClinicState(db, row);
  const settings = state.settings || {};
  const bookings = Array.isArray(state.bookings) ? state.bookings : [];

  const services = (state.services || [])
    .filter(s => s.active !== false)
    .map(s => ({ id: s.id, name: s.name, duration: s.defaultDuration || 30 }));

  const workStart = settings.workHoursStart || "09:00";
  const workEnd   = settings.workHoursEnd   || "17:00";
  const slotGap   = settings.slotMinutes    || 30;

  sendJson(res, 200, {
    ok: true,
    clinic: { name: row.name, slug: row.slug, city: row.city || "", phone: row.phone || "" },
    services,
    slots: buildTimeSlots(workStart, workEnd, slotGap),
    bookedSlots: bookedSlotMap(bookings),
    workStart,
    workEnd,
    slotGap,
  });
}

/* ── POST /api/public/clinic/:slug/booking ────────────────────────────── */
async function handleCreateBooking(req, slug, res) {
  const row = db.prepare(
    "select * from clinics where slug = ?"
  ).get(slug);

  if (!row || row.status === "suspended" || row.status === "cancelled") {
    sendJson(res, 404, { error: "clinic_not_found" });
    return;
  }

  /* Collect + parse body */
  let body = {};
  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const raw = Buffer.concat(chunks).toString();
    body = raw ? JSON.parse(raw) : {};
  } catch {
    sendJson(res, 400, { error: "invalid_body" });
    return;
  }

  // Unauthenticated input — strip angle brackets/control chars at the boundary
  // so attacker-controlled strings can never reach an innerHTML sink verbatim.
  const patient = safeText(body.patient, 120);
  const phone   = safeText(body.phone, 40);
  const date    = String(body.date    || "").trim();
  const time    = String(body.time    || "").trim();

  if (!patient || !phone || !date || !time) {
    sendJson(res, 400, { error: "missing_required_fields" });
    return;
  }

  const ip = req.socket?.remoteAddress || "unknown";
  if (isRateLimited(ip)) {
    sendJson(res, 429, { error: "too_many_requests" });
    return;
  }

  const serviceName = safeText(body.serviceName, 200);
  const serviceId   = safeText(body.serviceId, 100);
  const notes       = safeText(body.notes, 500);
  const bookingId   = randomUUID();
  const reference   = "RIA-" + bookingId.slice(0, 6).toUpperCase();
  const now         = new Date().toISOString();

  // Re-read the state now that the body has been awaited: a clinic save may
  // have landed in the meantime, and writing from the earlier read would
  // silently discard it. From here to the update there is no await.
  const fresh = db.prepare(
    "select * from clinics where id = ?"
  ).get(row.id);
  const state = readClinicState(db, fresh);
  const freshStr = JSON.stringify(state);
  const bookings = Array.isArray(state.bookings) ? state.bookings : [];
  const candidate = { date, time, serviceId, service: serviceName };

  if (slotUnavailable(bookings, candidate)) {
    sendJson(res, 409, { error: "slot_unavailable" });
    return;
  }

  bookings.push({
    id: bookingId, status: "pending_confirmation",
    patient, phone, serviceId, service: serviceName,
    date, time, notes, reference, source: "online_booking",
    doctorId: "", specialistId: "", expectedAmount: 0, createdAt: now,
  });

  state.bookings = bookings;
  const currentVersion = Number(fresh?.state_version || 0);
  const nextVersion = currentVersion + 1;
  // Snapshot both sides of this write so logged-in clients editing against the
  // pre-booking version can still merge instead of hitting a conflict.
  withImmediateTransaction(db, () => {
    if (fresh?.state_json) ensureStateSnapshot(row.id, currentVersion, freshStr);
    const persisted = persistClinicStateCompatible(db, {
      clinicRow: fresh,
      clinicId: row.id,
      state,
      stateVersion: nextVersion,
      updatedAt: now
    });
    saveStateSnapshot(row.id, nextVersion, persisted.serialized);
  });

  sendJson(res, 201, { ok: true, reference, bookingId });
}

/* ── Router ───────────────────────────────────────────────────────────── */
export default async function publicHandler(req, res, url) {
  if (url.pathname === "/api/public/landing-settings") {
    sendJson(res, 200, { ok: true, landing: publicLandingSettings() });
    return;
  }

  const clinicMatch = url.pathname.match(/^\/api\/public\/clinic\/([a-z0-9-]+)$/i);
  if (clinicMatch && req.method === "GET") {
    handleGetClinic(clinicMatch[1], res);
    return;
  }

  const bookingMatch = url.pathname.match(/^\/api\/public\/clinic\/([a-z0-9-]+)\/booking$/i);
  if (bookingMatch && req.method === "POST") {
    await handleCreateBooking(req, bookingMatch[1], res);
    return;
  }

  sendJson(res, 404, { error: "public_route_not_found" });
}
