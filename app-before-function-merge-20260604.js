const STORAGE_KEY = "riaayaMvpState";
const LEADS_KEY = "riaayaLeads";
const DEMO_HISTORY_VERSION = 2;

const today = new Date().toISOString().slice(0, 10);

function dateOffset(days, baseDate = today) {
  const date = new Date(`${baseDate}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

const seedStaff = [
  { id: "staff-doctor-laila", name: "د. ليلى منصور", role: "doctor", rate: 50 },
  { id: "staff-doctor-sami", name: "د. سامي خالد", role: "doctor", rate: 50 },
  { id: "staff-specialist-sarah", name: "سارة خالد", role: "specialist", rate: 18 },
  { id: "staff-specialist-noor", name: "نور عمر", role: "specialist", rate: 15 }
];

const seedEntries = [
  {
    id: "entry-1",
    date: today,
    patient: "مريم أحمد",
    service: "جلسة ليزر",
    doctorId: "staff-doctor-laila",
    specialistId: "staff-specialist-sarah",
    amount: 80,
    discount: 5,
    paymentMethod: "cash",
    notes: "خصم متابعة"
  },
  {
    id: "entry-2",
    date: today,
    patient: "عمر يوسف",
    service: "إجراء تجميلي",
    doctorId: "staff-doctor-laila",
    specialistId: "",
    amount: 120,
    discount: 0,
    paymentMethod: "card",
    notes: ""
  },
  {
    id: "entry-3",
    date: today,
    patient: "هبة محمود",
    service: "استشارة أسنان",
    doctorId: "staff-doctor-sami",
    specialistId: "",
    amount: 60,
    discount: 0,
    paymentMethod: "cash",
    notes: ""
  },
  {
    id: "entry-4",
    date: today,
    patient: "يزن حسن",
    service: "جلسة عناية",
    doctorId: "staff-doctor-sami",
    specialistId: "staff-specialist-noor",
    amount: 45,
    discount: 0,
    paymentMethod: "transfer",
    notes: "تحويل بنكي"
  }
];

const demoHistoryEntries = [
  { id: "demo-history-6-1", date: dateOffset(-6), patient: "رنا علي", service: "جلسة ليزر", doctorId: "staff-doctor-laila", specialistId: "staff-specialist-sarah", amount: 95, discount: 0, paymentMethod: "cash", notes: "" },
  { id: "demo-history-6-2", date: dateOffset(-6), patient: "ماهر خليل", service: "استشارة أسنان", doctorId: "staff-doctor-sami", specialistId: "", amount: 45, discount: 0, paymentMethod: "card", notes: "" },
  { id: "demo-history-5-1", date: dateOffset(-5), patient: "ريم خالد", service: "إجراء تجميلي", doctorId: "staff-doctor-laila", specialistId: "", amount: 160, discount: 10, paymentMethod: "card", notes: "خصم عرض" },
  { id: "demo-history-5-2", date: dateOffset(-5), patient: "سيف محمود", service: "جلسة عناية", doctorId: "staff-doctor-sami", specialistId: "staff-specialist-noor", amount: 50, discount: 0, paymentMethod: "cash", notes: "" },
  { id: "demo-history-4-1", date: dateOffset(-4), patient: "نور الهدى", service: "جلسة ليزر", doctorId: "staff-doctor-laila", specialistId: "staff-specialist-sarah", amount: 85, discount: 5, paymentMethod: "cash", notes: "" },
  { id: "demo-history-4-2", date: dateOffset(-4), patient: "عادل ناصر", service: "استشارة أسنان", doctorId: "staff-doctor-sami", specialistId: "", amount: 55, discount: 0, paymentMethod: "transfer", notes: "" },
  { id: "demo-history-3-1", date: dateOffset(-3), patient: "بيان أحمد", service: "إجراء تجميلي", doctorId: "staff-doctor-laila", specialistId: "", amount: 180, discount: 0, paymentMethod: "card", notes: "" },
  { id: "demo-history-3-2", date: dateOffset(-3), patient: "جود عمر", service: "جلسة عناية", doctorId: "staff-doctor-sami", specialistId: "staff-specialist-noor", amount: 65, discount: 0, paymentMethod: "cash", notes: "" },
  { id: "demo-history-2-1", date: dateOffset(-2), patient: "ليان سمير", service: "جلسة ليزر", doctorId: "staff-doctor-laila", specialistId: "staff-specialist-sarah", amount: 100, discount: 0, paymentMethod: "cash", notes: "" },
  { id: "demo-history-2-2", date: dateOffset(-2), patient: "مجد يوسف", service: "متابعة علاج", doctorId: "staff-doctor-sami", specialistId: "", amount: 40, discount: 0, paymentMethod: "card", notes: "" },
  { id: "demo-history-1-1", date: dateOffset(-1), patient: "تالا حسن", service: "إجراء تجميلي", doctorId: "staff-doctor-laila", specialistId: "", amount: 150, discount: 0, paymentMethod: "card", notes: "" },
  { id: "demo-history-1-2", date: dateOffset(-1), patient: "آدم فادي", service: "جلسة عناية", doctorId: "staff-doctor-sami", specialistId: "staff-specialist-noor", amount: 70, discount: 5, paymentMethod: "transfer", notes: "" }
];

function createDemoReconciliations() {
  return {
    [dateOffset(-6)]: { countedCash: 95, countedCard: 45, countedTransfer: 0 },
    [dateOffset(-5)]: { countedCash: 50, countedCard: 150, countedTransfer: 0 },
    [dateOffset(-4)]: { countedCash: 80, countedCard: 0, countedTransfer: 55 },
    [dateOffset(-3)]: { countedCash: 65, countedCard: 180, countedTransfer: 0 },
    [dateOffset(-2)]: { countedCash: 100, countedCard: 40, countedTransfer: 0 },
    [dateOffset(-1)]: { countedCash: 0, countedCard: 150, countedTransfer: 65 }
  };
}

function createSeedState() {
  return {
    demoHistoryVersion: DEMO_HISTORY_VERSION,
    settings: {
      clinicName: "عيادة رعاية التجريبية",
      activeDate: today,
      branch: "الفرع الرئيسي"
    },
    staff: seedStaff,
    entries: [...demoHistoryEntries, ...seedEntries],
    reconciliations: {
      ...createDemoReconciliations(),
      [today]: {
        countedCash: 135,
        countedCard: 120,
        countedTransfer: 45
      }
    }
  };
}

function ensureDemoHistory(loadedState) {
  if (loadedState.demoHistoryVersion >= DEMO_HISTORY_VERSION) return loadedState;

  const existingIds = new Set(loadedState.entries.map(entry => entry.id));
  const additions = demoHistoryEntries.filter(entry => !existingIds.has(entry.id));

  return {
    ...loadedState,
    demoHistoryVersion: DEMO_HISTORY_VERSION,
    entries: [...additions, ...loadedState.entries],
    reconciliations: {
      ...createDemoReconciliations(),
      ...loadedState.reconciliations
    }
  };
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved) return createSeedState();
    if (saved.settings?.clinicName) {
      saved.settings.clinicName = saved.settings.clinicName.replaceAll("رعايا", "رعاية");
    }
    return ensureDemoHistory({
      demoHistoryVersion: saved.demoHistoryVersion || 0,
      settings: { ...createSeedState().settings, ...saved.settings },
      staff: Array.isArray(saved.staff) ? saved.staff : seedStaff,
      entries: Array.isArray(saved.entries) ? saved.entries : seedEntries,
      reconciliations: saved.reconciliations || {}
    });
  } catch {
    return createSeedState();
  }
}

let state = loadState();

const els = {
  viewButtons: document.querySelectorAll("[data-view-button]"),
  views: document.querySelectorAll("[data-view]"),
  clinicForm: document.querySelector("[data-clinic-form]"),
  clinicTitle: document.querySelector("[data-clinic-title]"),
  entryForm: document.querySelector("[data-entry-form]"),
  staffForm: document.querySelector("[data-staff-form]"),
  reconcileForm: document.querySelector("[data-reconcile-form]"),
  doctorSelect: document.querySelector("[data-doctor-select]"),
  specialistSelect: document.querySelector("[data-specialist-select]"),
  recentEntries: document.querySelector("[data-recent-entries]"),
  entryTable: document.querySelector("[data-entry-table]"),
  staffList: document.querySelector("[data-staff-list]"),
  salaryTable: document.querySelector("[data-salary-table]"),
  reconcileResult: document.querySelector("[data-reconcile-result]"),
  leadList: document.querySelector("[data-lead-list]"),
  alerts: document.querySelector("[data-alerts]"),
  healthLabel: document.querySelector("[data-health-label]"),
  healthNote: document.querySelector("[data-health-note]"),
  dashboardSummary: document.querySelector("[data-dashboard-summary]"),
  weekChart: document.querySelector("[data-week-chart]"),
  weekCount: document.querySelector("[data-week-count]"),
  paymentSummary: document.querySelector("[data-payment-summary]"),
  paymentBars: document.querySelector("[data-payment-bars]"),
  salaryBreakdown: document.querySelector("[data-salary-breakdown]"),
  closeSummary: document.querySelector("[data-close-summary]"),
  insightList: document.querySelector("[data-insight-list]"),
  closeChip: document.querySelector('[data-chip="close"]'),
  discountChip: document.querySelector('[data-chip="discount"]'),
  averageChip: document.querySelector('[data-chip="average"]')
};

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function money(value) {
  return `${Number(value || 0).toLocaleString("ar-JO", {
    maximumFractionDigits: 2
  })} د.أ`;
}

function numberValue(value) {
  return Number.parseFloat(value || 0) || 0;
}

function nextId(prefix) {
  if (crypto.randomUUID) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function roleLabel(role) {
  return role === "doctor" ? "طبيب" : "أخصائي";
}

function paymentLabel(method) {
  const labels = { cash: "كاش", card: "فيزا", transfer: "تحويل" };
  return labels[method] || method;
}

function getStaffMember(id) {
  return state.staff.find(member => member.id === id);
}

function netAmount(entry) {
  return Math.max(numberValue(entry.amount) - numberValue(entry.discount), 0);
}

function activeEntries() {
  return state.entries.filter(entry => entry.date === state.settings.activeDate);
}

function activeReconciliation() {
  return state.reconciliations[state.settings.activeDate] || null;
}

function totalsFor(entries) {
  return entries.reduce((totals, entry) => {
    const net = netAmount(entry);
    totals.revenue += net;
    totals.discount += numberValue(entry.discount);
    totals.count += 1;
    if (entry.paymentMethod === "cash") totals.cash += net;
    if (entry.paymentMethod === "card") totals.card += net;
    if (entry.paymentMethod === "transfer") totals.transfer += net;
    return totals;
  }, { revenue: 0, discount: 0, count: 0, cash: 0, card: 0, transfer: 0 });
}

function dateRangeForLastDays(days) {
  return Array.from({ length: days }, (_, index) => dateOffset(index - (days - 1), state.settings.activeDate));
}

function entriesForDate(date) {
  return state.entries.filter(entry => entry.date === date);
}

function entriesForLastDays(days) {
  const dates = new Set(dateRangeForLastDays(days));
  return state.entries.filter(entry => dates.has(entry.date));
}

function weeklySeries(days = 7) {
  return dateRangeForLastDays(days).map(date => {
    const entries = entriesForDate(date);
    return {
      date,
      entries,
      totals: totalsFor(entries)
    };
  });
}

function averageTicket(totals) {
  return totals.count ? totals.revenue / totals.count : 0;
}

function topServices(entries) {
  const services = new Map();
  entries.forEach(entry => {
    const current = services.get(entry.service) || { service: entry.service, count: 0, revenue: 0 };
    current.count += 1;
    current.revenue += netAmount(entry);
    services.set(entry.service, current);
  });
  return [...services.values()].sort((a, b) => b.revenue - a.revenue);
}

function reconciliationDiffs(totals, reconciliation) {
  if (!reconciliation) return null;
  const cashDiff = numberValue(reconciliation.countedCash) - totals.cash;
  const cardDiff = numberValue(reconciliation.countedCard) - totals.card;
  const transferDiff = numberValue(reconciliation.countedTransfer) - totals.transfer;
  return {
    cashDiff,
    cardDiff,
    transferDiff,
    totalDiff: cashDiff + cardDiff + transferDiff
  };
}

function salaryRows(entries) {
  return state.staff.map(member => {
    const related = entries.filter(entry => (
      entry.doctorId === member.id || entry.specialistId === member.id
    ));
    const amount = related.reduce((sum, entry) => sum + (netAmount(entry) * numberValue(member.rate) / 100), 0);
    return {
      member,
      operations: related.length,
      amount
    };
  });
}

function setView(viewName) {
  els.viewButtons.forEach(button => {
    button.classList.toggle("active", button.dataset.viewButton === viewName);
  });
  els.views.forEach(view => {
    view.classList.toggle("active", view.dataset.view === viewName);
  });
}

function renderClinicForm() {
  els.clinicForm.elements.clinicName.value = state.settings.clinicName;
  els.clinicForm.elements.activeDate.value = state.settings.activeDate;
  els.clinicForm.elements.branch.value = state.settings.branch || "";
  els.clinicTitle.textContent = state.settings.clinicName;
}

function renderStaffSelects() {
  const doctors = state.staff.filter(member => member.role === "doctor");
  const specialists = state.staff.filter(member => member.role === "specialist");

  els.doctorSelect.innerHTML = doctors.map(member => (
    `<option value="${member.id}">${member.name} (${member.rate}%)</option>`
  )).join("");

  els.specialistSelect.innerHTML = [
    `<option value="">بدون أخصائي</option>`,
    ...specialists.map(member => (
      `<option value="${member.id}">${member.name} (${member.rate}%)</option>`
    ))
  ].join("");
}

function renderKpis(entries, totals, diffs) {
  document.querySelector('[data-kpi="revenue"]').textContent = money(totals.revenue);
  document.querySelector('[data-kpi-note="revenue"]').textContent = `من ${totals.count} عملية`;
  document.querySelector('[data-kpi="cash"]').textContent = money(totals.cash);
  document.querySelector('[data-kpi="card"]').textContent = money(totals.card);

  const differenceEl = document.querySelector('[data-kpi="difference"]');
  const differenceNote = document.querySelector('[data-kpi-note="difference"]');

  if (!diffs) {
    differenceEl.textContent = "بانتظار الإغلاق";
    differenceNote.textContent = "أدخل الكاش والفيزا والتحويلات الفعلية";
    return;
  }

  differenceEl.textContent = money(diffs.totalDiff);
  differenceNote.textContent = Math.abs(diffs.totalDiff) < 0.01 ? "الإغلاق متطابق" : "يوجد فرق يحتاج مراجعة";
}

function renderDashboardSummary(entries, totals, diffs, weekEntries, weekTotals) {
  const avg = averageTicket(totals);
  const closeLabel = !diffs ? "الإغلاق غير محفوظ" : Math.abs(diffs.totalDiff) < 0.01 ? "الإغلاق متطابق" : "الإغلاق يحتاج مراجعة";

  els.dashboardSummary.textContent = entries.length
    ? `تم تسجيل ${totals.count} عملية اليوم بقيمة ${money(totals.revenue)}. إجمالي آخر 7 أيام ${money(weekTotals.revenue)} عبر ${weekEntries.length} عملية.`
    : `لا توجد عمليات لهذا التاريخ بعد. يعرض هذا القسم الإيرادات، طرق الدفع، النسب، وحالة الإغلاق بمجرد إدخال العمليات.`;

  els.closeChip.textContent = closeLabel;
  els.discountChip.textContent = `الخصومات ${money(totals.discount)}`;
  els.averageChip.textContent = `متوسط العملية ${money(avg)}`;

  document.querySelector('[data-kpi="weekRevenue"]').textContent = money(weekTotals.revenue);
  document.querySelector('[data-kpi-note="weekRevenue"]').textContent = `${weekEntries.length} عملية خلال آخر 7 أيام`;
}

function renderWeekChart(series) {
  const maxRevenue = Math.max(...series.map(day => day.totals.revenue), 1);
  const formatter = new Intl.DateTimeFormat("ar-JO", { weekday: "short" });
  const activeDate = state.settings.activeDate;
  const totalCount = series.reduce((sum, day) => sum + day.totals.count, 0);

  els.weekCount.textContent = `${totalCount} عملية`;
  els.weekChart.innerHTML = series.map(day => {
    const height = Math.max((day.totals.revenue / maxRevenue) * 100, day.totals.revenue ? 12 : 4);
    const label = formatter.format(new Date(`${day.date}T12:00:00`));
    return `
      <div class="chart-day ${day.date === activeDate ? "today" : ""}">
        <div class="chart-value">${money(day.totals.revenue).replace(" د.أ", "")}</div>
        <div class="bar-track">
          <div class="bar-fill" style="--bar-height:${height}%"></div>
        </div>
        <div class="chart-label">${label}</div>
      </div>
    `;
  }).join("");
}

function renderPaymentBreakdown(totals) {
  const paymentRows = [
    { label: "كاش", value: totals.cash, className: "cash" },
    { label: "فيزا", value: totals.card, className: "card" },
    { label: "تحويل", value: totals.transfer, className: "transfer" }
  ];
  const total = Math.max(totals.cash + totals.card + totals.transfer, 0);

  els.paymentSummary.textContent = total
    ? `إجمالي المقبوضات المسجلة اليوم ${money(total)}`
    : "لا توجد مدفوعات مسجلة لهذا التاريخ.";

  els.paymentBars.innerHTML = paymentRows.map(row => {
    const percent = total ? (row.value / total) * 100 : 0;
    return `
      <div class="progress-row">
        <span>${row.label}</span>
        <div class="progress-track">
          <div class="progress-fill ${row.className}" style="--progress:${percent}%"></div>
        </div>
        <span>${money(row.value)}</span>
      </div>
    `;
  }).join("");
}

function renderSalaryBreakdown(entries) {
  const rows = salaryRows(entries).filter(row => row.operations > 0).sort((a, b) => b.amount - a.amount);
  const maxAmount = Math.max(...rows.map(row => row.amount), 1);

  if (!rows.length) {
    els.salaryBreakdown.innerHTML = `<div class="empty-state">لا توجد مستحقات بعد لهذا التاريخ.</div>`;
    return;
  }

  els.salaryBreakdown.innerHTML = rows.map(row => {
    const percent = Math.max((row.amount / maxAmount) * 100, 6);
    return `
      <div class="salary-row">
        <div class="salary-row-header">
          <div>
            <strong>${row.member.name}</strong>
            <small>${roleLabel(row.member.role)} | ${row.operations} عملية | ${row.member.rate}%</small>
          </div>
          <strong>${money(row.amount)}</strong>
        </div>
        <div class="progress-track">
          <div class="progress-fill" style="--progress:${percent}%"></div>
        </div>
      </div>
    `;
  }).join("");
}

function renderCloseSummary(totals, reconciliation, diffs) {
  const rows = [
    { label: "الكاش", expected: totals.cash, counted: reconciliation?.countedCash, diff: diffs?.cashDiff },
    { label: "الفيزا", expected: totals.card, counted: reconciliation?.countedCard, diff: diffs?.cardDiff },
    { label: "التحويل", expected: totals.transfer, counted: reconciliation?.countedTransfer, diff: diffs?.transferDiff }
  ];

  els.closeSummary.innerHTML = rows.map(row => {
    const hasDiff = reconciliation && Math.abs(numberValue(row.diff)) >= 0.01;
    const status = !reconciliation ? "warn" : hasDiff ? "bad" : "good";
    const statusText = !reconciliation ? "غير محفوظ" : hasDiff ? "فرق" : "مطابق";
    return `
      <div class="close-row">
        <div>
          <strong>${row.label}</strong>
          <small>المتوقع ${money(row.expected)}${reconciliation ? ` | الموجود ${money(row.counted)}` : ""}</small>
        </div>
        <span class="status-pill ${status}">${statusText}</span>
      </div>
    `;
  }).join("");
}

function renderInsights(entries, weekEntries, totals) {
  const topService = topServices(weekEntries)[0];
  const avg = averageTicket(totals);
  const discountRate = totals.revenue + totals.discount ? (totals.discount / (totals.revenue + totals.discount)) * 100 : 0;

  const insights = [
    {
      title: topService ? `أكثر خدمة دخلاً: ${topService.service}` : "لا توجد خدمة بارزة بعد",
      body: topService ? `${topService.count} عمليات خلال آخر 7 أيام بقيمة ${money(topService.revenue)}.` : "ستظهر الخدمة الأعلى دخلاً بعد إدخال العمليات."
    },
    {
      title: `متوسط قيمة العملية ${money(avg)}`,
      body: entries.length ? "يساعدك هذا الرقم على فهم جودة الحجوزات اليومية." : "أضف عمليات اليوم لاحتساب المتوسط."
    },
    {
      title: `نسبة الخصم ${discountRate.toLocaleString("ar-JO", { maximumFractionDigits: 1 })}%`,
      body: totals.discount ? `تم تسجيل خصومات بقيمة ${money(totals.discount)} اليوم.` : "لا توجد خصومات مسجلة لهذا التاريخ."
    }
  ];

  els.insightList.innerHTML = insights.map(insight => `
    <div class="insight-card">
      <strong>${insight.title}</strong>
      <p>${insight.body}</p>
    </div>
  `).join("");
}

function renderRecentEntries(entries) {
  const recent = entries.slice(-5).reverse();
  if (!recent.length) {
    els.recentEntries.innerHTML = `<tr><td colspan="4">لا توجد عمليات مسجلة لهذا التاريخ.</td></tr>`;
    return;
  }

  els.recentEntries.innerHTML = recent.map(entry => `
    <tr>
      <td>${entry.patient}</td>
      <td>${entry.service}</td>
      <td><span class="pill">${paymentLabel(entry.paymentMethod)}</span></td>
      <td>${money(netAmount(entry))}</td>
    </tr>
  `).join("");
}

function renderEntryTable(entries) {
  if (!entries.length) {
    els.entryTable.innerHTML = `<tr><td colspan="5">أضف أول عملية حتى تظهر في سجل اليوم.</td></tr>`;
    return;
  }

  els.entryTable.innerHTML = entries.slice().reverse().map(entry => {
    const doctor = getStaffMember(entry.doctorId);
    return `
      <tr>
        <td>${entry.patient}</td>
        <td>${entry.service}</td>
        <td>${doctor ? doctor.name : "غير محدد"}</td>
        <td>${money(netAmount(entry))}</td>
        <td>
          <button class="icon-button danger" type="button" data-delete-entry="${entry.id}">حذف</button>
        </td>
      </tr>
    `;
  }).join("");
}

function renderStaffList() {
  if (!state.staff.length) {
    els.staffList.innerHTML = `<div class="empty-state">أضف أعضاء الفريق ونسبهم لبدء حساب المستحقات.</div>`;
    return;
  }

  els.staffList.innerHTML = state.staff.map(member => `
    <div class="staff-card">
      <div>
        <strong>${member.name}</strong>
        <div class="staff-meta">
          <span class="pill">${roleLabel(member.role)}</span>
          <span class="pill">${member.rate}%</span>
        </div>
      </div>
      <button class="icon-button danger" type="button" data-delete-staff="${member.id}">حذف</button>
    </div>
  `).join("");
}

function renderSalaries(entries) {
  const rows = salaryRows(entries);
  if (!rows.length) {
    els.salaryTable.innerHTML = `<tr><td colspan="5">أضف موظفين وعمليات لإظهار الرواتب.</td></tr>`;
    return;
  }

  els.salaryTable.innerHTML = rows.map(row => `
    <tr>
      <td>${row.member.name}</td>
      <td>${roleLabel(row.member.role)}</td>
      <td>${row.member.rate}%</td>
      <td>${row.operations}</td>
      <td><strong>${money(row.amount)}</strong></td>
    </tr>
  `).join("");
}

function renderReconciliation(totals, reconciliation, diffs) {
  const rows = [
    ["الكاش", totals.cash, reconciliation?.countedCash, diffs?.cashDiff],
    ["الفيزا", totals.card, reconciliation?.countedCard, diffs?.cardDiff],
    ["التحويل", totals.transfer, reconciliation?.countedTransfer, diffs?.transferDiff]
  ];

  if (reconciliation) {
    els.reconcileForm.elements.countedCash.value = reconciliation.countedCash;
    els.reconcileForm.elements.countedCard.value = reconciliation.countedCard;
    els.reconcileForm.elements.countedTransfer.value = reconciliation.countedTransfer;
  } else {
    els.reconcileForm.elements.countedCash.value = totals.cash;
    els.reconcileForm.elements.countedCard.value = totals.card;
    els.reconcileForm.elements.countedTransfer.value = totals.transfer;
  }

  els.reconcileResult.innerHTML = rows.map(([label, expected, counted, diff]) => {
    const hasDiff = Math.abs(numberValue(diff)) >= 0.01;
    const status = !reconciliation ? "warn" : hasDiff ? "bad" : "good";
    const statusText = !reconciliation ? "غير محفوظ" : hasDiff ? "فرق" : "مطابق";
    return `
      <div class="result-card">
        <strong>${label}</strong>
        <p>المتوقع: ${money(expected)} | الموجود: ${reconciliation ? money(counted) : "لم يحفظ بعد"}</p>
        <p><span class="status-pill ${status}">${statusText}</span> ${reconciliation ? `الفرق: ${money(diff)}` : ""}</p>
      </div>
    `;
  }).join("");
}

function renderLeads() {
  const leads = JSON.parse(localStorage.getItem(LEADS_KEY) || "[]");

  if (!leads.length) {
    els.leadList.innerHTML = `<div class="empty-state">لا توجد طلبات تجربة محفوظة بعد. جرّب النموذج في صفحة التعريف.</div>`;
    return;
  }

  els.leadList.innerHTML = leads.map(lead => `
    <div class="lead-card">
      <div>
        <strong>${lead.clinic || "عيادة بدون اسم"}</strong>
        <p>${lead.name || ""} | ${lead.phone || ""} | ${lead.city || ""}</p>
        <p>الخطة: ${lead.plan || "غير محدد"} | الحجم: ${lead.size || lead.clinic_size || "غير محدد"}</p>
        ${lead.notes ? `<p>${lead.notes}</p>` : ""}
      </div>
      <span class="pill">${lead.createdAt ? new Date(lead.createdAt).toLocaleDateString("ar-JO") : "محلي"}</span>
    </div>
  `).join("");
}

function renderAlerts(entries, totals, diffs) {
  const alerts = [];

  if (!entries.length) {
    alerts.push({
      type: "warning",
      title: "لا توجد عمليات لهذا التاريخ",
      body: "أضف عملية من قسم عمليات اليوم حتى تظهر الإيرادات والنسب."
    });
  }

  if (!activeReconciliation()) {
    alerts.push({
      type: "warning",
      title: "إغلاق اليوم غير محفوظ",
      body: "أدخل الموجود فعلياً من كاش وفيزا وتحويلات قبل اعتماد ملخص اليوم."
    });
  } else if (diffs && Math.abs(diffs.totalDiff) >= 0.01) {
    alerts.push({
      type: "danger",
      title: "يوجد فرق في الإغلاق",
      body: `فرق اليوم الإجمالي هو ${money(diffs.totalDiff)}. راجع الخصومات وطرق الدفع والعمليات غير المكتملة.`
    });
  } else {
    alerts.push({
      type: "",
      title: "الإغلاق متطابق",
      body: "المبالغ المسجلة تطابق الكاش والفيزا والتحويلات الفعلية."
    });
  }

  if (totals.discount > 0) {
    alerts.push({
      type: "warning",
      title: "هناك خصومات مسجلة",
      body: `إجمالي الخصومات لهذا التاريخ هو ${money(totals.discount)}.`
    });
  }

  const leadsCount = JSON.parse(localStorage.getItem(LEADS_KEY) || "[]").length;
  if (leadsCount > 0) {
    alerts.push({
      type: "",
      title: "طلبات تجربة جديدة",
      body: `لديك ${leadsCount} طلب محفوظ من صفحة التعريف.`
    });
  }

  els.alerts.innerHTML = alerts.map(alert => `
    <div class="alert ${alert.type}">
      <strong>${alert.title}</strong>
      <p>${alert.body}</p>
    </div>
  `).join("");

  if (diffs && Math.abs(diffs.totalDiff) < 0.01) {
    els.healthLabel.textContent = "مطابق";
    els.healthNote.textContent = "يمكنك مراجعة كشف الرواتب أو طباعته.";
  } else if (diffs) {
    els.healthLabel.textContent = "يحتاج مراجعة";
    els.healthNote.textContent = `فرق الإغلاق الحالي ${money(diffs.totalDiff)}.`;
  } else {
    els.healthLabel.textContent = "بانتظار الإغلاق";
    els.healthNote.textContent = "احفظ مطابقة الإغلاق لاعتماد اليوم.";
  }
}

function render() {
  const entries = activeEntries();
  const totals = totalsFor(entries);
  const reconciliation = activeReconciliation();
  const diffs = reconciliationDiffs(totals, reconciliation);
  const weekSeries = weeklySeries(7);
  const weekEntries = entriesForLastDays(7);
  const weekTotals = totalsFor(weekEntries);

  renderClinicForm();
  renderStaffSelects();
  renderKpis(entries, totals, diffs);
  renderDashboardSummary(entries, totals, diffs, weekEntries, weekTotals);
  renderWeekChart(weekSeries);
  renderPaymentBreakdown(totals);
  renderSalaryBreakdown(entries);
  renderCloseSummary(totals, reconciliation, diffs);
  renderInsights(entries, weekEntries, totals);
  renderRecentEntries(entries);
  renderEntryTable(entries);
  renderStaffList();
  renderSalaries(entries);
  renderReconciliation(totals, reconciliation, diffs);
  renderLeads();
  renderAlerts(entries, totals, diffs);
}

els.viewButtons.forEach(button => {
  button.addEventListener("click", () => setView(button.dataset.viewButton));
});

document.querySelectorAll("[data-jump]").forEach(button => {
  button.addEventListener("click", () => setView(button.dataset.jump));
});

els.clinicForm.addEventListener("submit", event => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(els.clinicForm).entries());
  state.settings = {
    clinicName: data.clinicName.trim(),
    activeDate: data.activeDate,
    branch: data.branch.trim()
  };
  saveState();
  render();
});

els.entryForm.addEventListener("submit", event => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(els.entryForm).entries());
  state.entries.push({
    id: nextId("entry"),
    date: state.settings.activeDate,
    patient: data.patient.trim(),
    service: data.service.trim(),
    doctorId: data.doctorId,
    specialistId: data.specialistId,
    amount: numberValue(data.amount),
    discount: Math.min(numberValue(data.discount), numberValue(data.amount)),
    paymentMethod: data.paymentMethod,
    notes: data.notes.trim()
  });
  els.entryForm.reset();
  els.entryForm.elements.discount.value = 0;
  saveState();
  render();
});

els.staffForm.addEventListener("submit", event => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(els.staffForm).entries());
  state.staff.push({
    id: nextId("staff"),
    name: data.name.trim(),
    role: data.role,
    rate: numberValue(data.rate)
  });
  els.staffForm.reset();
  saveState();
  render();
});

els.reconcileForm.addEventListener("submit", event => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(els.reconcileForm).entries());
  state.reconciliations[state.settings.activeDate] = {
    countedCash: numberValue(data.countedCash),
    countedCard: numberValue(data.countedCard),
    countedTransfer: numberValue(data.countedTransfer)
  };
  saveState();
  render();
});

document.addEventListener("click", event => {
  const deleteEntryId = event.target.dataset.deleteEntry;
  const deleteStaffId = event.target.dataset.deleteStaff;

  if (deleteEntryId) {
    state.entries = state.entries.filter(entry => entry.id !== deleteEntryId);
    saveState();
    render();
  }

  if (deleteStaffId) {
    const isUsed = state.entries.some(entry => (
      entry.doctorId === deleteStaffId || entry.specialistId === deleteStaffId
    ));
    if (isUsed && !confirm("هذا الموظف مرتبط بعمليات سابقة. هل تريد حذفه؟")) return;
    state.staff = state.staff.filter(member => member.id !== deleteStaffId);
    saveState();
    render();
  }
});

document.querySelector("[data-clear-entries]").addEventListener("click", () => {
  if (!confirm("سيتم مسح سجل التاريخ المحدد فقط. هل أنت متأكد؟")) return;
  state.entries = state.entries.filter(entry => entry.date !== state.settings.activeDate);
  delete state.reconciliations[state.settings.activeDate];
  saveState();
  render();
});

document.querySelector("[data-clear-leads]").addEventListener("click", () => {
  if (!confirm("هل تريد مسح طلبات التجربة المحفوظة على هذا الجهاز؟")) return;
  localStorage.removeItem(LEADS_KEY);
  render();
});

document.querySelectorAll("[data-print-report]").forEach(button => {
  button.addEventListener("click", () => {
    setView("salaries");
    window.print();
  });
});

render();
