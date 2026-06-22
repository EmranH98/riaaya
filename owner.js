let ownerSession = null;
let clinics = [];
let auditLogs = [];
let landingSettings = null;
let readinessStatus = null;

const clinicList = document.querySelector("[data-clinic-list]");
const auditList = document.querySelector("[data-audit-list]");
const searchInput = document.querySelector("[data-owner-search]");
const statusFilter = document.querySelector("[data-owner-status-filter]");
const landingForm = document.querySelector("[data-landing-settings-form]");
const landingStatus = document.querySelector("[data-landing-settings-status]");
const readinessBadge = document.querySelector("[data-readiness-badge]");
const readinessStorageMode = document.querySelector("[data-readiness-storage-mode]");
const readinessStorageDetail = document.querySelector("[data-readiness-storage-detail]");
const readinessBackupTitle = document.querySelector("[data-readiness-backup-title]");
const readinessBackupDetail = document.querySelector("[data-readiness-backup-detail]");
const readinessSecurityTitle = document.querySelector("[data-readiness-security-title]");
const readinessSecurityDetail = document.querySelector("[data-readiness-security-detail]");
const readinessChecks = document.querySelector("[data-readiness-checks]");
const readinessRestore = document.querySelector("[data-readiness-restore]");

// Modals
const notifyDialog = document.querySelector("[data-notify-dialog]");
const notifyForm = document.querySelector("[data-notify-form]");
const notifyStatus = document.querySelector("[data-notify-status]");
const resetUserDialog = document.querySelector("[data-reset-user-dialog]");
const resetUserForm = document.querySelector("[data-reset-user-form]");
const resetUserStatus = document.querySelector("[data-reset-user-status]");
const disableUser2faDialog = document.querySelector("[data-disable-user-2fa-dialog]");
const disableUser2faForm = document.querySelector("[data-disable-user-2fa-form]");
const disableUser2faStatus = document.querySelector("[data-disable-user-2fa-status]");
const overrideSettingsDialog = document.querySelector("[data-override-settings-dialog]");
const overrideSettingsForm = document.querySelector("[data-override-settings-form]");
const overrideSettingsStatus = document.querySelector("[data-override-settings-status]");

const CLINIC_MODULES = [
  ["operations", "العمليات"],
  ["patients", "ملفات المرضى والزوار"],
  ["bookings", "الحجوزات"],
  ["staff", "الموظفون"],
  ["services", "الخدمات والقواعد"],
  ["inventory", "المخزون"],
  ["expenses", "المصروفات"],
  ["finance", "الإغلاق المالي"],
  ["payroll", "الرواتب"],
  ["reports", "التقارير"],
  ["communications", "التواصل"],
  ["receipts", "الفواتير والضريبة"],
  ["accounts", "الحسابات والصلاحيات"],
  ["imports", "استيراد البيانات"]
];

const DEFAULT_LIMITS = {
  starter: { maxUsers: 5, maxPatients: 1000, maxMonthlySms: 0, maxBranches: 1 },
  professional: { maxUsers: 20, maxPatients: 10000, maxMonthlySms: 1500, maxBranches: 3 },
  enterprise: { maxUsers: 100, maxPatients: 100000, maxMonthlySms: 10000, maxBranches: 20 }
};

function statusLabel(status) {
  return { trial: "تجربة", active: "فعالة", suspended: "موقوفة", cancelled: "ملغاة" }[status] || status;
}

function planLabel(plan) {
  return { starter: "البداية", professional: "الاحترافية", enterprise: "المؤسسات" }[plan] || plan;
}

function supportLabel(tier) {
  return { standard: "دعم عادي", priority: "أولوية", white_glove: "إعداد كامل" }[tier] || tier;
}

function twoFactorLabel(enabled) {
  return enabled ? "2FA مفعّلة" : "2FA غير مفعّلة";
}

function userOptionLabel(user, includeTwoFactor = false) {
  const base = `${user.name || user.email} — ${user.email} (${user.role})`;
  return includeTwoFactor ? `${base} — ${twoFactorLabel(user.twoFactorEnabled)}` : base;
}

function renderKpis(mrr = 0, arr = 0) {
  document.querySelector("[data-owner-kpi='all']").textContent = clinics.length;
  ["trial", "active", "suspended"].forEach(status => {
    document.querySelector(`[data-owner-kpi='${status}']`).textContent = clinics.filter(c => c.status === status).length;
  });
  document.querySelector("[data-owner-kpi='mrr']").textContent = `${mrr.toLocaleString("ar-JO")} د.أ`;
  document.querySelector("[data-owner-kpi='arr']").textContent = `${arr.toLocaleString("ar-JO")} د.أ`;
}

function filteredClinics() {
  const query = searchInput.value.trim().toLowerCase();
  const status = statusFilter.value;
  return clinics.filter(clinic => {
    const matchesStatus = !status || clinic.status === status;
    const matchesQuery = !query || [clinic.name, clinic.city, clinic.plan, clinic.phone, clinic.slug, clinic.supportTier, clinic.ownerNotes]
      .join(" ").toLowerCase().includes(query);
    return matchesStatus && matchesQuery;
  });
}

function renderClinics() {
  const rows = filteredClinics();
  clinicList.innerHTML = rows.length ? rows.map(clinic => `
    <div class="clinic-row" data-clinic-row="${clinic.id}">
      <div class="clinic-identity">
        <strong>${clinic.name}</strong>
        <span>${clinic.city || "-"} | ${clinic.phone || "-"}</span>
        <small>${clinic.slug}</small>
        <span class="status-pill ${clinic.status}">${statusLabel(clinic.status)}</span>
        <span class="status-pill">${planLabel(clinic.plan)} | ${supportLabel(clinic.supportTier || "standard")}</span>
      </div>
      <div class="clinic-metric"><small>المستخدمون</small><strong>${clinic.userCount}</strong></div>
      <div class="clinic-metric"><small>المرضى</small><strong>${clinic.patientCount}</strong></div>
      <div class="clinic-metric"><small>الحجوزات</small><strong>${clinic.bookingCount}</strong></div>
      <div class="clinic-metric"><small>العمليات</small><strong>${clinic.operationCount}</strong></div>
      <div class="clinic-controls">
        <select data-clinic-plan aria-label="الخطة">
          <option value="starter" ${clinic.plan === "starter" ? "selected" : ""}>البداية</option>
          <option value="professional" ${clinic.plan === "professional" ? "selected" : ""}>الاحترافية</option>
          <option value="enterprise" ${clinic.plan === "enterprise" ? "selected" : ""}>المؤسسات</option>
        </select>
        <select data-clinic-status aria-label="الحالة">
          <option value="trial" ${clinic.status === "trial" ? "selected" : ""}>تجربة</option>
          <option value="active" ${clinic.status === "active" ? "selected" : ""}>فعالة</option>
          <option value="suspended" ${clinic.status === "suspended" ? "selected" : ""}>موقوفة</option>
          <option value="cancelled" ${clinic.status === "cancelled" ? "selected" : ""}>ملغاة</option>
        </select>
        <label class="inline-label">انتهاء التجربة<input data-clinic-trial type="date" value="${clinic.trialEndsAt ? clinic.trialEndsAt.slice(0, 10) : ""}" aria-label="نهاية التجربة"></label>
        <label class="inline-label deadline-label">
          تاريخ إغلاق الحساب
          <input data-clinic-deadline type="date" value="${clinic.accountDeadline || ""}" aria-label="تاريخ إغلاق الحساب">
          <small>عند هذا التاريخ يُوقف الحساب تلقائياً وتظهر تنبيهات للعيادة</small>
        </label>
        <select data-clinic-support aria-label="مستوى الدعم">
          <option value="standard" ${(clinic.supportTier || "standard") === "standard" ? "selected" : ""}>دعم عادي</option>
          <option value="priority" ${clinic.supportTier === "priority" ? "selected" : ""}>أولوية</option>
          <option value="white_glove" ${clinic.supportTier === "white_glove" ? "selected" : ""}>إعداد كامل</option>
        </select>
        <button type="button" data-save-clinic="${clinic.id}">حفظ التغييرات</button>
        <button class="secondary-control" type="button" data-reset-clinic-password="${clinic.id}">كلمة مرور مؤقتة للمدير</button>
        <button class="secondary-control" type="button" data-reset-user-password="${clinic.id}">إعادة كلمة مرور موظف</button>
        <button class="secondary-control" type="button" data-disable-user-twofa="${clinic.id}">إيقاف 2FA لمستخدم</button>
        <button class="secondary-control" type="button" data-send-notify="${clinic.id}">إرسال إشعار</button>
        <button class="secondary-control" type="button" data-override-settings="${clinic.id}">تعديل إعدادات التطبيق</button>
        <a class="secondary-control" href="/api/owner/clinics/${clinic.id}/export" target="_blank" rel="noreferrer">تصدير البيانات</a>
        <button class="danger-control" type="button" data-delete-clinic="${clinic.id}">حذف العيادة</button>
      </div>
      <details class="clinic-customizer">
        <summary>تخصيص الخدمة والصلاحيات التجارية</summary>
        <div class="customizer-grid">
          <section>
            <h3>الموديولات المفعلة</h3>
            <div class="module-grid">
              ${CLINIC_MODULES.map(([module, label]) => `
                <label class="module-toggle">
                  <input type="checkbox" data-clinic-module="${module}" ${(clinic.enabledModules || []).includes(module) ? "checked" : ""}>
                  <span>${label}</span>
                </label>
              `).join("")}
            </div>
          </section>
          <section>
            <h3>الحدود التجارية</h3>
            <div class="limit-grid">
              <label>المستخدمون<input data-clinic-limit="maxUsers" type="number" min="1" value="${clinic.limits?.maxUsers ?? DEFAULT_LIMITS[clinic.plan]?.maxUsers ?? 20}"></label>
              <label>المرضى<input data-clinic-limit="maxPatients" type="number" min="1" value="${clinic.limits?.maxPatients ?? DEFAULT_LIMITS[clinic.plan]?.maxPatients ?? 10000}"></label>
              <label>SMS / شهر<input data-clinic-limit="maxMonthlySms" type="number" min="0" value="${clinic.limits?.maxMonthlySms ?? DEFAULT_LIMITS[clinic.plan]?.maxMonthlySms ?? 1500}"></label>
              <label>الفروع<input data-clinic-limit="maxBranches" type="number" min="1" value="${clinic.limits?.maxBranches ?? DEFAULT_LIMITS[clinic.plan]?.maxBranches ?? 3}"></label>
            </div>
          </section>
          <section>
            <h3>الأمان</h3>
            <label class="require-2fa-toggle">
              <input type="checkbox" data-clinic-require-2fa ${clinic.require2fa ? "checked" : ""}>
              <span>
                <strong>إلزام المصادقة الثنائية (2FA)</strong>
                <small>عند التفعيل، يجب على كل مستخدم في هذه العيادة تفعيل المصادقة الثنائية قبل استخدام النظام.</small>
              </span>
            </label>
          </section>
          <section>
            <h3>الهوية والملاحظات</h3>
            <div class="branding-grid">
              <label>لون العيادة<input data-clinic-branding="accentColor" type="color" value="${clinic.branding?.accentColor || "#0a7c5c"}"></label>
              <label>اسم المساحة<input data-clinic-branding="workspaceLabel" type="text" value="${clinic.branding?.workspaceLabel || ""}" placeholder="مثلاً: مساحة VIP"></label>
              <label class="wide-field">ملاحظات داخلية<textarea data-clinic-owner-notes rows="4" placeholder="تسعير خاص، احتياج تدريب، ملاحظات المبيعات...">${clinic.ownerNotes || ""}</textarea></label>
            </div>
          </section>
        </div>
      </details>
    </div>
  `).join("") : `<div class="empty">لا توجد عيادات مطابقة.</div>`;
}

function renderAudit() {
  auditList.innerHTML = auditLogs.length ? auditLogs.slice(0, 50).map(log => `
    <div class="audit-row">
      <strong>${log.clinicName}</strong>
      <span>${log.userName}: ${log.action} ${log.entity}</span>
      <time>${new Date(log.createdAt).toLocaleString("ar-JO")}</time>
    </div>
  `).join("") : `<div class="empty">لا يوجد نشاط بعد.</div>`;
}

function formatDateTime(value) {
  return value ? new Date(value).toLocaleString("ar-JO") : "غير متوفر";
}

function renderReadiness() {
  if (!readinessBadge) return;
  if (!readinessStatus) {
    readinessBadge.className = "status-pill trial";
    readinessBadge.textContent = "بانتظار الفحص";
    return;
  }
  const storage = readinessStatus.storage || {};
  const backup = readinessStatus.backup || {};
  const security = readinessStatus.security || {};
  readinessBadge.className = `status-pill ${readinessStatus.readyForPilot ? "active" : "suspended"}`;
  readinessBadge.textContent = readinessStatus.readyForPilot ? "جاهز لتجربة حقيقية" : "غير جاهز للبيانات الحقيقية";
  readinessStorageMode.textContent = storage.safeForRealData
    ? "Safe real clinic"
    : storage.deploymentMode === "preview"
      ? "Preview only"
      : "Needs review";
  readinessStorageDetail.textContent = `النشر: ${storage.deploymentMode || "غير محدد"} | التخزين: ${storage.databaseMode || "غير معروف"} | قاعدة البيانات: ${storage.databaseLocation || "غير محدد"}`;
  readinessBackupTitle.textContent = backup.latestBackup
    ? `${backup.count} نسخة | آخر نسخة ${formatDateTime(backup.latestBackup.modifiedAt)}`
    : backup.configured
      ? "لا توجد نسخة محفوظة بعد"
      : "غير مضبوط";
  readinessBackupDetail.textContent = backup.warning || `المسار: ${backup.path || "غير محدد"} | الاحتفاظ: ${backup.retentionDays || 30} يوم`;
  readinessSecurityTitle.textContent = `${security.ownerTwoFactorCount || 0}/${security.ownerAccounts || 0} مالك مع 2FA`;
  readinessSecurityDetail.textContent = `NODE_ENV=${security.nodeEnv || "غير محدد"} | ALLOWED_ORIGIN=${security.allowedOrigin || "غير مضبوط"}`;
  readinessChecks.innerHTML = (readinessStatus.checks || []).map(check => `
    <div class="readiness-check ${check.ok ? "ok" : ""}">
      <span class="check-icon">${check.ok ? "✓" : "!"}</span>
      <div>
        <strong>${check.label}</strong>
        <small>${check.detail}</small>
      </div>
    </div>
  `).join("");
  readinessRestore.innerHTML = (readinessStatus.restoreChecklist || [])
    .map(item => `<li>${item}</li>`)
    .join("");
}

async function loadReadiness() {
  try {
    const response = await fetch("/api/owner/readiness", { headers: { Accept: "application/json" } });
    readinessStatus = response.ok ? await response.json() : null;
  } catch {
    readinessStatus = null;
  }
  renderReadiness();
}

function prettyJson(value) {
  return JSON.stringify(value || [], null, 2);
}

function parseJsonField(form, name, fallback) {
  try {
    const value = JSON.parse(form.elements[name].value || "[]");
    return Array.isArray(value) ? value : fallback;
  } catch {
    throw new Error(`${name}_invalid`);
  }
}

function renderLandingSettings() {
  if (!landingForm || !landingSettings) return;
  const set = (name, value = "") => {
    if (landingForm.elements[name]) landingForm.elements[name].value = value;
  };
  set("accentColor", landingSettings.accentColor || "#0a7c5c");
  ["announcementVisible", "pricingVisible", "testimonialsVisible", "registrationEnabled"].forEach(name => {
    if (landingForm.elements[name]) landingForm.elements[name].checked = landingSettings[name] === true;
  });
  [
    "announcement", "heroBadge", "heroLine1", "heroLine2Prefix", "heroAccent", "heroLine3Prefix",
    "heroGold", "heroSubtitle", "heroPrimaryCta", "heroProof", "featuresTitle",
    "pricingTitle", "featuresDescription", "ctaTitle", "ctaAccent", "ctaSubtitle",
    "formSubmitLabel", "demoLinkLabel", "footerText"
  ].forEach(name => set(name, landingSettings[name] || ""));
  set("statsJson", prettyJson(landingSettings.stats));
  set("featuresJson", prettyJson(landingSettings.features));
  set("modulesJson", prettyJson(landingSettings.modules));
  set("plansJson", prettyJson(landingSettings.plans));
  set("testimonialsJson", prettyJson(landingSettings.testimonials));
}

function landingPayloadFromForm() {
  const form = landingForm;
  return {
    ...landingSettings,
    accentColor: form.elements.accentColor.value,
    announcementVisible: form.elements.announcementVisible.checked,
    pricingVisible: form.elements.pricingVisible.checked,
    testimonialsVisible: form.elements.testimonialsVisible.checked,
    registrationEnabled: form.elements.registrationEnabled.checked,
    announcement: form.elements.announcement.value.trim(),
    heroBadge: form.elements.heroBadge.value.trim(),
    heroLine1: form.elements.heroLine1.value.trim(),
    heroLine2Prefix: form.elements.heroLine2Prefix.value.trim(),
    heroAccent: form.elements.heroAccent.value.trim(),
    heroLine3Prefix: form.elements.heroLine3Prefix.value.trim(),
    heroGold: form.elements.heroGold.value.trim(),
    heroSubtitle: form.elements.heroSubtitle.value.trim(),
    heroPrimaryCta: form.elements.heroPrimaryCta.value.trim(),
    heroProof: form.elements.heroProof.value.trim(),
    featuresTitle: form.elements.featuresTitle.value.trim(),
    featuresDescription: form.elements.featuresDescription.value.trim(),
    pricingTitle: form.elements.pricingTitle.value.trim(),
    ctaTitle: form.elements.ctaTitle.value.trim(),
    ctaAccent: form.elements.ctaAccent.value.trim(),
    ctaSubtitle: form.elements.ctaSubtitle.value.trim(),
    formSubmitLabel: form.elements.formSubmitLabel.value.trim(),
    demoLinkLabel: form.elements.demoLinkLabel.value.trim(),
    footerText: form.elements.footerText.value.trim(),
    stats: parseJsonField(form, "statsJson", landingSettings.stats),
    features: parseJsonField(form, "featuresJson", landingSettings.features),
    modules: parseJsonField(form, "modulesJson", landingSettings.modules),
    plans: parseJsonField(form, "plansJson", landingSettings.plans),
    testimonials: parseJsonField(form, "testimonialsJson", landingSettings.testimonials)
  };
}

async function loadOwner() {
  const sessionResponse = await fetch("/api/auth/session");
  ownerSession = await sessionResponse.json();
  if (!ownerSession.authenticated || ownerSession.user.role !== "platform_owner") {
    location.href = "/login";
    return;
  }
  document.querySelector("[data-owner-name]").textContent = ownerSession.user.name;
  const [response, landingResponse, readinessResponse] = await Promise.all([
    fetch("/api/owner/clinics"),
    fetch("/api/owner/landing-settings"),
    fetch("/api/owner/readiness", { headers: { Accept: "application/json" } })
  ]);
  if (!response.ok) {
    location.href = "/login";
    return;
  }
  const result = await response.json();
  const landingResult = landingResponse.ok ? await landingResponse.json() : {};
  readinessStatus = readinessResponse.ok ? await readinessResponse.json() : null;
  clinics = result.clinics || [];
  auditLogs = result.auditLogs || [];
  landingSettings = landingResult.landing || null;
  renderKpis(result.mrr || 0, result.arr || 0);
  renderClinics();
  renderAudit();
  renderReadiness();
  renderLandingSettings();
  renderOwner2fa(Boolean(ownerSession.user?.twoFactorEnabled));
}

// ── Owner account two-factor authentication (self-enrollment) ────────────────
const owner2fa = {
  panel: document.querySelector("[data-owner-2fa-panel]"),
  badge: document.querySelector("[data-owner-2fa-badge]"),
  disabled: document.querySelector("[data-owner-2fa-disabled]"),
  enabled: document.querySelector("[data-owner-2fa-enabled]"),
  enableStep: document.querySelector("[data-owner-2fa-enable]"),
  backupStep: document.querySelector("[data-owner-2fa-backup]"),
  disableStep: document.querySelector("[data-owner-2fa-disable]"),
  secret: document.querySelector("[data-owner-2fa-secret]"),
  otpauth: document.querySelector("[data-owner-2fa-otpauth]"),
  enableCode: document.querySelector("[data-owner-2fa-enable-code]"),
  enableStatus: document.querySelector("[data-owner-2fa-enable-status]"),
  backupCodes: document.querySelector("[data-owner-2fa-backup-codes]"),
  disablePassword: document.querySelector("[data-owner-2fa-disable-password]"),
  disableCode: document.querySelector("[data-owner-2fa-disable-code]"),
  disableStatus: document.querySelector("[data-owner-2fa-disable-status]")
};

function showEl(el, visible) {
  if (el) el.hidden = !visible;
}

function renderOwner2fa(enabled) {
  if (!owner2fa.panel) return;
  if (owner2fa.badge) {
    owner2fa.badge.textContent = enabled ? "مفعّلة" : "غير مفعّلة";
    owner2fa.badge.classList.toggle("active", enabled);
    owner2fa.badge.classList.toggle("suspended", !enabled);
  }
  showEl(owner2fa.disabled, !enabled);
  showEl(owner2fa.enabled, enabled);
  showEl(owner2fa.enableStep, false);
  showEl(owner2fa.backupStep, false);
  showEl(owner2fa.disableStep, false);
}

async function owner2faRequest(path, body) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-CSRF-Token": ownerSession.csrfToken },
    body: JSON.stringify(body || {})
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "request_failed");
  return result;
}

document.querySelector("[data-owner-2fa-start-enable]")?.addEventListener("click", async () => {
  try {
    const result = await owner2faRequest("/api/auth/2fa/setup");
    owner2fa.secret.textContent = result.secret;
    owner2fa.otpauth.textContent = result.otpauthUrl;
    owner2fa.enableCode.value = "";
    owner2fa.enableStatus.textContent = "";
    showEl(owner2fa.disabled, false);
    showEl(owner2fa.enableStep, true);
  } catch {
    alert("تعذّر بدء إعداد المصادقة الثنائية.");
  }
});

document.querySelector("[data-owner-2fa-enable-confirm]")?.addEventListener("click", async () => {
  const code = owner2fa.enableCode.value.trim();
  if (!/^\d{6}$/.test(code)) {
    owner2fa.enableStatus.textContent = "أدخل رمزاً صحيحاً من 6 أرقام.";
    return;
  }
  try {
    const result = await owner2faRequest("/api/auth/2fa/enable", { code });
    owner2fa.backupCodes.innerHTML = (result.backupCodes || []).map(code => `<code>${code}</code>`).join("");
    showEl(owner2fa.enableStep, false);
    showEl(owner2fa.backupStep, true);
    if (ownerSession?.user) ownerSession.user.twoFactorEnabled = true;
  } catch (error) {
    owner2fa.enableStatus.textContent = error.message === "invalid_2fa_code"
      ? "الرمز غير صحيح. حاول مرة أخرى." : "تعذّر التفعيل.";
  }
});

document.querySelector("[data-owner-2fa-backup-done]")?.addEventListener("click", () => renderOwner2fa(true));

document.querySelector("[data-owner-2fa-start-disable]")?.addEventListener("click", () => {
  owner2fa.disablePassword.value = "";
  owner2fa.disableCode.value = "";
  owner2fa.disableStatus.textContent = "";
  showEl(owner2fa.enabled, false);
  showEl(owner2fa.disableStep, true);
});

document.querySelector("[data-owner-2fa-disable-confirm]")?.addEventListener("click", async () => {
  const password = owner2fa.disablePassword.value;
  const code = owner2fa.disableCode.value.trim();
  if (!password || !code) {
    owner2fa.disableStatus.textContent = "أدخل كلمة المرور والرمز.";
    return;
  }
  try {
    await owner2faRequest("/api/auth/2fa/disable", { password, code });
    if (ownerSession?.user) ownerSession.user.twoFactorEnabled = false;
    renderOwner2fa(false);
  } catch (error) {
    const messages = { invalid_password: "كلمة المرور غير صحيحة.", invalid_2fa_code: "الرمز غير صحيح." };
    owner2fa.disableStatus.textContent = messages[error.message] || "تعذّر الإيقاف.";
  }
});

// ── Create Clinic ──────────────────────────────────────────────────────────────
const createClinicForm = document.querySelector("[data-create-clinic-form]");
const createClinicStatus = document.querySelector("[data-create-clinic-status]");

if (createClinicForm) {
  createClinicForm.addEventListener("submit", async event => {
    event.preventDefault();
    if (!ownerSession?.csrfToken) return;
    const data = Object.fromEntries(new FormData(createClinicForm));
    const button = createClinicForm.querySelector("button[type='submit']");
    button.disabled = true;
    createClinicStatus.textContent = "جاري الإنشاء...";
    try {
      const response = await fetch("/api/owner/clinics", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": ownerSession.csrfToken },
        body: JSON.stringify(data)
      });
      const result = await response.json();
      if (!response.ok) {
        const msgs = {
          missing_fields: "الحقول المطلوبة غير مكتملة.",
          weak_password: "كلمة المرور ضعيفة (8 أحرف على الأقل).",
          invalid_email: "أدخل بريدًا إلكترونيًا صحيحًا.",
          email_already_registered: "البريد الإلكتروني مسجّل مسبقاً."
        };
        throw new Error(msgs[result.error] || result.error || "حدث خطأ.");
      }
      createClinicStatus.textContent = `تم إنشاء العيادة: ${result.clinic.name}`;
      createClinicForm.reset();
      await loadOwner();
    } catch (error) {
      createClinicStatus.textContent = error.message || "تعذر إنشاء العيادة.";
    } finally {
      button.disabled = false;
    }
  });
}

// ── Landing Settings ────────────────────────────────────────────────────────────
if (landingForm) {
  landingForm.addEventListener("submit", async event => {
    event.preventDefault();
    if (!ownerSession?.csrfToken) return;
    let payload;
    try {
      payload = landingPayloadFromForm();
    } catch {
      if (landingStatus) landingStatus.textContent = "يوجد JSON غير صحيح. راجع الأقواس والفواصل.";
      return;
    }
    const button = landingForm.querySelector("button[type='submit']");
    if (button) button.disabled = true;
    if (landingStatus) landingStatus.textContent = "جاري الحفظ...";
    try {
      const response = await fetch("/api/owner/landing-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": ownerSession.csrfToken },
        body: JSON.stringify({ landing: payload })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "save_failed");
      landingSettings = result.landing;
      renderLandingSettings();
      if (landingStatus) landingStatus.textContent = "تم حفظ صفحة الهبوط.";
    } catch {
      if (landingStatus) landingStatus.textContent = "تعذر حفظ الإعدادات.";
    } finally {
      if (button) button.disabled = false;
    }
  });
}

// ── Send Notification Modal ──────────────────────────────────────────────────
if (notifyForm) {
  notifyForm.addEventListener("submit", async event => {
    event.preventDefault();
    if (!ownerSession?.csrfToken) return;
    const data = Object.fromEntries(new FormData(notifyForm));
    const button = notifyForm.querySelector("button[type='submit']");
    button.disabled = true;
    notifyStatus.textContent = "جاري الإرسال...";
    try {
      const response = await fetch(`/api/owner/clinics/${data.clinicId}/notify`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": ownerSession.csrfToken },
        body: JSON.stringify({
          title: data.title,
          body: data.body,
          severity: data.severity,
          viewTarget: data.viewTarget,
          expiresAt: data.expiresAt || null
        })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "send_failed");
      notifyStatus.textContent = "تم إرسال الإشعار.";
      notifyForm.reset();
      setTimeout(() => notifyDialog.close(), 1200);
    } catch {
      notifyStatus.textContent = "تعذر إرسال الإشعار.";
    } finally {
      button.disabled = false;
    }
  });
}

document.querySelector("[data-close-notify-dialog]")?.addEventListener("click", () => notifyDialog.close());

// ── Reset User Password Modal ────────────────────────────────────────────────
if (resetUserForm) {
  resetUserForm.addEventListener("submit", async event => {
    event.preventDefault();
    if (!ownerSession?.csrfToken) return;
    const data = Object.fromEntries(new FormData(resetUserForm));
    const button = resetUserForm.querySelector("button[type='submit']");
    button.disabled = true;
    resetUserStatus.textContent = "جاري إعادة التعيين...";
    try {
      const response = await fetch(`/api/owner/clinics/${data.clinicId}/reset-user-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": ownerSession.csrfToken },
        body: JSON.stringify({ userId: data.userId })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "reset_failed");
      window.prompt(`كلمة المرور المؤقتة لـ ${result.name} (${result.email}). تظهر مرة واحدة فقط:`, result.temporaryPassword);
      resetUserDialog.close();
    } catch {
      resetUserStatus.textContent = "تعذر إعادة تعيين كلمة المرور.";
    } finally {
      button.disabled = false;
    }
  });
}

document.querySelector("[data-close-reset-user-dialog]")?.addEventListener("click", () => resetUserDialog.close());

// ── Disable User 2FA Modal ─────────────────────────────────────────────────
if (disableUser2faForm) {
  disableUser2faForm.addEventListener("submit", async event => {
    event.preventDefault();
    if (!ownerSession?.csrfToken) return;
    const data = Object.fromEntries(new FormData(disableUser2faForm));
    const button = disableUser2faForm.querySelector("button[type='submit']");
    button.disabled = true;
    disableUser2faStatus.textContent = "جاري الإيقاف...";
    try {
      const response = await fetch(`/api/owner/clinics/${data.clinicId}/disable-user-2fa`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": ownerSession.csrfToken },
        body: JSON.stringify({ userId: data.userId })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "disable_failed");
      disableUser2faStatus.textContent = `تم إيقاف المصادقة الثنائية لـ ${result.name || result.email}.`;
      await loadOwner();
      setTimeout(() => disableUser2faDialog.close(), 1200);
    } catch {
      disableUser2faStatus.textContent = "تعذر إيقاف المصادقة الثنائية.";
    } finally {
      button.disabled = false;
    }
  });
}

document.querySelector("[data-close-disable-user-2fa-dialog]")?.addEventListener("click", () => disableUser2faDialog.close());

async function openDisableUser2faDialog(clinicId) {
  if (!clinicId || !disableUser2faDialog || !disableUser2faForm) return;
  disableUser2faStatus.textContent = "جاري التحميل...";
  disableUser2faForm.elements.clinicId.value = clinicId;
  disableUser2faDialog.showModal();
  try {
    const response = await fetch(`/api/owner/clinics/${clinicId}/users`);
    const result = await response.json();
    if (!response.ok) throw new Error("load_failed");
    const select = disableUser2faForm.querySelector("[data-disable-user-2fa-select]");
    const submitButton = disableUser2faForm.querySelector("button[type='submit']");
    select.replaceChildren(...result.users.map(user => {
      const option = new Option(userOptionLabel(user, true), user.id);
      option.disabled = !user.twoFactorEnabled;
      return option;
    }));
    const enabledUsers = result.users.filter(u => u.twoFactorEnabled);
    if (enabledUsers.length) {
      select.value = enabledUsers[0].id;
      if (submitButton) submitButton.disabled = false;
      disableUser2faStatus.textContent = "";
    } else {
      if (submitButton) submitButton.disabled = true;
      disableUser2faStatus.textContent = "لا يوجد مستخدم لديه مصادقة ثنائية مفعلة في هذه العيادة.";
    }
  } catch {
    disableUser2faStatus.textContent = "تعذر تحميل قائمة المستخدمين.";
  }
}

// ── Override Settings Modal ──────────────────────────────────────────────────
if (overrideSettingsForm) {
  overrideSettingsForm.addEventListener("submit", async event => {
    event.preventDefault();
    if (!ownerSession?.csrfToken) return;
    const data = Object.fromEntries(new FormData(overrideSettingsForm));
    const button = overrideSettingsForm.querySelector("button[type='submit']");
    button.disabled = true;
    overrideSettingsStatus.textContent = "جاري الحفظ...";
    const payload = {};
    if (data.clinicName?.trim()) payload.clinicName = data.clinicName.trim();
    if (data.activeDate) payload.activeDate = data.activeDate;
    if (data.language) payload.language = data.language;
    try {
      const response = await fetch(`/api/owner/clinics/${data.clinicId}/override-settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": ownerSession.csrfToken },
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "override_failed");
      overrideSettingsStatus.textContent = "تم تطبيق الإعدادات.";
      setTimeout(() => overrideSettingsDialog.close(), 1200);
    } catch {
      overrideSettingsStatus.textContent = "تعذر حفظ الإعدادات.";
    } finally {
      button.disabled = false;
    }
  });
}

document.querySelector("[data-close-override-settings-dialog]")?.addEventListener("click", () => overrideSettingsDialog.close());

// ── Main Click Handler ────────────────────────────────────────────────────────
document.addEventListener("click", async event => {
  const target = event.target;

  // Save clinic changes
  const clinicId = target.dataset.saveClinic;
  if (clinicId) {
    const row = target.closest("[data-clinic-row]");
    target.disabled = true;
    try {
      const response = await fetch(`/api/owner/clinics/${clinicId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": ownerSession.csrfToken },
        body: JSON.stringify({
          plan: row.querySelector("[data-clinic-plan]").value,
          status: row.querySelector("[data-clinic-status]").value,
          trialEndsAt: row.querySelector("[data-clinic-trial]").value,
          accountDeadline: row.querySelector("[data-clinic-deadline]").value,
          supportTier: row.querySelector("[data-clinic-support]").value,
          enabledModules: [...row.querySelectorAll("[data-clinic-module]:checked")].map(i => i.dataset.clinicModule),
          limits: Object.fromEntries([...row.querySelectorAll("[data-clinic-limit]")].map(i => [i.dataset.clinicLimit, Number(i.value)])),
          branding: Object.fromEntries([...row.querySelectorAll("[data-clinic-branding]")].map(i => [i.dataset.clinicBranding, i.value.trim()])),
          ownerNotes: row.querySelector("[data-clinic-owner-notes]").value,
          require2fa: row.querySelector("[data-clinic-require-2fa]")?.checked === true
        })
      });
      if (!response.ok) throw new Error("save_failed");
      target.textContent = "✓ تم الحفظ";
      target.style.background = "#1A5C38";
      target.style.color = "#fff";
      setTimeout(() => loadOwner(), 1100);
    } catch {
      target.textContent = "✗ تعذّر الحفظ — حاول مجدداً";
      target.style.background = "#a32d2d";
      target.style.color = "#fff";
      target.disabled = false;
    }
    return;
  }

  // Reset admin password
  const resetAdminId = target.dataset.resetClinicPassword;
  if (resetAdminId) {
    if (!confirm("سيتم إلغاء جلسات مدير العيادة الحالية وإصدار كلمة مرور مؤقتة. هل تريد المتابعة؟")) return;
    target.disabled = true;
    try {
      const response = await fetch(`/api/owner/clinics/${resetAdminId}/reset-admin-password`, {
        method: "POST",
        headers: { "X-CSRF-Token": ownerSession.csrfToken }
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "reset_failed");
      window.prompt(`كلمة المرور المؤقتة لـ ${result.email}. تظهر مرة واحدة فقط:`, result.temporaryPassword);
      await loadOwner();
    } finally {
      target.disabled = false;
    }
    return;
  }

  // Reset any user password — open modal with user list
  const resetUserId = target.dataset.resetUserPassword;
  if (resetUserId) {
    resetUserStatus.textContent = "جاري التحميل...";
    resetUserForm.elements.clinicId.value = resetUserId;
    resetUserDialog.showModal();
    try {
      const response = await fetch(`/api/owner/clinics/${resetUserId}/users`);
      const result = await response.json();
      if (!response.ok) throw new Error("load_failed");
      const select = resetUserForm.querySelector("[data-reset-user-select]");
      select.replaceChildren(...result.users.map(user => new Option(userOptionLabel(user), user.id)));
      resetUserStatus.textContent = "";
    } catch {
      resetUserStatus.textContent = "تعذر تحميل قائمة المستخدمين.";
    }
    return;
  }

  // Disable any user's two-factor authentication — open modal with user list
  // NOTE: attribute is data-disable-user-twofa (not -2fa); a digit after a hyphen
  // breaks dataset camelCasing, so dataset.disableUser2fa would read undefined.
  const disableUser2faId = target.dataset.disableUserTwofa;
  if (disableUser2faId) {
    await openDisableUser2faDialog(disableUser2faId);
    return;
  }

  // Send notification — open modal
  const sendNotifyId = target.dataset.sendNotify;
  if (sendNotifyId) {
    notifyForm.reset();
    notifyForm.elements.clinicId.value = sendNotifyId;
    notifyStatus.textContent = "";
    notifyDialog.showModal();
    return;
  }

  // Override clinic settings — open modal
  const overrideId = target.dataset.overrideSettings;
  if (overrideId) {
    overrideSettingsForm.reset();
    overrideSettingsForm.elements.clinicId.value = overrideId;
    overrideSettingsStatus.textContent = "";
    overrideSettingsDialog.showModal();
    return;
  }

  // Delete clinic
  const deleteId = target.dataset.deleteClinic;
  if (deleteId) {
    const clinic = clinics.find(c => c.id === deleteId);
    if (!confirm(`هذا الإجراء لا يمكن التراجع عنه.\n\nهل تريد حذف العيادة "${clinic?.name || deleteId}" وكل بياناتها نهائياً؟`)) return;
    target.disabled = true;
    try {
      const response = await fetch(`/api/owner/clinics/${deleteId}`, {
        method: "DELETE",
        headers: { "X-CSRF-Token": ownerSession.csrfToken }
      });
      if (!response.ok) throw new Error("delete_failed");
      await loadOwner();
    } finally {
      target.disabled = false;
    }
    return;
  }
});

searchInput.addEventListener("input", renderClinics);
statusFilter.addEventListener("change", renderClinics);
document.querySelector("[data-refresh-readiness]")?.addEventListener("click", loadReadiness);

document.querySelector("[data-test-offsite-backup]")?.addEventListener("click", async event => {
  const button = event.currentTarget;
  const status = document.querySelector("[data-offsite-test-status]");
  button.disabled = true;
  if (status) { status.textContent = "جاري اختبار رفع نسخة إلى التخزين الخارجي..."; status.className = "offsite-test-status"; }
  try {
    const response = await fetch("/api/owner/offsite-backup-test", {
      method: "POST",
      headers: { "X-CSRF-Token": ownerSession.csrfToken }
    });
    const result = await response.json().catch(() => ({}));
    if (status) {
      if (result.ok) {
        status.textContent = `✅ نجح الرفع إلى ${result.bucket} (${result.key}). التخزين الخارجي يعمل.`;
        status.className = "offsite-test-status ok";
      } else if (!result.configured) {
        status.textContent = "⚠️ لم تُضبط متغيّرات التخزين الخارجي (LITESTREAM_*) في Render بعد.";
        status.className = "offsite-test-status warn";
      } else {
        status.textContent = `❌ فشل الرفع: ${result.error || "خطأ غير معروف"}`;
        status.className = "offsite-test-status error";
      }
    }
    await loadReadiness();
  } catch {
    if (status) { status.textContent = "تعذّر تنفيذ الاختبار. حاول مرة أخرى."; status.className = "offsite-test-status error"; }
  } finally {
    button.disabled = false;
  }
});

document.querySelector("[data-owner-logout]").addEventListener("click", async () => {
  await fetch("/api/auth/logout", {
    method: "POST",
    headers: { "X-CSRF-Token": ownerSession.csrfToken }
  });
  location.href = "/login";
});

loadOwner().catch(() => {
  location.href = "/login";
});
