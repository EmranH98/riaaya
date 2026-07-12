import { statSync } from "node:fs";
import { latestSchemaVersion } from "./migrations.js";

const startedAt = new Date().toISOString();
const durations = [];
const routes = new Map();
const counters = { total: 0, active: 0, status2xx: 0, status3xx: 0, status4xx: 0, status5xx: 0 };
let lastServerErrorAt = "";

function routeKey(method, pathname) {
  const normalized = String(pathname || "/")
    .replace(/\/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, "/:id")
    .replace(/\/api\/owner\/clinics\/[^/]+/i, "/api/owner/clinics/:id")
    .replace(/\/api\/patient-photos\/[^/]+/i, "/api/patient-photos/:id");
  return `${String(method || "GET").toUpperCase()} ${normalized}`;
}

function percentile(values, ratio) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(Math.ceil(sorted.length * ratio) - 1, sorted.length - 1)] || 0;
}

export function beginRequestObservation({ method, pathname }) {
  const began = performance.now();
  const key = routeKey(method, pathname);
  counters.total += 1;
  counters.active += 1;
  return statusCode => {
    counters.active = Math.max(counters.active - 1, 0);
    const status = Number(statusCode || 0);
    if (status >= 500) {
      counters.status5xx += 1;
      lastServerErrorAt = new Date().toISOString();
    } else if (status >= 400) counters.status4xx += 1;
    else if (status >= 300) counters.status3xx += 1;
    else if (status >= 200) counters.status2xx += 1;
    const durationMs = Math.round((performance.now() - began) * 10) / 10;
    durations.push(durationMs);
    if (durations.length > 500) durations.shift();
    const route = routes.get(key) || { count: 0, errors: 0, totalMs: 0, maxMs: 0 };
    route.count += 1;
    route.errors += status >= 500 ? 1 : 0;
    route.totalMs += durationMs;
    route.maxMs = Math.max(route.maxMs, durationMs);
    routes.set(key, route);
    if (routes.size > 100) routes.delete(routes.keys().next().value);
  };
}

export function databaseReadiness(database) {
  try {
    database.prepare("select 1 as ok").get();
    const appliedSchemaVersion = Number(database.prepare("select coalesce(max(version), 0) as version from schema_migrations").get()?.version || 0);
    const inconsistentClinics = Number(database.prepare(`
      select count(*) as count
      from clinics
      where coalesce(record_storage_version, 0) >= 1
        and (
          record_storage_synced_version != state_version
          or not exists (
            select 1 from clinic_record_manifests manifests
            where manifests.clinic_id = clinics.id and manifests.state_version = clinics.state_version
          )
        )
    `).get()?.count || 0);
    const pendingClinics = Number(database.prepare(`
      select count(*) as count from clinics
      where state_json is not null and coalesce(record_storage_version, 0) < 1
    `).get()?.count || 0);
    return {
      ok: appliedSchemaVersion === latestSchemaVersion() && inconsistentClinics === 0,
      appliedSchemaVersion,
      expectedSchemaVersion: latestSchemaVersion(),
      inconsistentClinics,
      pendingRelationalMigration: pendingClinics
    };
  } catch (error) {
    return { ok: false, error: String(error?.message || error).slice(0, 160) };
  }
}

export function observabilitySnapshot(database, { databasePath = "" } = {}) {
  const readiness = databaseReadiness(database);
  let integrity = "unavailable";
  try {
    const result = database.prepare("pragma quick_check").get();
    integrity = result?.quick_check || result?.["quick_check"] || "unknown";
  } catch { /* readiness already reports database failures */ }
  let databaseSizeMb = 0;
  try { databaseSizeMb = Math.round((statSync(databasePath).size / (1024 * 1024)) * 10) / 10; } catch { /* optional */ }
  const memory = process.memoryUsage();
  const recentRoutes = [...routes.entries()]
    .map(([route, value]) => ({
      route,
      count: value.count,
      errors: value.errors,
      averageMs: Math.round((value.totalMs / Math.max(value.count, 1)) * 10) / 10,
      maxMs: value.maxMs
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);
  return {
    startedAt,
    uptimeSeconds: Math.round(process.uptime()),
    requests: {
      ...counters,
      averageMs: durations.length ? Math.round((durations.reduce((sum, value) => sum + value, 0) / durations.length) * 10) / 10 : 0,
      p95Ms: percentile(durations, 0.95),
      lastServerErrorAt,
      routes: recentRoutes
    },
    runtime: {
      node: process.version,
      rssMb: Math.round(memory.rss / (1024 * 1024)),
      heapUsedMb: Math.round(memory.heapUsed / (1024 * 1024))
    },
    database: { ...readiness, integrity, sizeMb: databaseSizeMb }
  };
}
