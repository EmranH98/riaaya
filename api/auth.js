import { randomUUID } from "node:crypto";
import { db, audit, defaultClinicLimits, defaultClinicModules, nowIso, publicClinic, publicUser, slugifyClinic } from "../lib/database.js";
import {
  clearLoginFailures,
  clearSessionCookie,
  clientIp,
  hashPassword,
  isLoginRateLimited,
  loginRateLimitKey,
  normalizeEmail,
  parseCookies,
  randomToken,
  recordLoginFailure,
  safeText,
  sessionCookie,
  tokenHash,
  validatePassword,
  verifyPassword
} from "../lib/security.js";

const SESSION_SECONDS = 12 * 60 * 60;

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(payload));
}

export function authenticateRequest(req) {
  const token = parseCookies(req.headers.cookie || "").riaaya_session;
  if (!token) return null;
  const row = db.prepare(`
    select
      sessions.token_hash,
      sessions.csrf_token,
      sessions.expires_at,
      users.*,
      clinics.name as clinic_name,
      clinics.slug as clinic_slug,
      clinics.phone as clinic_phone,
      clinics.city as clinic_city,
      clinics.plan as clinic_plan,
      clinics.status as clinic_status,
      clinics.trial_ends_at as clinic_trial_ends_at,
      clinics.tax_number as clinic_tax_number,
      clinics.income_source_sequence as clinic_income_source_sequence,
      clinics.enabled_modules_json as clinic_enabled_modules_json,
      clinics.limits_json as clinic_limits_json,
      clinics.branding_json as clinic_branding_json,
      clinics.support_tier as clinic_support_tier,
      clinics.owner_notes as clinic_owner_notes,
      clinics.created_at as clinic_created_at,
      clinics.updated_at as clinic_updated_at
    from sessions
    join users on users.id = sessions.user_id
    left join clinics on clinics.id = users.clinic_id
    where sessions.token_hash = ?
  `).get(tokenHash(token));

  if (!row || row.active !== 1 || row.expires_at <= nowIso()) {
    if (row?.token_hash) db.prepare("delete from sessions where token_hash = ?").run(row.token_hash);
    return null;
  }

  const clinic = row.clinic_id
    ? {
        id: row.clinic_id,
        name: row.clinic_name,
        slug: row.clinic_slug,
        phone: row.clinic_phone,
        city: row.clinic_city,
        plan: row.clinic_plan,
        status: row.clinic_status,
        trial_ends_at: row.clinic_trial_ends_at,
        tax_number: row.clinic_tax_number,
        income_source_sequence: row.clinic_income_source_sequence,
        enabled_modules_json: row.clinic_enabled_modules_json,
        limits_json: row.clinic_limits_json,
        branding_json: row.clinic_branding_json,
        support_tier: row.clinic_support_tier,
        owner_notes: row.clinic_owner_notes,
        created_at: row.clinic_created_at,
        updated_at: row.clinic_updated_at
      }
    : null;

  return {
    session: {
      tokenHash: row.token_hash,
      csrfToken: row.csrf_token,
      expiresAt: row.expires_at
    },
    user: publicUser(row),
    clinic: publicClinic(clinic)
  };
}

export function requireSession(req, res, { owner = false, csrf = false } = {}) {
  const auth = authenticateRequest(req);
  if (!auth) {
    sendJson(res, 401, { error: "authentication_required" });
    return null;
  }
  if (owner && auth.user.role !== "platform_owner") {
    sendJson(res, 403, { error: "owner_access_required" });
    return null;
  }
  if (auth.clinic?.status === "suspended" && auth.user.role !== "platform_owner") {
    sendJson(res, 403, { error: "clinic_suspended" });
    return null;
  }
  if (
    auth.clinic?.status === "trial"
    && auth.clinic.trialEndsAt
    && auth.clinic.trialEndsAt <= nowIso()
    && auth.user.role !== "platform_owner"
  ) {
    sendJson(res, 402, { error: "trial_expired" });
    return null;
  }
  if (
    auth.clinic?.accountDeadline
    && auth.clinic.accountDeadline <= nowIso().slice(0, 10)
    && auth.user.role !== "platform_owner"
  ) {
    sendJson(res, 402, { error: "account_deadline_reached" });
    return null;
  }
  if (csrf && req.headers["x-csrf-token"] !== auth.session.csrfToken) {
    sendJson(res, 403, { error: "invalid_csrf_token" });
    return null;
  }
  return auth;
}

function createSession(req, res, userId) {
  const token = randomToken();
  const csrfToken = randomToken(24);
  const createdAt = nowIso();
  const expiresAt = new Date(Date.now() + SESSION_SECONDS * 1000).toISOString();
  db.prepare(`
    insert into sessions (token_hash, user_id, csrf_token, expires_at, ip_address, user_agent, created_at)
    values (?, ?, ?, ?, ?, ?, ?)
  `).run(
    tokenHash(token),
    userId,
    csrfToken,
    expiresAt,
    clientIp(req),
    String(req.headers["user-agent"] || "").slice(0, 500),
    createdAt
  );
  res.setHeader("Set-Cookie", sessionCookie(token, SESSION_SECONDS));
  return { csrfToken, expiresAt };
}

function login(req, res) {
  const email = normalizeEmail(req.body?.email);
  const password = String(req.body?.password || "");
  const rateKey = loginRateLimitKey(req, email);

  if (isLoginRateLimited(rateKey)) {
    sendJson(res, 429, { error: "too_many_login_attempts" });
    return;
  }

  const row = db.prepare("select * from users where email = ?").get(email);
  if (!row || row.active !== 1 || !verifyPassword(password, row.password_hash)) {
    recordLoginFailure(rateKey);
    sendJson(res, 401, { error: "invalid_credentials" });
    return;
  }

  clearLoginFailures(rateKey);
  db.prepare("delete from sessions where user_id = ? and expires_at <= ?").run(row.id, nowIso());
  const session = createSession(req, res, row.id);
  const clinic = row.clinic_id ? db.prepare("select * from clinics where id = ?").get(row.clinic_id) : null;
  audit({
    clinicId: row.clinic_id,
    userId: row.id,
    action: "login",
    entity: "session",
    ipAddress: clientIp(req)
  });
  sendJson(res, 200, { ok: true, user: publicUser(row), clinic: publicClinic(clinic), ...session });
}

function register(req, res) {
  const clinicName = safeText(req.body?.clinicName, 120);
  const name = safeText(req.body?.name, 120);
  const email = normalizeEmail(req.body?.email);
  const password = String(req.body?.password || "");
  const phone = safeText(req.body?.phone, 40);
  const city = safeText(req.body?.city, 80);
  const plan = safeText(req.body?.plan || "professional", 40);
  const acceptedPrivacy = req.body?.acceptedPrivacy === true;

  if (!clinicName || !name || !email || !phone || !city) {
    sendJson(res, 400, { error: "missing_registration_fields" });
    return;
  }
  if (!validatePassword(password)) {
    sendJson(res, 400, { error: "weak_password" });
    return;
  }
  if (!acceptedPrivacy) {
    sendJson(res, 400, { error: "privacy_consent_required" });
    return;
  }
  if (db.prepare("select 1 from users where email = ?").get(email)) {
    sendJson(res, 409, { error: "email_already_registered" });
    return;
  }

  const clinicId = randomUUID();
  const userId = randomUUID();
  const createdAt = nowIso();
  const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

  db.exec("begin immediate");
  try {
    db.prepare(`
      insert into clinics (
        id, name, slug, phone, city, plan, status, trial_ends_at,
        enabled_modules_json, limits_json, branding_json, support_tier,
        created_at, updated_at
      )
      values (?, ?, ?, ?, ?, ?, 'trial', ?, ?, ?, '{}', 'standard', ?, ?)
    `).run(
      clinicId,
      clinicName,
      slugifyClinic(clinicName),
      phone,
      city,
      plan,
      trialEndsAt,
      JSON.stringify(defaultClinicModules(plan)),
      JSON.stringify(defaultClinicLimits(plan)),
      createdAt,
      createdAt
    );
    db.prepare(`
      insert into users (
        id, clinic_id, email, password_hash, name, mobile, role, permissions_json,
        own_entries_only, can_view_sensitive, calendar_scope, calendar_days_back,
        calendar_days_ahead, working_days_json, active, created_at, updated_at
      ) values (?, ?, ?, ?, ?, ?, 'admin', '[]', 0, 1, 'all', 3650, 3650, '[0,1,2,3,4,5,6]', 1, ?, ?)
    `).run(userId, clinicId, email, hashPassword(password), name, phone, createdAt, createdAt);
    db.exec("commit");
  } catch (error) {
    db.exec("rollback");
    throw error;
  }

  const session = createSession(req, res, userId);
  audit({
    clinicId,
    userId,
    action: "register",
    entity: "clinic",
    entityId: clinicId,
    metadata: { plan, privacyConsentAt: createdAt },
    ipAddress: clientIp(req)
  });
  sendJson(res, 201, {
    ok: true,
    user: publicUser(db.prepare("select * from users where id = ?").get(userId)),
    clinic: publicClinic(db.prepare("select * from clinics where id = ?").get(clinicId)),
    ...session
  });
}

function changePassword(req, res) {
  const auth = requireSession(req, res, { csrf: true });
  if (!auth) return;

  const oldPassword = String(req.body?.oldPassword || "");
  const newPassword = String(req.body?.newPassword || "");

  if (!oldPassword || !newPassword) {
    sendJson(res, 400, { error: "missing_fields" });
    return;
  }
  if (!validatePassword(newPassword)) {
    sendJson(res, 400, { error: "weak_password" });
    return;
  }

  const user = db.prepare("select * from users where id = ?").get(auth.user.id);
  if (!user || !verifyPassword(oldPassword, user.password_hash)) {
    sendJson(res, 401, { error: "invalid_old_password" });
    return;
  }

  const updatedAt = nowIso();
  db.prepare("update users set password_hash = ?, updated_at = ? where id = ?")
    .run(hashPassword(newPassword), updatedAt, auth.user.id);

  // Invalidate all other sessions for this user so old password can't be reused
  db.prepare("delete from sessions where user_id = ? and token_hash != ?")
    .run(auth.user.id, auth.session.tokenHash);

  audit({
    clinicId: auth.user.clinicId || null,
    userId: auth.user.id,
    action: "change_password",
    entity: "user",
    entityId: auth.user.id,
    ipAddress: clientIp(req)
  });

  sendJson(res, 200, { ok: true });
}

function logout(req, res) {
  const auth = authenticateRequest(req);
  if (auth && req.headers["x-csrf-token"] === auth.session.csrfToken) {
    db.prepare("delete from sessions where token_hash = ?").run(auth.session.tokenHash);
    audit({
      clinicId: auth.user.clinicId || null,
      userId: auth.user.id,
      action: "logout",
      entity: "session",
      ipAddress: clientIp(req)
    });
  }
  res.setHeader("Set-Cookie", clearSessionCookie());
  sendJson(res, 200, { ok: true });
}

export default async function authHandler(req, res, url) {
  if (req.method === "GET" && url.pathname === "/api/auth/session") {
    const auth = authenticateRequest(req);
    sendJson(res, 200, auth
      ? { authenticated: true, user: auth.user, clinic: auth.clinic, csrfToken: auth.session.csrfToken, expiresAt: auth.session.expiresAt }
      : { authenticated: false });
    return;
  }
  if (req.method === "POST" && url.pathname === "/api/auth/login") {
    login(req, res);
    return;
  }
  if (req.method === "POST" && url.pathname === "/api/auth/register") {
    register(req, res);
    return;
  }
  if (req.method === "POST" && url.pathname === "/api/auth/logout") {
    logout(req, res);
    return;
  }
  if (req.method === "POST" && url.pathname === "/api/auth/change-password") {
    changePassword(req, res);
    return;
  }
  sendJson(res, 404, { error: "auth_route_not_found" });
}
