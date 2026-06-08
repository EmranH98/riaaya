import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import { hashPassword } from "./security.js";
import { assertRealDataStorageReady } from "./storage-policy.js";

const root = fileURLToPath(new URL("../", import.meta.url));
export const databasePath = process.env.RIAAYA_DB_PATH || join(root, "data", "riaaya.sqlite");

assertRealDataStorageReady({
  databasePath,
  backupPath: process.env.RIAAYA_BACKUP_DIR || ""
});

mkdirSync(dirname(databasePath), { recursive: true });

export const db = new DatabaseSync(databasePath);

db.exec(`
  pragma journal_mode = WAL;
  pragma foreign_keys = ON;
  pragma busy_timeout = 5000;

  create table if not exists clinics (
    id text primary key,
    name text not null,
    slug text not null unique,
    phone text,
    city text,
    plan text not null default 'professional',
    status text not null default 'trial' check (status in ('trial', 'active', 'suspended', 'cancelled')),
    trial_ends_at text,
    state_json text,
    state_version integer not null default 0,
    tax_number text,
    income_source_sequence text,
    enabled_modules_json text not null default '[]',
    limits_json text not null default '{}',
    branding_json text not null default '{}',
    support_tier text not null default 'standard',
    owner_notes text not null default '',
    created_at text not null,
    updated_at text not null
  );

  create table if not exists users (
    id text primary key,
    clinic_id text references clinics(id) on delete cascade,
    email text not null unique,
    password_hash text not null,
    name text not null,
    mobile text,
    tel_no text,
    role text not null check (role in ('platform_owner', 'admin', 'data_entry', 'doctor', 'specialist')),
    permissions_json text not null default '[]',
    staff_id text,
    own_entries_only integer not null default 0,
    can_view_sensitive integer not null default 0,
    calendar_scope text not null default 'all' check (calendar_scope in ('all', 'today', 'rolling', 'working_days', 'assigned')),
    calendar_days_back integer not null default 0,
    calendar_days_ahead integer not null default 365,
    working_days_json text not null default '[0,1,2,3,4,5,6]',
    active integer not null default 1,
    must_change_password integer not null default 0,
    created_at text not null,
    updated_at text not null
  );

  create table if not exists sessions (
    token_hash text primary key,
    user_id text not null references users(id) on delete cascade,
    csrf_token text not null,
    expires_at text not null,
    ip_address text,
    user_agent text,
    created_at text not null
  );

  create table if not exists audit_logs (
    id text primary key,
    clinic_id text references clinics(id) on delete cascade,
    user_id text references users(id) on delete set null,
    action text not null,
    entity text not null,
    entity_id text,
    metadata_json text not null default '{}',
    ip_address text,
    created_at text not null
  );

  create table if not exists clinic_integrations (
    clinic_id text not null references clinics(id) on delete cascade,
    provider text not null check (provider in ('whatsapp', 'sms', 'jofotara')),
    config_json text not null default '{}',
    secret_cipher text,
    updated_at text not null,
    primary key (clinic_id, provider)
  );

  create table if not exists platform_settings (
    key text primary key,
    value_json text not null default '{}',
    updated_at text not null
  );

  create index if not exists clinics_status_idx on clinics(status, trial_ends_at);
  create index if not exists users_clinic_idx on users(clinic_id, active);
  create index if not exists sessions_user_idx on sessions(user_id, expires_at);
  create index if not exists audit_clinic_created_idx on audit_logs(clinic_id, created_at desc);
`);

const userColumns = new Set(db.prepare("pragma table_info(users)").all().map(column => column.name));
if (!userColumns.has("mobile")) db.exec("alter table users add column mobile text");
if (!userColumns.has("tel_no")) db.exec("alter table users add column tel_no text");
const clinicColumns = new Set(db.prepare("pragma table_info(clinics)").all().map(column => column.name));
if (!clinicColumns.has("state_version")) db.exec("alter table clinics add column state_version integer not null default 0");
if (!clinicColumns.has("enabled_modules_json")) db.exec("alter table clinics add column enabled_modules_json text not null default '[]'");
if (!clinicColumns.has("limits_json")) db.exec("alter table clinics add column limits_json text not null default '{}'");
if (!clinicColumns.has("branding_json")) db.exec("alter table clinics add column branding_json text not null default '{}'");
if (!clinicColumns.has("support_tier")) db.exec("alter table clinics add column support_tier text not null default 'standard'");
if (!clinicColumns.has("owner_notes")) db.exec("alter table clinics add column owner_notes text not null default ''");

export function nowIso() {
  return new Date().toISOString();
}

export function parseJson(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

export const DEFAULT_LANDING_SETTINGS = {
  accentColor: "#0a7c5c",
  announcementVisible: true,
  announcement: "ابدأ تجربة رعاية مجاناً لمدة 14 يوم. بدون بطاقة بنكية.",
  navTrialLabel: "افتح النموذج",
  navLoginLabel: "تسجيل الدخول",
  heroBadge: "منصة SaaS لإدارة العيادات في الأردن",
  heroLine1: "مساحة واحدة",
  heroLine2Prefix: "ليوم عيادة",
  heroAccent: "أوضح",
  heroLine3Prefix: "وفريق",
  heroGold: "أهدأ",
  heroSubtitle: "رعاية يرتب العمليات اليومية، المدفوعات، النسب، والمطابقة في واجهة واحدة هادئة، حتى تعرف بالضبط ماذا حدث اليوم وماذا يحتاج متابعة.",
  heroPrimaryCta: "ابدأ تجربة مجانية",
  heroProof: "بدون بطاقة بنكية · إعداد سريع · مصمم باللغة العربية",
  stats: [
    { value: "14", label: "يوم تجربة مجانية" },
    { value: "5", label: "دقائق لإدخال اليوم" },
    { value: "أقل", label: "أوراق وحسابات يدوية" }
  ],
  featuresTag: "لماذا رعاية؟",
  featuresTitle: "كل ما تحتاجه لإغلاق يوم العيادة بثقة",
  featuresDescription: "بدلاً من الأوراق وملفات الإكسل المتفرقة، يعطيك رعاية صورة واضحة عن الإيرادات، الدفعات، النسب، والملاحظات التي تحتاج متابعة.",
  features: [
    { icon: "🔔", title: "مطابقة يومية واضحة", description: "قارن الكاش والفيزا والتحويلات مع العمليات المسجلة، واعرف الفرق مباشرة قبل إغلاق اليوم." },
    { icon: "📊", title: "نسب ورواتب بدون تعب", description: "حدد نسبة كل طبيب أو أخصائي مرة واحدة، واترك رعاية يحسب المستحقات من العمليات الفعلية." },
    { icon: "🤖", title: "تنبيهات تساعدك على القرار", description: "يركز رعاية على الأرقام غير المعتادة، الخصومات، ونقاط المتابعة حتى لا تضيع التفاصيل الصغيرة.", highlight: true },
    { icon: "📦", title: "متابعة المخزون بسهولة", description: "تابع المنتجات والمواد المستخدمة في العيادة، واحصل على تذكير مبكر قبل نفاد الأصناف المهمة." },
    { icon: "📱", title: "متابعة المرضى والعملاء", description: "احتفظ بسجل واضح للاستفسارات والمراجعات، وجهز رسائل متابعة تساعد الفريق على تحويل الاهتمام إلى موعد." },
    { icon: "🧾", title: "تقارير مالية مرتبة", description: "صدّر ملخصات شهرية وسنوية تساعد الإدارة والمحاسب على مراجعة الإيرادات والمصاريف بثقة." }
  ],
  modulesTitle: "وحدات عملية تكبر مع احتياج عيادتك",
  modules: [
    { emoji: "🗓️", name: "حجز المواعيد", sub: "للمرضى والموظفين" },
    { emoji: "📋", name: "الإدخال اليومي", sub: "يدوي أو عبر إكسل" },
    { emoji: "💰", name: "الرواتب والنسب", sub: "أطباء وأخصائيون" },
    { emoji: "✅", name: "المطابقة والتدقيق", sub: "مراجعة يومية" },
    { emoji: "📦", name: "إدارة المخزون", sub: "مع طلب الموردين" },
    { emoji: "👥", name: "إدارة العملاء", sub: "CRM متكامل" },
    { emoji: "📣", name: "الحملات التسويقية", sub: "واتساب وإعلانات" },
    { emoji: "📊", name: "التقارير المالية", sub: "ربح، ضرائب، تصدير" }
  ],
  pricingVisible: true,
  pricingTitle: "خطة واحدة واضحة الآن",
  pricingDescription: "حالياً نبدأ بخطة واحدة بسيطة بسعر 25 دينار شهرياً حتى يكون القرار سهل وواضح.",
  plans: [
    { id: "starter", name: "رعاية", price: "25", currency: "دينار", period: "/شهرياً", tagline: "خطة واحدة تشمل أدوات العيادة الأساسية للتجربة والإطلاق", cta: "ابدأ بهذه الخطة", featured: true, popular: "خطة الإطلاق", features: ["ملفات المرضى والزوار", "حجوزات وتقويم عملي", "تسجيل العمليات اليومية", "تقارير ومطابقة يومية", "مصروفات ومخزون أساسي", "صلاحيات المستخدمين"] }
  ],
  testimonialsVisible: true,
  testimonialsTitle: "ما الذي نريد أن يغيّره رعاية في يوم العيادة؟",
  testimonials: [
    { initials: "د.ن", name: "د. نور الحسن", role: "عيادة تجميل ليزر — عمّان", quote: "بدل ما نراجع أكثر من ملف آخر اليوم، صار عندنا ملخص واحد يوضح الإيرادات والنسب وأي فرق يحتاج مراجعة." },
    { initials: "م.س", name: "محمد سليمان", role: "مدير عيادة أسنان — الزرقاء", quote: "المطابقة اليومية هي أهم شيء بالنسبة لنا. نريد أن نعرف مباشرة إذا كان هناك فرق بين السجل والموجود فعلياً." },
    { initials: "ر.ع", name: "رانيا عبيدات", role: "مديرة عيادة تخسيس — إربد", quote: "الفكرة الأقوى أن النظام يتكلم بلغة العيادة: طبيب، أخصائي، خصم، كاش، فيزا، ونسبة واضحة لكل شخص." }
  ],
  ctaTitle: "خلّينا نرتب يوم العيادة معاً",
  ctaAccent: "ابدأ بتجربة مجانية",
  ctaSubtitle: "جرّب رعاية لمدة 14 يوم بدون رسوم وبدون بطاقة بنكية.",
  registrationEnabled: true,
  formSubmitLabel: "أنشئ حساب العيادة",
  demoLinkLabel: "شاهد النموذج التجريبي",
  footerText: "رعاية يساعد العيادات في الأردن على تنظيم العمليات اليومية، مراجعة الإيرادات، وحساب النسب من مكان واحد."
};

function mergeLandingSettings(value = {}) {
  const source = value && typeof value === "object" ? value : {};
  return { ...DEFAULT_LANDING_SETTINGS, ...source };
}

export function getPlatformSetting(key, fallback = {}) {
  const row = db.prepare("select value_json from platform_settings where key = ?").get(key);
  return parseJson(row?.value_json, fallback);
}

export function setPlatformSetting(key, value) {
  db.prepare(`
    insert into platform_settings (key, value_json, updated_at)
    values (?, ?, ?)
    on conflict(key) do update set value_json = excluded.value_json, updated_at = excluded.updated_at
  `).run(key, JSON.stringify(value || {}), nowIso());
}

export function publicLandingSettings() {
  return mergeLandingSettings(getPlatformSetting("landing", DEFAULT_LANDING_SETTINGS));
}

export function slugifyClinic(value) {
  const base = String(value || "clinic")
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 42) || "clinic";
  let slug = base;
  let suffix = 1;
  const exists = db.prepare("select 1 from clinics where slug = ?").get(slug);
  while (exists && db.prepare("select 1 from clinics where slug = ?").get(slug)) {
    suffix += 1;
    slug = `${base}-${suffix}`;
  }
  return slug;
}

export function audit({ clinicId = null, userId = null, action, entity, entityId = null, metadata = {}, ipAddress = "" }) {
  db.prepare(`
    insert into audit_logs (id, clinic_id, user_id, action, entity, entity_id, metadata_json, ip_address, created_at)
    values (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(randomUUID(), clinicId, userId, action, entity, entityId, JSON.stringify(metadata), ipAddress, nowIso());
}

export function publicUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    clinicId: row.clinic_id || "",
    email: row.email,
    name: row.name,
    mobile: row.mobile || "",
    telNo: row.tel_no || "",
    role: row.role,
    permissionFeatures: parseJson(row.permissions_json, []),
    staffId: row.staff_id || "",
    ownEntriesOnly: Boolean(row.own_entries_only),
    canViewSensitive: Boolean(row.can_view_sensitive),
    calendarScope: row.calendar_scope || "all",
    calendarDaysBack: Number(row.calendar_days_back || 0),
    calendarDaysAhead: Number(row.calendar_days_ahead || 0),
    workingDays: parseJson(row.working_days_json, [0, 1, 2, 3, 4, 5, 6]),
    active: Boolean(row.active),
    mustChangePassword: Boolean(row.must_change_password)
  };
}

export const CLINIC_MODULES = [
  "operations",
  "patients",
  "bookings",
  "staff",
  "services",
  "inventory",
  "expenses",
  "finance",
  "payroll",
  "reports",
  "communications",
  "receipts",
  "accounts",
  "imports"
];

const PLAN_DEFAULT_MODULES = {
  starter: ["operations", "patients", "bookings", "reports", "accounts"],
  professional: ["operations", "patients", "bookings", "staff", "services", "inventory", "expenses", "finance", "reports", "communications", "receipts", "accounts"],
  enterprise: CLINIC_MODULES
};

const PLAN_DEFAULT_LIMITS = {
  starter: { maxUsers: 5, maxPatients: 1000, maxMonthlySms: 0, maxBranches: 1 },
  professional: { maxUsers: 20, maxPatients: 10000, maxMonthlySms: 1500, maxBranches: 3 },
  enterprise: { maxUsers: 100, maxPatients: 100000, maxMonthlySms: 10000, maxBranches: 20 }
};

export function defaultClinicModules(plan = "professional") {
  return PLAN_DEFAULT_MODULES[plan] || PLAN_DEFAULT_MODULES.professional;
}

export function defaultClinicLimits(plan = "professional") {
  return PLAN_DEFAULT_LIMITS[plan] || PLAN_DEFAULT_LIMITS.professional;
}

export function publicClinic(row) {
  if (!row) return null;
  const modules = parseJson(row.enabled_modules_json, []);
  const limits = parseJson(row.limits_json, {});
  const branding = parseJson(row.branding_json, {});
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    phone: row.phone || "",
    city: row.city || "",
    plan: row.plan,
    status: row.status,
    trialEndsAt: row.trial_ends_at || "",
    taxNumber: row.tax_number || "",
    incomeSourceSequence: row.income_source_sequence || "",
    enabledModules: Array.isArray(modules) && modules.length ? modules : defaultClinicModules(row.plan),
    limits: { ...defaultClinicLimits(row.plan), ...(limits && typeof limits === "object" ? limits : {}) },
    branding: branding && typeof branding === "object" ? branding : {},
    supportTier: row.support_tier || "standard",
    ownerNotes: row.owner_notes || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function ensurePlatformOwner() {
  const existing = db.prepare("select id from users where role = 'platform_owner' limit 1").get();

  const isProduction = process.env.NODE_ENV === "production";
  const email = String(process.env.RIAAYA_OWNER_EMAIL || (isProduction ? "" : "owner@riaaya.local")).trim().toLowerCase();
  const password = String(process.env.RIAAYA_OWNER_PASSWORD || (isProduction ? "" : "RiaayaOwner!2026"));

  if (!email || !password) {
    throw new Error("RIAAYA_OWNER_EMAIL and RIAAYA_OWNER_PASSWORD are required in production.");
  }

  const timestamp = nowIso();
  if (existing) {
    if (process.env.RIAAYA_OWNER_SYNC === "true") {
      db.prepare(`
        update users
        set email = ?, password_hash = ?, updated_at = ?
        where id = ?
      `).run(email, hashPassword(password), timestamp, existing.id);
    }
    return;
  }

  db.prepare(`
    insert into users (
      id, clinic_id, email, password_hash, name, role, permissions_json,
      can_view_sensitive, calendar_scope, active, must_change_password, created_at, updated_at
    ) values (?, null, ?, ?, ?, 'platform_owner', '[]', 1, 'all', 1, ?, ?, ?)
  `).run(
    randomUUID(),
    email,
    hashPassword(password),
    "Riaaya Platform Owner",
    isProduction ? 0 : 1,
    timestamp,
    timestamp
  );

  if (!isProduction) {
    console.warn("Development owner login: owner@riaaya.local / RiaayaOwner!2026");
  }
}

ensurePlatformOwner();
