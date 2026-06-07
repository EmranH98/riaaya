const STORAGE_KEY = "riaayaMvpState";
const LEADS_KEY = "riaayaLeads";
const DEMO_HISTORY_VERSION = 5;

const today = new Date().toISOString().slice(0, 10);

const VIEW_LABELS = {
  dashboard: "ملخص اليوم",
  entries: "عمليات اليوم",
  staff: "الموظفون والنسب",
  services: "الخدمات والقواعد",
  inventory: "المخزون والموردون",
  reconcile: "المطابقة",
  salaries: "الرواتب",
  leads: "طلبات التجربة",
  accounts: "الحسابات والصلاحيات"
};

const ADMIN_VIEWS = Object.keys(VIEW_LABELS);

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

const seedServices = [
  { id: "service-laser", name: "جلسة ليزر", defaultPrice: 80, defaultCost: 8, active: true },
  { id: "service-cosmetic", name: "إجراء تجميلي", defaultPrice: 120, defaultCost: 18, active: true },
  { id: "service-dental", name: "استشارة أسنان", defaultPrice: 60, defaultCost: 0, active: true },
  { id: "service-care", name: "جلسة عناية", defaultPrice: 45, defaultCost: 5, active: true },
  { id: "service-followup", name: "متابعة علاج", defaultPrice: 40, defaultCost: 0, active: true }
];

const seedRules = [
  {
    id: "rule-doctors-net-default",
    name: "الأطباء | نسبة العضو من الربح الصافي",
    appliesTo: "doctor",
    personId: "",
    serviceId: "",
    model: "member_rate",
    value: 0,
    active: true
  },
  {
    id: "rule-specialists-gross-default",
    name: "الأخصائيون | النسبة من المقبوض",
    appliesTo: "specialist",
    personId: "",
    serviceId: "",
    model: "member_rate",
    value: 0,
    active: true
  }
];

const seedSuppliers = [
  {
    id: "supplier-medcare",
    name: "MedCare Supplies",
    contact: "079 555 2310",
    city: "عمّان",
    category: "مواد طبية",
    notes: "توريد سريع للمواد الاستهلاكية"
  },
  {
    id: "supplier-derma",
    name: "DermaPro Jordan",
    contact: "sales@dermapro.jo",
    city: "عمّان",
    category: "منتجات عناية",
    notes: "أسعار أفضل عند طلب كميات شهرية"
  },
  {
    id: "supplier-dental",
    name: "Dental House",
    contact: "06 555 8844",
    city: "إربد",
    category: "أسنان",
    notes: "مورد بديل للعيادات الشمالية"
  }
];

const seedInventoryItems = [
  {
    id: "inventory-gloves",
    name: "قفازات نيتريل",
    sku: "GLV-NIT-M",
    unit: "علبة",
    quantity: 7,
    lowThreshold: 10,
    unitCost: 4.5,
    supplierId: "supplier-medcare",
    lastOrderedAt: dateOffset(-8),
    active: true
  },
  {
    id: "inventory-laser-gel",
    name: "جل ليزر",
    sku: "LAS-GEL",
    unit: "عبوة",
    quantity: 18,
    lowThreshold: 8,
    unitCost: 3.25,
    supplierId: "supplier-derma",
    lastOrderedAt: dateOffset(-15),
    active: true
  },
  {
    id: "inventory-dental-anesthetic",
    name: "مخدر أسنان",
    sku: "DEN-ANE",
    unit: "كرتونة",
    quantity: 2,
    lowThreshold: 3,
    unitCost: 22,
    supplierId: "supplier-dental",
    lastOrderedAt: dateOffset(-21),
    active: true
  }
];

const seedPurchaseOrders = [
  {
    id: "order-gloves",
    itemId: "inventory-gloves",
    supplierId: "supplier-medcare",
    date: dateOffset(-8),
    quantity: 12,
    unitCost: 4.5,
    status: "received",
    branch: "الفرع الرئيسي",
    notes: "طلب افتتاحي"
  },
  {
    id: "order-laser-gel",
    itemId: "inventory-laser-gel",
    supplierId: "supplier-derma",
    date: dateOffset(-15),
    quantity: 24,
    unitCost: 3.25,
    status: "received",
    branch: "الفرع الرئيسي",
    notes: ""
  }
];

const seedAccounts = [
  {
    id: "account-admin",
    name: "مدير النظام",
    role: "admin",
    staffId: "",
    allowedViews: ADMIN_VIEWS,
    canViewSensitive: true,
    ownEntriesOnly: false,
    canManagePermissions: true,
    active: true
  },
  {
    id: "account-data-entry",
    name: "موظف إدخال",
    role: "data_entry",
    staffId: "",
    allowedViews: ["entries"],
    canViewSensitive: false,
    ownEntriesOnly: false,
    canManagePermissions: false,
    active: true
  },
  {
    id: "account-doctor-laila",
    name: "د. ليلى",
    role: "doctor",
    staffId: "staff-doctor-laila",
    allowedViews: ["dashboard", "entries"],
    canViewSensitive: false,
    ownEntriesOnly: true,
    canManagePermissions: false,
    active: true
  }
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

function asNumber(value) {
  return Number.parseFloat(value || 0) || 0;
}

function mergeById(baseRecords, incomingRecords) {
  const records = new Map();
  baseRecords.forEach(record => records.set(record.id, { ...record }));
  incomingRecords.forEach(record => {
    if (!record?.id) return;
    records.set(record.id, { ...records.get(record.id), ...record });
  });
  return [...records.values()];
}

function serviceFromEntry(entry, services = seedServices) {
  return services.find(service => service.id === entry.serviceId)
    || services.find(service => service.name === entry.service)
    || null;
}

function normalizeService(service) {
  return {
    id: service.id || nextId("service"),
    name: service.name || "خدمة بدون اسم",
    defaultPrice: asNumber(service.defaultPrice ?? service.default_price),
    defaultCost: asNumber(service.defaultCost ?? service.default_cost ?? service.doctor_cost),
    active: service.active !== false
  };
}

function normalizeRule(rule) {
  const appliesTo = rule.appliesTo || rule.applies_to || "doctor";
  const isOldDoctorDefault = rule.id === "rule-doctors-net-default" && rule.model === "pct_net" && asNumber(rule.value) === 50;
  return {
    id: rule.id || nextId("rule"),
    name: isOldDoctorDefault ? "الأطباء | نسبة العضو من الربح الصافي" : rule.name || "قاعدة بدون اسم",
    appliesTo: appliesTo === "staff" ? "specialist" : appliesTo,
    personId: rule.personId || rule.person_id || "",
    serviceId: rule.serviceId || rule.service_id || "",
    model: isOldDoctorDefault ? "member_rate" : rule.model || "pct_net",
    value: isOldDoctorDefault ? 0 : asNumber(rule.value),
    tierThreshold: asNumber(rule.tierThreshold ?? rule.tier_threshold_qty),
    tierValue: asNumber(rule.tierValue ?? rule.tier_value),
    active: rule.active !== false && rule.is_active !== false
  };
}

function normalizeStaffMember(member) {
  return {
    id: member.id || nextId("staff"),
    name: member.name || "عضو فريق",
    role: member.role === "staff" ? "specialist" : member.role || "specialist",
    rate: asNumber(member.rate),
    baseSalary: asNumber(member.baseSalary ?? member.base_salary),
    deduction: asNumber(member.deduction ?? member.ss_deduction)
  };
}

function defaultViewsForRole(role) {
  if (role === "admin") return ADMIN_VIEWS;
  if (role === "data_entry") return ["entries"];
  return ["dashboard", "entries"];
}

function normalizeAccount(account) {
  const role = account.role || "data_entry";
  const allowedViews = Array.isArray(account.allowedViews)
    ? account.allowedViews
    : Array.isArray(account.allowed_views)
      ? account.allowed_views
      : defaultViewsForRole(role);
  const views = [...new Set(allowedViews.filter(view => VIEW_LABELS[view]))];

  return {
    id: account.id || nextId("account"),
    name: account.name || "حساب مستخدم",
    role,
    staffId: account.staffId || account.staff_id || "",
    allowedViews: role === "admin" ? ADMIN_VIEWS : views.length ? views : defaultViewsForRole(role),
    canViewSensitive: role === "admin" || account.canViewSensitive === true || account.can_view_sensitive === true,
    ownEntriesOnly: account.ownEntriesOnly === true || account.own_entries_only === true,
    canManagePermissions: role === "admin" || account.canManagePermissions === true || account.can_manage_permissions === true,
    active: account.active !== false
  };
}

function normalizeEntry(entry, services = seedServices) {
  const service = serviceFromEntry(entry, services);
  const quantity = Math.max(asNumber(entry.quantity ?? entry.qty) || 1, 1);
  const amount = asNumber(entry.amount ?? entry.price);
  const unitPrice = asNumber(entry.unitPrice ?? entry.unit_price) || (quantity ? amount / quantity : amount);
  const totalAmount = amount || unitPrice * quantity;

  return {
    ...entry,
    id: entry.id || nextId("entry"),
    date: entry.date || today,
    patient: entry.patient || entry.customer || "مريض",
    serviceId: entry.serviceId || entry.service_id || service?.id || "",
    service: service?.name || entry.service || "خدمة",
    doctorId: entry.doctorId || entry.doctor_id || "",
    specialistId: entry.specialistId || entry.staff_id || "",
    quantity,
    unitPrice,
    amount: totalAmount,
    cost: asNumber(entry.cost ?? service?.defaultCost),
    discount: Math.min(asNumber(entry.discount), totalAmount),
    paymentMethod: entry.paymentMethod || entry.payment_method || "cash",
    notes: entry.notes || entry.note || ""
  };
}

function normalizeSupplier(supplier) {
  return {
    id: supplier.id || nextId("supplier"),
    name: supplier.name || "مورد بدون اسم",
    contact: supplier.contact || supplier.phone || supplier.email || "",
    city: supplier.city || "",
    category: supplier.category || "عام",
    notes: supplier.notes || "",
    active: supplier.active !== false
  };
}

function normalizeInventoryItem(item) {
  return {
    id: item.id || nextId("inventory"),
    name: item.name || "صنف بدون اسم",
    sku: item.sku || "",
    unit: item.unit || "قطعة",
    quantity: asNumber(item.quantity ?? item.stock),
    lowThreshold: asNumber(item.lowThreshold ?? item.low_threshold ?? item.reorderPoint),
    unitCost: asNumber(item.unitCost ?? item.unit_cost ?? item.cost),
    supplierId: item.supplierId || item.supplier_id || "",
    lastOrderedAt: item.lastOrderedAt || item.last_ordered_at || "",
    active: item.active !== false
  };
}

function normalizePurchaseOrder(order) {
  return {
    id: order.id || nextId("order"),
    itemId: order.itemId || order.item_id || "",
    supplierId: order.supplierId || order.supplier_id || "",
    date: order.date || today,
    quantity: asNumber(order.quantity),
    unitCost: asNumber(order.unitCost ?? order.unit_cost ?? order.cost),
    status: order.status || "ordered",
    branch: order.branch || "الفرع الرئيسي",
    notes: order.notes || ""
  };
}

function createSeedState() {
  const services = seedServices.map(normalizeService);
  const suppliers = seedSuppliers.map(normalizeSupplier);
  const inventory = seedInventoryItems.map(normalizeInventoryItem);
  const purchaseOrders = seedPurchaseOrders.map(normalizePurchaseOrder);
  return {
    demoHistoryVersion: DEMO_HISTORY_VERSION,
    settings: {
      clinicName: "عيادة رعاية التجريبية",
      activeDate: today,
      branch: "الفرع الرئيسي"
    },
    staff: seedStaff.map(normalizeStaffMember),
    services,
    rules: seedRules.map(normalizeRule),
    suppliers,
    inventory,
    purchaseOrders,
    accounts: seedAccounts.map(normalizeAccount),
    currentAccountId: "account-admin",
    entries: [...demoHistoryEntries, ...seedEntries].map(entry => normalizeEntry(entry, services)),
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
  const additions = demoHistoryEntries
    .filter(entry => !existingIds.has(entry.id))
    .map(entry => normalizeEntry(entry, loadedState.services));

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
    const seed = createSeedState();
    const services = mergeById(seed.services, Array.isArray(saved.services) ? saved.services.map(normalizeService) : []);
    const rules = mergeById(seed.rules, Array.isArray(saved.rules) ? saved.rules.map(normalizeRule) : []);
    const suppliers = mergeById(seed.suppliers, Array.isArray(saved.suppliers) ? saved.suppliers.map(normalizeSupplier) : []);
    const inventory = mergeById(seed.inventory, Array.isArray(saved.inventory) ? saved.inventory.map(normalizeInventoryItem) : []);
    const purchaseOrders = mergeById(seed.purchaseOrders, Array.isArray(saved.purchaseOrders) ? saved.purchaseOrders.map(normalizePurchaseOrder) : []);
    const accounts = mergeById(seed.accounts, Array.isArray(saved.accounts) ? saved.accounts.map(normalizeAccount) : []).map(normalizeAccount);
    const currentAccountId = accounts.some(account => account.id === saved.currentAccountId)
      ? saved.currentAccountId
      : "account-admin";
    if (saved.settings?.clinicName) {
      saved.settings.clinicName = saved.settings.clinicName.replaceAll("رعايا", "رعاية");
    }
    return ensureDemoHistory({
      demoHistoryVersion: saved.demoHistoryVersion || 0,
      settings: { ...seed.settings, ...saved.settings },
      staff: Array.isArray(saved.staff) ? saved.staff.map(normalizeStaffMember) : seed.staff,
      services,
      rules,
      suppliers,
      inventory,
      purchaseOrders,
      accounts,
      currentAccountId,
      entries: Array.isArray(saved.entries) ? saved.entries.map(entry => normalizeEntry(entry, services)) : seed.entries,
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
  accountSwitcher: document.querySelector("[data-account-switcher]"),
  accountForm: document.querySelector("[data-account-form]"),
  accountStaffSelect: document.querySelector("[data-account-staff-select]"),
  accountList: document.querySelector("[data-account-list]"),
  entryForm: document.querySelector("[data-entry-form]"),
  staffForm: document.querySelector("[data-staff-form]"),
  serviceForm: document.querySelector("[data-service-form]"),
  ruleForm: document.querySelector("[data-rule-form]"),
  supplierForm: document.querySelector("[data-supplier-form]"),
  inventoryForm: document.querySelector("[data-inventory-form]"),
  orderForm: document.querySelector("[data-order-form]"),
  reconcileForm: document.querySelector("[data-reconcile-form]"),
  doctorSelect: document.querySelector("[data-doctor-select]"),
  specialistSelect: document.querySelector("[data-specialist-select]"),
  serviceSelect: document.querySelector("[data-service-select]"),
  rulePersonSelect: document.querySelector("[data-rule-person-select]"),
  ruleServiceSelect: document.querySelector("[data-rule-service-select]"),
  inventorySupplierSelect: document.querySelector("[data-inventory-supplier-select]"),
  orderItemSelect: document.querySelector("[data-order-item-select]"),
  orderSupplierSelect: document.querySelector("[data-order-supplier-select]"),
  entryPreview: document.querySelector("[data-entry-preview]"),
  recentEntries: document.querySelector("[data-recent-entries]"),
  entryTable: document.querySelector("[data-entry-table]"),
  staffList: document.querySelector("[data-staff-list]"),
  serviceList: document.querySelector("[data-service-list]"),
  ruleList: document.querySelector("[data-rule-list]"),
  supplierList: document.querySelector("[data-supplier-list]"),
  inventoryList: document.querySelector("[data-inventory-list]"),
  lowStockList: document.querySelector("[data-low-stock-list]"),
  purchaseOrderList: document.querySelector("[data-purchase-order-list]"),
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
  const labels = {
    admin: "مدير",
    data_entry: "إدخال بيانات",
    doctor: "طبيب",
    specialist: "أخصائي"
  };
  return labels[role] || role;
}

function paymentLabel(method) {
  const labels = { cash: "كاش", card: "فيزا", transfer: "تحويل" };
  return labels[method] || method;
}

function getStaffMember(id) {
  return state.staff.find(member => member.id === id);
}

function activeAccounts() {
  return (state.accounts || []).filter(account => account.active !== false);
}

function currentAccount() {
  const accounts = activeAccounts();
  return accounts.find(account => account.id === state.currentAccountId)
    || accounts[0]
    || normalizeAccount(seedAccounts[0]);
}

function currentAllowedViews() {
  const account = currentAccount();
  if (account.role === "admin") return ADMIN_VIEWS;
  const views = (account.allowedViews || []).filter(view => VIEW_LABELS[view]);
  return views.length ? views : defaultViewsForRole(account.role);
}

function canManagePermissions() {
  const account = currentAccount();
  return account.role === "admin" || account.canManagePermissions === true;
}

function canViewSensitive() {
  const account = currentAccount();
  return account.role === "admin" || account.canViewSensitive === true;
}

function canView(viewName) {
  if (viewName === "accounts") return canManagePermissions();
  if (["reconcile", "salaries"].includes(viewName) && !canViewSensitive()) return false;
  return currentAllowedViews().includes(viewName);
}

function firstAllowedView() {
  return currentAllowedViews().find(view => view !== "accounts" || canManagePermissions()) || "entries";
}

function filterEntriesForAccount(entries) {
  const account = currentAccount();
  if (!account.ownEntriesOnly || !account.staffId) return entries;
  return entries.filter(entry => entry.doctorId === account.staffId || entry.specialistId === account.staffId);
}

function activeServices() {
  return state.services.filter(service => service.active !== false);
}

function getService(id) {
  return state.services.find(service => service.id === id);
}

function getSupplier(id) {
  return state.suppliers.find(supplier => supplier.id === id);
}

function getInventoryItem(id) {
  return state.inventory.find(item => item.id === id);
}

function activeSuppliers() {
  return state.suppliers.filter(supplier => supplier.active !== false);
}

function activeInventoryItems() {
  return state.inventory.filter(item => item.active !== false);
}

function isLowStock(item) {
  return item.active !== false
    && numberValue(item.lowThreshold) > 0
    && numberValue(item.quantity) <= numberValue(item.lowThreshold);
}

function lowStockItems() {
  return activeInventoryItems()
    .filter(isLowStock)
    .sort((a, b) => (a.quantity - a.lowThreshold) - (b.quantity - b.lowThreshold));
}

function stockStatus(item) {
  if (item.active === false) return { className: "warn", label: "متوقف" };
  if (!numberValue(item.lowThreshold)) return { className: "good", label: "بدون تنبيه" };
  if (isLowStock(item)) return { className: "bad", label: "يحتاج طلب" };
  return { className: "good", label: "مطمئن" };
}

function orderStatusLabel(status) {
  const labels = {
    planned: "مخطط",
    ordered: "تم الطلب",
    received: "تم الاستلام",
    cancelled: "ملغي"
  };
  return labels[status] || status;
}

function orderTotal(order) {
  return numberValue(order.quantity) * numberValue(order.unitCost);
}

function inventoryValue() {
  return state.inventory.reduce((sum, item) => (
    sum + numberValue(item.quantity) * numberValue(item.unitCost)
  ), 0);
}

function serviceLabel(entry) {
  return getService(entry.serviceId)?.name || entry.service || "خدمة";
}

function ruleModelLabel(model) {
  const labels = {
    member_rate: "نسبة العضو الافتراضية",
    pct_net: "نسبة من الربح بعد التكلفة",
    pct_gross: "نسبة من المقبوض",
    fixed: "مبلغ ثابت لكل عملية",
    tiered: "نسبة متدرجة"
  };
  return labels[model] || model;
}

function ruleDescription(rule) {
  const person = rule.personId ? getStaffMember(rule.personId)?.name : "كل الفريق";
  const service = rule.serviceId ? getService(rule.serviceId)?.name : "كل الخدمات";
  const value = rule.model === "member_rate" ? "حسب نسبة الموظف" : `${rule.value}%`;
  const fixedValue = rule.model === "fixed" ? money(rule.value) : value;
  return `${roleLabel(rule.appliesTo)} | ${person} | ${service} | ${ruleModelLabel(rule.model)} (${fixedValue})`;
}

function findRule(appliesTo, personId, serviceId) {
  const candidates = state.rules.filter(rule => {
    const roleMatches = rule.active !== false && rule.appliesTo === appliesTo;
    const personMatches = !rule.personId || rule.personId === personId;
    const serviceMatches = !rule.serviceId || rule.serviceId === serviceId;
    return roleMatches && personMatches && serviceMatches;
  });

  if (!candidates.length) return null;

  return candidates
    .map(rule => ({
      rule,
      score: (rule.personId ? 10 : 0) + (rule.serviceId ? 5 : 0)
    }))
    .sort((a, b) => b.score - a.score)[0].rule;
}

function netAmount(entry) {
  return Math.max(numberValue(entry.amount) - numberValue(entry.discount), 0);
}

function entryCost(entry) {
  return numberValue(entry.cost) * Math.max(numberValue(entry.quantity) || 1, 1);
}

function profitAmount(entry) {
  return Math.max(netAmount(entry) - entryCost(entry), 0);
}

function calculateMemberPayout(entry, member) {
  if (!member) return null;
  const appliesTo = member.role === "doctor" ? "doctor" : "specialist";
  const rule = findRule(appliesTo, member.id, entry.serviceId);
  const quantity = Math.max(numberValue(entry.quantity) || 1, 1);
  const gross = netAmount(entry);
  const profit = profitAmount(entry);
  const fallbackRate = numberValue(member.rate);
  const activeRule = rule || {
    model: "member_rate",
    value: fallbackRate,
    name: "نسبة العضو الافتراضية"
  };

  if (activeRule.model === "member_rate") {
    const base = appliesTo === "doctor" ? profit : gross;
    const baseLabel = appliesTo === "doctor" ? "الربح" : "المقبوض";
    const payout = base * (fallbackRate / 100);
    return {
      member,
      payout,
      formula: `${fallbackRate}% من ${baseLabel} ${money(base)}`
    };
  }

  if (activeRule.model === "fixed") {
    const payout = numberValue(activeRule.value) * quantity;
    return {
      member,
      payout,
      formula: `${money(activeRule.value)} ثابت × ${quantity}`
    };
  }

  if (activeRule.model === "pct_gross") {
    const payout = gross * (numberValue(activeRule.value) / 100);
    return {
      member,
      payout,
      formula: `${activeRule.value}% من المقبوض ${money(gross)}`
    };
  }

  if (activeRule.model === "pct_net") {
    const payout = profit * (numberValue(activeRule.value) / 100);
    return {
      member,
      payout,
      formula: `${activeRule.value}% من الربح ${money(profit)}`
    };
  }

  if (activeRule.model === "tiered") {
    const threshold = numberValue(activeRule.tierThreshold);
    const monthPrefix = state.settings.activeDate.slice(0, 7);
    const relatedCount = state.entries.filter(item => (
      item.date?.startsWith(monthPrefix)
      && (item.doctorId === member.id || item.specialistId === member.id)
    )).length;
    const rate = threshold && relatedCount >= threshold ? numberValue(activeRule.tierValue) : numberValue(activeRule.value);
    const payout = profit * (rate / 100);
    return {
      member,
      payout,
      formula: `${rate}% متدرجة من الربح ${money(profit)}`
    };
  }

  const payout = gross * (fallbackRate / 100);
  return {
    member,
    payout,
    formula: `${fallbackRate}% من المقبوض ${money(gross)}`
  };
}

function entryPayouts(entry) {
  return [entry.doctorId, entry.specialistId]
    .map(id => calculateMemberPayout(entry, getStaffMember(id)))
    .filter(Boolean);
}

function activeEntries() {
  return filterEntriesForAccount(state.entries).filter(entry => entry.date === state.settings.activeDate);
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
  return filterEntriesForAccount(state.entries).filter(entry => entry.date === date);
}

function entriesForLastDays(days) {
  const dates = new Set(dateRangeForLastDays(days));
  return filterEntriesForAccount(state.entries).filter(entry => dates.has(entry.date));
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
    const name = serviceLabel(entry);
    const current = services.get(name) || { service: name, count: 0, revenue: 0 };
    current.count += 1;
    current.revenue += netAmount(entry);
    services.set(name, current);
  });
  return [...services.values()].sort((a, b) => (
    canViewSensitive() ? b.revenue - a.revenue : b.count - a.count
  ));
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
    const related = entries
      .map(entry => ({ entry, payout: entryPayouts(entry).find(row => row.member.id === member.id) }))
      .filter(row => row.payout);
    const amount = related.reduce((sum, row) => sum + row.payout.payout, 0);
    return {
      member,
      operations: related.length,
      amount,
      formulas: [...new Set(related.map(row => row.payout.formula))].slice(0, 3)
    };
  });
}

function renderAccountSwitcher() {
  if (!els.accountSwitcher) return;
  const accounts = activeAccounts();
  if (!accounts.some(account => account.id === state.currentAccountId) && accounts.length) {
    state.currentAccountId = accounts[0].id;
  }
  els.accountSwitcher.innerHTML = accounts.map(account => (
    `<option value="${account.id}">${account.name} | ${roleLabel(account.role)}</option>`
  )).join("");
  els.accountSwitcher.value = state.currentAccountId;
}

function renderAccountStaffSelect() {
  if (!els.accountStaffSelect) return;
  els.accountStaffSelect.innerHTML = [
    `<option value="">غير مرتبط بموظف</option>`,
    ...state.staff.map(member => `<option value="${member.id}">${member.name} | ${roleLabel(member.role)}</option>`)
  ].join("");
}

function renderAccountList() {
  if (!els.accountList) return;
  if (!canManagePermissions()) {
    els.accountList.innerHTML = `<div class="empty-state">هذا الحساب لا يملك صلاحية إدارة الحسابات.</div>`;
    return;
  }

  els.accountList.innerHTML = (state.accounts || []).map(account => {
    const isAdmin = account.role === "admin";
    const staff = getStaffMember(account.staffId);
    const viewControls = ADMIN_VIEWS.map(view => `
      <label class="permission-check">
        <input
          type="checkbox"
          data-account-id="${account.id}"
          data-account-view="${view}"
          ${account.allowedViews.includes(view) ? "checked" : ""}
          ${isAdmin ? "disabled" : ""}
        >
        ${VIEW_LABELS[view]}
      </label>
    `).join("");

    return `
      <div class="permission-card">
        <div class="permission-card-head">
          <div>
            <strong>${account.name}</strong>
            <p>${roleLabel(account.role)}${staff ? ` | مرتبط بـ ${staff.name}` : ""}</p>
          </div>
          <div class="row-actions">
            <span class="status-pill ${account.active === false ? "bad" : "good"}">${account.active === false ? "موقوف" : "فعال"}</span>
            ${account.id !== "account-admin" && account.id !== state.currentAccountId ? `<button class="icon-button danger" type="button" data-delete-account="${account.id}">حذف</button>` : ""}
          </div>
        </div>
        <div class="permission-flags">
          <label class="permission-check">
            <input type="checkbox" data-account-id="${account.id}" data-account-flag="canViewSensitive" ${account.canViewSensitive ? "checked" : ""} ${isAdmin ? "disabled" : ""}>
            عرض المبالغ والنسب والتقارير
          </label>
          <label class="permission-check">
            <input type="checkbox" data-account-id="${account.id}" data-account-flag="ownEntriesOnly" ${account.ownEntriesOnly ? "checked" : ""} ${isAdmin ? "disabled" : ""}>
            رؤية عملياته فقط
          </label>
          <label class="permission-check">
            <input type="checkbox" data-account-id="${account.id}" data-account-flag="canManagePermissions" ${account.canManagePermissions ? "checked" : ""} ${isAdmin ? "disabled" : ""}>
            إدارة الحسابات والصلاحيات
          </label>
          <label class="permission-check">
            <input type="checkbox" data-account-id="${account.id}" data-account-flag="active" ${account.active !== false ? "checked" : ""} ${isAdmin ? "disabled" : ""}>
            حساب فعال
          </label>
        </div>
        <div class="permission-view-grid">${viewControls}</div>
      </div>
    `;
  }).join("");
}

function renderAccessControls() {
  renderAccountSwitcher();
  renderAccountStaffSelect();

  const activeView = document.querySelector(".view.active")?.dataset.view;
  if (!activeView || !canView(activeView)) {
    setView(firstAllowedView());
  }

  els.viewButtons.forEach(button => {
    button.hidden = !canView(button.dataset.viewButton);
  });

  const showSensitive = canViewSensitive();
  document.querySelectorAll("[data-sensitive]").forEach(element => {
    element.hidden = !showSensitive;
    if ("disabled" in element) {
      element.disabled = !showSensitive;
    }
    element.querySelectorAll("input, select, textarea, button").forEach(control => {
      control.disabled = !showSensitive;
    });
  });

  document.body.classList.toggle("limited-account", !showSensitive);
  renderAccountList();
}

function setView(viewName) {
  const targetView = canView(viewName) ? viewName : firstAllowedView();
  els.viewButtons.forEach(button => {
    button.classList.toggle("active", button.dataset.viewButton === targetView);
  });
  els.views.forEach(view => {
    view.classList.toggle("active", view.dataset.view === targetView);
  });
}

function renderClinicForm() {
  els.clinicForm.elements.clinicName.value = state.settings.clinicName;
  els.clinicForm.elements.activeDate.value = state.settings.activeDate;
  els.clinicForm.elements.branch.value = state.settings.branch || "";
  els.clinicTitle.textContent = state.settings.clinicName;
}

function renderStaffSelects() {
  const account = currentAccount();
  const scopedMember = account.ownEntriesOnly && account.staffId ? getStaffMember(account.staffId) : null;
  const doctors = scopedMember?.role === "doctor"
    ? [scopedMember]
    : state.staff.filter(member => member.role === "doctor");
  const specialists = scopedMember?.role === "specialist"
    ? [scopedMember]
    : state.staff.filter(member => member.role === "specialist");
  const services = activeServices();
  const staffOptionLabel = member => canViewSensitive() ? `${member.name} (${member.rate}%)` : member.name;

  els.doctorSelect.innerHTML = doctors.map(member => (
    `<option value="${member.id}">${staffOptionLabel(member)}</option>`
  )).join("");

  const specialistOptions = specialists.map(member => (
    `<option value="${member.id}">${staffOptionLabel(member)}</option>`
  ));
  els.specialistSelect.innerHTML = scopedMember?.role === "specialist"
    ? specialistOptions.join("")
    : [`<option value="">بدون أخصائي</option>`, ...specialistOptions].join("");

  if (els.serviceSelect) {
    els.serviceSelect.innerHTML = services.length
      ? services.map(service => `<option value="${service.id}">${service.name}</option>`).join("")
      : `<option value="">أضف خدمة أولاً</option>`;

    const selectedService = getService(els.serviceSelect.value) || services[0];
    if (selectedService && els.entryForm) {
      if (!els.entryForm.elements.amount.value) {
        els.entryForm.elements.amount.value = selectedService.defaultPrice || "";
      }
      if (!els.entryForm.elements.cost.value || els.entryForm.elements.cost.value === "0") {
        els.entryForm.elements.cost.value = selectedService.defaultCost || 0;
      }
    }
  }

  if (els.ruleServiceSelect) {
    els.ruleServiceSelect.innerHTML = [
      `<option value="">كل الخدمات</option>`,
      ...state.services.map(service => `<option value="${service.id}">${service.name}</option>`)
    ].join("");
  }

  renderRulePersonSelect();
}

function renderRulePersonSelect() {
  if (!els.rulePersonSelect || !els.ruleForm) return;
  const appliesTo = els.ruleForm.elements.appliesTo.value;
  const people = state.staff.filter(member => member.role === appliesTo);
  els.rulePersonSelect.innerHTML = [
    `<option value="">كل ${appliesTo === "doctor" ? "الأطباء" : "الأخصائيين"}</option>`,
    ...people.map(member => `<option value="${member.id}">${member.name}</option>`)
  ].join("");
}

function renderInventorySelects() {
  const suppliers = activeSuppliers();
  const items = activeInventoryItems();
  const supplierOptions = suppliers.length
    ? suppliers.map(supplier => `<option value="${supplier.id}">${supplier.name}</option>`).join("")
    : `<option value="">أضف مورد أولاً</option>`;

  if (els.inventorySupplierSelect) {
    els.inventorySupplierSelect.innerHTML = supplierOptions;
  }

  if (els.orderSupplierSelect) {
    els.orderSupplierSelect.innerHTML = supplierOptions;
  }

  if (els.orderItemSelect) {
    els.orderItemSelect.innerHTML = items.length
      ? items.map(item => `<option value="${item.id}">${item.name} (${item.quantity} ${item.unit})</option>`).join("")
      : `<option value="">أضف صنف أولاً</option>`;
  }
}

function renderKpis(entries, totals, diffs) {
  if (!canViewSensitive()) {
    document.querySelector('[data-kpi="revenue"]').textContent = "مخفي";
    document.querySelector('[data-kpi-note="revenue"]').textContent = `ضمن صلاحياتك: ${totals.count} عملية`;
    document.querySelector('[data-kpi="cash"]').textContent = "مخفي";
    document.querySelector('[data-kpi="card"]').textContent = "مخفي";
    document.querySelector('[data-kpi="difference"]').textContent = "مخفي";
    document.querySelector('[data-kpi-note="difference"]').textContent = "صلاحية مالية مطلوبة";
    return;
  }

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

  if (!canViewSensitive()) {
    els.dashboardSummary.textContent = entries.length
      ? `يعرض هذا الحساب ${entries.length} عملية ضمن صلاحياته لهذا التاريخ. التفاصيل المالية مخفية.`
      : "لا توجد عمليات ظاهرة لهذا الحساب في هذا التاريخ.";
    els.closeChip.textContent = "الإغلاق مخفي";
    els.discountChip.textContent = "الخصومات مخفية";
    els.averageChip.textContent = "المتوسط مخفي";
    document.querySelector('[data-kpi="weekRevenue"]').textContent = "مخفي";
    document.querySelector('[data-kpi-note="weekRevenue"]').textContent = `${weekEntries.length} عملية ظاهرة خلال آخر 7 أيام`;
    return;
  }

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
  const showSensitive = canViewSensitive();
  const maxValue = Math.max(...series.map(day => showSensitive ? day.totals.revenue : day.totals.count), 1);
  const formatter = new Intl.DateTimeFormat("ar-JO", { weekday: "short" });
  const activeDate = state.settings.activeDate;
  const totalCount = series.reduce((sum, day) => sum + day.totals.count, 0);

  els.weekCount.textContent = `${totalCount} عملية`;
  els.weekChart.innerHTML = series.map(day => {
    const value = showSensitive ? day.totals.revenue : day.totals.count;
    const height = Math.max((value / maxValue) * 100, value ? 12 : 4);
    const label = formatter.format(new Date(`${day.date}T12:00:00`));
    return `
      <div class="chart-day ${day.date === activeDate ? "today" : ""}">
        <div class="chart-value">${showSensitive ? money(day.totals.revenue).replace(" د.أ", "") : day.totals.count}</div>
        <div class="bar-track">
          <div class="bar-fill" style="--bar-height:${height}%"></div>
        </div>
        <div class="chart-label">${label}</div>
      </div>
    `;
  }).join("");
}

function renderPaymentBreakdown(totals) {
  if (!canViewSensitive()) {
    els.paymentSummary.textContent = "طرق الدفع والمبالغ مخفية لهذا الحساب.";
    els.paymentBars.innerHTML = `<div class="empty-state">يمكن للمدير تفعيل عرض المعلومات المالية من شاشة الصلاحيات.</div>`;
    return;
  }

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
  if (!canViewSensitive()) {
    els.salaryBreakdown.innerHTML = `<div class="empty-state">النسب والمستحقات مخفية لهذا الحساب.</div>`;
    return;
  }

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
            <small>${roleLabel(row.member.role)} | ${row.operations} عملية | ${row.formulas.join("، ") || `${row.member.rate}% افتراضي`}</small>
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
  if (!canViewSensitive()) {
    els.closeSummary.innerHTML = `<div class="empty-state">مطابقة الإغلاق مخفية لهذا الحساب.</div>`;
    return;
  }

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

  if (!canViewSensitive()) {
    const insights = [
      {
        title: topService ? `أكثر خدمة تكراراً: ${topService.service}` : "لا توجد خدمة بارزة بعد",
        body: topService ? `${topService.count} عمليات ظاهرة خلال آخر 7 أيام.` : "ستظهر الخدمة الأعلى تكراراً بعد إدخال العمليات."
      },
      {
        title: `عمليات اليوم: ${entries.length}`,
        body: "يعرض هذا الرقم العمليات المسموح لهذا الحساب برؤيتها فقط."
      }
    ];
    els.insightList.innerHTML = insights.map(insight => `
      <div class="insight-card">
        <strong>${insight.title}</strong>
        <p>${insight.body}</p>
      </div>
    `).join("");
    return;
  }

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
        <td>${serviceLabel(entry)}</td>
        <td><span class="pill">${paymentLabel(entry.paymentMethod)}</span></td>
        <td>${canViewSensitive() ? money(netAmount(entry)) : "مخفي"}</td>
      </tr>
  `).join("");
}

function renderEntryTable(entries) {
  const showSensitive = canViewSensitive();
  if (!entries.length) {
    els.entryTable.innerHTML = `<tr><td colspan="${showSensitive ? 6 : 3}">أضف أول عملية حتى تظهر في سجل اليوم.</td></tr>`;
    return;
  }

  els.entryTable.innerHTML = entries.slice().reverse().map(entry => {
    const doctor = getStaffMember(entry.doctorId);
    const specialist = getStaffMember(entry.specialistId);
    const payouts = entryPayouts(entry);
    const payoutText = payouts.length
      ? payouts.map(row => `${row.member.name}: ${money(row.payout)}`).join("<br>")
      : "لا يوجد";
    return `
      <tr>
        <td>${entry.patient}</td>
        <td>${serviceLabel(entry)}</td>
        <td>${[doctor?.name, specialist?.name].filter(Boolean).join(" / ") || "غير محدد"}</td>
        ${showSensitive ? `<td>${money(netAmount(entry))}</td>` : ""}
        ${showSensitive ? `<td><span class="formula-pill">${payoutText}</span></td>` : ""}
        ${showSensitive ? `<td><button class="icon-button danger" type="button" data-delete-entry="${entry.id}">حذف</button></td>` : ""}
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
          ${canViewSensitive() ? `<span class="pill">${member.rate}%</span>` : ""}
        </div>
      </div>
      ${canViewSensitive() ? `<button class="icon-button danger" type="button" data-delete-staff="${member.id}">حذف</button>` : ""}
    </div>
  `).join("");
}

function renderServiceList() {
  if (!els.serviceList) return;
  if (!state.services.length) {
    els.serviceList.innerHTML = `<div class="empty-state">أضف الخدمات حتى تظهر في نموذج العمليات.</div>`;
    return;
  }

  els.serviceList.innerHTML = state.services.map(service => `
    <div class="staff-card">
      <div>
        <strong>${service.name}</strong>
        <div class="staff-meta">
          <span class="pill">السعر ${money(service.defaultPrice)}</span>
          ${canViewSensitive() ? `<span class="pill">التكلفة ${money(service.defaultCost)}</span>` : ""}
          <span class="pill">${service.active === false ? "متوقفة" : "فعالة"}</span>
        </div>
      </div>
      ${canViewSensitive() ? `<button class="icon-button danger" type="button" data-delete-service="${service.id}">حذف</button>` : ""}
    </div>
  `).join("");
}

function renderRuleList() {
  if (!els.ruleList) return;
  if (!canViewSensitive()) {
    els.ruleList.innerHTML = `<div class="empty-state">قواعد النسب والمستحقات مخفية لهذا الحساب.</div>`;
    return;
  }
  if (!state.rules.length) {
    els.ruleList.innerHTML = `<div class="empty-state">لا توجد قواعد مستحقات بعد.</div>`;
    return;
  }

  els.ruleList.innerHTML = state.rules.map(rule => `
    <div class="staff-card">
      <div>
        <strong>${rule.name}</strong>
        <p>${ruleDescription(rule)}</p>
      </div>
      <button class="icon-button danger" type="button" data-delete-rule="${rule.id}">حذف</button>
    </div>
  `).join("");
}

function renderSupplierList() {
  if (!els.supplierList) return;
  if (!state.suppliers.length) {
    els.supplierList.innerHTML = `<div class="empty-state">أضف مورداً حتى يظهر في دليل الطلب.</div>`;
    return;
  }

  els.supplierList.innerHTML = state.suppliers.map(supplier => `
    <div class="staff-card">
      <div>
        <strong>${supplier.name}</strong>
        <p>${supplier.category || "عام"} | ${supplier.city || "بدون مدينة"} | ${supplier.contact || "لا يوجد تواصل"}</p>
        ${supplier.notes ? `<p>${supplier.notes}</p>` : ""}
      </div>
      <button class="icon-button danger" type="button" data-delete-supplier="${supplier.id}">حذف</button>
    </div>
  `).join("");
}

function renderInventoryKpis() {
  const itemsEl = document.querySelector('[data-inventory-kpi="items"]');
  if (!itemsEl) return;
  const activeItems = activeInventoryItems();
  document.querySelector('[data-inventory-kpi="items"]').textContent = activeItems.length;
  document.querySelector('[data-inventory-kpi="low"]').textContent = lowStockItems().length;
  document.querySelector('[data-inventory-kpi="suppliers"]').textContent = activeSuppliers().length;
  document.querySelector('[data-inventory-kpi="value"]').textContent = money(inventoryValue());
}

function renderLowStockList() {
  if (!els.lowStockList) return;
  const rows = lowStockItems();
  if (!rows.length) {
    els.lowStockList.innerHTML = `<div class="empty-state">لا توجد أصناف تحت حد الطلب الآن.</div>`;
    return;
  }

  els.lowStockList.innerHTML = rows.map(item => {
    const supplier = getSupplier(item.supplierId);
    return `
      <div class="staff-card low-stock-card">
        <div>
          <strong>${item.name}</strong>
          <p>المتوفر ${item.quantity} ${item.unit} | حد الطلب ${item.lowThreshold} ${item.unit}</p>
          <p>المورد المقترح: ${supplier?.name || "غير محدد"}${supplier?.contact ? ` | ${supplier.contact}` : ""}</p>
        </div>
        <button class="text-button" type="button" data-fill-order="${item.id}">طلب</button>
      </div>
    `;
  }).join("");
}

function renderInventoryList() {
  if (!els.inventoryList) return;
  if (!state.inventory.length) {
    els.inventoryList.innerHTML = `<div class="empty-state">أضف أول صنف للمخزون.</div>`;
    return;
  }

  els.inventoryList.innerHTML = state.inventory.map(item => {
    const supplier = getSupplier(item.supplierId);
    const status = stockStatus(item);
    const lastOrder = item.lastOrderedAt ? new Date(`${item.lastOrderedAt}T12:00:00`).toLocaleDateString("ar-JO") : "لا يوجد";
    return `
      <div class="staff-card inventory-card">
        <div>
          <strong>${item.name}</strong>
          <p>${item.sku ? `${item.sku} | ` : ""}${item.quantity} ${item.unit} | حد التنبيه ${item.lowThreshold || "معطل"}</p>
          <p>المورد: ${supplier?.name || "غير محدد"}${canViewSensitive() ? ` | التكلفة ${money(item.unitCost)}` : ""} | آخر طلب ${lastOrder}</p>
        </div>
        <div class="row-actions">
          <span class="status-pill ${status.className}">${status.label}</span>
          <button class="text-button" type="button" data-fill-order="${item.id}">طلب</button>
          <button class="icon-button danger" type="button" data-delete-inventory="${item.id}">حذف</button>
        </div>
      </div>
    `;
  }).join("");
}

function renderPurchaseOrders() {
  if (!els.purchaseOrderList) return;
  const showSensitive = canViewSensitive();
  if (!state.purchaseOrders.length) {
    els.purchaseOrderList.innerHTML = `<tr><td colspan="${showSensitive ? 9 : 7}">لا يوجد سجل طلبات بعد.</td></tr>`;
    return;
  }

  els.purchaseOrderList.innerHTML = state.purchaseOrders.slice().reverse().map(order => {
    const item = getInventoryItem(order.itemId);
    const supplier = getSupplier(order.supplierId);
    const canReceive = order.status !== "received" && order.status !== "cancelled";
    return `
      <tr>
        <td>${new Date(`${order.date}T12:00:00`).toLocaleDateString("ar-JO")}</td>
        <td>${item?.name || "صنف محذوف"}</td>
        <td>${supplier?.name || "مورد محذوف"}</td>
        <td>${order.branch || state.settings.branch || "الفرع الرئيسي"}</td>
        <td>${order.quantity} ${item?.unit || ""}</td>
        ${showSensitive ? `<td>${money(order.unitCost)}</td>` : ""}
        ${showSensitive ? `<td><strong>${money(orderTotal(order))}</strong></td>` : ""}
        <td><span class="status-pill ${order.status === "received" ? "good" : order.status === "cancelled" ? "bad" : "warn"}">${orderStatusLabel(order.status)}</span></td>
        <td>
          ${canReceive ? `<button class="text-button" type="button" data-receive-order="${order.id}">استلام</button>` : ""}
          <button class="icon-button danger" type="button" data-delete-order="${order.id}">حذف</button>
        </td>
      </tr>
    `;
  }).join("");
}

function updateEntryPreview() {
  if (!els.entryPreview || !els.entryForm) return;
  if (!canViewSensitive()) {
    els.entryPreview.textContent = "سيتم حفظ العملية بدون عرض النسب أو المستحقات لهذا الحساب.";
    return;
  }

  const data = Object.fromEntries(new FormData(els.entryForm).entries());
  const service = getService(data.serviceId);
  const quantity = Math.max(numberValue(data.quantity) || 1, 1);
  const unitPrice = numberValue(data.amount || service?.defaultPrice);
  const amount = unitPrice * quantity;
  const account = currentAccount();
  const scopedMember = account.ownEntriesOnly && account.staffId ? getStaffMember(account.staffId) : null;
  const previewEntry = normalizeEntry({
    date: state.settings.activeDate,
    patient: data.patient || "مريض",
    serviceId: data.serviceId,
    service: service?.name,
    doctorId: scopedMember?.role === "doctor" ? scopedMember.id : data.doctorId,
    specialistId: scopedMember?.role === "specialist" ? scopedMember.id : data.specialistId,
    quantity,
    unitPrice,
    amount,
    cost: numberValue(data.cost ?? service?.defaultCost),
    discount: numberValue(data.discount),
    paymentMethod: data.paymentMethod || "cash"
  }, state.services);
  const payouts = entryPayouts(previewEntry);

  if (!service || !data.doctorId) {
    els.entryPreview.textContent = "اختر الخدمة والطبيب لعرض صيغة المستحقات قبل الحفظ.";
    return;
  }

  els.entryPreview.innerHTML = payouts.length
    ? payouts.map(row => `<span>${row.member.name}: <strong>${money(row.payout)}</strong> | ${row.formula}</span>`).join("")
    : "لا توجد مستحقات محسوبة لهذه العملية.";
}

function renderSalaries(entries) {
  if (!canViewSensitive()) {
    els.salaryTable.innerHTML = `<tr><td colspan="5">كشف الرواتب والنسب مخفي لهذا الحساب.</td></tr>`;
    return;
  }

  const rows = salaryRows(entries);
  if (!rows.length) {
    els.salaryTable.innerHTML = `<tr><td colspan="5">أضف موظفين وعمليات لإظهار الرواتب.</td></tr>`;
    return;
  }

  els.salaryTable.innerHTML = rows.map(row => `
    <tr>
      <td>${row.member.name}</td>
      <td>${roleLabel(row.member.role)}</td>
      <td>${row.formulas.join("<br>") || `${row.member.rate}% افتراضي`}</td>
      <td>${row.operations}</td>
      <td><strong>${money(row.amount)}</strong></td>
    </tr>
  `).join("");
}

function renderReconciliation(totals, reconciliation, diffs) {
  if (!canViewSensitive()) {
    els.reconcileResult.innerHTML = `<div class="empty-state">مطابقة الإغلاق مخفية لهذا الحساب.</div>`;
    return;
  }

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
  const showSensitive = canViewSensitive();

  if (!entries.length) {
    alerts.push({
      type: "warning",
      title: "لا توجد عمليات لهذا التاريخ",
      body: showSensitive
        ? "أضف عملية من قسم عمليات اليوم حتى تظهر الإيرادات والنسب."
        : "أضف عملية من قسم عمليات اليوم حتى تظهر ضمن صلاحيات هذا الحساب."
    });
  }

  if (showSensitive && !activeReconciliation()) {
    alerts.push({
      type: "warning",
      title: "إغلاق اليوم غير محفوظ",
      body: "أدخل الموجود فعلياً من كاش وفيزا وتحويلات قبل اعتماد ملخص اليوم."
    });
  } else if (showSensitive && diffs && Math.abs(diffs.totalDiff) >= 0.01) {
    alerts.push({
      type: "danger",
      title: "يوجد فرق في الإغلاق",
      body: `فرق اليوم الإجمالي هو ${money(diffs.totalDiff)}. راجع الخصومات وطرق الدفع والعمليات غير المكتملة.`
    });
  } else if (showSensitive) {
    alerts.push({
      type: "",
      title: "الإغلاق متطابق",
      body: "المبالغ المسجلة تطابق الكاش والفيزا والتحويلات الفعلية."
    });
  }

  if (showSensitive && totals.discount > 0) {
    alerts.push({
      type: "warning",
      title: "هناك خصومات مسجلة",
      body: `إجمالي الخصومات لهذا التاريخ هو ${money(totals.discount)}.`
    });
  }

  const lowItems = lowStockItems();
  if (lowItems.length > 0) {
    alerts.push({
      type: "warning",
      title: "أصناف مخزون تحتاج طلب",
      body: `${lowItems.length} صنف تحت حد الطلب: ${lowItems.slice(0, 3).map(item => item.name).join("، ")}.`
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

  if (!showSensitive) {
    els.healthLabel.textContent = "صلاحيات محدودة";
    els.healthNote.textContent = "هذا الحساب يرى العمليات المسموح بها فقط.";
  } else if (diffs && Math.abs(diffs.totalDiff) < 0.01) {
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
  renderAccessControls();
  const entries = activeEntries();
  const totals = totalsFor(entries);
  const reconciliation = activeReconciliation();
  const diffs = reconciliationDiffs(totals, reconciliation);
  const weekSeries = weeklySeries(7);
  const weekEntries = entriesForLastDays(7);
  const weekTotals = totalsFor(weekEntries);

  renderClinicForm();
  renderStaffSelects();
  renderInventorySelects();
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
  renderServiceList();
  renderRuleList();
  renderInventoryKpis();
  renderSupplierList();
  renderInventoryList();
  renderLowStockList();
  renderPurchaseOrders();
  renderSalaries(entries);
  renderReconciliation(totals, reconciliation, diffs);
  renderLeads();
  renderAlerts(entries, totals, diffs);
  updateEntryPreview();
}

els.viewButtons.forEach(button => {
  button.addEventListener("click", () => setView(button.dataset.viewButton));
});

document.querySelectorAll("[data-jump]").forEach(button => {
  button.addEventListener("click", () => setView(button.dataset.jump));
});

if (els.accountSwitcher) {
  els.accountSwitcher.addEventListener("change", event => {
    state.currentAccountId = event.target.value;
    saveState();
    render();
  });
}

if (els.accountForm) {
  els.accountForm.addEventListener("submit", event => {
    event.preventDefault();
    if (!canManagePermissions()) return;
    const data = Object.fromEntries(new FormData(els.accountForm).entries());
    state.accounts.push(normalizeAccount({
      id: nextId("account"),
      name: data.name.trim(),
      role: data.role,
      staffId: data.staffId,
      allowedViews: defaultViewsForRole(data.role),
      canViewSensitive: data.canViewSensitive === "on",
      ownEntriesOnly: data.ownEntriesOnly === "on",
      canManagePermissions: false,
      active: true
    }));
    els.accountForm.reset();
    saveState();
    render();
  });
}

if (els.entryForm) {
  els.entryForm.addEventListener("input", updateEntryPreview);
  els.entryForm.addEventListener("change", event => {
    if (event.target === els.serviceSelect) {
      const service = getService(els.serviceSelect.value);
      if (service) {
        els.entryForm.elements.amount.value = service.defaultPrice || "";
        els.entryForm.elements.cost.value = service.defaultCost || 0;
      }
    }
    updateEntryPreview();
  });
}

els.clinicForm.addEventListener("submit", event => {
  event.preventDefault();
  if (!canViewSensitive()) return;
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
  if (!canView("entries")) return;
  const data = Object.fromEntries(new FormData(els.entryForm).entries());
  const service = getService(data.serviceId);
  const quantity = Math.max(numberValue(data.quantity) || 1, 1);
  const unitPrice = numberValue(data.amount || service?.defaultPrice);
  const amount = unitPrice * quantity;
  const account = currentAccount();
  const scopedMember = account.ownEntriesOnly && account.staffId ? getStaffMember(account.staffId) : null;
  state.entries.push({
    id: nextId("entry"),
    date: state.settings.activeDate,
    patient: data.patient.trim(),
    serviceId: data.serviceId,
    service: service?.name || "خدمة",
    doctorId: scopedMember?.role === "doctor" ? scopedMember.id : data.doctorId,
    specialistId: scopedMember?.role === "specialist" ? scopedMember.id : data.specialistId,
    quantity,
    unitPrice,
    amount,
    cost: numberValue(data.cost || service?.defaultCost),
    discount: Math.min(numberValue(data.discount), amount),
    paymentMethod: data.paymentMethod,
    notes: data.notes.trim()
  });
  els.entryForm.reset();
  els.entryForm.elements.quantity.value = 1;
  els.entryForm.elements.discount.value = 0;
  saveState();
  render();
});

els.staffForm.addEventListener("submit", event => {
  event.preventDefault();
  if (!canViewSensitive()) return;
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

if (els.serviceForm) {
  els.serviceForm.addEventListener("submit", event => {
    event.preventDefault();
    if (!canViewSensitive()) return;
    const data = Object.fromEntries(new FormData(els.serviceForm).entries());
    state.services.push(normalizeService({
      id: nextId("service"),
      name: data.name.trim(),
      defaultPrice: data.defaultPrice,
      defaultCost: data.defaultCost,
      active: data.active === "true"
    }));
    els.serviceForm.reset();
    saveState();
    render();
  });
}

if (els.ruleForm) {
  els.ruleForm.addEventListener("submit", event => {
    event.preventDefault();
    if (!canViewSensitive()) return;
    const data = Object.fromEntries(new FormData(els.ruleForm).entries());
    state.rules.push(normalizeRule({
      id: nextId("rule"),
      name: data.name.trim(),
      appliesTo: data.appliesTo,
      personId: data.personId,
      serviceId: data.serviceId,
      model: data.model,
      value: data.model === "member_rate" ? 0 : data.value,
      active: true
    }));
    els.ruleForm.reset();
    saveState();
    render();
  });

  els.ruleForm.elements.appliesTo.addEventListener("change", renderRulePersonSelect);
}

function applyOrderToItem(order, shouldReceive = false) {
  const item = getInventoryItem(order.itemId);
  if (!item) return;
  item.supplierId = order.supplierId || item.supplierId;
  item.unitCost = numberValue(order.unitCost) || item.unitCost;
  item.lastOrderedAt = order.date;
  if (shouldReceive) {
    item.quantity = numberValue(item.quantity) + numberValue(order.quantity);
  }
}

function fillOrderForm(itemId) {
  if (!els.orderForm) return;
  const item = getInventoryItem(itemId);
  if (!item) return;
  setView("inventory");
  els.orderForm.elements.itemId.value = item.id;
  els.orderForm.elements.supplierId.value = item.supplierId || activeSuppliers()[0]?.id || "";
  els.orderForm.elements.date.value = today;
  els.orderForm.elements.quantity.value = Math.max(numberValue(item.lowThreshold) * 2 - numberValue(item.quantity), 1);
  els.orderForm.elements.unitCost.value = item.unitCost || 0;
  els.orderForm.elements.status.value = "ordered";
  els.orderForm.elements.notes.value = "";
  els.orderForm.scrollIntoView({ behavior: "smooth", block: "center" });
}

if (els.supplierForm) {
  els.supplierForm.addEventListener("submit", event => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(els.supplierForm).entries());
    state.suppliers.push(normalizeSupplier({
      id: nextId("supplier"),
      name: data.name.trim(),
      contact: data.contact.trim(),
      city: data.city.trim(),
      category: data.category.trim(),
      notes: data.notes.trim(),
      active: true
    }));
    els.supplierForm.reset();
    saveState();
    render();
  });
}

if (els.inventoryForm) {
  els.inventoryForm.addEventListener("submit", event => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(els.inventoryForm).entries());
    state.inventory.push(normalizeInventoryItem({
      id: nextId("inventory"),
      name: data.name.trim(),
      sku: data.sku.trim(),
      unit: data.unit.trim(),
      quantity: data.quantity,
      lowThreshold: data.lowThreshold,
      unitCost: data.unitCost,
      supplierId: data.supplierId,
      active: true
    }));
    els.inventoryForm.reset();
    saveState();
    render();
  });
}

if (els.orderForm) {
  els.orderForm.elements.date.value = today;
  els.orderForm.addEventListener("change", event => {
    if (event.target === els.orderItemSelect) {
      const item = getInventoryItem(els.orderItemSelect.value);
      if (item) {
        els.orderForm.elements.supplierId.value = item.supplierId || activeSuppliers()[0]?.id || "";
        els.orderForm.elements.unitCost.value = item.unitCost || 0;
      }
    }
  });

  els.orderForm.addEventListener("submit", event => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(els.orderForm).entries());
    const order = normalizePurchaseOrder({
      id: nextId("order"),
      itemId: data.itemId,
      supplierId: data.supplierId,
      date: data.date,
      quantity: data.quantity,
      unitCost: data.unitCost,
      status: data.status,
      branch: state.settings.branch || "الفرع الرئيسي",
      notes: data.notes.trim()
    });
    state.purchaseOrders.push(order);
    applyOrderToItem(order, order.status === "received");
    els.orderForm.reset();
    els.orderForm.elements.date.value = today;
    saveState();
    render();
  });
}

els.reconcileForm.addEventListener("submit", event => {
  event.preventDefault();
  if (!canViewSensitive()) return;
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
  const deleteServiceId = event.target.dataset.deleteService;
  const deleteRuleId = event.target.dataset.deleteRule;
  const deleteSupplierId = event.target.dataset.deleteSupplier;
  const deleteInventoryId = event.target.dataset.deleteInventory;
  const deleteOrderId = event.target.dataset.deleteOrder;
  const deleteAccountId = event.target.dataset.deleteAccount;
  const receiveOrderId = event.target.dataset.receiveOrder;
  const fillOrderId = event.target.dataset.fillOrder;

  if (deleteEntryId) {
    if (!canViewSensitive()) return;
    state.entries = state.entries.filter(entry => entry.id !== deleteEntryId);
    saveState();
    render();
  }

  if (deleteStaffId) {
    if (!canViewSensitive()) return;
    const isUsed = state.entries.some(entry => (
      entry.doctorId === deleteStaffId || entry.specialistId === deleteStaffId
    ));
    if (isUsed && !confirm("هذا الموظف مرتبط بعمليات سابقة. هل تريد حذفه؟")) return;
    state.staff = state.staff.filter(member => member.id !== deleteStaffId);
    saveState();
    render();
  }

  if (deleteServiceId) {
    if (!canViewSensitive()) return;
    const isUsed = state.entries.some(entry => entry.serviceId === deleteServiceId);
    if (isUsed && !confirm("هذه الخدمة مرتبطة بعمليات سابقة. هل تريد حذفها؟")) return;
    state.services = state.services.filter(service => service.id !== deleteServiceId);
    state.rules = state.rules.filter(rule => rule.serviceId !== deleteServiceId);
    saveState();
    render();
  }

  if (deleteRuleId) {
    if (!canViewSensitive()) return;
    state.rules = state.rules.filter(rule => rule.id !== deleteRuleId);
    saveState();
    render();
  }

  if (deleteSupplierId) {
    const isUsed = state.inventory.some(item => item.supplierId === deleteSupplierId)
      || state.purchaseOrders.some(order => order.supplierId === deleteSupplierId);
    if (isUsed && !confirm("هذا المورد مرتبط بأصناف أو طلبات. هل تريد حذفه؟")) return;
    state.suppliers = state.suppliers.filter(supplier => supplier.id !== deleteSupplierId);
    state.inventory = state.inventory.map(item => (
      item.supplierId === deleteSupplierId ? { ...item, supplierId: "" } : item
    ));
    saveState();
    render();
  }

  if (deleteInventoryId) {
    const isUsed = state.purchaseOrders.some(order => order.itemId === deleteInventoryId);
    if (isUsed && !confirm("هذا الصنف مرتبط بسجل طلبات. هل تريد حذفه من قائمة المخزون؟")) return;
    state.inventory = state.inventory.filter(item => item.id !== deleteInventoryId);
    saveState();
    render();
  }

  if (deleteOrderId) {
    if (!confirm("هل تريد حذف سجل الطلب؟ لن يتم تعديل كمية المخزون تلقائياً.")) return;
    state.purchaseOrders = state.purchaseOrders.filter(order => order.id !== deleteOrderId);
    saveState();
    render();
  }

  if (receiveOrderId) {
    const order = state.purchaseOrders.find(item => item.id === receiveOrderId);
    if (!order || order.status === "received") return;
    order.status = "received";
    applyOrderToItem(order, true);
    saveState();
    render();
  }

  if (fillOrderId) {
    fillOrderForm(fillOrderId);
  }

  if (deleteAccountId) {
    if (!canManagePermissions() || deleteAccountId === "account-admin" || deleteAccountId === state.currentAccountId) return;
    state.accounts = state.accounts.filter(account => account.id !== deleteAccountId);
    saveState();
    render();
  }
});

document.addEventListener("change", event => {
  const accountId = event.target.dataset.accountId;
  const viewName = event.target.dataset.accountView;
  const flagName = event.target.dataset.accountFlag;
  if (!accountId || (!viewName && !flagName) || !canManagePermissions()) return;

  const account = state.accounts.find(item => item.id === accountId);
  if (!account || account.role === "admin") return;

  if (viewName) {
    const views = new Set(account.allowedViews || []);
    if (event.target.checked) {
      views.add(viewName);
    } else {
      views.delete(viewName);
    }
    account.allowedViews = [...views].filter(view => VIEW_LABELS[view]);
    if (!account.allowedViews.length) account.allowedViews = ["entries"];
  }

  if (flagName) {
    if (flagName === "active" && account.id === state.currentAccountId && !event.target.checked) {
      event.target.checked = true;
      return;
    }
    account[flagName] = event.target.checked;
  }

  state.accounts = state.accounts.map(normalizeAccount);
  saveState();
  render();
});

document.querySelector("[data-clear-entries]").addEventListener("click", () => {
  if (!canViewSensitive()) return;
  if (!confirm("سيتم مسح سجل التاريخ المحدد فقط. هل أنت متأكد؟")) return;
  state.entries = state.entries.filter(entry => entry.date !== state.settings.activeDate);
  delete state.reconciliations[state.settings.activeDate];
  saveState();
  render();
});

function csvValue(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function downloadCSV(rows, filename) {
  if (!rows.length) return;
  const keys = Object.keys(rows[0]);
  const csv = [
    keys.map(csvValue).join(","),
    ...rows.map(row => keys.map(key => csvValue(row[key])).join(","))
  ].join("\n");
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }));
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

function exportEntries() {
  if (!canViewSensitive()) return;
  const rows = activeEntries().map(entry => ({
    date: entry.date,
    patient: entry.patient,
    service: serviceLabel(entry),
    doctor: getStaffMember(entry.doctorId)?.name || "",
    specialist: getStaffMember(entry.specialistId)?.name || "",
    quantity: entry.quantity || 1,
    revenue: netAmount(entry),
    cost: entryCost(entry),
    payment: paymentLabel(entry.paymentMethod),
    payouts: entryPayouts(entry).map(row => `${row.member.name}: ${money(row.payout)} (${row.formula})`).join(" | ")
  }));
  downloadCSV(rows, `riaaya-entries-${state.settings.activeDate}.csv`);
}

function exportSalaries() {
  if (!canViewSensitive()) return;
  const rows = salaryRows(activeEntries()).map(row => ({
    date: state.settings.activeDate,
    member: row.member.name,
    role: roleLabel(row.member.role),
    operations: row.operations,
    formulas: row.formulas.join(" | "),
    payout: row.amount
  }));
  downloadCSV(rows, `riaaya-salaries-${state.settings.activeDate}.csv`);
}

function exportInventory() {
  if (!canViewSensitive()) return;
  const rows = state.purchaseOrders.map(order => {
    const item = getInventoryItem(order.itemId);
    const supplier = getSupplier(order.supplierId);
    return {
      date: order.date,
      item: item?.name || "صنف محذوف",
      supplier: supplier?.name || "مورد محذوف",
      branch: order.branch,
      quantity: order.quantity,
      unit: item?.unit || "",
      unitCost: order.unitCost,
      total: orderTotal(order),
      status: orderStatusLabel(order.status),
      notes: order.notes
    };
  });
  downloadCSV(rows, `riaaya-inventory-orders-${state.settings.activeDate}.csv`);
}

document.querySelector("[data-export-entries]")?.addEventListener("click", exportEntries);
document.querySelector("[data-export-salaries]")?.addEventListener("click", exportSalaries);
document.querySelector("[data-export-inventory]")?.addEventListener("click", exportInventory);

document.querySelector("[data-clear-leads]").addEventListener("click", () => {
  if (!confirm("هل تريد مسح طلبات التجربة المحفوظة على هذا الجهاز؟")) return;
  localStorage.removeItem(LEADS_KEY);
  render();
});

document.querySelectorAll("[data-print-report]").forEach(button => {
  button.addEventListener("click", () => {
    if (!canViewSensitive()) return;
    setView("salaries");
    window.print();
  });
});

render();
