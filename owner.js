let ownerSession = null;
let clinics = [];
let auditLogs = [];
let landingSettings = null;

const clinicList = document.querySelector("[data-clinic-list]");
const auditList = document.querySelector("[data-audit-list]");
const searchInput = document.querySelector("[data-owner-search]");
const statusFilter = document.querySelector("[data-owner-status-filter]");
const landingForm = document.querySelector("[data-landing-settings-form]");
const landingStatus = document.querySelector("[data-landing-settings-status]");

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

let disableUser2faOpenLocked = false;

function handleDisableUser2faOpen(event) {
  const button = event.target.closest?.("[data-disable-user-2fa]");
  if (!button) return;
  event.preventDefault();
  event.stopPropagation();
  if (disableUser2faOpenLocked) return;
  disableUser2faOpenLocked = true;
  setTimeout(() => {
    disableUser2faOpenLocked = false;
  }, 500);
  openDisableUser2faDialog(button.dataset.disableUser2fa);
}

document.addEventListener("pointerdown", handleDisableUser2faOpen, true);
document.addEventListener("click", handleDisableUser2faOpen, true);
document.addEventListener("keydown", event => {
  if (event.key !== "Enter" && event.key !== " ") return;
  handleDisableUser2faOpen(event);
}, true);

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
        <button class="secondary-control" type="button" data-disable-user-2fa="${clinic.id}">إيقاف 2FA لمستخدم</button>
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
  clinicList.querySelectorAll("[data-disable-user-2fa]").forEach(button => {
    button.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      openDisableUser2faDialog(button.dataset.disableUser2fa);
    });
  });
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
  const [response, landingResponse] = await Promise.all([
    fetch("/api/owner/clinics"),
    fetch("/api/owner/landing-settings")
  ]);
  if (!response.ok) {
    location.href = "/login";
    return;
  }
  const result = await response.json();
  const landingResult = landingResponse.ok ? await landingResponse.json() : {};
  clinics = result.clinics || [];
  auditLogs = result.auditLogs || [];
  landingSettings = landingResult.landing || null;
  renderKpis(result.mrr || 0, result.arr || 0);
  renderClinics();
  renderAudit();
  renderLandingSettings();
}

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
          ownerNotes: row.querySelector("[data-clinic-owner-notes]").value
        })
      });
      if (!response.ok) throw new Error("save_failed");
      await loadOwner();
    } finally {
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
  const disableUser2faId = target.dataset.disableUser2fa;
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
