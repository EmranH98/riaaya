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

function renderKpis() {
  document.querySelector("[data-owner-kpi='all']").textContent = clinics.length;
  ["trial", "active", "suspended"].forEach(status => {
    document.querySelector(`[data-owner-kpi='${status}']`).textContent = clinics.filter(clinic => clinic.status === status).length;
  });
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
        <input data-clinic-trial type="date" value="${clinic.trialEndsAt ? clinic.trialEndsAt.slice(0, 10) : ""}" aria-label="نهاية التجربة">
        <select data-clinic-support aria-label="مستوى الدعم">
          <option value="standard" ${(clinic.supportTier || "standard") === "standard" ? "selected" : ""}>دعم عادي</option>
          <option value="priority" ${clinic.supportTier === "priority" ? "selected" : ""}>أولوية</option>
          <option value="white_glove" ${clinic.supportTier === "white_glove" ? "selected" : ""}>إعداد كامل</option>
        </select>
        <button type="button" data-save-clinic="${clinic.id}">حفظ التغييرات</button>
        <button class="secondary-control" type="button" data-reset-clinic-password="${clinic.id}">كلمة مرور مؤقتة</button>
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
  const response = await fetch("/api/owner/clinics");
  const landingResponse = await fetch("/api/owner/landing-settings");
  if (!response.ok) {
    location.href = "/login";
    return;
  }
  const result = await response.json();
  const landingResult = landingResponse.ok ? await landingResponse.json() : {};
  clinics = result.clinics || [];
  auditLogs = result.auditLogs || [];
  landingSettings = landingResult.landing || null;
  renderKpis();
  renderClinics();
  renderAudit();
  renderLandingSettings();
}

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
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": ownerSession.csrfToken
        },
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

document.addEventListener("click", async event => {
  const clinicId = event.target.dataset.saveClinic;
  const resetClinicId = event.target.dataset.resetClinicPassword;
  if (resetClinicId) {
    if (!confirm("سيتم إلغاء جلسات مدير العيادة الحالية وإصدار كلمة مرور مؤقتة. هل تريد المتابعة؟")) return;
    event.target.disabled = true;
    try {
      const response = await fetch(`/api/owner/clinics/${resetClinicId}/reset-admin-password`, {
        method: "POST",
        headers: { "X-CSRF-Token": ownerSession.csrfToken }
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "reset_failed");
      window.prompt(`كلمة المرور المؤقتة لـ ${result.email}. تظهر مرة واحدة فقط:`, result.temporaryPassword);
      await loadOwner();
    } finally {
      event.target.disabled = false;
    }
    return;
  }
  if (!clinicId) return;
  const row = event.target.closest("[data-clinic-row]");
  event.target.disabled = true;
  try {
    const response = await fetch(`/api/owner/clinics/${clinicId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": ownerSession.csrfToken
      },
      body: JSON.stringify({
        plan: row.querySelector("[data-clinic-plan]").value,
        status: row.querySelector("[data-clinic-status]").value,
        trialEndsAt: row.querySelector("[data-clinic-trial]").value,
        supportTier: row.querySelector("[data-clinic-support]").value,
        enabledModules: [...row.querySelectorAll("[data-clinic-module]:checked")].map(input => input.dataset.clinicModule),
        limits: Object.fromEntries([...row.querySelectorAll("[data-clinic-limit]")].map(input => [input.dataset.clinicLimit, Number(input.value)])),
        branding: Object.fromEntries([...row.querySelectorAll("[data-clinic-branding]")].map(input => [input.dataset.clinicBranding, input.value.trim()])),
        ownerNotes: row.querySelector("[data-clinic-owner-notes]").value
      })
    });
    if (!response.ok) throw new Error("save_failed");
    await loadOwner();
  } finally {
    event.target.disabled = false;
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
