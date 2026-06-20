import { randomUUID } from "node:crypto";
import { readdirSync, statSync } from "node:fs";
import { basename, join } from "node:path";
import {
  audit,
  CLINIC_MODULES,
  databasePath,
  db,
  DEFAULT_LANDING_SETTINGS,
  defaultClinicLimits,
  defaultClinicModules,
  nowIso,
  parseJson,
  publicClinic,
  publicLandingSettings,
  setPlatformSetting,
  slugifyClinic
} from "../lib/database.js";
import { requireSession } from "./auth.js";
import { clientIp, hashPassword, isValidEmail, normalizeEmail, safeText, temporaryPassword, validatePassword } from "../lib/security.js";
import { storageReadiness } from "../lib/storage-policy.js";
import { offsiteBackupStatus, testOffsiteConnectivity } from "../lib/offsite-backup.js";

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

// ── Plan monthly prices (JD) used for ARR/MRR ────────────────────────────────
const PLAN_MONTHLY_PRICE = { starter: 25, professional: 45, enterprise: 90 };

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

  // MRR = sum of monthly price for all active/trial clinics
  const activeClinics = clinics.filter(c => c.status === "active" || c.status === "trial");
  const mrr = activeClinics.reduce((sum, c) => sum + (PLAN_MONTHLY_PRICE[c.plan] || 0), 0);

  sendJson(res, 200, { ok: true, clinics, auditLogs: auditRows, mrr, arr: mrr * 12 });
}

function backupStatus() {
  const backupPath = process.env.RIAAYA_BACKUP_DIR || "";
  const retentionDays = Number(process.env.RIAAYA_BACKUP_RETENTION || process.env.RIAAYA_BACKUP_RETENTION_DAYS || 30);
  if (!backupPath) {
    return {
      configured: false,
      path: "",
      count: 0,
      latestBackup: null,
      retentionDays,
      warning: "RIAAYA_BACKUP_DIR غير مضبوط. لا تستخدم بيانات مرضى حقيقية قبل تفعيل النسخ الاحتياطي."
    };
  }

  try {
    const backups = readdirSync(backupPath)
      .filter(name => name.endsWith(".sqlite") || name.endsWith(".db") || name.endsWith(".sqlite3"))
      .map(name => {
        const fullPath = join(backupPath, name);
        const stat = statSync(fullPath);
        return {
          name,
          path: fullPath,
          sizeBytes: stat.size,
          modifiedAt: stat.mtime.toISOString()
        };
      })
      .sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt));
    return {
      configured: true,
      path: backupPath,
      count: backups.length,
      latestBackup: backups[0] || null,
      retentionDays,
      warning: backups.length
        ? ""
        : "مسار النسخ الاحتياطي مضبوط، لكن لا توجد نسخ SQLite محفوظة بعد."
    };
  } catch (error) {
    return {
      configured: true,
      path: backupPath,
      count: 0,
      latestBackup: null,
      retentionDays,
      warning: `تعذر قراءة مسار النسخ الاحتياطي: ${error.message}`
    };
  }
}

async function testOffsiteBackup(req, res) {
  const auth = requireSession(req, res, { owner: true, csrf: true });
  if (!auth) return;
  const result = await testOffsiteConnectivity();
  audit({
    userId: auth.user.id,
    action: "test_offsite_backup",
    entity: "platform",
    entityId: "offsite",
    metadata: { ok: result.ok, configured: result.configured },
    ipAddress: clientIp(req)
  });
  sendJson(res, result.ok ? 200 : (result.configured ? 502 : 400), result);
}

function productionReadiness(req, res) {
  const auth = requireSession(req, res, { owner: true });
  if (!auth) return;
  const backup = backupStatus();
  const offsiteBackup = offsiteBackupStatus();
  const readiness = storageReadiness({
    databasePath,
    backupPath: process.env.RIAAYA_BACKUP_DIR || ""
  });
  const ownerRows = db.prepare("select * from users where role = 'platform_owner' order by created_at asc").all();
  const ownerTwoFactorCount = ownerRows.filter(row => Number(row.totp_enabled) === 1).length;
  const clinicRows = db.prepare("select status, state_json from clinics").all();
  const clinicCount = clinicRows.length;
  const realClinicCandidates = clinicRows.filter(row => ["active", "trial"].includes(row.status)).length;
  const exportedAt = new Date().toISOString();
  const checks = [
    {
      id: "production-mode",
      label: "وضع النشر Production",
      ok: readiness.deploymentMode === "production",
      detail: `الوضع الحالي: ${readiness.deploymentMode}`
    },
    {
      id: "durable-database",
      label: "قاعدة البيانات على تخزين دائم",
      ok: readiness.safeForRealData,
      detail: `المسار: ${databasePath} | النوع: ${readiness.databaseMode}`
    },
    {
      id: "backup-target",
      label: "مسار نسخ احتياطي قابل للاستخدام",
      ok: backup.configured && !backup.warning,
      detail: backup.latestBackup
        ? `آخر نسخة: ${basename(backup.latestBackup.name)} في ${backup.latestBackup.modifiedAt}`
        : backup.warning || "لا توجد نسخة حديثة بعد"
    },
    {
      id: "offsite-backup",
      label: "نسخة احتياطية خارج الخادم",
      ok: offsiteBackup.configured,
      detail: offsiteBackup.configured
        ? `مفعلة إلى ${offsiteBackup.bucket}/${offsiteBackup.prefix}`
        : offsiteBackup.warning
    },
    {
      id: "owner-2fa",
      label: "المصادقة الثنائية لحسابات المالك",
      ok: ownerRows.length > 0 && ownerTwoFactorCount === ownerRows.length,
      detail: `${ownerTwoFactorCount} من ${ownerRows.length} حساب مالك مفعّل عليه 2FA`
    },
    {
      id: "encryption-key",
      label: "مفتاح تشفير أسرار التكاملات",
      ok: String(process.env.RIAAYA_ENCRYPTION_KEY || "").length >= 32,
      detail: String(process.env.RIAAYA_ENCRYPTION_KEY || "").length >= 32
        ? "موجود بطول مناسب"
        : "غير مضبوط أو قصير"
    },
    {
      id: "allowed-origin",
      label: "حصر الأصل المسموح",
      ok: String(process.env.ALLOWED_ORIGIN || "").startsWith("https://"),
      detail: process.env.ALLOWED_ORIGIN || "غير مضبوط"
    }
  ];
  const readyForPilot = checks.every(check => check.ok);
  sendJson(res, 200, {
    ok: true,
    checkedAt: exportedAt,
    readyForPilot,
    storage: {
      deploymentMode: readiness.deploymentMode,
      databaseMode: readiness.databaseMode,
      backupMode: readiness.backupMode,
      provider: process.env.RIAAYA_STORAGE_PROVIDER || (readiness.managedDatabase ? "managed_cloud_database" : "server_sqlite"),
      databaseLocation: databasePath,
      safeForRealData: readiness.safeForRealData,
      demoOnly: readiness.demoOnly || readiness.deploymentMode === "preview"
    },
    backup,
    offsiteBackup,
    security: {
      ownerAccounts: ownerRows.length,
      ownerTwoFactorCount,
      nodeEnv: process.env.NODE_ENV || "",
      allowedOrigin: process.env.ALLOWED_ORIGIN || ""
    },
    counts: {
      clinics: clinicCount,
      activeOrTrialClinics: realClinicCandidates
    },
    checks,
    restoreChecklist: [
      "نزّل تصدير JSON كامل للعيادة قبل أي تعديل كبير.",
      "شغّل npm run backup أو تأكد من وجود نسخة SQLite حديثة.",
      "جرّب استرجاع النسخة على بيئة ثانية غير الإنتاج.",
      "قارن أعداد المرضى والعمليات والحجوزات والإيصالات بعد الاسترجاع.",
      "وثّق وقت الاختبار واسم الشخص الذي نفذه قبل إدخال بيانات حقيقية."
    ]
  });
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

function createClinic(req, res) {
  const auth = requireSession(req, res, { owner: true, csrf: true });
  if (!auth) return;

  const clinicName = safeText(req.body?.clinicName, 120);
  const city = safeText(req.body?.city || "", 80);
  const phone = safeText(req.body?.phone || "", 40);
  const plan = ["starter", "professional", "enterprise"].includes(req.body?.plan) ? req.body.plan : "professional";
  const adminName = safeText(req.body?.adminName, 120);
  const adminEmail = normalizeEmail(req.body?.adminEmail);
  const adminPassword = String(req.body?.adminPassword || "");

  if (!clinicName || !adminName || !adminEmail) {
    sendJson(res, 400, { error: "missing_fields" });
    return;
  }
  if (!isValidEmail(adminEmail)) {
    sendJson(res, 400, { error: "invalid_email" });
    return;
  }
  if (!validatePassword(adminPassword)) {
    sendJson(res, 400, { error: "weak_password" });
    return;
  }
  if (db.prepare("select 1 from users where email = ?").get(adminEmail)) {
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
        owner_notes, created_at, updated_at
      ) values (?, ?, ?, ?, ?, ?, 'trial', ?, ?, ?, '{}', 'standard', '', ?, ?)
    `).run(
      clinicId, clinicName, slugifyClinic(clinicName), phone, city, plan,
      trialEndsAt,
      JSON.stringify(defaultClinicModules(plan)),
      JSON.stringify(defaultClinicLimits(plan)),
      createdAt, createdAt
    );
    db.prepare(`
      insert into users (
        id, clinic_id, email, password_hash, name, role, permissions_json,
        own_entries_only, can_view_sensitive, calendar_scope, calendar_days_back,
        calendar_days_ahead, working_days_json, active, must_change_password, created_at, updated_at
      ) values (?, ?, ?, ?, ?, 'admin', '[]', 0, 1, 'all', 3650, 3650, '[0,1,2,3,4,5,6]', 1, 0, ?, ?)
    `).run(userId, clinicId, adminEmail, hashPassword(adminPassword), adminName, createdAt, createdAt);
    db.exec("commit");
  } catch (error) {
    db.exec("rollback");
    throw error;
  }

  audit({
    userId: auth.user.id,
    clinicId,
    action: "create",
    entity: "clinic",
    entityId: clinicId,
    metadata: { plan, adminEmail },
    ipAddress: clientIp(req)
  });
  sendJson(res, 201, {
    ok: true,
    clinic: publicClinic(db.prepare("select * from clinics where id = ?").get(clinicId))
  });
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
  const trialEndsAt = safeText(req.body?.trialEndsAt || existing.trial_ends_at || "", 40);
  const accountDeadline = safeText(req.body?.accountDeadline || "", 40);
  const modules = cleanModules(req.body?.enabledModules, plan, parseJson(existing.enabled_modules_json, []));
  const limits = cleanLimits(req.body?.limits, plan, parseJson(existing.limits_json, {}));
  const branding = cleanBranding(req.body?.branding, parseJson(existing.branding_json, {}));
  const supportTier = allowedSupport.has(req.body?.supportTier) ? req.body.supportTier : existing.support_tier || "standard";
  const ownerNotes = safeText(req.body?.ownerNotes ?? existing.owner_notes, 2000);
  // Owner-controlled per-clinic 2FA requirement (only changes when explicitly sent).
  const require2fa = req.body?.require2fa === undefined
    ? Number(existing.require_2fa || 0)
    : (req.body.require2fa === true || req.body.require2fa === "true" ? 1 : 0);
  // Validate deadline format (YYYY-MM-DD or empty)
  const cleanDeadline = /^\d{4}-\d{2}-\d{2}$/.test(accountDeadline) ? accountDeadline : (existing.account_deadline || null);
  db.prepare(`
    update clinics set
      status = ?, plan = ?, trial_ends_at = ?,
      enabled_modules_json = ?, limits_json = ?, branding_json = ?,
      support_tier = ?, owner_notes = ?, account_deadline = ?, require_2fa = ?, updated_at = ?
    where id = ?
  `).run(
    status, plan, trialEndsAt || null,
    JSON.stringify(modules), JSON.stringify(limits), JSON.stringify(branding),
    supportTier, ownerNotes, cleanDeadline, require2fa, nowIso(), clinicId
  );
  audit({
    userId: auth.user.id,
    action: "update",
    entity: "clinic",
    entityId: clinicId,
    metadata: { status, plan, trialEndsAt, modules, limits, supportTier, accountDeadline: cleanDeadline, require2fa },
    ipAddress: clientIp(req)
  });
  sendJson(res, 200, { ok: true, clinic: publicClinic(db.prepare("select * from clinics where id = ?").get(clinicId)) });
}

function deleteClinic(req, res, clinicId) {
  const auth = requireSession(req, res, { owner: true, csrf: true });
  if (!auth) return;
  const existing = db.prepare("select * from clinics where id = ?").get(clinicId);
  if (!existing) {
    sendJson(res, 404, { error: "clinic_not_found" });
    return;
  }
  audit({
    userId: auth.user.id,
    action: "delete",
    entity: "clinic",
    entityId: clinicId,
    metadata: { name: existing.name, slug: existing.slug },
    ipAddress: clientIp(req)
  });
  db.prepare("delete from clinics where id = ?").run(clinicId);
  sendJson(res, 200, { ok: true });
}

function exportClinicData(req, res, clinicId) {
  const auth = requireSession(req, res, { owner: true });
  if (!auth) return;
  const clinic = db.prepare("select * from clinics where id = ?").get(clinicId);
  if (!clinic) {
    sendJson(res, 404, { error: "clinic_not_found" });
    return;
  }
  const users = db.prepare("select id, email, name, role, active, created_at from users where clinic_id = ?").all(clinicId);
  const state = parseJson(clinic.state_json, {});
  const payload = {
    exportedAt: nowIso(),
    clinic: publicClinic(clinic),
    users,
    state
  };
  const filename = `riaaya-export-${clinic.slug}-${nowIso().slice(0, 10)}.json`;
  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(payload, null, 2));
}

function getClinicUsers(req, res, clinicId) {
  const auth = requireSession(req, res, { owner: true });
  if (!auth) return;
  const clinic = db.prepare("select id from clinics where id = ?").get(clinicId);
  if (!clinic) {
    sendJson(res, 404, { error: "clinic_not_found" });
    return;
  }
  const users = db.prepare(`
    select id, email, name, role, active, totp_enabled, created_at, updated_at
    from users where clinic_id = ? order by role asc, name asc
  `).all(clinicId).map(user => ({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    active: Boolean(user.active),
    twoFactorEnabled: Boolean(user.totp_enabled),
    createdAt: user.created_at,
    updatedAt: user.updated_at
  }));
  sendJson(res, 200, { ok: true, users });
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

function resetUserPassword(req, res, clinicId) {
  const auth = requireSession(req, res, { owner: true, csrf: true });
  if (!auth) return;
  const userId = safeText(req.body?.userId || "", 40);
  const user = db.prepare("select * from users where id = ? and clinic_id = ? and active = 1").get(userId, clinicId);
  if (!user) {
    sendJson(res, 404, { error: "user_not_found" });
    return;
  }
  const password = temporaryPassword();
  db.prepare("update users set password_hash = ?, must_change_password = 1, updated_at = ? where id = ?")
    .run(hashPassword(password), nowIso(), user.id);
  db.prepare("delete from sessions where user_id = ?").run(user.id);
  audit({
    userId: auth.user.id,
    clinicId,
    action: "reset_password",
    entity: "user",
    entityId: user.id,
    metadata: { email: user.email, role: user.role },
    ipAddress: clientIp(req)
  });
  sendJson(res, 200, { ok: true, email: user.email, name: user.name, temporaryPassword: password });
}

function disableUserTwoFactor(req, res, clinicId) {
  const auth = requireSession(req, res, { owner: true, csrf: true });
  if (!auth) return;
  const userId = safeText(req.body?.userId || "", 40);
  const user = db.prepare("select * from users where id = ? and clinic_id = ?").get(userId, clinicId);
  if (!user) {
    sendJson(res, 404, { error: "user_not_found" });
    return;
  }

  db.prepare(`
    update users
    set totp_enabled = 0,
        totp_secret_cipher = null,
        totp_pending_cipher = null,
        totp_backup_codes_json = '[]',
        updated_at = ?
    where id = ?
  `).run(nowIso(), user.id);
  db.prepare("delete from sessions where user_id = ?").run(user.id);

  audit({
    userId: auth.user.id,
    clinicId,
    action: "disable_2fa",
    entity: "user",
    entityId: user.id,
    metadata: { email: user.email, role: user.role, by: "platform_owner" },
    ipAddress: clientIp(req)
  });
  sendJson(res, 200, { ok: true, email: user.email, name: user.name, wasEnabled: Boolean(user.totp_enabled) });
}

function sendClinicNotification(req, res, clinicId) {
  const auth = requireSession(req, res, { owner: true, csrf: true });
  if (!auth) return;
  const clinic = db.prepare("select id from clinics where id = ?").get(clinicId);
  if (!clinic) {
    sendJson(res, 404, { error: "clinic_not_found" });
    return;
  }
  const title = safeText(req.body?.title || "", 200);
  const body = safeText(req.body?.body || "", 500);
  const severity = ["info", "warning", "danger"].includes(req.body?.severity) ? req.body.severity : "info";
  const viewTarget = safeText(req.body?.viewTarget || "dashboard", 40);
  const expiresAt = req.body?.expiresAt ? safeText(req.body.expiresAt, 40) : null;

  if (!title || !body) {
    sendJson(res, 400, { error: "missing_notification_fields" });
    return;
  }

  const notifId = randomUUID();
  db.prepare(`
    insert into clinic_notifications (id, clinic_id, title, body, severity, view_target, expires_at, created_at)
    values (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(notifId, clinicId, title, body, severity, viewTarget, expiresAt, nowIso());

  audit({
    userId: auth.user.id,
    clinicId,
    action: "notify",
    entity: "clinic_notification",
    entityId: notifId,
    metadata: { title, severity },
    ipAddress: clientIp(req)
  });
  sendJson(res, 201, { ok: true, id: notifId });
}

function overrideClinicSettings(req, res, clinicId) {
  const auth = requireSession(req, res, { owner: true, csrf: true });
  if (!auth) return;
  const clinic = db.prepare("select * from clinics where id = ?").get(clinicId);
  if (!clinic) {
    sendJson(res, 404, { error: "clinic_not_found" });
    return;
  }
  const state = parseJson(clinic.state_json, {});
  if (!state.settings) state.settings = {};

  // Allow overriding: activeDate, language
  if (req.body?.activeDate && /^\d{4}-\d{2}-\d{2}$/.test(req.body.activeDate)) {
    state.settings.activeDate = req.body.activeDate;
  }
  if (req.body?.language && ["ar", "en"].includes(req.body.language)) {
    state.settings.language = req.body.language;
  }
  if (req.body?.clinicName) {
    state.settings.clinicName = safeText(req.body.clinicName, 120);
  }

  const newVersion = (Number(clinic.state_version) || 0) + 1;
  db.prepare("update clinics set state_json = ?, state_version = ?, updated_at = ? where id = ?")
    .run(JSON.stringify(state), newVersion, nowIso(), clinicId);

  audit({
    userId: auth.user.id,
    clinicId,
    action: "override_settings",
    entity: "clinic",
    entityId: clinicId,
    metadata: req.body,
    ipAddress: clientIp(req)
  });
  sendJson(res, 200, { ok: true });
}

export default async function ownerHandler(req, res, url) {
  if (url.pathname === "/api/owner/clinics" && req.method === "GET") return listClinics(req, res);
  if (url.pathname === "/api/owner/readiness" && req.method === "GET") return productionReadiness(req, res);
  if (url.pathname === "/api/owner/offsite-backup-test" && req.method === "POST") return testOffsiteBackup(req, res);
  if (url.pathname === "/api/owner/clinics" && req.method === "POST") return createClinic(req, res);
  if (url.pathname === "/api/owner/landing-settings" && req.method === "GET") return getLandingSettings(req, res);
  if (url.pathname === "/api/owner/landing-settings" && req.method === "PUT") return updateLandingSettings(req, res);

  const clinicMatch = url.pathname.match(/^\/api\/owner\/clinics\/([^/]+)$/);
  if (clinicMatch) {
    const clinicId = clinicMatch[1];
    if (req.method === "PATCH") return updateClinic(req, res, clinicId);
    if (req.method === "DELETE") return deleteClinic(req, res, clinicId);
  }

  const exportMatch = url.pathname.match(/^\/api\/owner\/clinics\/([^/]+)\/export$/);
  if (exportMatch && req.method === "GET") return exportClinicData(req, res, exportMatch[1]);

  const usersMatch = url.pathname.match(/^\/api\/owner\/clinics\/([^/]+)\/users$/);
  if (usersMatch && req.method === "GET") return getClinicUsers(req, res, usersMatch[1]);

  const resetAdminMatch = url.pathname.match(/^\/api\/owner\/clinics\/([^/]+)\/reset-admin-password$/);
  if (resetAdminMatch && req.method === "POST") return resetClinicAdminPassword(req, res, resetAdminMatch[1]);

  const resetUserMatch = url.pathname.match(/^\/api\/owner\/clinics\/([^/]+)\/reset-user-password$/);
  if (resetUserMatch && req.method === "POST") return resetUserPassword(req, res, resetUserMatch[1]);

  const disableUser2faMatch = url.pathname.match(/^\/api\/owner\/clinics\/([^/]+)\/disable-user-2fa$/);
  if (disableUser2faMatch && req.method === "POST") return disableUserTwoFactor(req, res, disableUser2faMatch[1]);

  const notifyMatch = url.pathname.match(/^\/api\/owner\/clinics\/([^/]+)\/notify$/);
  if (notifyMatch && req.method === "POST") return sendClinicNotification(req, res, notifyMatch[1]);

  const settingsMatch = url.pathname.match(/^\/api\/owner\/clinics\/([^/]+)\/override-settings$/);
  if (settingsMatch && req.method === "PATCH") return overrideClinicSettings(req, res, settingsMatch[1]);

  sendJson(res, 404, { error: "owner_route_not_found" });
}
