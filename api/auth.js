import { randomUUID } from "node:crypto";
import { db, audit, defaultClinicLimits, defaultClinicModules, nowIso, parseJson, publicClinic, publicUser, slugifyClinic } from "../lib/database.js";
import {
  clearLoginFailures,
  clearSessionCookie,
  clientIp,
  decryptSecret,
  encryptSecret,
  hashPassword,
  isValidEmail,
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
import { generateBackupCodes, generateTotpSecret, otpauthUrl, verifyTotp } from "../lib/totp.js";
import { sendEmail } from "../lib/email.js";

// Short-lived challenges for the second factor: a verified password earns a
// challenge id, which must be exchanged for a real session by submitting a code.
const twoFactorChallenges = new Map();
const CHALLENGE_TTL_MS = 5 * 60 * 1000;
const CHALLENGE_MAX_ATTEMPTS = 6;
setInterval(() => {
  const now = Date.now();
  for (const [id, challenge] of twoFactorChallenges) {
    if (challenge.expiresAt < now) twoFactorChallenges.delete(id);
  }
}, 60_000).unref();

function createTwoFactorChallenge(userId) {
  const id = randomToken(24);
  twoFactorChallenges.set(id, { userId, expiresAt: Date.now() + CHALLENGE_TTL_MS, attempts: 0 });
  return id;
}

function consumeBackupCode(user, code) {
  const clean = String(code || "").trim().toLowerCase();
  if (!clean) return false;
  const hashes = parseJson(user.totp_backup_codes_json, []);
  const hash = tokenHash(clean);
  const index = hashes.indexOf(hash);
  if (index === -1) return false;
  hashes.splice(index, 1);
  db.prepare("update users set totp_backup_codes_json = ?, updated_at = ? where id = ?")
    .run(JSON.stringify(hashes), nowIso(), user.id);
  return true;
}

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

  // Second factor: if the account has 2FA on, stop here and require a code.
  if (row.totp_enabled) {
    const challengeId = createTwoFactorChallenge(row.id);
    audit({
      clinicId: row.clinic_id,
      userId: row.id,
      action: "login_challenge",
      entity: "session",
      metadata: { method: "totp" },
      ipAddress: clientIp(req)
    });
    sendJson(res, 200, { ok: true, twoFactorRequired: true, challengeId });
    return;
  }

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
  if (!isValidEmail(email)) {
    sendJson(res, 400, { error: "invalid_email" });
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

// ── Two-factor authentication (TOTP) ────────────────────────────────────────

// Step 2 of login: exchange a password-verified challenge + code for a session.
function verifyTwoFactor(req, res) {
  const challengeId = String(req.body?.challengeId || "");
  const code = String(req.body?.code || "");
  const challenge = twoFactorChallenges.get(challengeId);
  if (!challenge || challenge.expiresAt < Date.now()) {
    twoFactorChallenges.delete(challengeId);
    sendJson(res, 401, { error: "challenge_expired" });
    return;
  }
  challenge.attempts += 1;
  if (challenge.attempts > CHALLENGE_MAX_ATTEMPTS) {
    twoFactorChallenges.delete(challengeId);
    sendJson(res, 429, { error: "too_many_2fa_attempts" });
    return;
  }
  const user = db.prepare("select * from users where id = ?").get(challenge.userId);
  if (!user || user.active !== 1 || !user.totp_enabled) {
    twoFactorChallenges.delete(challengeId);
    sendJson(res, 401, { error: "invalid_challenge" });
    return;
  }
  let secret = "";
  try {
    secret = decryptSecret(user.totp_secret_cipher);
  } catch (error) {
    console.error("Unable to decrypt 2FA secret for user", user.id, error?.message || error);
  }
  const ok = (secret && verifyTotp(secret, code)) || consumeBackupCode(user, code);
  if (!ok) {
    sendJson(res, 401, { error: secret ? "invalid_2fa_code" : "invalid_2fa_setup" });
    return;
  }
  twoFactorChallenges.delete(challengeId);
  db.prepare("delete from sessions where user_id = ? and expires_at <= ?").run(user.id, nowIso());
  const session = createSession(req, res, user.id);
  const clinic = user.clinic_id ? db.prepare("select * from clinics where id = ?").get(user.clinic_id) : null;
  audit({
    clinicId: user.clinic_id,
    userId: user.id,
    action: "login",
    entity: "session",
    metadata: { method: "2fa" },
    ipAddress: clientIp(req)
  });
  sendJson(res, 200, { ok: true, user: publicUser(user), clinic: publicClinic(clinic), ...session });
}

// Begin enrollment: issue a fresh secret (kept pending until a code confirms it).
function setupTwoFactor(req, res) {
  const auth = requireSession(req, res, { csrf: true });
  if (!auth) return;
  const secret = generateTotpSecret();
  db.prepare("update users set totp_pending_cipher = ?, updated_at = ? where id = ?")
    .run(encryptSecret(secret), nowIso(), auth.user.id);
  sendJson(res, 200, {
    ok: true,
    secret,
    otpauthUrl: otpauthUrl(secret, auth.user.email || auth.user.name || "user")
  });
}

// Confirm enrollment with a code, turn 2FA on, and return one-time backup codes.
function enableTwoFactor(req, res) {
  const auth = requireSession(req, res, { csrf: true });
  if (!auth) return;
  const user = db.prepare("select * from users where id = ?").get(auth.user.id);
  const pending = decryptSecret(user?.totp_pending_cipher);
  if (!pending) {
    sendJson(res, 400, { error: "no_pending_2fa" });
    return;
  }
  if (!verifyTotp(pending, String(req.body?.code || ""))) {
    sendJson(res, 401, { error: "invalid_2fa_code" });
    return;
  }
  const backupCodes = generateBackupCodes(8);
  const hashes = backupCodes.map(code => tokenHash(code.toLowerCase()));
  db.prepare(`
    update users set totp_enabled = 1, totp_secret_cipher = ?, totp_pending_cipher = null,
      totp_backup_codes_json = ?, updated_at = ? where id = ?
  `).run(encryptSecret(pending), JSON.stringify(hashes), nowIso(), user.id);
  audit({
    clinicId: user.clinic_id,
    userId: user.id,
    action: "enable_2fa",
    entity: "user",
    entityId: user.id,
    ipAddress: clientIp(req)
  });
  sendJson(res, 200, { ok: true, backupCodes });
}

// Turn 2FA off — requires the current password plus a valid code (or backup code).
function disableTwoFactor(req, res) {
  const auth = requireSession(req, res, { csrf: true });
  if (!auth) return;
  const user = db.prepare("select * from users where id = ?").get(auth.user.id);
  if (!user?.totp_enabled) {
    sendJson(res, 400, { error: "2fa_not_enabled" });
    return;
  }
  if (!verifyPassword(String(req.body?.password || ""), user.password_hash)) {
    sendJson(res, 401, { error: "invalid_password" });
    return;
  }
  const secret = decryptSecret(user.totp_secret_cipher);
  const code = String(req.body?.code || "");
  if (!verifyTotp(secret, code) && !consumeBackupCode(user, code)) {
    sendJson(res, 401, { error: "invalid_2fa_code" });
    return;
  }
  db.prepare(`
    update users set totp_enabled = 0, totp_secret_cipher = null, totp_pending_cipher = null,
      totp_backup_codes_json = '[]', updated_at = ? where id = ?
  `).run(nowIso(), user.id);
  audit({
    clinicId: user.clinic_id,
    userId: user.id,
    action: "disable_2fa",
    entity: "user",
    entityId: user.id,
    ipAddress: clientIp(req)
  });
  sendJson(res, 200, { ok: true });
}

function forgotPassword(req, res) {
  const email = normalizeEmail(req.body?.email || "");
  if (!email) {
    sendJson(res, 400, { error: "email_required" });
    return;
  }
  const user = db.prepare("select id, email, clinic_id from users where email = ?").get(email);
  if (!user) {
    // Don't leak whether the email exists — say we sent it either way
    sendJson(res, 200, { ok: true, message: "Check your email if an account exists" });
    return;
  }
  const token = randomToken(32);
  const hash = tokenHash(token);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour
  db.prepare(`
    insert or replace into password_reset_tokens (token_hash, user_id, expires_at, created_at)
    values (?, ?, ?, ?)
  `).run(hash, user.id, expiresAt, nowIso());

  // Clean up expired tokens
  db.prepare("delete from password_reset_tokens where expires_at < ?").run(nowIso());

  const resetLink = `${process.env.RIAAYA_ORIGIN || "https://riaaya.onrender.com"}/reset-password?token=${token}`;
  const html = `
    <p>مرحباً،</p>
    <p>طلبت تغيير كلمة المرور الخاصة بك. اضغط الزر أدناه لإعادة تعيينها:</p>
    <p><a href="${resetLink}" style="display:inline-block;padding:12px 24px;background:#0a7c5c;color:white;text-decoration:none;border-radius:6px;">إعادة تعيين كلمة المرور</a></p>
    <p>الرابط صالح لمدة ساعة واحدة. إذا لم تطلب هذا، تجاهل هذا البريد.</p>
    <p>—<br/>فريق رعاية</p>
  `;

  sendEmail({
    to: user.email,
    subject: "إعادة تعيين كلمة المرور — رعاية",
    html
  }).catch(err => {
    console.error("[forgot-password] email send failed:", err.message);
  });

  sendJson(res, 200, { ok: true, message: "Check your email if an account exists" });
}

function resetPassword(req, res) {
  const token = String(req.body?.token || "").trim();
  const newPassword = String(req.body?.password || "");
  if (!token || !newPassword) {
    sendJson(res, 400, { error: "token_and_password_required" });
    return;
  }
  if (!validatePassword(newPassword)) {
    sendJson(res, 400, { error: "weak_password" });
    return;
  }
  const hash = tokenHash(token);
  const resetToken = db.prepare(`
    select user_id, expires_at from password_reset_tokens where token_hash = ?
  `).get(hash);
  if (!resetToken || new Date(resetToken.expires_at) < new Date()) {
    sendJson(res, 401, { error: "invalid_or_expired_token" });
    return;
  }
  const user = db.prepare("select id, clinic_id from users where id = ?").get(resetToken.user_id);
  if (!user) {
    sendJson(res, 404, { error: "user_not_found" });
    return;
  }

  db.prepare("update users set password_hash = ?, must_change_password = 0, updated_at = ? where id = ?")
    .run(hashPassword(newPassword), nowIso(), user.id);
  db.prepare("delete from password_reset_tokens where token_hash = ?").run(hash);
  db.prepare("delete from sessions where user_id = ?").run(user.id);

  audit({
    clinicId: user.clinic_id,
    userId: user.id,
    action: "reset_password",
    entity: "user",
    entityId: user.id,
    ipAddress: clientIp(req)
  });

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
  if (req.method === "POST" && url.pathname === "/api/auth/2fa/verify") {
    verifyTwoFactor(req, res);
    return;
  }
  if (req.method === "POST" && url.pathname === "/api/auth/2fa/setup") {
    setupTwoFactor(req, res);
    return;
  }
  if (req.method === "POST" && url.pathname === "/api/auth/2fa/enable") {
    enableTwoFactor(req, res);
    return;
  }
  if (req.method === "POST" && url.pathname === "/api/auth/2fa/disable") {
    disableTwoFactor(req, res);
    return;
  }
  if (req.method === "POST" && url.pathname === "/api/auth/change-password") {
    changePassword(req, res);
    return;
  }
  if (req.method === "POST" && url.pathname === "/api/auth/forgot-password") {
    forgotPassword(req, res);
    return;
  }
  if (req.method === "POST" && url.pathname === "/api/auth/reset-password") {
    resetPassword(req, res);
    return;
  }
  sendJson(res, 404, { error: "auth_route_not_found" });
}
