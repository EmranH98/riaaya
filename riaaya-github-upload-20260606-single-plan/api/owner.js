import {
  audit,
  CLINIC_MODULES,
  db,
  DEFAULT_LANDING_SETTINGS,
  defaultClinicLimits,
  defaultClinicModules,
  nowIso,
  parseJson,
  publicClinic,
  publicLandingSettings,
  setPlatformSetting
} from "../lib/database.js";
import { requireSession } from "./auth.js";
import { clientIp, hashPassword, safeText, temporaryPassword } from "../lib/security.js";

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(payload));
}

function clinicSummary(row) {
  return {
    ...publicClinic(row),
    userCount: Number(row.user_count || 0),
    operationCount: Number(row.operation_count || 0),
    bookingCount: Number(row.booking_count || 0),
    patientCount: Number(row.patient_count || 0)
  };
}

function cleanModules(input, plan, fallback) {
  const modules = Array.isArray(input)
    ? input.map(String).filter(module => CLINIC_MODULES.includes(module))
    : fallback;
  const unique = [...new Set(modules || [])];
  return unique.length ? unique : defaultClinicModules(plan);
}

function cleanLimits(input, plan, fallback) {
  const defaults = { ...defaultClinicLimits(plan), ...(fallback || {}) };
  const source = input && typeof input === "object" ? input : {};
  return {
    maxUsers: Math.max(1, Math.min(Number(source.maxUsers ?? defaults.maxUsers), 500)),
    maxPatients: Math.max(1, Math.min(Number(source.maxPatients ?? defaults.maxPatients), 1000000)),
    maxMonthlySms: Math.max(0, Math.min(Number(source.maxMonthlySms ?? defaults.maxMonthlySms), 500000)),
    maxBranches: Math.max(1, Math.min(Number(source.maxBranches ?? defaults.maxBranches), 500))
  };
}

function cleanBranding(input, fallback = {}) {
  const source = input && typeof input === "object" ? input : {};
  const accent = safeText(source.accentColor || fallback.accentColor || "", 20);
  return {
    accentColor: /^#[0-9a-f]{6}$/i.test(accent) ? accent : "",
    workspaceLabel: safeText(source.workspaceLabel || fallback.workspaceLabel || "", 80)
  };
}

function cleanText(value, fallback = "", max = 500) {
  const cleaned = safeText(value ?? fallback, max);
  return cleaned || fallback;
}

function cleanBoolean(value, fallback = false) {
  return value === true || value === "true" ? true : value === false || value === "false" ? false : fallback;
}

function cleanArray(value, fallback, mapper, limit = 12) {
  const source = Array.isArray(value) ? value : fallback;
  return source.slice(0, limit).map(mapper).filter(Boolean);
}

function cleanLandingSettings(input = {}) {
  const fallback = publicLandingSettings();
  const accent = cleanText(input.accentColor, fallback.accentColor, 20);
  return {
    ...DEFAULT_LANDING_SETTINGS,
    accentColor: /^#[0-9a-f]{6}$/i.test(accent) ? accent : fallback.accentColor,
    announcementVisible: cleanBoolean(input.announcementVisible, fallback.announcementVisible),
    announcement: cleanText(input.announcement, fallback.announcement, 220),
    navTrialLabel: cleanText(input.navTrialLabel, fallback.navTrialLabel, 80),
    navLoginLabel: cleanText(input.navLoginLabel, fallback.navLoginLabel, 80),
    heroBadge: cleanText(input.heroBadge, fallback.heroBadge, 160),
    heroLine1: cleanText(input.heroLine1, fallback.heroLine1, 120),
    heroLine2Prefix: cleanText(input.heroLine2Prefix, fallback.heroLine2Prefix, 120),
    heroAccent: cleanText(input.heroAccent, fallback.heroAccent, 80),
    heroLine3Prefix: cleanText(input.heroLine3Prefix, fallback.heroLine3Prefix, 120),
    heroGold: cleanText(input.heroGold, fallback.heroGold, 80),
    heroSubtitle: cleanText(input.heroSubtitle, fallback.heroSubtitle, 700),
    heroPrimaryCta: cleanText(input.heroPrimaryCta, fallback.heroPrimaryCta, 100),
    heroProof: cleanText(input.heroProof, fallback.heroProof, 180),
    stats: cleanArray(input.stats, fallback.stats, item => ({
      value: cleanText(item?.value, "", 40),
      label: cleanText(item?.label, "", 80)
    }), 4),
    featuresTag: cleanText(input.featuresTag, fallback.featuresTag, 80),
    featuresTitle: cleanText(input.featuresTitle, fallback.featuresTitle, 180),
    featuresDescription: cleanText(input.featuresDescription, fallback.featuresDescription, 600),
    features: cleanArray(input.features, fallback.features, item => ({
      icon: cleanText(item?.icon, "•", 8),
      title: cleanText(item?.title, "", 100),
      description: cleanText(item?.description, "", 400),
      highlight: cleanBoolean(item?.highlight, false)
    }), 9),
    modulesTitle: cleanText(input.modulesTitle, fallback.modulesTitle, 180),
    modules: cleanArray(input.modules, fallback.modules, item => ({
      emoji: cleanText(item?.emoji, "•", 8),
      name: cleanText(item?.name, "", 90),
      sub: cleanText(item?.sub, "", 120)
    }), 12),
    pricingVisible: cleanBoolean(input.pricingVisible, fallback.pricingVisible),
    pricingTitle: cleanText(input.pricingTitle, fallback.pricingTitle, 180),
    pricingDescription: cleanText(input.pricingDescription, fallback.pricingDescription, 600),
    plans: cleanArray(input.plans, fallback.plans, item => ({
      id: cleanText(item?.id, "professional", 40),
      name: cleanText(item?.name, "", 80),
      price: cleanText(item?.price, "", 40),
      currency: cleanText(item?.currency, "دينار", 40),
      period: cleanText(item?.period, "/شهرياً", 40),
      tagline: cleanText(item?.tagline, "", 220),
      cta: cleanText(item?.cta, "ابدأ", 80),
      featured: cleanBoolean(item?.featured, false),
      popular: cleanText(item?.popular, "", 80),
      features: cleanArray(item?.features, [], feature => cleanText(feature, "", 140), 10)
    }), 6),
    testimonialsVisible: cleanBoolean(input.testimonialsVisible, fallback.testimonialsVisible),
    testimonialsTitle: cleanText(input.testimonialsTitle, fallback.testimonialsTitle, 180),
    testimonials: cleanArray(input.testimonials, fallback.testimonials, item => ({
      initials: cleanText(item?.initials, "", 12),
      name: cleanText(item?.name, "", 80),
      role: cleanText(item?.role, "", 120),
      quote: cleanText(item?.quote, "", 420)
    }), 6),
    ctaTitle: cleanText(input.ctaTitle, fallback.ctaTitle, 160),
    ctaAccent: cleanText(input.ctaAccent, fallback.ctaAccent, 120),
    ctaSubtitle: cleanText(input.ctaSubtitle, fallback.ctaSubtitle, 280),
    registrationEnabled: cleanBoolean(input.registrationEnabled, fallback.registrationEnabled),
    formSubmitLabel: cleanText(input.formSubmitLabel, fallback.formSubmitLabel, 100),
    demoLinkLabel: cleanText(input.demoLinkLabel, fallback.demoLinkLabel, 100),
    footerText: cleanText(input.footerText, fallback.footerText, 500)
  };
}

function listClinics(req, res) {
  const auth = requireSession(req, res, { owner: true });
  if (!auth) return;
  const rows = db.prepare(`
    select clinics.*, count(users.id) as user_count
    from clinics
    left join users on users.clinic_id = clinics.id
    group by clinics.id
    order by clinics.created_at desc
  `).all();
  const clinics = rows.map(row => {
    const state = parseJson(row.state_json, {});
    return clinicSummary({
      ...row,
      operation_count: state.entries?.length || 0,
      booking_count: state.bookings?.length || 0,
      patient_count: state.patients?.length || 0
    });
  });
  const auditRows = db.prepare(`
    select audit_logs.*, users.name as user_name, clinics.name as clinic_name
    from audit_logs
    left join users on users.id = audit_logs.user_id
    left join clinics on clinics.id = audit_logs.clinic_id
    order by audit_logs.created_at desc
    limit 100
  `).all().map(row => ({
    id: row.id,
    clinicId: row.clinic_id || "",
    clinicName: row.clinic_name || "Platform",
    userName: row.user_name || "System",
    action: row.action,
    entity: row.entity,
    entityId: row.entity_id || "",
    metadata: parseJson(row.metadata_json, {}),
    createdAt: row.created_at
  }));
  sendJson(res, 200, { ok: true, clinics, auditLogs: auditRows });
}

function getLandingSettings(req, res) {
  const auth = requireSession(req, res, { owner: true });
  if (!auth) return;
  sendJson(res, 200, { ok: true, landing: publicLandingSettings() });
}

function updateLandingSettings(req, res) {
  const auth = requireSession(req, res, { owner: true, csrf: true });
  if (!auth) return;
  const landing = cleanLandingSettings(req.body?.landing || req.body || {});
  setPlatformSetting("landing", landing);
  audit({
    userId: auth.user.id,
    action: "update",
    entity: "platform_landing",
    entityId: "landing",
    metadata: { pricingVisible: landing.pricingVisible, registrationEnabled: landing.registrationEnabled },
    ipAddress: clientIp(req)
  });
  sendJson(res, 200, { ok: true, landing });
}

function updateClinic(req, res, clinicId) {
  const auth = requireSession(req, res, { owner: true, csrf: true });
  if (!auth) return;
  const existing = db.prepare("select * from clinics where id = ?").get(clinicId);
  if (!existing) {
    sendJson(res, 404, { error: "clinic_not_found" });
    return;
  }
  const allowedStatuses = new Set(["trial", "active", "suspended", "cancelled"]);
  const allowedSupport = new Set(["standard", "priority", "white_glove"]);
  const status = allowedStatuses.has(req.body?.status) ? req.body.status : existing.status;
  const plan = safeText(req.body?.plan || existing.plan, 40);
  const trialEndsAt = safeText(req.body?.trialEndsAt || existing.trial_ends_at, 40);
  const modules = cleanModules(req.body?.enabledModules, plan, parseJson(existing.enabled_modules_json, []));
  const limits = cleanLimits(req.body?.limits, plan, parseJson(existing.limits_json, {}));
  const branding = cleanBranding(req.body?.branding, parseJson(existing.branding_json, {}));
  const supportTier = allowedSupport.has(req.body?.supportTier) ? req.body.supportTier : existing.support_tier || "standard";
  const ownerNotes = safeText(req.body?.ownerNotes ?? existing.owner_notes, 2000);
  db.prepare(`
    update clinics set
      status = ?, plan = ?, trial_ends_at = ?,
      enabled_modules_json = ?, limits_json = ?, branding_json = ?,
      support_tier = ?, owner_notes = ?, updated_at = ?
    where id = ?
  `).run(
    status,
    plan,
    trialEndsAt || null,
    JSON.stringify(modules),
    JSON.stringify(limits),
    JSON.stringify(branding),
    supportTier,
    ownerNotes,
    nowIso(),
    clinicId
  );
  audit({
    userId: auth.user.id,
    action: "update",
    entity: "clinic",
    entityId: clinicId,
    metadata: { status, plan, trialEndsAt, modules, limits, supportTier },
    ipAddress: clientIp(req)
  });
  sendJson(res, 200, { ok: true, clinic: publicClinic(db.prepare("select * from clinics where id = ?").get(clinicId)) });
}

function resetClinicAdminPassword(req, res, clinicId) {
  const auth = requireSession(req, res, { owner: true, csrf: true });
  if (!auth) return;
  const admin = db.prepare(`
    select * from users
    where clinic_id = ? and role = 'admin' and active = 1
    order by created_at asc
    limit 1
  `).get(clinicId);
  if (!admin) {
    sendJson(res, 404, { error: "clinic_admin_not_found" });
    return;
  }
  const password = temporaryPassword();
  db.prepare("update users set password_hash = ?, must_change_password = 1, updated_at = ? where id = ?")
    .run(hashPassword(password), nowIso(), admin.id);
  db.prepare("delete from sessions where user_id = ?").run(admin.id);
  audit({
    userId: auth.user.id,
    clinicId,
    action: "reset_password",
    entity: "user",
    entityId: admin.id,
    metadata: { email: admin.email },
    ipAddress: clientIp(req)
  });
  sendJson(res, 200, { ok: true, email: admin.email, temporaryPassword: password });
}

export default async function ownerHandler(req, res, url) {
  if (url.pathname === "/api/owner/clinics" && req.method === "GET") return listClinics(req, res);
  if (url.pathname === "/api/owner/landing-settings" && req.method === "GET") return getLandingSettings(req, res);
  if (url.pathname === "/api/owner/landing-settings" && req.method === "PUT") return updateLandingSettings(req, res);
  const resetMatch = url.pathname.match(/^\/api\/owner\/clinics\/([^/]+)\/reset-admin-password$/);
  if (resetMatch && req.method === "POST") return resetClinicAdminPassword(req, res, resetMatch[1]);
  const match = url.pathname.match(/^\/api\/owner\/clinics\/([^/]+)$/);
  if (match && req.method === "PATCH") return updateClinic(req, res, match[1]);
  sendJson(res, 404, { error: "owner_route_not_found" });
}
