const STORAGE_KEY = "riaayaMvpState";
const LEADS_KEY = "riaayaLeads";
const DEMO_HISTORY_VERSION = 8;
const PAYMENT_METHODS = ["cash", "card", "transfer"];
const DEFAULT_SCHEDULE_COLUMNS = [
  { id: "laser-women", label: "laser for women" },
  { id: "laser-women-2", label: "laser for women 2" },
  { id: "facial-women", label: "Facial for women" },
  { id: "doctor", label: "Doctor" },
  { id: "laser-men", label: "laser for men" },
  { id: "waiting", label: "Waiting" },
  { id: "product", label: "product" },
  { id: "facial-men", label: "facial for men" },
  { id: "nutrition", label: "تغذية" },
  { id: "notes", label: "Notes" }
];
const runtime = {
  mode: "trial",
  session: null,
  csrfToken: "",
  ready: false,
  saveTimer: null,
  saveInFlight: false,
  savePending: false,
  openReceiptId: "",
  operationReturnView: "dashboard",
  stateVersion: 0,
  serverNotifications: []
};

function storageGet(key) {
  try {
    if (typeof localStorage === "undefined") return null;
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function storageSet(key, value) {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(key, value);
  } catch {
    // Ignore storage errors in restricted browser contexts.
  }
}

function storageRemove(key) {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.removeItem(key);
  } catch {
    // Ignore storage errors in restricted browser contexts.
  }
}

const jordanDateParts = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Amman",
  year: "numeric",
  month: "2-digit",
  day: "2-digit"
}).formatToParts(new Date()).reduce((parts, part) => ({ ...parts, [part.type]: part.value }), {});
const today = `${jordanDateParts.year}-${jordanDateParts.month}-${jordanDateParts.day}`;

const VIEW_LABELS = {
  dashboard: "ملخص اليوم",
  growth: "فرص النمو",
  products: "المنتجات",
  entries: "عمليات اليوم",
  patients: "ملفات المرضى والزوار",
  bookings: "الحجوزات",
  staff: "الموظفون والنسب",
  services: "الخدمات المتاحة للعمليات",
  "service-admin": "إضافة خدمة",
  packages: "الباقات والجلسات",
  collections: "المبالغ المستحقة",
  inventory: "المخزون والموردون",
  expenses: "المصروفات",
  reconcile: "المطابقة",
  salaries: "الرواتب",
  reports: "التقارير",
  communications: "التواصل والفوترة",
  leads: "طلبات التجربة",
  accounts: "الحسابات والصلاحيات",
  imports: "استيراد البيانات"
};

const ADMIN_VIEWS = Object.keys(VIEW_LABELS).filter(view => view !== "leads");

const VIEW_MODULES = {
  entries: "operations",
  patients: "patients",
  bookings: "bookings",
  staff: "staff",
  services: "services",
  inventory: "inventory",
  expenses: "expenses",
  reconcile: "finance",
  salaries: "payroll",
  reports: "reports",
  communications: "communications",
  accounts: "accounts",
  imports: "imports"
};

const PERMISSION_FEATURES = [
  { id: "see_mobile", label: "User Can See Mobile Number", category: "patients" },
  { id: "access_financial", label: "User Can Access Financial", category: "financial", sensitive: true },
  { id: "access_medical", label: "User Can Access Medical", category: "medical", views: ["entries"] },
  { id: "access_price_medical", label: "User Can Access Price In Medical", category: "medical", sensitive: true },
  { id: "edit_treatments_medical", label: "User Can Access Edit Treatments In Medical", category: "medical", views: ["services"] },
  { id: "delete_treatments_medical", label: "User Can Access Delete Treatments In Medical", category: "medical", views: ["services"] },
  { id: "appointments_report", label: "User Can Access Appointments Report", category: "reports", views: ["reports"] },
  { id: "patients_page", label: "User Can Access Patients Page", category: "patients", views: ["patients"] },
  { id: "expenses_report", label: "User Can Access Expenses Report Page", category: "reports", views: ["reports", "expenses"], sensitive: true },
  { id: "expenses_settings", label: "User Can Access Expenses Settings Page", category: "financial", views: ["expenses"], sensitive: true },
  { id: "access_expenses", label: "User Can Access Expenses Page", category: "financial", views: ["expenses"], sensitive: true },
  { id: "add_expense", label: "User Can Add Expenses", category: "financial", views: ["expenses"], sensitive: true },
  { id: "edit_expense", label: "User Can Edit Expenses", category: "financial", views: ["expenses"], sensitive: true },
  { id: "delete_expense", label: "User Can Delete Expenses", category: "financial", views: ["expenses"], sensitive: true },
  { id: "manage_expense_categories", label: "User Can Manage Expense Groups", category: "financial", views: ["expenses"], sensitive: true },
  { id: "import_data", label: "User Can Import Clinic Data", category: "administration", views: ["imports"] },
  { id: "treatments_settings", label: "User Can Access Treatments Settings Page", category: "medical", views: ["services"] },
  { id: "cancel_package_medical", label: "User Can Cancel Package In Medical Page", category: "medical", views: ["entries"] },
  { id: "calendar_page", label: "User Can Access Calendar Page", category: "calendar", views: ["bookings"] },
  { id: "complete_package_session", label: "User Can Complete / Uncomplete Package session In Medical Page", category: "medical", views: ["entries"] },
  { id: "discount_medical", label: "User Can Access Discount In Medical Page", category: "financial", views: ["entries"], sensitive: true },
  { id: "edit_price_medical", label: "User Can Access Edit Price In Medical", category: "financial", views: ["services"], sensitive: true },
  { id: "mobile_calendar_print", label: "User Can See Mobile Number In Calendar Print", category: "calendar", views: ["bookings"] },
  { id: "delete_treatments_plan", label: "User Can Access Delete Treatments Plan In Medical", category: "medical", views: ["entries"] },
  { id: "complete_date_session", label: "User Can Access Complete Date For Session In Medical", category: "medical", views: ["entries"] },
  { id: "date_payment_financials", label: "User Can Access Date For Payment In Patient Financials", category: "financial", sensitive: true },
  { id: "edit_patient_information", label: "User Can Access Edit Patient Information", category: "patients", views: ["patients"] },
  { id: "payment_before_month", label: "User Can Add a Payment Before the Month", category: "financial", sensitive: true },
  { id: "payment_in_past", label: "User Can Add a Payment in The Past", category: "financial", sensitive: true },
  { id: "change_calendar_date", label: "User Can Change Date in the Calendar", category: "calendar", views: ["bookings"] },
  { id: "patient_number", label: "User Can Access Patient Number In Patients Page", category: "patients", views: ["patients"] },
  { id: "cash_details_report", label: "User Can Access Cash Details Report", category: "reports", views: ["reports"], sensitive: true },
  { id: "cash_details_past", label: "User Can Access Date in Cash Details Report in The Past", category: "reports", views: ["reports"], sensitive: true },
  { id: "medicine_radiology_lab", label: "User Can Add Medicine,Radiology and Lab In Medical Page", category: "medical", views: ["entries"] },
  { id: "sick_leave_reports", label: "User Can Access Sick Leave Reports In Medical Page", category: "reports", views: ["reports"] },
  { id: "inventory", label: "User Can Access Inventory", category: "inventory", views: ["inventory"] },
  { id: "material_consumable_inventory", label: "User Can Access Material Consumable In Inventory", category: "inventory", views: ["inventory"] },
  { id: "consumable_price_inventory", label: "User Can Access Consumable Price In Inventory", category: "inventory", views: ["inventory"], sensitive: true },
  { id: "consumed_amount_required", label: "Consumed Amount Required For User", category: "inventory", views: ["inventory"] },
  { id: "material_remaining_report", label: "User Can Access Material Name / Remaining In Inventory ( Materials Report )", category: "inventory", views: ["inventory", "reports"] },
  { id: "sms_report", label: "User Can Access SMS Report", category: "communication", views: ["reports"] },
  { id: "sms_groups", label: "User Can Access SMS Groups", category: "communication", views: ["communications"] },
  { id: "communications_hub", label: "User Can Access Communications Hub", category: "communication", views: ["communications"] },
  { id: "send_role_digests", label: "User Can Schedule Role Daily Reports", category: "communication", views: ["communications"] },
  { id: "send_sms_campaigns", label: "User Can Create SMS Campaigns", category: "communication", views: ["communications"] },
  { id: "manage_jofotara", label: "User Can Manage JoFotara Receipts", category: "financial", views: ["communications"], sensitive: true },
  { id: "view_receipts", label: "User Can View Patient and Visit Receipts", category: "financial", views: ["patients", "entries"] },
  { id: "issue_receipts", label: "User Can Issue and Print Receipts", category: "financial", views: ["entries"] },
  { id: "add_patient", label: "User Can Add Patient / Visitor File", category: "patients", views: ["patients"] },
  { id: "delete_patient", label: "User Can Delete Patient / Visitor File", category: "patients", views: ["patients"] },
  { id: "patient_history", label: "User Can Access Patient Operations History", category: "patients", views: ["patients"] },
  { id: "patient_bookings", label: "User Can Access Patient Appointments History", category: "patients", views: ["patients"] },
  { id: "add_appointment", label: "User Can Add Appointment", category: "calendar", views: ["bookings"] },
  { id: "edit_appointment", label: "User Can Edit Appointment", category: "calendar", views: ["bookings"] },
  { id: "delete_appointment", label: "User Can Delete Appointment", category: "calendar", views: ["bookings"] },
  { id: "change_appointment_status", label: "User Can Change Appointment Status", category: "calendar", views: ["bookings"] },
  { id: "print_calendar", label: "User Can Print Calendar", category: "calendar", views: ["bookings"] },
  { id: "universal_reports", label: "User Can Access Universal Search Reports", category: "reports", views: ["reports"] },
  { id: "export_reports", label: "User Can Export Reports", category: "reports", views: ["reports"] },
  { id: "print_reports", label: "User Can Print Reports", category: "reports", views: ["reports"] },
  { id: "manage_staff", label: "User Can Manage Staff", category: "administration", views: ["staff"] },
  { id: "manage_services", label: "User Can Manage Services and Rules", category: "administration", views: ["services"] },
  { id: "manage_suppliers", label: "User Can Manage Suppliers and Orders", category: "inventory", views: ["inventory"] },
  { id: "manage_users", label: "User Can Manage Users and Permissions", category: "administration", views: ["accounts"], managePermissions: true }
];

const DEFAULT_FEATURES_BY_ROLE = {
  admin: PERMISSION_FEATURES.map(feature => feature.id),
  data_entry: ["access_medical", "calendar_page", "patients_page", "patient_history", "patient_bookings", "add_patient", "add_appointment", "change_appointment_status"],
  doctor: ["access_medical", "calendar_page", "patients_page", "patient_history", "patient_bookings", "appointments_report"],
  specialist: ["access_medical", "calendar_page", "patients_page", "patient_history", "patient_bookings"]
};

const APP_TEXT_EN = {
  // ── Phase 1: sidebar nav, groups, chrome, common buttons & headers ──
  "اليومي": "Daily",
  "المالية": "Finance",
  "الإدارة": "Administration",
  "النظام": "System",
  "فرص النمو": "Growth Opportunities",
  "الباقات والجلسات": "Packages & Sessions",
  "ملفات المرضى والزوار": "Patient & Visitor Files",
  "المبالغ المستحقة": "Outstanding Balances",
  "المصروفات": "Expenses",
  "التواصل والفوترة": "Communications & Billing",
  "تقرير العمليات": "Operations Report",
  "تقرير الباقات": "Packages Report",
  "تقرير الموظفين": "Staff Report",
  "سجل التعديلات": "Edit History",
  "التقرير المالي": "Financial Report",
  "بحث تفصيلي": "Detailed Search",
  "الخدمات": "Services",
  "المخزون والموردون": "Inventory & Suppliers",
  "الموظفون والنسب": "Staff & Commissions",
  "الحسابات والصلاحيات": "Accounts & Permissions",
  "استيراد البيانات": "Import Data",
  "طلبات التجربة": "Trial Requests",
  "المنتجات": "Products",
  "الموردون": "Suppliers",
  "أصناف المخزون": "Inventory Items",
  "إعدادات اليوم": "Day Settings",
  "تنقّل سريع": "Quick Navigate",
  "مركز التقارير": "Reports Center",
  "حجوزات اليوم": "Today's Bookings",
  "مدفوعات اليوم": "Today's Payments",
  "مصروفات اليوم": "Today's Expenses",
  "صافي اليوم": "Today's Net",
  "صافي الشهر": "Month Net",
  "باقات نشطة": "Active Packages",
  "قيمة المخزون": "Inventory Value",
  "المطابقة اليومية": "Daily Reconciliation",
  "تنبيهات": "Notifications",
  "المدفوعات": "Payments",
  "تغيير تاريخ العمل أو الفرع": "Change work date or branch",
  "العودة إلى اليوم": "Back to Today",
  "تسجيل عملية": "Record Operation",
  "تسجيل جلسة": "Record Session",
  "حجز جديد": "New Booking",
  "فتح المطابقة": "Open Reconciliation",
  "فتح التقويم": "Open Calendar",
  "فتح ملف مريض": "Open Patient File",
  "حفظ": "Save",
  "إلغاء": "Cancel",
  "حذف": "Delete",
  "تعديل": "Edit",
  "إضافة": "Add",
  "بحث": "Search",
  "تصدير": "Export",
  "طباعة": "Print",
  "رجوع": "Back",
  "إغلاق": "Close",
  "استرجاع": "Restore",
  "تم الاسترجاع": "Restored",
  "المستخدم": "User",
  "الإجراء": "Action",
  "نوع الإجراء": "Action Type",
  "التفاصيل": "Details",
  "التاريخ والوقت": "Date & Time",
  "كل المستخدمين": "All Users",
  "كل الإجراءات": "All Actions",
  "مسح الفلاتر ✕": "Clear Filters ✕",
  "التوزيع حسب": "Breakdown by",
  "الفئة": "Category",
  "الفئة الفرعية": "Subcategory",
  "الخدمة": "Service",
  "طريقة الدفع": "Payment Method",
  "الفريق": "Team",
  "العدد": "Count",
  "عدد": "Count",
  "المحصّل": "Collected",
  "التكلفة": "Cost",
  "الربح": "Profit",
  "الحصة": "Share",
  "الإجمالي": "Total",
  "المريض": "Patient",
  "الطبيب": "Doctor",
  "الموظف": "Employee",
  "الحالة": "Status",
  "السعر": "Price",
  "الوقت": "Time",
  "التاريخ": "Date",
  "الكل": "All",
  "كل الفئات": "All Categories",
  "عرض الكل": "View All",
  // ── Phase 2: dashboard zones, payment/status, security, forms ──
  "مركز اليوم": "Today Center",
  "مركز قيادة اليوم": "Today's Command Center",
  "ما يحتاج انتباهك الآن": "What needs your attention now",
  "صحة العيادة": "Clinic Health",
  "مركز التنبيهات": "Notification Center",
  "مركز التنبيه": "Notification Center",
  "تحديد كمقروء": "Mark as read",
  "دخول العيادات": "Enter Clinics",
  "الأمان": "Security",
  "🔒 الأمان": "🔒 Security",
  "تسجيل الخروج": "Log out",
  "بانتظار": "Pending",
  "لم يتم إغلاق اليوم بعد": "Day not closed yet",
  "لا توجد إجراءات عاجلة": "No urgent actions",
  "وصلوا للعيادة": "Arrived at clinic",
  "بانتظار الخدمة": "Awaiting service",
  "من الحجوزات والإدخال المباشر": "From bookings and direct entry",
  "مواعيد وتنبيهات تشغيلية": "Operational appointments & alerts",
  "المصروفات المسجلة": "Recorded expenses",
  "المدفوع بعد المصروفات": "Net after expenses",
  "جلسات متبقية": "Sessions remaining",
  "تحصيل": "Collect",
  "المستحقات على المرضى": "Patient balances",
  "قادم": "Upcoming",
  "جلسات اليوم القادمة": "Today's upcoming sessions",
  "التقويم": "Calendar",
  "النبض التشغيلي": "Operational pulse",
  "الحركة والمدفوعات خلال 14 يوماً": "Activity & payments over 14 days",
  "إجمالي آخر 7 أيام": "Last 7 days total",
  "ضغط المواعيد حسب الساعة": "Appointment load by hour",
  "لتوزيع الفريق والغرف قبل الازدحام": "To plan team & rooms before peak",
  "رحلة الموعد": "Appointment journey",
  "حالة حجوزات اليوم": "Today's bookings status",
  "فتح الجدول": "Open schedule",
  "فتح التقويم": "Open Calendar",
  "الجدول المباشر": "Live schedule",
  "القادمون اليوم": "Today's arrivals",
  "اقتراحات ذكية": "Smart suggestions",
  "إجراءات عالية الأولوية": "High-priority actions",
  "الأتمتة": "Automation",
  "لا توجد مدفوعات بعد.": "No payments yet.",
  "الإغلاق المالي": "Financial close",
  "الكاش": "Cash",
  "البطاقات": "Cards",
  "الفرق": "Difference",
  "المستحقات حسب الأداء": "Dues by performance",
  "قراءة تشغيلية": "Operational reading",
  "اتجاهات اليوم": "Today's trends",
  "الدفع": "Payment",
  "المدفوع": "Paid",
  "تسجيل سريع": "Quick entry",
  "إضافة عملية للملف": "Add operation to file",
  "حالة الدفع": "Payment status",
  "مدفوع كاملاً": "Paid in full",
  "دفع جزئي": "Partial payment",
  "لم يُدفع بعد": "Not paid yet",
  "المدفوع الآن": "Paid now",
  "المتبقي على المريض": "Patient remaining balance",
  "بداية الدوام": "Shift start",
  "نهاية الدوام": "Shift end",
  "كلمة المرور": "Password",
  "المصادقة الثنائية (2FA)": "Two-Factor Authentication (2FA)",
  "تفعيل المصادقة الثنائية": "Enable two-factor authentication",
  "تفعيل المصادقة الثنائية الآن": "Enable two-factor now",
  "إيقاف المصادقة الثنائية": "Disable two-factor authentication",
  "عيادتك تتطلب المصادقة الثنائية": "Your clinic requires two-factor authentication",
  "رمز المصادقة (أو رمز احتياط)": "Authentication code (or backup code)",
  "أدخل الرمز المكوّن من 6 أرقام للتأكيد": "Enter the 6-digit code to confirm",
  "＋ بيانات اختبار": "＋ Test data",
  "إنشاء حساب عيادة آمن": "Create a secure clinic account",
  "أنت داخل النموذج التجريبي العام": "You're in the public demo",
  "عيادة رعاية": "Riaaya Clinic",
  "اسم المريض": "Patient Name",
  "رقم الهاتف": "Phone Number",
  "الجنس": "Gender",
  "أنثى": "Female",
  "ذكر": "Male",
  "الجنسية": "Nationality",
  "المدينة": "City",
  "ملاحظات": "Notes",
  "ملاحظات سريرية": "Clinical Notes",
  "المصدر": "Source",
  "الكمية": "Quantity",
  "الخصم": "Discount",
  "المبلغ": "Amount",
  "التكلفة المباشرة": "Direct Cost",
  "السعر الافتراضي": "Default Price",
  "اسم الخدمة": "Service Name",
  "حفظ التعديل": "Save Changes",
  "حفظ القاعدة": "Save Rule",
  "حفظ الخدمة": "Save Service",
  "حفظ كل الخدمات": "Save All Services",
  "إضافة الموظف": "Add Employee",
  "إضافة عمود": "Add Column",
  "اسم القاعدة": "Rule Name",
  "طريقة الحساب": "Calculation Method",
  "تطبق على": "Applies To",
  "القيمة": "Value",
  "الموظفون": "Employees",
  "الطبيب": "Doctor",
  "الأخصائي": "Specialist",
  "أخصائي": "Specialist",
  "طبيب": "Doctor",
  "رعاية": "Riaaya",
  "إدارة العيادات": "Clinic Management",
  "نموذج تجريبي تفاعلي": "Interactive Prototype",
  "عيادة رعاية التجريبية": "Riaaya Demo Clinic",
  "اللغة": "Language",
  "العربية": "Arabic",
  "الحساب": "Account",
  "الصفحة الرئيسية": "Home",
  "طباعة كشف الرواتب": "Print Payroll Report",
  "اسم العيادة": "Clinic Name",
  "تاريخ العمل": "Work Date",
  "الفرع": "Branch",
  "حفظ الإعدادات": "Save Settings",
  "الحالة": "Status",
  "يتم التحديث": "Updating",
  "تتغير الحالة بعد كل عملية أو مطابقة.": "Status changes after each operation or reconciliation.",
  "ملخص اليوم": "Today Summary",
  "عمليات اليوم": "Today Operations",
  "ملفات المرضى والزوار": "Patients & Visitors",
  "الحجوزات": "Bookings",
  "الموظفون والنسب": "Staff & Rates",
  "الخدمات والقواعد": "Services & Rules",
  "المخزون والموردون": "Inventory & Suppliers",
  "المطابقة": "Reconciliation",
  "الرواتب": "Payroll",
  "التقارير": "Reports",
  "التواصل والفوترة": "Communications & Billing",
  "الحسابات والصلاحيات": "Accounts & Permissions",
  "طلبات التجربة": "Trial Requests",
  "نظرة تشغيلية": "Operational View",
  "صورة العيادة في نهاية اليوم": "The clinic picture at day-end",
  "يتم تجهيز الملخص من عمليات اليوم والمطابقة والرواتب.": "The summary is built from today's operations, reconciliation, and payroll.",
  "إيرادات آخر 7 أيام": "Last 7 Days Revenue",
  "بناءً على العمليات المسجلة": "Based on recorded operations",
  "إيرادات اليوم": "Today Revenue",
  "الكاش المسجل": "Recorded Cash",
  "الفيزا المسجلة": "Recorded Card",
  "فرق الإغلاق": "Closing Difference",
  "لا توجد فروقات": "No differences",
  "الأداء الأسبوعي": "Weekly Performance",
  "الإيرادات حسب اليوم": "Revenue by Day",
  "طرق الدفع": "Payment Methods",
  "توزيع المقبوضات": "Collections Breakdown",
  "التزامات الفريق": "Team Obligations",
  "نسب ورواتب اليوم": "Today's Rates & Payroll",
  "التفاصيل": "Details",
  "إغلاق اليوم": "Day Closing",
  "حالة المطابقة": "Reconciliation Status",
  "آخر ما تم تسجيله": "Latest Entries",
  "إضافة عملية": "Add Operation",
  "ملاحظات اليوم": "Today's Notes",
  "ما يحتاج مراجعة": "Needs Review",
  "إدخال جديد": "New Entry",
  "عملية جديدة": "New Operation",
  "اسم المريض": "Patient Name",
  "الخدمة": "Service",
  "الطبيب": "Doctor",
  "الأخصائي": "Specialist",
  "الكمية": "Quantity",
  "السعر": "Price",
  "التكلفة المباشرة": "Direct Cost",
  "الخصم": "Discount",
  "طريقة الدفع": "Payment Method",
  "حالة العملية": "Operation Status",
  "مكتملة": "Completed",
  "بانتظار التعيين": "Pending Assignment",
  "محجوزة": "Scheduled",
  "بانتظار الدفع": "Pending Payment",
  "ملغاة": "Cancelled",
  "ملاحظات": "Notes",
  "إضافة العملية": "Add Operation",
  "سجل اليوم": "Today's Log",
  "كل العمليات": "All Operations",
  "تصدير CSV": "Export CSV",
  "مسح سجل اليوم": "Clear Today's Log",
  "المريض": "Patient",
  "الفريق": "Team",
  "الصافي": "Net",
  "المستحقات": "Payouts",
  "كشف قابل للطباعة": "Printable Report",
  "طباعة التقرير": "Print Report",
  "الموظف": "Staff Member",
  "الدور": "Role",
  "الصيغة": "Formula",
  "عدد العمليات": "Operations",
  "المستحق": "Payout",
  "كشف فردي": "Individual Slip",
  "تفاصيل راتب الموظف": "Staff Salary Details",
  "طباعة كشف فردي": "Print Individual Slip",
  "اختيار الموظف": "Choose Staff Member",
  "تفاصيل الكشف": "Slip Details",
  "اعتماد": "Approve",
  "تم الدفع": "Mark Paid",
  "معتمد": "Approved",
  "مدفوع": "Paid",
  "مسودة": "Draft",
  "تقارير كاملة الصفحة": "Full Page Reports",
  "اختيار التقرير": "Choose Report",
  "طباعة التقرير": "Print Report",
  "تكبير الشاشة": "Maximize",
  "تصغير الشاشة": "Exit Full Screen",
  "عرض كامل": "Full View",
  "إغلاق": "Close",
  "من": "From",
  "إلى": "To",
  "اليوم": "Today",
  "مطابقة المرضى والمدفوعات": "Patient & Payment Reconciliation",
  "حسب المريض": "By Patient",
  "كل عملية": "Every Procedure",
  "الحجوزات والجدول": "Bookings & Schedule",
  "قائمة التكاليف": "Cost List",
  "تعيين الأخصائيين": "Specialist Assignments",
  "إضافة عضو للفريق": "Add Team Member",
  "النسب والقواعد": "Rates & Rules",
  "الاسم": "Name",
  "طبيب": "Doctor",
  "أخصائي": "Specialist",
  "النسبة": "Rate",
  "إضافة الموظف": "Add Staff Member",
  "الفريق الحالي": "Current Team",
  "كتالوج الخدمات": "Service Catalog",
  "إضافة خدمة وتسعيرها": "Add and Price Service",
  "اسم الخدمة": "Service Name",
  "السعر الافتراضي": "Default Price",
  "الحالة": "Status",
  "فعالة": "Active",
  "متوقفة": "Inactive",
  "حفظ الخدمة": "Save Service",
  "الخدمات الحالية": "Current Services",
  "الخدمات المتاحة للعمليات": "Services Available for Operations",
  "قواعد المستحقات": "Payout Rules",
  "قاعدة جديدة": "New Rule",
  "اسم القاعدة": "Rule Name",
  "تطبق على": "Applies To",
  "الشخص": "Person",
  "طريقة الحساب": "Calculation Method",
  "القيمة": "Value",
  "حفظ القاعدة": "Save Rule",
  "أولوية الحساب": "Calculation Priority",
  "القواعد الحالية": "Current Rules",
  "أصناف المخزون": "Inventory Items",
  "تنبيهات منخفضة": "Low Alerts",
  "الموردون": "Suppliers",
  "قيمة المخزون": "Inventory Value",
  "إدارة المخزون": "Inventory Management",
  "حجوزات اليوم": "Today's Bookings",
  "بانتظار التأكيد": "Pending Confirmation",
  "تم الوصول": "Arrived",
  "قيمة متوقعة": "Expected Value",
  "حسب تاريخ العمل": "Based on work date",
  "حجوزات تحتاج متابعة": "Bookings need follow-up",
  "جاهزة للتحويل إلى عملية": "Ready to convert to operation",
  "من الحجوزات غير الملغاة": "From non-cancelled bookings",
  "تقويم الحجوزات": "Bookings Calendar",
  "الشهر الحالي": "Current Month",
  "اختر يوماً لعرض حجوزاته.": "Choose a day to view its bookings.",
  "الشهر السابق": "Previous Month",
  "الشهر التالي": "Next Month",
  "إدارة المواعيد": "Appointment Management",
  "إضافة مريض أو زائر": "Add Patient or Visitor",
  "نوع الملف": "File Type",
  "الاسم الكامل": "Full Name",
  "البريد الإلكتروني": "Email",
  "الجنس": "Gender",
  "الجنسية": "Nationality",
  "الفئة": "Category",
  "ملاحظات الملف": "File Notes",
  "حفظ الملف": "Save File",
  "المرضى والزوار": "Patients & Visitors",
  "بحث ذكي": "Smart Search",
  "رقم الملف": "File Number",
  "آخر نشاط": "Last Activity",
  "فتح الملف": "Open File",
  "مركز التقارير": "Report Center",
  "البحث الشامل": "Universal Search",
  "حجز جديد": "New Booking",
  "الهاتف": "Phone",
  "التاريخ": "Date",
  "الوقت": "Time",
  "محجوز": "Scheduled",
  "مؤكد": "Confirmed",
  "وصل": "Arrived",
  "تمت العملية": "Operation Completed",
  "لم يحضر": "No Show",
  "ملغي": "Cancelled",
  "القيمة المتوقعة": "Expected Amount",
  "ملاحظات الحجز": "Booking Notes",
  "حفظ الحجز": "Save Booking",
  "الجدول": "Schedule",
  "تقرير الحجوزات": "Bookings Report",
  "الموردون": "Suppliers",
  "إضافة مورد للعيادة": "Add Clinic Supplier",
  "اسم المورد": "Supplier Name",
  "التواصل": "Contact",
  "المدينة": "City",
  "التصنيف": "Category",
  "حفظ المورد": "Save Supplier",
  "دليل الطلب": "Ordering Directory",
  "من أين يمكن الطلب؟": "Where Can We Order From?",
  "المخزون": "Inventory",
  "إضافة صنف وحد التنبيه": "Add Item & Alert Level",
  "اسم الصنف": "Item Name",
  "رمز الصنف": "SKU",
  "الوحدة": "Unit",
  "الكمية الحالية": "Current Quantity",
  "حد الطلب المنخفض": "Low Order Limit",
  "آخر تكلفة للوحدة": "Last Unit Cost",
  "المورد المفضل": "Preferred Supplier",
  "حفظ الصنف": "Save Item",
  "تنبيهات المخزون": "Inventory Alerts",
  "أصناف تحتاج طلب": "Items Need Ordering",
  "قائمة المخزون": "Inventory List",
  "الأصناف الحالية": "Current Items",
  "الطلبات": "Orders",
  "تسجيل طلب أو استلام": "Record Order or Receipt",
  "الصنف": "Item",
  "المورد": "Supplier",
  "تاريخ الطلب": "Order Date",
  "تكلفة الوحدة": "Unit Cost",
  "حفظ الطلب": "Save Order",
  "من أين طلبنا؟": "Where Did We Order From?",
  "سجل الموردين والتكاليف": "Supplier & Cost Log",
  "النتيجة": "Result",
  "هل الإغلاق متطابق؟": "Is Closing Matched?",
  "إدارة الوصول": "Access Management",
  "حساب جديد": "New Account",
  "اسم الحساب": "Account Name",
  "نوع الحساب": "Account Type",
  "إدخال بيانات": "Data Entry",
  "مدير": "Admin",
  "ربط بموظف": "Link to Staff",
  "يرى عملياته فقط": "Own Operations Only",
  "يرى المبالغ والنسب": "Can View Money & Rates",
  "إضافة الحساب": "Add Account",
  "الصلاحيات الحالية": "Current Permissions",
  "من يرى ماذا؟": "Who Sees What?",
  "من صفحة التعريف": "From Landing Page",
  "طلبات التجربة المحفوظة": "Saved Trial Requests",
  "مسح الطلبات": "Clear Requests",
  "كاش": "Cash",
  "فيزا": "Card",
  "تحويل": "Transfer",
  "بدون طبيب": "No Doctor",
  "بدون أخصائي": "No Specialist",
  "اختياري": "Optional"
};

function dateOffset(days, baseDate = today) {
  const date = new Date(`${baseDate}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function dateFromInput(dateString) {
  return new Date(`${dateString || today}T12:00:00`);
}

function formatDateInput(date) {
  return date.toISOString().slice(0, 10);
}

function monthOffset(dateString, months) {
  const source = dateFromInput(dateString);
  const target = new Date(source.getFullYear(), source.getMonth() + months, 1, 12);
  const maxDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(source.getDate(), maxDay));
  return formatDateInput(target);
}

function calendarDaysForMonth(dateString) {
  const active = dateFromInput(dateString);
  const monthStart = new Date(active.getFullYear(), active.getMonth(), 1, 12);
  const leadingDays = (monthStart.getDay() + 1) % 7;
  const gridStart = new Date(monthStart);
  gridStart.setDate(monthStart.getDate() - leadingDays);

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(gridStart);
    day.setDate(gridStart.getDate() + index);
    return {
      date: formatDateInput(day),
      dayNumber: day.getDate(),
      inMonth: day.getMonth() === active.getMonth()
    };
  });
}

const seedStaff = [
  { id: "staff-doctor-laila", name: "د. ليلى منصور", role: "doctor", rate: 50, phone: "079 000 2001" },
  { id: "staff-doctor-sami", name: "د. سامي خالد", role: "doctor", rate: 50, phone: "079 000 2002" },
  { id: "staff-specialist-sarah", name: "سارة خالد", role: "specialist", rate: 18, phone: "079 000 2003" },
  { id: "staff-specialist-noor", name: "نور عمر", role: "specialist", rate: 15, phone: "079 000 2004" }
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
    userName: "admin",
    arabicFirstName: "مدير",
    arabicLastName: "النظام",
    firstName: "System",
    lastName: "Admin",
    uid: "10001",
    mobile: "079 000 1001",
    telNo: "06 000 1001",
    role: "admin",
    staffId: "",
    allowedViews: ADMIN_VIEWS,
    permissionFeatures: DEFAULT_FEATURES_BY_ROLE.admin,
    canViewSensitive: true,
    ownEntriesOnly: false,
    canManagePermissions: true,
    memberSince: "2026-05-20",
    lastAccess: "1 day 3 hours",
    active: true
  },
  {
    id: "account-data-entry",
    name: "موظف إدخال",
    userName: "assistant01",
    arabicFirstName: "موظف",
    arabicLastName: "إدخال",
    firstName: "Clinic",
    lastName: "Assistant",
    uid: "10002",
    mobile: "079 000 1002",
    telNo: "06 000 1002",
    role: "data_entry",
    staffId: "",
    allowedViews: ["entries", "bookings"],
    permissionFeatures: ["access_medical", "calendar_page", "patients_page", "patient_history", "patient_bookings", "add_patient", "add_appointment", "change_appointment_status", "see_mobile"],
    canViewSensitive: false,
    ownEntriesOnly: false,
    canManagePermissions: false,
    memberSince: "2026-04-27",
    lastAccess: "4 hours",
    active: true
  },
  {
    id: "account-doctor-laila",
    name: "د. ليلى",
    userName: "doctor-laila",
    arabicFirstName: "ليلى",
    arabicLastName: "منصور",
    firstName: "Laila",
    lastName: "Mansour",
    uid: "10003",
    mobile: "079 000 1003",
    telNo: "06 000 1003",
    role: "doctor",
    staffId: "staff-doctor-laila",
    allowedViews: ["dashboard", "entries", "bookings"],
    permissionFeatures: ["access_medical", "calendar_page", "patients_page", "patient_history", "patient_bookings", "appointments_report"],
    canViewSensitive: false,
    ownEntriesOnly: true,
    canManagePermissions: false,
    memberSince: "2026-04-08",
    lastAccess: "1 day 3 hours",
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

const seedBookings = [
  {
    id: "booking-1",
    date: today,
    time: "10:30",
    patient: "لين خالد",
    phone: "079 123 4455",
    serviceId: "service-laser",
    service: "جلسة ليزر",
    doctorId: "",
    specialistId: "staff-specialist-sarah",
    expectedAmount: 80,
    status: "confirmed",
    notes: "تأكيد عبر واتساب"
  },
  {
    id: "booking-2",
    date: today,
    time: "12:00",
    patient: "سامي ناصر",
    phone: "078 222 1000",
    serviceId: "service-cosmetic",
    service: "إجراء تجميلي",
    doctorId: "staff-doctor-laila",
    specialistId: "",
    expectedAmount: 120,
    status: "scheduled",
    notes: "يحتاج اتصال قبل الموعد"
  },
  {
    id: "booking-3",
    date: today,
    time: "14:15",
    patient: "هدى إبراهيم",
    phone: "077 333 0909",
    serviceId: "service-care",
    service: "جلسة عناية",
    doctorId: "",
    specialistId: "staff-specialist-noor",
    expectedAmount: 45,
    status: "arrived",
    notes: "وصلت وتنتظر الدخول"
  },
  {
    id: "booking-4",
    date: dateOffset(1),
    time: "11:00",
    patient: "مالك فادي",
    phone: "079 444 0808",
    serviceId: "service-followup",
    service: "متابعة علاج",
    doctorId: "staff-doctor-sami",
    specialistId: "",
    expectedAmount: 40,
    status: "scheduled",
    notes: ""
  }
];

const seedPatients = [
  { id: "patient-mariam", patientNumber: "1001", profileType: "patient", name: "مريم أحمد", phone: "079 410 1001", email: "mariam@example.com", gender: "female", nationality: "الأردن", city: "عمّان", category: "ليزر", notes: "تفضّل التواصل عبر واتساب", marketingConsent: true, createdAt: dateOffset(-120) },
  { id: "patient-omar", patientNumber: "1002", profileType: "patient", name: "عمر يوسف", phone: "078 410 1002", email: "", gender: "male", nationality: "الأردن", city: "الزرقاء", category: "تجميل", notes: "", marketingConsent: true, createdAt: dateOffset(-98) },
  { id: "patient-hiba", patientNumber: "1003", profileType: "patient", name: "هبة محمود", phone: "077 410 1003", email: "hiba@example.com", gender: "female", nationality: "الأردن", city: "عمّان", category: "أسنان", notes: "حساسية من البنسلين", marketingConsent: false, createdAt: dateOffset(-84) },
  { id: "patient-yazan", patientNumber: "1004", profileType: "patient", name: "يزن حسن", phone: "079 410 1004", email: "", gender: "male", nationality: "الأردن", city: "إربد", category: "عناية", notes: "", marketingConsent: true, createdAt: dateOffset(-65) },
  { id: "patient-lin", patientNumber: "1005", profileType: "patient", name: "لين خالد", phone: "079 123 4455", email: "", gender: "female", nationality: "الأردن", city: "عمّان", category: "ليزر", notes: "تأكيد المواعيد عبر واتساب", marketingConsent: true, createdAt: dateOffset(-44) },
  { id: "patient-sami", patientNumber: "1006", profileType: "patient", name: "سامي ناصر", phone: "078 222 1000", email: "", gender: "male", nationality: "الأردن", city: "عمّان", category: "تجميل", notes: "", marketingConsent: true, createdAt: dateOffset(-32) },
  { id: "patient-huda", patientNumber: "1007", profileType: "patient", name: "هدى إبراهيم", phone: "077 333 0909", email: "", gender: "female", nationality: "فلسطين", city: "عمّان", category: "عناية", notes: "", marketingConsent: true, createdAt: dateOffset(-18) },
  { id: "patient-malik", patientNumber: "1008", profileType: "visitor", name: "مالك فادي", phone: "079 444 0808", email: "", gender: "male", nationality: "الأردن", city: "عمّان", category: "استشارة", notes: "زائر لم يتحول إلى ملف علاجي بعد", marketingConsent: false, createdAt: dateOffset(-5) }
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

function seedCommunicationState() {
  return {
    digestRules: [
      {
        id: "digest-admin-daily",
        accountId: "account-admin",
        channel: "whatsapp",
        sendTime: "18:30",
        template: "role_daily",
        active: true,
        lastQueuedAt: ""
      }
    ],
    campaigns: [],
    outboundMessages: [],
    receipts: [],
    notificationReads: {},
    integrations: {
      whatsapp: {
        businessPhone: "",
        phoneNumberId: "",
        templateName: "clinic_daily_role_report",
        configured: false
      },
      sms: {
        provider: "local",
        senderId: "",
        endpoint: "",
        configured: false
      },
      jofotara: {
        taxNumber: "",
        clientId: "",
        incomeSourceSequence: "",
        secretConfigured: false,
        configured: false
      }
    }
  };
}

function normalizeDigestRule(rule) {
  return {
    id: rule.id || nextId("digest"),
    accountId: rule.accountId || rule.account_id || "",
    channel: rule.channel || "whatsapp",
    sendTime: rule.sendTime || rule.send_time || "18:30",
    template: rule.template || "role_daily",
    active: rule.active !== false,
    lastQueuedAt: rule.lastQueuedAt || rule.last_queued_at || ""
  };
}

function normalizeCampaign(campaign) {
  return {
    id: campaign.id || nextId("campaign"),
    audience: campaign.audience || "all_consented",
    category: campaign.category || "",
    message: campaign.message || "",
    scheduledAt: campaign.scheduledAt || campaign.scheduled_at || "",
    recipientCount: asNumber(campaign.recipientCount ?? campaign.recipient_count),
    segments: asNumber(campaign.segments) || 1,
    status: campaign.status || "queued",
    createdAt: campaign.createdAt || campaign.created_at || new Date().toISOString()
  };
}

function normalizeOutboundMessage(message) {
  return {
    id: message.id || nextId("message"),
    channel: message.channel || "whatsapp",
    recipient: message.recipient || "",
    accountId: message.accountId || message.account_id || "",
    patientId: message.patientId || message.patient_id || "",
    campaignId: message.campaignId || message.campaign_id || "",
    body: message.body || "",
    status: message.status || "queued",
    deliveryMode: message.deliveryMode || message.delivery_mode || "",
    providerReference: message.providerReference || message.provider_reference || "",
    error: message.error || "",
    createdAt: message.createdAt || message.created_at || new Date().toISOString()
  };
}

function normalizeReceipt(receipt) {
  const paymentBreakdown = cleanPaymentBreakdown(
    receipt.paymentBreakdown || receipt.payment_breakdown,
    receipt.paymentMethod || receipt.payment_method || "cash",
    asNumber(receipt.total)
  );
  return {
    id: receipt.id || nextId("receipt"),
    invoiceNumber: receipt.invoiceNumber || receipt.invoice_number || "",
    date: receipt.date || today,
    patientId: receipt.patientId || receipt.patient_id || "",
    patient: receipt.patient || "مريض",
    entryIds: Array.isArray(receipt.entryIds) ? receipt.entryIds : [],
    itemCount: asNumber(receipt.itemCount ?? receipt.item_count),
    subtotal: asNumber(receipt.subtotal ?? receipt.total),
    taxRate: asNumber(receipt.taxRate ?? receipt.tax_rate),
    taxAmount: asNumber(receipt.taxAmount ?? receipt.tax_amount),
    total: asNumber(receipt.total),
    buyerType: receipt.buyerType || receipt.buyer_type || "individual",
    buyerTaxNumber: receipt.buyerTaxNumber || receipt.buyer_tax_number || "",
    paymentBreakdown,
    paymentMethod: paymentMethodFromBreakdown(paymentBreakdown, receipt.paymentMethod || receipt.payment_method || "cash"),
    reference: receipt.reference || "",
    notes: receipt.notes || "",
    status: receipt.status || "draft",
    deliveryMode: receipt.deliveryMode || receipt.delivery_mode || "",
    providerReference: receipt.providerReference || receipt.provider_reference || "",
    error: receipt.error || "",
    createdAt: receipt.createdAt || receipt.created_at || new Date().toISOString()
  };
}

function normalizeExpenseGroup(group) {
  return {
    id: group.id || nextId("expense-group"),
    name: group.name || group.group || "مجموعة مصروفات",
    subgroups: (Array.isArray(group.subgroups) ? group.subgroups : []).map(subgroup => ({
      id: subgroup.id || nextId("expense-subgroup"),
      name: subgroup.name || subgroup.subgroup || "فئة فرعية"
    }))
  };
}

function normalizeExpense(expense) {
  return {
    id: expense.id || nextId("expense"),
    groupId: expense.groupId || expense.group_id || "",
    subgroupId: expense.subgroupId || expense.subgroup_id || "",
    groupName: expense.groupName || expense.group_name || expense.group || "",
    subgroupName: expense.subgroupName || expense.subgroup_name || expense.subgroup || "",
    amount: Math.max(asNumber(expense.amount), 0),
    date: expense.date || today,
    paymentMethod: expense.paymentMethod || expense.payment_method || "cash",
    vendor: expense.vendor || expense.payee || expense.supplier || "",
    reference: expense.reference || expense.receipt_number || "",
    notes: expense.notes || expense.note || "",
    branch: expense.branch || "الفرع الرئيسي",
    recurring: expense.recurring === true || expense.recurring === "true",
    createdAt: expense.createdAt || expense.created_at || new Date().toISOString()
  };
}

function normalizeImportHistory(record) {
  return {
    id: record.id || nextId("import"),
    fileName: record.fileName || record.file_name || "",
    sourceSystem: record.sourceSystem || record.source_system || "",
    entity: record.entity || "patients",
    total: asNumber(record.total),
    imported: asNumber(record.imported),
    duplicates: asNumber(record.duplicates),
    invalid: asNumber(record.invalid),
    createdAt: record.createdAt || record.created_at || new Date().toISOString(),
    entryIds: Array.isArray(record.entryIds) ? record.entryIds : [],
    bookingIds: Array.isArray(record.bookingIds) ? record.bookingIds : [],
    patientIds: Array.isArray(record.patientIds) ? record.patientIds : [],
    expenseIds: Array.isArray(record.expenseIds) ? record.expenseIds : []
  };
}

function asNumber(value) {
  return Number.parseFloat(value || 0) || 0;
}

function cleanPaymentBreakdown(input = {}, fallbackMethod = "cash", fallbackAmount = 0) {
  const isArray = Array.isArray(input);
  const raw = isArray
    ? input.reduce((totals, row) => {
        const method = row.method || row.type || row.paymentMethod;
        if (PAYMENT_METHODS.includes(method)) totals[method] = numberValue(totals[method]) + numberValue(row.amount);
        return totals;
      }, {})
    : input && typeof input === "object" ? input : {};
  // An explicit breakdown (even all-zeros, e.g. an unpaid visit) must be respected,
  // so "لم يُدفع بعد" really records 0 paid instead of being assumed paid in full.
  const hasExplicitBreakdown = isArray || PAYMENT_METHODS.some(method => raw[method] !== undefined);
  const breakdown = Object.fromEntries(PAYMENT_METHODS.map(method => [method, Math.max(numberValue(raw[method]), 0)]));
  const total = PAYMENT_METHODS.reduce((sum, method) => sum + breakdown[method], 0);
  if (total > 0.009 || hasExplicitBreakdown) return breakdown;
  // No payment data at all (legacy entry) → assume it was paid in full via the fallback method.
  const method = PAYMENT_METHODS.includes(fallbackMethod) ? fallbackMethod : "cash";
  return { cash: 0, card: 0, transfer: 0, [method]: Math.max(numberValue(fallbackAmount), 0) };
}

function paymentMethodFromBreakdown(breakdown = {}, fallback = "cash") {
  const active = PAYMENT_METHODS.filter(method => numberValue(breakdown[method]) > 0.009);
  if (active.length > 1) return "mixed";
  return active[0] || (PAYMENT_METHODS.includes(fallback) ? fallback : "cash");
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
    category: service.category || service.group || "",
    subcategory: service.subcategory || service.sub_category || service.subgroup || "",
    defaultPrice: asNumber(service.defaultPrice ?? service.default_price),
    defaultCost: asNumber(service.defaultCost ?? service.default_cost ?? service.doctor_cost),
    consumes: Array.isArray(service.consumes)
      ? service.consumes
          .map(part => ({ itemId: part.itemId || part.item_id || "", qty: asNumber(part.qty ?? part.quantity) }))
          .filter(part => part.itemId && part.qty > 0)
      : [],
    active: service.active !== false
  };
}

// ── Inventory consumption: an operation deducts its service's mapped items ──
function deductInventoryForEntry(entry) {
  const service = getService(entry.serviceId);
  if (!service || !Array.isArray(service.consumes) || !service.consumes.length) return;
  const multiplier = Math.max(numberValue(entry.quantity) || 1, 1);
  state.inventoryMovements = state.inventoryMovements || [];
  service.consumes.forEach(part => {
    const item = getInventoryItem(part.itemId);
    if (!item) return;
    const change = -part.qty * multiplier;
    item.quantity = Math.max(0, asNumber(item.quantity) + change);
    state.inventoryMovements.push({
      id: nextId("invmove"),
      itemId: part.itemId,
      qty: change,
      reason: "consumption",
      entryId: entry.id,
      serviceId: entry.serviceId,
      date: entry.date || state.settings.activeDate,
      at: new Date().toISOString()
    });
  });
}

// Reverse a deleted operation's consumption (adds the stock back).
function restoreInventoryForEntry(entry) {
  const moves = (state.inventoryMovements || []).filter(move => move.entryId === entry.id && move.reason === "consumption");
  moves.forEach(move => {
    const item = getInventoryItem(move.itemId);
    if (item) item.quantity = asNumber(item.quantity) - move.qty;
  });
  state.inventoryMovements = (state.inventoryMovements || []).filter(move => move.entryId !== entry.id);
}

// ── Service → inventory consumption builder (add + edit service forms) ──────
let _servicePendingConsumes = [];
let _editServicePendingConsumes = [];

function consumeItemLabel(itemId) {
  const item = getInventoryItem(itemId);
  return item ? `${item.name} (${item.unit})` : "صنف محذوف";
}

function renderConsumeList(listEl, consumes, removeAttr) {
  if (!listEl) return;
  listEl.innerHTML = consumes.length
    ? consumes.map((part, index) => `<span class="consume-chip">${consumeItemLabel(part.itemId)} × ${part.qty}<button type="button" data-${removeAttr}="${index}" aria-label="حذف">×</button></span>`).join("")
    : `<p class="consume-empty">لا يُخصم أي صنف من المخزون عند تنفيذ هذه الخدمة.</p>`;
}

function populateConsumeSelects() {
  const items = (state.inventory || []).filter(item => item.active !== false);
  const opts = `<option value="">— اختر صنفاً من المخزون —</option>`
    + items.map(item => `<option value="${item.id}">${item.name} — متوفر ${numberValue(item.quantity)} ${item.unit}</option>`).join("");
  document.querySelectorAll("[data-consume-item-select], [data-edit-consume-item-select]").forEach(select => {
    const current = select.value;
    select.innerHTML = opts;
    select.value = current;
  });
}

document.addEventListener("click", event => {
  if (event.target.closest("[data-add-consume]")) {
    const select = document.querySelector("[data-consume-item-select]");
    const qtyEl = document.querySelector("[data-consume-qty]");
    const itemId = select?.value, qty = Number(qtyEl?.value);
    if (!itemId || !(qty > 0)) return;
    _servicePendingConsumes.push({ itemId, qty });
    select.value = ""; qtyEl.value = "";
    renderConsumeList(document.querySelector("[data-consume-list]"), _servicePendingConsumes, "remove-consume");
    return;
  }
  const rem = event.target.closest("[data-remove-consume]");
  if (rem) {
    _servicePendingConsumes.splice(Number(rem.dataset.removeConsume), 1);
    renderConsumeList(document.querySelector("[data-consume-list]"), _servicePendingConsumes, "remove-consume");
    return;
  }
  if (event.target.closest("[data-edit-add-consume]")) {
    const select = document.querySelector("[data-edit-consume-item-select]");
    const qtyEl = document.querySelector("[data-edit-consume-qty]");
    const itemId = select?.value, qty = Number(qtyEl?.value);
    if (!itemId || !(qty > 0)) return;
    _editServicePendingConsumes.push({ itemId, qty });
    select.value = ""; qtyEl.value = "";
    renderConsumeList(document.querySelector("[data-edit-consume-list]"), _editServicePendingConsumes, "edit-remove-consume");
    return;
  }
  const erem = event.target.closest("[data-edit-remove-consume]");
  if (erem) {
    _editServicePendingConsumes.splice(Number(erem.dataset.editRemoveConsume), 1);
    renderConsumeList(document.querySelector("[data-edit-consume-list]"), _editServicePendingConsumes, "edit-remove-consume");
  }
});

document.addEventListener("change", event => {
  if (event.target.matches("[data-inventory-isproduct]")) {
    const wrap = document.querySelector("[data-inventory-saleprice-wrap]");
    if (wrap) wrap.hidden = !event.target.checked;
  }
});

// ── Products: a sellable inventory item; selling deducts stock + books revenue ──
function sellProduct(itemId, qty, paymentMethod, patientName) {
  const item = getInventoryItem(itemId);
  if (!item || !(qty > 0)) return false;
  const amount = asNumber(item.salePrice) * qty;
  const entry = normalizeEntry({
    id: nextId("entry"),
    date: state.settings.activeDate,
    patient: (patientName || "").trim() || "بيع منتج",
    service: item.name,
    serviceId: "",
    amount,
    unitPrice: asNumber(item.salePrice),
    quantity: qty,
    cost: asNumber(item.unitCost) * qty,
    discount: 0,
    paymentMethod: paymentMethod || "cash",
    status: "completed",
    category: "منتجات",
    productId: item.id
  }, state.services);
  state.entries.push(entry);
  item.quantity = Math.max(0, asNumber(item.quantity) - qty);
  state.inventoryMovements = state.inventoryMovements || [];
  state.inventoryMovements.push({
    id: nextId("invmove"), itemId: item.id, qty: -qty, reason: "sale",
    entryId: entry.id, date: entry.date, at: new Date().toISOString()
  });
  logEdit("بيع منتج", `${item.name} × ${qty} · ${money(amount)}`);
  saveState();
  render();
  return true;
}

function renderProducts() {
  if (!els.productsList) return;
  const products = (state.inventory || []).filter(item => item.isProduct && item.active !== false);
  if (!products.length) {
    els.productsList.innerHTML = `<div class="empty-state">لا توجد منتجات بعد. فعّل خيار «منتج للبيع» على أي صنف في المخزون لإظهاره هنا.</div>`;
    return;
  }
  const showSensitive = canViewSensitive();
  const rows = products.map(item => {
    const margin = asNumber(item.salePrice) - asNumber(item.unitCost);
    const low = item.lowThreshold > 0 && item.quantity <= item.lowThreshold;
    return `
      <tr>
        <td><strong>${item.name}</strong>${item.sku ? ` <small>${item.sku}</small>` : ""}</td>
        <td><span class="${low ? "stock-low" : ""}">${numberValue(item.quantity)} ${item.unit}</span></td>
        <td>${money(asNumber(item.salePrice))}</td>
        ${showSensitive ? `<td>${money(asNumber(item.unitCost))}</td><td>${money(margin)}</td>` : ""}
        <td><button class="dark-button" type="button" data-sell-product="${item.id}" ${item.quantity <= 0 ? "disabled" : ""}>بيع</button></td>
      </tr>`;
  }).join("");
  els.productsList.innerHTML = `
    <div class="table-wrap">
      <table class="practical-table">
        <thead><tr><th>المنتج</th><th>المتوفر</th><th>سعر البيع</th>${showSensitive ? "<th>التكلفة</th><th>الربح/وحدة</th>" : ""}<th></th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

// Single source of truth for categories — gathered from services, packages, and
// calendar columns so a category defined anywhere shows up in every picker.
function serviceCategories() {
  return [...new Set([
    ...(state.services || []).map(service => service.category),
    ...(state.packageTemplates || []).map(template => template.category),
    ...(state.scheduleColumns || []).map(column => column.category)
  ].filter(Boolean))].sort((a, b) => a.localeCompare(b, "ar"));
}

// Options for a commission-rule target select: pick a whole category (cat:NAME)
// or a single service. Categories are gathered from services AND packages, so a
// rule set on a category also covers package sales in that category.
function ruleTargetOptionsHtml(allLabel = "كل الخدمات") {
  const categories = serviceCategories();
  const catGroup = categories.length
    ? `<optgroup label="الفئات (تُطبّق على كل الفئة والباقات)">${categories.map(c => `<option value="cat:${c}">${c} — كل الفئة</option>`).join("")}</optgroup>`
    : "";
  const svcGroup = `<optgroup label="خدمة واحدة">${activeServices().map(s => `<option value="${s.id}">${s.name}</option>`).join("")}</optgroup>`;
  return `<option value="">${allLabel}</option>${catGroup}${svcGroup}`;
}

// Split a rule-target select value into { serviceId, category }.
function parseRuleTarget(value) {
  const raw = String(value || "");
  return raw.startsWith("cat:")
    ? { serviceId: "", category: raw.slice(4) }
    : { serviceId: raw, category: "" };
}

function normalizePackageTemplate(template) {
  const source = template || {};
  return {
    id: source.id || nextId("pkgtpl"),
    name: source.name || "باقة بدون اسم",
    category: source.category || "",
    serviceId: source.serviceId || source.service_id || "",
    sessions: Math.max(1, Math.round(asNumber(source.sessions) || 1)),
    price: asNumber(source.price),
    validityDays: Math.max(0, Math.round(asNumber(source.validityDays ?? source.validity_days))),
    active: source.active !== false
  };
}

function normalizePatientPackage(pkg) {
  const source = pkg || {};
  const total = Math.max(1, Math.round(asNumber(source.totalSessions ?? source.total_sessions) || 1));
  const used = Math.min(total, Math.max(0, Math.round(asNumber(source.usedSessions ?? source.used_sessions))));
  const status = ["completed", "expired", "active"].includes(source.status) ? source.status : "active";
  return {
    id: source.id || nextId("pkg"),
    patientId: source.patientId || source.patient_id || "",
    templateId: source.templateId || source.template_id || "",
    name: source.name || "باقة",
    category: source.category || "",
    serviceId: source.serviceId || source.service_id || "",
    totalSessions: total,
    usedSessions: used,
    price: asNumber(source.price),
    paid: asNumber(source.paid),
    soldByStaffId: source.soldByStaffId || source.sold_by || "",
    soldAt: source.soldAt || source.sold_at || "",
    expiresAt: source.expiresAt || source.expires_at || "",
    status
  };
}

function packageRemaining(pkg) {
  return Math.max(0, (pkg.totalSessions || 0) - (pkg.usedSessions || 0));
}

function packageComputedStatus(pkg) {
  if (packageRemaining(pkg) <= 0) return "completed";
  if (pkg.expiresAt && pkg.expiresAt < new Date().toISOString().slice(0, 10)) return "expired";
  return "active";
}

function packageTemplateById(id) {
  return (state.packageTemplates || []).find(template => template.id === id) || null;
}

function patientPackageById(id) {
  return (state.patientPackages || []).find(pkg => pkg.id === id) || null;
}

function packageScheduledSessions(packageId) {
  return (state.bookings || []).filter(booking => booking.packageId === packageId && booking.status === "scheduled");
}

function upcomingPackageSessions() {
  return (state.bookings || [])
    .filter(booking => booking.packageId && booking.status === "scheduled")
    .slice()
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
}

// Sell a package: records the patient package (session tracking) AND a real
// revenue entry on the active date, so the sale shows in سجل العمليات and counts
// in every entry-based calculation (revenue, collections, commission, reports).
function sellPackage({ patientId, template, sessions, price, paid, soldByStaffId }) {
  if (!patientId || !template) return null;
  const totalSessions = Math.max(1, Math.round(numberValue(sessions) || template.sessions));
  const finalPrice = (price !== undefined && price !== null && price !== "") ? numberValue(price) : numberValue(template.price);
  const paidAmount = Math.min(Math.max(numberValue(paid), 0), finalPrice);
  let expiresAt = "";
  if (template.validityDays > 0) {
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + template.validityDays);
    expiresAt = expiry.toISOString().slice(0, 10);
  }
  const pkg = normalizePatientPackage({
    patientId, templateId: template.id, name: template.name, category: template.category || "", serviceId: template.serviceId,
    totalSessions, usedSessions: 0, price: finalPrice, paid: paidAmount,
    soldByStaffId: soldByStaffId || "", soldAt: state.settings.activeDate, expiresAt, status: "active"
  });
  state.patientPackages = state.patientPackages || [];
  state.patientPackages.push(pkg);
  logEdit("بيع باقة", `${patientById(patientId)?.name || ""} · ${pkg.name} · ${money(pkg.price)}`);

  const seller = (state.staff || []).find(member => member.id === soldByStaffId);
  const patient = patientById(patientId);
  const entry = normalizeEntry({
    id: nextId("entry"),
    visitNumber: nextVisitNumber(),
    date: state.settings.activeDate,
    patientId,
    patient: patient ? patient.name : "مريض",
    serviceId: "",
    service: `باقة: ${template.name}`,
    amount: finalPrice,
    discount: 0,
    quantity: 1,
    cost: 0,
    doctorId: seller && seller.role === "doctor" ? seller.id : "",
    specialistId: seller && seller.role && seller.role !== "doctor" ? seller.id : "",
    packageId: pkg.id,
    status: "completed",
    paymentBreakdown: { cash: paidAmount, card: 0, transfer: 0 }
  }, state.services);
  state.entries = state.entries || [];
  state.entries.push(entry);
  pkg.entryId = entry.id;
  return pkg;
}

function patientById(id) {
  return (state.patients || []).find(patient => patient.id === id) || null;
}

function findOrCreatePatientByName(name) {
  const clean = String(name || "").trim();
  if (!clean) return null;
  const existing = (state.patients || []).find(patient => patientNameKey(patient.name) === patientNameKey(clean));
  if (existing) return existing;
  const patient = normalizePatient({ name: clean, profileType: "patient" });
  state.patients = state.patients || [];
  state.patients.push(patient);
  logEdit("إضافة ملف مريض", patient.name);
  return patient;
}

function normalizeRule(rule) {
  const appliesTo = rule.appliesTo || rule.applies_to || "doctor";
  const isOldDoctorDefault = rule.id === "rule-doctors-net-default" && rule.model === "pct_net" && asNumber(rule.value) === 50;
  const personIds = Array.isArray(rule.personIds)
    ? [...new Set(rule.personIds.filter(Boolean))]
    : ((rule.personId || rule.person_id) ? [rule.personId || rule.person_id] : []);
  const serviceIds = Array.isArray(rule.serviceIds)
    ? [...new Set(rule.serviceIds.filter(Boolean))]
    : ((rule.serviceId || rule.service_id) ? [rule.serviceId || rule.service_id] : []);
  return {
    id: rule.id || nextId("rule"),
    name: isOldDoctorDefault ? "الأطباء | نسبة العضو من الربح الصافي" : rule.name || "قاعدة بدون اسم",
    appliesTo: appliesTo === "staff" ? "specialist" : appliesTo,
    personId: personIds[0] || "",
    personIds,
    serviceId: serviceIds[0] || "",
    serviceIds,
    category: rule.category || "",
    model: isOldDoctorDefault ? "member_rate" : rule.model || "pct_net",
    value: isOldDoctorDefault ? 0 : asNumber(rule.value),
    tierThreshold: asNumber(rule.tierThreshold ?? rule.tier_threshold_qty),
    tierValue: asNumber(rule.tierValue ?? rule.tier_value),
    active: rule.active !== false && rule.is_active !== false
  };
}

function normalizeStaffMember(member) {
  const role = member.role === "staff" ? "specialist" : member.role || "specialist";
  // Default model: doctors default to pct_net (from profit), specialists to pct_gross (from collected)
  const defaultModel = role === "doctor" ? "pct_net" : "pct_gross";
  return {
    id: member.id || nextId("staff"),
    name: member.name || "عضو فريق",
    role,
    model: member.model || defaultModel,
    rate: asNumber(member.rate),
    baseSalary: asNumber(member.baseSalary ?? member.base_salary),
    deduction: asNumber(member.deduction ?? member.ss_deduction),
    phone: member.phone || member.mobile || "",
    email: member.email || ""
  };
}

function defaultViewsForRole(role) {
  if (role === "admin") return ADMIN_VIEWS;
  if (role === "data_entry") return ["entries"];
  return ["dashboard", "entries"];
}

function featureById(featureId) {
  return PERMISSION_FEATURES.find(feature => feature.id === featureId);
}

function uniqueValues(values) {
  return [...new Set(values.filter(Boolean))];
}

function defaultFeaturesForRole(role) {
  return DEFAULT_FEATURES_BY_ROLE[role] || DEFAULT_FEATURES_BY_ROLE.data_entry;
}

function accountDisplayName(account) {
  return account.name
    || [account.arabicFirstName, account.arabicLastName].filter(Boolean).join(" ")
    || [account.firstName, account.lastName].filter(Boolean).join(" ")
    || account.userName
    || "حساب مستخدم";
}

function permissionCategoryLabel(category) {
  const labels = {
    patients: "Patients & Visitors",
    medical: "Medical & Treatments",
    calendar: "Calendar & Appointments",
    financial: "Financial",
    reports: "Reports",
    inventory: "Inventory",
    communication: "SMS & Communication",
    administration: "Administration"
  };
  return labels[category] || category || "Other";
}

function deriveAccessFromFeatures(role, features) {
  if (role === "admin") {
    return {
      allowedViews: ADMIN_VIEWS,
      canViewSensitive: true,
      canManagePermissions: true
    };
  }

  const featureObjects = features.map(featureById).filter(Boolean);
  const featureViews = featureObjects.flatMap(feature => feature.views || []);
  const allowedViews = uniqueValues([
    ...defaultViewsForRole(role),
    ...featureViews.filter(view => VIEW_LABELS[view])
  ]);

  return {
    allowedViews,
    canViewSensitive: featureObjects.some(feature => feature.sensitive),
    canManagePermissions: featureObjects.some(feature => feature.managePermissions)
  };
}

function normalizeAccount(account) {
  const role = account.role || "data_entry";
  const storedFeatures = Array.isArray(account.permissionFeatures)
    ? account.permissionFeatures
    : Array.isArray(account.permission_features)
      ? account.permission_features
      : defaultFeaturesForRole(role);
  const allowedViews = Array.isArray(account.allowedViews)
    ? account.allowedViews
    : Array.isArray(account.allowed_views)
      ? account.allowed_views
      : defaultViewsForRole(role);
  const views = [...new Set(allowedViews.filter(view => VIEW_LABELS[view]))];
  const permissionFeatures = uniqueValues(storedFeatures.filter(feature => featureById(feature)));
  const derived = deriveAccessFromFeatures(role, permissionFeatures);
  const firstName = account.firstName || account.first_name || "";
  const lastName = account.lastName || account.last_name || "";
  const arabicFirstName = account.arabicFirstName || account.arabic_first_name || "";
  const arabicLastName = account.arabicLastName || account.arabic_last_name || "";
  const userName = account.userName || account.user_name || account.username || "";

  const normalized = {
    id: account.id || nextId("account"),
    userName: userName || `user-${Date.now().toString().slice(-4)}`,
    arabicFirstName,
    arabicLastName,
    firstName,
    lastName,
    uid: String(account.uid || account.user_id || Math.floor(10000 + Math.random() * 90000)),
    name: account.name || [arabicFirstName, arabicLastName].filter(Boolean).join(" ") || [firstName, lastName].filter(Boolean).join(" ") || userName || "حساب مستخدم",
    role,
    staffId: account.staffId || account.staff_id || "",
    viewMode: ["normal", "kiosk", "rows_nav"].includes(account.viewMode || account.view_mode) ? (account.viewMode || account.view_mode) : "normal",
    allowedViews: derived.allowedViews.length ? derived.allowedViews : views.length ? views : defaultViewsForRole(role),
    permissionFeatures,
    canViewSensitive: role === "admin" || derived.canViewSensitive,
    ownEntriesOnly: account.ownEntriesOnly === true || account.own_entries_only === true,
    canManagePermissions: role === "admin" || derived.canManagePermissions,
    memberSince: account.memberSince || account.member_since || new Date().toISOString().slice(0, 10),
    lastAccess: account.lastAccess || account.last_access || "",
    mobile: account.mobile || account.phone || "",
    email: account.email || "",
    telNo: account.telNo || account.tel_no || account.telephone || "",
    calendarScope: account.calendarScope || account.calendar_scope || "all",
    calendarDaysBack: asNumber(account.calendarDaysBack ?? account.calendar_days_back),
    calendarDaysAhead: asNumber(account.calendarDaysAhead ?? account.calendar_days_ahead) || 365,
    workingDays: Array.isArray(account.workingDays)
      ? account.workingDays.map(Number)
      : Array.isArray(account.working_days)
        ? account.working_days.map(Number)
        : [0, 1, 2, 3, 4, 5, 6],
    allowedColumnIds: Array.isArray(account.allowedColumnIds) ? account.allowedColumnIds : [],
    active: account.active !== false
  };

  normalized.name = accountDisplayName(normalized);
  return normalized;
}

function normalizePatient(patient) {
  return {
    id: patient.id || nextId("patient"),
    patientNumber: String(patient.patientNumber || patient.patient_number || ""),
    profileType: patient.profileType || patient.profile_type || "patient",
    name: patient.name || patient.full_name || "ملف بدون اسم",
    phone: patient.phone || patient.mobile || "",
    email: patient.email || "",
    gender: patient.gender || "",
    nationality: patient.nationality || "",
    city: patient.city || "",
    category: patient.category || "",
    referralSource: patient.referralSource || patient.referral_source || "",
    notes: patient.notes || patient.note || "",
    rating: Math.min(5, Math.max(0, Math.round(asNumber(patient.rating)))),
    marketingConsent: patient.marketingConsent === true || patient.marketing_consent === true,
    consentUpdatedAt: patient.consentUpdatedAt || patient.consent_updated_at || "",
    createdAt: patient.createdAt || patient.created_at || today,
    active: patient.active !== false
  };
}

function patientNameKey(value) {
  return String(value || "").trim().toLocaleLowerCase("ar").replace(/\s+/g, " ");
}

function linkPatientIds(records, patients) {
  const patientsByName = new Map(patients.map(patient => [patientNameKey(patient.name), patient.id]));
  return records.map(record => ({
    ...record,
    patientId: record.patientId || patientsByName.get(patientNameKey(record.patient)) || ""
  }));
}

function completePatientDirectory(patients, records) {
  const completed = patients.map(patient => ({ ...patient }));
  const known = new Set(completed.map(patient => patientNameKey(patient.name)));
  const missing = records
    .filter(record => record.patient && !known.has(patientNameKey(record.patient)))
    .sort((a, b) => patientNameKey(a.patient).localeCompare(patientNameKey(b.patient), "ar"));

  missing.forEach(record => {
    const key = patientNameKey(record.patient);
    if (!key || known.has(key)) return;
    known.add(key);
    completed.push(normalizePatient({
      id: `patient-auto-${completed.length + 1}`,
      patientNumber: String(1001 + completed.length),
      profileType: "patient",
      name: record.patient,
      phone: record.phone || "",
      createdAt: record.date || today
    }));
  });
  return completed;
}

function normalizeEntry(entry, services = seedServices) {
  const service = serviceFromEntry(entry, services);
  const quantity = Math.max(asNumber(entry.quantity ?? entry.qty) || 1, 1);
  const amount = asNumber(entry.amount ?? entry.price);
  const unitPrice = asNumber(entry.unitPrice ?? entry.unit_price) || (quantity ? amount / quantity : amount);
  const totalAmount = amount || unitPrice * quantity;
  const discount = Math.min(asNumber(entry.discount), totalAmount);
  const doctorId = entry.doctorId || entry.doctor_id || "";
  const specialistId = entry.specialistId || entry.staff_id || "";
  const status = entry.status || (!doctorId && !specialistId ? "pending_assignment" : "completed");
  const paymentBreakdown = cleanPaymentBreakdown(
    entry.paymentBreakdown || entry.payment_breakdown || entry.payments,
    entry.paymentMethod || entry.payment_method || "cash",
    Math.max(totalAmount - discount, 0)
  );

  return {
    ...entry,
    id: entry.id || nextId("entry"),
    date: entry.date || today,
    patientId: entry.patientId || entry.patient_id || "",
    patient: entry.patient || entry.customer || "مريض",
    serviceId: entry.serviceId || entry.service_id || service?.id || "",
    service: service?.name || entry.service || "خدمة",
    doctorId,
    specialistId,
    quantity,
    unitPrice,
    amount: totalAmount,
    cost: asNumber(entry.cost ?? service?.defaultCost),
    discount,
    paymentBreakdown,
    paymentMethod: entry.paymentMethod || entry.payment_method || paymentMethodFromBreakdown(paymentBreakdown, "cash"),
    status,
    bookingId: entry.bookingId || entry.booking_id || "",
    createdAt: entry.createdAt || entry.created_at || new Date().toISOString(),
    notes: entry.notes || entry.note || "",
    // doctorRate override: 0 means "use staff default". Positive value = per-visit override.
    doctorRate: asNumber(entry.doctorRate ?? entry.doctor_rate),
    doctorModel: entry.doctorModel || entry.doctor_model || ""
  };
}

function normalizeBooking(booking, services = seedServices) {
  const service = serviceFromEntry(booking, services);
  return {
    id: booking.id || nextId("booking"),
    date: booking.date || today,
    time: booking.time || "09:00",
    patientId: booking.patientId || booking.patient_id || "",
    patient: booking.patient || booking.customer || "مريض",
    phone: booking.phone || booking.mobile || "",
    serviceId: booking.serviceId || booking.service_id || service?.id || "",
    service: service?.name || booking.service || "خدمة",
    scheduleColumnId: booking.scheduleColumnId || booking.schedule_column_id || "",
    doctorId: booking.doctorId || booking.doctor_id || "",
    specialistId: booking.specialistId || booking.staff_id || "",
    expectedAmount: asNumber(booking.expectedAmount ?? booking.expected_amount ?? service?.defaultPrice),
    status: booking.status || "scheduled",
    packageId: booking.packageId || booking.package_id || "",
    notes: booking.notes || booking.note || "",
    createdAt: booking.createdAt || booking.created_at || new Date().toISOString()
  };
}

function normalizeScheduleColumn(column = {}, index = 0) {
  const label = String(column.label || column.name || column.title || "").trim() || `Column ${index + 1}`;
  const id = String(column.id || column.value || "")
    .trim()
    .replace(/[^a-zA-Z0-9_\-\u0600-\u06FF]+/g, "-")
    .replace(/^-+|-+$/g, "")
    || `schedule-column-${index + 1}`;
  const categories = Array.isArray(column.categories)
    ? [...new Set(column.categories.filter(Boolean))]
    : (column.category ? [column.category] : []);
  return {
    id,
    label,
    categories,
    category: categories[0] || "",
    active: column.active !== false
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
    isProduct: item.isProduct === true || item.is_product === true,
    salePrice: asNumber(item.salePrice ?? item.sale_price ?? item.price),
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
  const rawBookings = seedBookings.map(booking => normalizeBooking(booking, services));
  const rawEntries = [...demoHistoryEntries, ...seedEntries].map(entry => normalizeEntry(entry, services));
  const patients = completePatientDirectory(seedPatients.map(normalizePatient), [...rawEntries, ...rawBookings]);
  const bookings = linkPatientIds(rawBookings, patients);
  const entries = linkPatientIds(rawEntries, patients);
  const communication = seedCommunicationState();
  const expenseGroups = [
    normalizeExpenseGroup({
      id: "expense-group-operating",
      name: "تشغيل العيادة",
      subgroups: [
        { id: "expense-sub-transport", name: "مواصلات" },
        { id: "expense-sub-supplies", name: "مستلزمات" },
        { id: "expense-sub-utilities", name: "مياه وكهرباء" }
      ]
    }),
    normalizeExpenseGroup({
      id: "expense-group-payroll",
      name: "الموظفون",
      subgroups: [
        { id: "expense-sub-salary", name: "رواتب" },
        { id: "expense-sub-meals", name: "ضيافة ووجبات" }
      ]
    }),
    normalizeExpenseGroup({
      id: "expense-group-marketing",
      name: "التسويق",
      subgroups: [{ id: "expense-sub-ads", name: "إعلانات" }]
    })
  ];
  const expenses = [
    normalizeExpense({ id: "expense-demo-1", groupId: "expense-group-operating", subgroupId: "expense-sub-supplies", amount: 24.3, date: today, paymentMethod: "cash", vendor: "مورد العيادة", notes: "مستلزمات يومية" }),
    normalizeExpense({ id: "expense-demo-2", groupId: "expense-group-payroll", subgroupId: "expense-sub-meals", amount: 8, date: dateOffset(-1), paymentMethod: "cash", notes: "ضيافة الفريق" }),
    normalizeExpense({ id: "expense-demo-3", groupId: "expense-group-marketing", subgroupId: "expense-sub-ads", amount: 60, date: dateOffset(-3), paymentMethod: "card", vendor: "منصة إعلانات", reference: "AD-104" })
  ];
  const seedReconciliations = {
    ...createDemoReconciliations(),
    [today]: {
      countedCash: 135,
      countedCard: 120,
      countedTransfer: 45,
      note: "إغلاق تجريبي محفوظ لعرض سجل المطابقة اليومي."
    }
  };
  const reconciliationData = normalizeReconciliationData({ reconciliations: seedReconciliations }, entries);
  return {
    demoHistoryVersion: DEMO_HISTORY_VERSION,
    settings: {
      clinicName: "عيادة رعاية التجريبية",
      activeDate: today,
      branch: "الفرع الرئيسي",
      reportDateFrom: today,
      reportDateTo: today,
      scheduleSlotMinutes: 15,
      language: storageGet("riaayaLanguage") || "ar"
    },
    staff: seedStaff.map(normalizeStaffMember),
    services,
    scheduleColumns: DEFAULT_SCHEDULE_COLUMNS.map(normalizeScheduleColumn),
    rules: seedRules.map(normalizeRule),
    suppliers,
    inventory,
    purchaseOrders,
    expenseGroups,
    expenses,
    importHistory: [],
    bookings,
    patients,
    accounts: seedAccounts.map(normalizeAccount),
    currentAccountId: "account-admin",
    entries,
    digestRules: communication.digestRules.map(normalizeDigestRule),
    campaigns: communication.campaigns,
    outboundMessages: communication.outboundMessages,
    receipts: communication.receipts,
    notificationReads: communication.notificationReads,
    integrations: communication.integrations,
    salaryApprovals: {},
    reconciliations: reconciliationData.reconciliations,
    reconciliationHistory: reconciliationData.reconciliationHistory
  };
}

function ensureDemoHistory(loadedState) {
  if (loadedState.demoHistoryVersion >= DEMO_HISTORY_VERSION) return loadedState;

  const existingIds = new Set(loadedState.entries.map(entry => entry.id));
  const additions = linkPatientIds(
    demoHistoryEntries
      .filter(entry => !existingIds.has(entry.id))
      .map(entry => normalizeEntry(entry, loadedState.services)),
    loadedState.patients || []
  );

  const nextEntries = [...additions, ...loadedState.entries];
  const reconciliationData = normalizeReconciliationData({
    ...loadedState,
    reconciliations: {
      ...createDemoReconciliations(),
      ...loadedState.reconciliations
    }
  }, nextEntries);

  return {
    ...loadedState,
    demoHistoryVersion: DEMO_HISTORY_VERSION,
    entries: nextEntries,
    accounts: (loadedState.accounts || []).map(account => {
      if (account.id === "account-data-entry") {
        return normalizeAccount({ ...account, permissionFeatures: uniqueValues([...(account.permissionFeatures || []), ...DEFAULT_FEATURES_BY_ROLE.data_entry, "see_mobile"]) });
      }
      if (account.id === "account-doctor-laila") {
        return normalizeAccount({ ...account, permissionFeatures: uniqueValues([...(account.permissionFeatures || []), ...DEFAULT_FEATURES_BY_ROLE.doctor]) });
      }
      return account;
    }),
    reconciliations: reconciliationData.reconciliations,
    reconciliationHistory: reconciliationData.reconciliationHistory
  };
}

function loadState() {
  try {
    const saved = JSON.parse(storageGet(STORAGE_KEY));
    if (!saved) return createSeedState();
    const seed = createSeedState();
    const services = mergeById(seed.services, Array.isArray(saved.services) ? saved.services.map(normalizeService) : []);
    const rules = mergeById(seed.rules, Array.isArray(saved.rules) ? saved.rules.map(normalizeRule) : []);
    const suppliers = mergeById(seed.suppliers, Array.isArray(saved.suppliers) ? saved.suppliers.map(normalizeSupplier) : []);
    const inventory = mergeById(seed.inventory, Array.isArray(saved.inventory) ? saved.inventory.map(normalizeInventoryItem) : []);
    const purchaseOrders = mergeById(seed.purchaseOrders, Array.isArray(saved.purchaseOrders) ? saved.purchaseOrders.map(normalizePurchaseOrder) : []);
    const rawBookings = mergeById(seed.bookings, Array.isArray(saved.bookings) ? saved.bookings.map(booking => normalizeBooking(booking, services)) : []);
    const rawEntries = Array.isArray(saved.entries) ? saved.entries.map(entry => normalizeEntry(entry, services)) : seed.entries;
    const patients = completePatientDirectory(
      mergeById(seed.patients, Array.isArray(saved.patients) ? saved.patients.map(normalizePatient) : []),
      [...rawEntries, ...rawBookings]
    );
    const bookings = linkPatientIds(rawBookings, patients);
    const entries = linkPatientIds(rawEntries, patients);
    const savedAccounts = Array.isArray(saved.accounts)
      ? saved.accounts.map(normalizeAccount).map(account => {
          const seededAccount = seed.accounts.find(item => item.id === account.id);
          return {
            ...account,
            mobile: account.mobile || seededAccount?.mobile || "",
            telNo: account.telNo || seededAccount?.telNo || ""
          };
        })
      : [];
    const accounts = mergeById(seed.accounts, savedAccounts).map(normalizeAccount);
    const currentAccountId = accounts.some(account => account.id === saved.currentAccountId)
      ? saved.currentAccountId
      : "account-admin";
    if (saved.settings?.clinicName) {
      saved.settings.clinicName = saved.settings.clinicName.replaceAll("رعايا", "رعاية");
    }
    const mergedSettings = { ...seed.settings, ...saved.settings };
    // Auto-advance the active working date to today if the app wasn't opened today.
    if (mergedSettings.activeDate && mergedSettings.activeDate < today) {
      mergedSettings.activeDate = today;
    }
    const loaded = {
      demoHistoryVersion: saved.demoHistoryVersion || 0,
      settings: mergedSettings,
      staff: Array.isArray(saved.staff) ? saved.staff.map(normalizeStaffMember) : seed.staff,
      services,
      scheduleColumns: Array.isArray(saved.scheduleColumns)
        ? saved.scheduleColumns.map(normalizeScheduleColumn).filter(column => column.active !== false)
        : seed.scheduleColumns,
      rules,
      suppliers,
      inventory,
      purchaseOrders,
      expenseGroups: Array.isArray(saved.expenseGroups) ? saved.expenseGroups.map(normalizeExpenseGroup) : seed.expenseGroups,
      expenses: Array.isArray(saved.expenses) ? saved.expenses.map(normalizeExpense) : seed.expenses,
      importHistory: Array.isArray(saved.importHistory) ? saved.importHistory.map(normalizeImportHistory) : [],
      packageTemplates: Array.isArray(saved.packageTemplates) ? saved.packageTemplates.map(normalizePackageTemplate) : seed.packageTemplates,
      patientPackages: Array.isArray(saved.patientPackages) ? saved.patientPackages.map(normalizePatientPackage) : seed.patientPackages,
      auditTrail: Array.isArray(saved.auditTrail) ? saved.auditTrail : [],
      growthLog: Array.isArray(saved.growthLog) ? saved.growthLog : [],
      bookings,
      patients,
      accounts,
      currentAccountId,
      entries,
      digestRules: Array.isArray(saved.digestRules) ? saved.digestRules.map(normalizeDigestRule) : seed.digestRules,
      campaigns: Array.isArray(saved.campaigns) ? saved.campaigns.map(normalizeCampaign) : seed.campaigns,
      outboundMessages: Array.isArray(saved.outboundMessages) ? saved.outboundMessages.map(normalizeOutboundMessage) : seed.outboundMessages,
      receipts: Array.isArray(saved.receipts) ? saved.receipts.map(normalizeReceipt) : seed.receipts,
      notificationReads: saved.notificationReads || {},
      integrations: {
        whatsapp: { ...seed.integrations.whatsapp, ...(saved.integrations?.whatsapp || {}) },
        sms: { ...seed.integrations.sms, ...(saved.integrations?.sms || {}) },
        jofotara: { ...seed.integrations.jofotara, ...(saved.integrations?.jofotara || {}) }
      },
      salaryApprovals: saved.salaryApprovals || {},
      reconciliations: saved.reconciliations || {},
      reconciliationHistory: Array.isArray(saved.reconciliationHistory) ? saved.reconciliationHistory : []
    };
    const reconciliationData = normalizeReconciliationData(loaded, entries);
    return ensureDemoHistory({
      ...loaded,
      reconciliations: reconciliationData.reconciliations,
      reconciliationHistory: reconciliationData.reconciliationHistory
    });
  } catch {
    return createSeedState();
  }
}

function emptyClinicState(clinic = {}) {
  const communication = seedCommunicationState();
  return {
    demoHistoryVersion: DEMO_HISTORY_VERSION,
    settings: {
      clinicName: clinic.name || "عيادة جديدة",
      activeDate: today,
      branch: "الفرع الرئيسي",
      reportDateFrom: today,
      reportDateTo: today,
      scheduleSlotMinutes: 15,
      language: storageGet("riaayaLanguage") || "ar"
    },
    staff: [],
    services: [],
    packageTemplates: [],
    patientPackages: [],
    auditTrail: [],
    scheduleColumns: DEFAULT_SCHEDULE_COLUMNS.map(normalizeScheduleColumn),
    rules: [],
    suppliers: [],
    inventory: [],
    purchaseOrders: [],
    expenseGroups: [],
    expenses: [],
    importHistory: [],
    bookings: [],
    patients: [],
    accounts: [],
    currentAccountId: "",
    entries: [],
    digestRules: [],
    campaigns: [],
    outboundMessages: [],
    receipts: [],
    notificationReads: {},
    integrations: {
      whatsapp: { ...communication.integrations.whatsapp, configured: false },
      sms: { ...communication.integrations.sms, configured: false },
      jofotara: {
        ...communication.integrations.jofotara,
        configured: Boolean(clinic.taxNumber && clinic.incomeSourceSequence),
        taxNumber: clinic.taxNumber || "",
        incomeSourceSequence: clinic.incomeSourceSequence || ""
      }
    },
    salaryApprovals: {},
    reconciliations: {},
    reconciliationHistory: []
  };
}

function hydrateClinicState(saved, clinic, accounts) {
  const base = emptyClinicState(clinic);
  const source = saved && typeof saved === "object" ? saved : {};
  const services = Array.isArray(source.services) ? source.services.map(normalizeService) : [];
  const patients = Array.isArray(source.patients) ? source.patients.map(normalizePatient) : [];
  const bookings = linkPatientIds(
    Array.isArray(source.bookings) ? source.bookings.map(booking => normalizeBooking(booking, services)) : [],
    patients
  );
  const entries = linkPatientIds(
    Array.isArray(source.entries) ? source.entries.map(entry => normalizeEntry(entry, services)) : [],
    patients
  );
  const reconciliationData = normalizeReconciliationData(source, entries);
  return {
    ...base,
    ...source,
    settings: (() => {
      const merged = { ...base.settings, ...(source.settings || {}), clinicName: clinic.name || source.settings?.clinicName || base.settings.clinicName };
      // Follow the device date: if the clinic was last opened on an earlier day,
      // advance the working date to today so a new day starts fresh.
      if (!merged.activeDate || merged.activeDate < today) merged.activeDate = today;
      return merged;
    })(),
    staff: Array.isArray(source.staff) ? source.staff.map(normalizeStaffMember) : [],
    services,
    packageTemplates: Array.isArray(source.packageTemplates) ? source.packageTemplates.map(normalizePackageTemplate) : [],
    patientPackages: Array.isArray(source.patientPackages) ? source.patientPackages.map(normalizePatientPackage) : [],
    scheduleColumns: Array.isArray(source.scheduleColumns)
      ? source.scheduleColumns.map(normalizeScheduleColumn).filter(column => column.active !== false)
      : base.scheduleColumns,
    rules: Array.isArray(source.rules) ? source.rules.map(normalizeRule) : [],
    suppliers: Array.isArray(source.suppliers) ? source.suppliers.map(normalizeSupplier) : [],
    inventory: Array.isArray(source.inventory) ? source.inventory.map(normalizeInventoryItem) : [],
    purchaseOrders: Array.isArray(source.purchaseOrders) ? source.purchaseOrders.map(normalizePurchaseOrder) : [],
    expenseGroups: Array.isArray(source.expenseGroups) ? source.expenseGroups.map(normalizeExpenseGroup) : [],
    expenses: Array.isArray(source.expenses) ? source.expenses.map(normalizeExpense) : [],
    importHistory: Array.isArray(source.importHistory) ? source.importHistory.map(normalizeImportHistory) : [],
    bookings,
    patients,
    entries,
    accounts: (accounts || []).map(normalizeAccount),
    currentAccountId: runtime.session?.user?.id || "",
    digestRules: Array.isArray(source.digestRules) ? source.digestRules.map(normalizeDigestRule) : [],
    campaigns: Array.isArray(source.campaigns) ? source.campaigns.map(normalizeCampaign) : [],
    outboundMessages: Array.isArray(source.outboundMessages) ? source.outboundMessages.map(normalizeOutboundMessage) : [],
    receipts: Array.isArray(source.receipts) ? source.receipts.map(normalizeReceipt) : [],
    notificationReads: source.notificationReads || {},
    auditTrail: Array.isArray(source.auditTrail) ? source.auditTrail : [],
    growthLog: Array.isArray(source.growthLog) ? source.growthLog : [],
    integrations: {
      whatsapp: { ...base.integrations.whatsapp, ...(source.integrations?.whatsapp || {}) },
      sms: { ...base.integrations.sms, ...(source.integrations?.sms || {}) },
      jofotara: { ...base.integrations.jofotara, ...(source.integrations?.jofotara || {}) }
    },
    salaryApprovals: source.salaryApprovals || {},
    reconciliations: reconciliationData.reconciliations,
    reconciliationHistory: reconciliationData.reconciliationHistory
  };
}

let state = loadState();
let selectedSalaryMemberId = "";
let selectedPatientId = state.patients?.[0]?.id || "";
let patientFocusMode = "list";
let patientPage = 1;
let operationPage = 1;
let reportPage = 1;
let expensePage = 1;
let importSession = null;
let pendingOperationLines = [];
let communicationBackendStatus = null;
let storageSafetyStatus = null;
let currentFollowupId = null;
let selectedFollowupMethod = "cash";

const els = {
  viewButtons: document.querySelectorAll("[data-view-button]"),
  views: document.querySelectorAll("[data-view]"),
  clinicForm: document.querySelector("[data-clinic-form]"),
  clinicTitle: document.querySelector("[data-clinic-title]"),
  languageSelect: document.querySelector("[data-language-select]"),
  accountSwitcher: document.querySelector("[data-account-switcher]"),
  accountForm: document.querySelector("[data-account-form]"),
  accountStaffSelect: document.querySelector("[data-account-staff-select]"),
  accountColumnsSelect: document.querySelector("[data-account-columns-select]"),
  accountList: document.querySelector("[data-account-list]"),
  accountFilterForm: document.querySelector("[data-account-filter-form]"),
  accountTable: document.querySelector("[data-account-table]"),
  accountSubmit: document.querySelector("[data-account-submit]"),
  storageSafetyPanel: document.querySelector("[data-storage-safety-panel]"),
  storageStatusBadge: document.querySelector("[data-storage-status-badge]"),
  storageStatusTitle: document.querySelector("[data-storage-status-title]"),
  storageStatusDetail: document.querySelector("[data-storage-status-detail]"),
  storageStatusMeta: document.querySelector("[data-storage-status-meta]"),
  permissionForm: document.querySelector("[data-permission-form]"),
  permissionAccountSelect: document.querySelector("[data-permission-account-select]"),
  permissionCategorySelect: document.querySelector("[data-permission-category-select]"),
  permissionSearch: document.querySelector("[data-permission-search]"),
  permissionFeatureSelect: document.querySelector("[data-permission-feature-select]"),
  permissionCatalog: document.querySelector("[data-permission-catalog]"),
  permissionTable: document.querySelector("[data-permission-table]"),
  growthCenter: document.querySelector("[data-growth-center]"),
  dailyCommandDate: document.querySelector("[data-daily-command-date]"),
  dailyCommandClinic: document.querySelector("[data-daily-command-clinic]"),
  dailyCommandNextTime: document.querySelector("[data-daily-command-next-time]"),
  dailyCommandNextName: document.querySelector("[data-daily-command-next-name]"),
  dailyCommandNextMeta: document.querySelector("[data-daily-command-next-meta]"),
  dailyCommandRevenue: document.querySelector("[data-daily-command-revenue]"),
  dailyCommandRevenueNote: document.querySelector("[data-daily-command-revenue-note]"),
  dailyCommandReconcileStatus: document.querySelector("[data-daily-command-reconcile-status]"),
  dailyCommandReconcileNote: document.querySelector("[data-daily-command-reconcile-note]"),
  dailyCommandAlerts: document.querySelector("[data-daily-command-alerts]"),
  dailyCommandAlertsNote: document.querySelector("[data-daily-command-alerts-note]"),
  dailyCommandOps: document.querySelector("[data-daily-command-ops]"),
  dailyCommandOpsNote: document.querySelector("[data-daily-command-ops-note]"),
  dailyCommandBookings: document.querySelector("[data-daily-command-bookings]"),
  dailyCommandBookingsNote: document.querySelector("[data-daily-command-bookings-note]"),
  operationModal: document.querySelector("[data-operation-modal]"),
  entryForm: document.querySelector("[data-entry-form]"),
  paymentQuickRow: document.querySelector("[data-payment-quick-row]"),
  paidAmountField: document.querySelector("[data-paid-amount-field]"),
  remainingField: document.querySelector("[data-remaining-field]"),
  remainingInput: document.querySelector("[data-remaining-input]"),
  operationPatientOptions: document.querySelector("[data-operation-patient-options]"),
  entryFilterForm: document.querySelector("[data-entry-filter-form]"),
  entryFilterService: document.querySelector("[data-entry-filter-service]"),
  entryFilterStaff: document.querySelector("[data-entry-filter-staff]"),
  entryPagination: document.querySelector("[data-entry-pagination]"),
  operationLines: document.querySelector("[data-operation-lines]"),
  entrySubmit: document.querySelector("[data-entry-submit]"),
  patientForm: document.querySelector("[data-patient-form]"),
  patientSubmit: document.querySelector("[data-patient-submit]"),
  patientFilterForm: document.querySelector("[data-patient-filter-form]"),
  patientTable: document.querySelector("[data-patient-table]"),
  patientPagination: document.querySelector("[data-patient-pagination]"),
  patientFile: document.querySelector("[data-patient-file]"),
  staffForm: document.querySelector("[data-staff-form]"),
  staffModelSelect: document.querySelector("[data-staff-model-select]"),
  staffRateLabel: document.querySelector("[data-staff-rate-label]"),
  staffModelHint: document.querySelector("[data-staff-model-hint]"),
  staffRuleServiceSelect: document.querySelector("[data-staff-rule-service-select]"),
  staffRuleModelSelect: document.querySelector("[data-staff-rule-model-select]"),
  staffRuleValueInput: document.querySelector("[data-staff-rule-value]"),
  staffPendingRules: document.querySelector("[data-staff-pending-rules]"),
  doctorRateRow: document.querySelector("[data-doctor-rate-row]"),
  doctorRateValue: document.querySelector("[data-doctor-rate-value]"),
  doctorRateHint: document.querySelector("[data-doctor-rate-hint]"),
  doctorRateOverride: document.querySelector("[data-doctor-rate-override]"),
  doctorRateOverrideInput: document.querySelector("[data-doctor-rate-override-input]"),
  doctorModelOverride: document.querySelector("[data-doctor-model-override]"),
  paymentStatusToggle: document.querySelector("[data-payment-status-toggle]"),
  serviceForm: document.querySelector("[data-service-form]"),
  ruleForm: document.querySelector("[data-rule-form]"),
  supplierForm: document.querySelector("[data-supplier-form]"),
  inventoryForm: document.querySelector("[data-inventory-form]"),
  productsList: document.querySelector("[data-products-list]"),
  orderForm: document.querySelector("[data-order-form]"),
  bookingForm: document.querySelector("[data-booking-form]"),
  reconcileForm: document.querySelector("[data-reconcile-form]"),
  doctorSelect: document.querySelector("[data-doctor-select]"),
  specialistSelect: document.querySelector("[data-specialist-select]"),
  serviceSelect: document.querySelector("[data-service-select]"),
  operationSchedulePanel: document.querySelector("[data-operation-schedule]"),
  operationScheduleColumn: document.querySelector("[data-operation-schedule-column]"),
  operationCategorySelect: document.querySelector("[data-operation-category]"),
  operationSubcategorySelect: document.querySelector("[data-operation-subcategory]"),
  serviceCategoryList: document.querySelector("#service-categories"),
  bookingDoctorSelect: document.querySelector("[data-booking-doctor-select]"),
  bookingSpecialistSelect: document.querySelector("[data-booking-specialist-select]"),
  bookingServiceSelect: document.querySelector("[data-booking-service-select]"),
  bookingCategorySelect: document.querySelector("[data-booking-category]"),
  bookingSubcategorySelect: document.querySelector("[data-booking-subcategory]"),
  bookingColumnSelect: document.querySelector("[data-booking-column-select]"),
  scheduleColumnForm: document.querySelector("[data-schedule-column-form]"),
  scheduleColumnList: document.querySelector("[data-schedule-column-list]"),
  scheduleSlotMinutes: document.querySelector("[data-schedule-slot-minutes]"),
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
  serviceBrowse: document.querySelector("[data-service-browse]"),
  serviceBrowseCategory: document.querySelector("[data-service-browse-category]"),
  serviceBrowseSearch: document.querySelector("[data-service-browse-search]"),
  referralSummary: document.querySelector("[data-referral-summary]"),
  collectionsBody: document.querySelector("[data-collections-body]"),
  collectionsTotal: document.querySelector("[data-collections-total]"),
  packageTemplateForm: document.querySelector("[data-package-template-form]"),
  packageTemplateList: document.querySelector("[data-package-template-list]"),
  packageSellForm: document.querySelector("[data-package-sell-form]"),
  packageList: document.querySelector("[data-package-list]"),
  packageSessionForm: document.querySelector("[data-package-session-form]"),
  packageSessionList: document.querySelector("[data-package-session-list]"),
  operationPackageTemplate: document.querySelector("[data-operation-package-template]"),
  operationPackageStatus: document.querySelector("[data-operation-package-status]"),
  ruleList: document.querySelector("[data-rule-list]"),
  supplierList: document.querySelector("[data-supplier-list]"),
  inventoryList: document.querySelector("[data-inventory-list]"),
  lowStockList: document.querySelector("[data-low-stock-list]"),
  purchaseOrderList: document.querySelector("[data-purchase-order-list]"),
  expenseForm: document.querySelector("[data-expense-form]"),
  expenseGroup: document.querySelector("[data-expense-group]"),
  expenseSubgroup: document.querySelector("[data-expense-subgroup]"),
  expenseSubmit: document.querySelector("[data-expense-submit]"),
  expenseCategoryForm: document.querySelector("[data-expense-category-form]"),
  expenseCategoryList: document.querySelector("[data-expense-category-list]"),
  expenseFilterForm: document.querySelector("[data-expense-filter-form]"),
  expenseFilterGroup: document.querySelector("[data-expense-filter-group]"),
  expenseFilterSubgroup: document.querySelector("[data-expense-filter-subgroup]"),
  expenseVisuals: document.querySelector("[data-expense-visuals]"),
  expenseTable: document.querySelector("[data-expense-table]"),
  expensePagination: document.querySelector("[data-expense-pagination]"),
  bookingList: document.querySelector("[data-booking-list]"),
  bookingDayCalendar: document.querySelector("[data-booking-day-calendar]"),
  bookingCalendar: document.querySelector("[data-booking-calendar]"),
  bookingCalendarWeekdays: document.querySelector("[data-booking-calendar-weekdays]"),
  bookingDateInput: document.querySelector("[data-booking-date-input]"),
  bookingCalendarTitle: document.querySelector("[data-booking-calendar-title]"),
  bookingCalendarSummary: document.querySelector("[data-booking-calendar-summary]"),
  salaryTable: document.querySelector("[data-salary-table]"),
  salarySlipPanel: document.querySelector("[data-salary-slip-panel]"),
  salarySlipSelect: document.querySelector("[data-salary-slip-select]"),
  salarySlip: document.querySelector("[data-salary-slip]"),
  printSalarySlip: document.querySelector("[data-print-salary-slip]"),
  reconcileResult: document.querySelector("[data-reconcile-result]"),
  leadList: document.querySelector("[data-lead-list]"),
  reportSelect: document.querySelector("[data-report-select]"),
  reportDateFrom: document.querySelector("[data-report-date-from]"),
  reportDateTo: document.querySelector("[data-report-date-to]"),
  reportToday: document.querySelector("[data-report-today]"),
  reportFilterForm: document.querySelector("[data-report-filter-form]"),
  reportSearch: document.querySelector("[data-report-search]"),
  reportSource: document.querySelector("[data-report-source]"),
  reportStatus: document.querySelector("[data-report-status]"),
  reportPayment: document.querySelector("[data-report-payment]"),
  reportPageSize: document.querySelector("[data-report-page-size]"),
  reportVisuals: document.querySelector("[data-report-visuals]"),
  reportPage: document.querySelector("[data-report-page]"),
  reportPagination: document.querySelector("[data-report-pagination]"),
  printSelectedReport: document.querySelector("[data-print-selected-report]"),
  focusExit: document.querySelector("[data-exit-focus]"),
  tableFocus: document.querySelector("[data-table-focus]"),
  tableFocusTitle: document.querySelector("[data-table-focus-title]"),
  tableFocusSubtitle: document.querySelector("[data-table-focus-subtitle]"),
  tableFocusContent: document.querySelector("[data-table-focus-content]"),
  alerts: document.querySelector("[data-alerts]"),
  healthLabel: document.querySelector("[data-health-label]"),
  healthNote: document.querySelector("[data-health-note]"),
  dashboardSummary: document.querySelector("[data-dashboard-summary]"),
  weekChart: document.querySelector("[data-week-chart]"),
  revenueTrend: document.querySelector("[data-revenue-trend]"),
  capacityHeatmap: document.querySelector("[data-capacity-heatmap]"),
  weekCount: document.querySelector("[data-week-count]"),
  paymentSummary: document.querySelector("[data-payment-summary]"),
  paymentBars: document.querySelector("[data-payment-bars]"),
  salaryBreakdown: document.querySelector("[data-salary-breakdown]"),
  closeSummary: document.querySelector("[data-close-summary]"),
  insightList: document.querySelector("[data-insight-list]"),
  closeChip: document.querySelector('[data-chip="close"]'),
  discountChip: document.querySelector('[data-chip="discount"]'),
  averageChip: document.querySelector('[data-chip="average"]'),
  nextVisitor: document.querySelector("[data-next-visitor]"),
  bookingFunnel: document.querySelector("[data-booking-funnel]"),
  dashboardSchedule: document.querySelector("[data-dashboard-schedule]"),
  smartActions: document.querySelector("[data-smart-actions]"),
  globalSearch: document.querySelector("[data-global-search]"),
  notificationToggle: document.querySelector("[data-notification-toggle]"),
  notificationPanel: document.querySelector("[data-notification-panel]"),
  notificationCount: document.querySelector("[data-notification-count]"),
  notificationList: document.querySelector("[data-notification-list]"),
  communicationNotifications: document.querySelector("[data-communication-notifications]"),
  digestForm: document.querySelector("[data-digest-form]"),
  digestAccount: document.querySelector("[data-digest-account]"),
  digestPreview: document.querySelector("[data-digest-preview]"),
  digestRules: document.querySelector("[data-digest-rules]"),
  campaignForm: document.querySelector("[data-campaign-form]"),
  campaignEstimate: document.querySelector("[data-campaign-estimate]"),
  campaignList: document.querySelector("[data-campaign-list]"),
  whatsappSettings: document.querySelector("[data-whatsapp-settings]"),
  smsSettings: document.querySelector("[data-sms-settings]"),
  jofotaraSettings: document.querySelector("[data-jofotara-settings]"),
  receiptTable: document.querySelector("[data-receipt-table]"),
  importSourceForm: document.querySelector("[data-import-source-form]"),
  importFile: document.querySelector("[data-import-file]"),
  importEntity: document.querySelector("[data-import-entity]"),
  importWorkspace: document.querySelector("[data-import-workspace]"),
  importSummary: document.querySelector("[data-import-summary]"),
  importMapping: document.querySelector("[data-import-mapping]"),
  importPreviewHead: document.querySelector("[data-import-preview-head]"),
  importPreviewBody: document.querySelector("[data-import-preview-body]"),
  commitImport: document.querySelector("[data-commit-import]"),
  importHistory: document.querySelector("[data-import-history]"),
  runtimeBanner: document.querySelector("[data-runtime-banner]"),
  runtimeLabel: document.querySelector("[data-runtime-label]"),
  loginLink: document.querySelector("[data-login-link]"),
  logoutButton: document.querySelector("[data-logout-button]"),
  securityButton: document.querySelector("[data-security-button]"),
  securityModal: document.querySelector("[data-security-modal]"),
  twofaGate: document.querySelector("[data-twofa-gate]"),
  receiptModal: document.querySelector("[data-receipt-modal]"),
  receiptDocument: document.querySelector("[data-receipt-document]"),
  submitOpenReceipt: document.querySelector("[data-submit-open-receipt]"),
  followupModal: document.getElementById("followup-modal"),
  followupSummary: document.querySelector("[data-followup-summary]"),
  followupAmount: document.querySelector("[data-followup-amount]"),
  followupRemainingHint: document.querySelector("[data-followup-remaining-hint]"),
  followupNote: document.querySelector("[data-followup-note]")
};

// ─── Allergy / Safety Alert ───────────────────────────────────────────────
const ALLERGY_KEYWORDS = [
  "حساسية", "تحسس", "حساس", "allergy", "allergic",
  "لا يتحمل", "ممنوع", "تفاعل", "reaction", "intolerant"
];
function hasAllergyKeywords(notes) {
  if (!notes) return false;
  const lower = notes.toLowerCase();
  return ALLERGY_KEYWORDS.some(kw => lower.includes(kw.toLowerCase()));
}
function allergySnippet(notes) {
  if (!notes) return "";
  const lines = notes.split(/[\n،,]/);
  const hit = lines.find(l => ALLERGY_KEYWORDS.some(kw => l.toLowerCase().includes(kw.toLowerCase())));
  return (hit || notes).trim().slice(0, 120);
}
// ──────────────────────────────────────────────────────────────────────────

// ─── Toast Notification ───────────────────────────────────────────────────
function showToast(message, type = "success") {
  const existing = document.querySelector(".app-toast");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.className = `app-toast app-toast--${type}`;
  toast.setAttribute("role", "status");
  toast.setAttribute("aria-live", "polite");
  toast.textContent = message;
  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => toast.classList.add("app-toast--visible"));
  });

  setTimeout(() => {
    toast.classList.remove("app-toast--visible");
    toast.addEventListener("transitionend", () => toast.remove(), { once: true });
  }, 3000);
}
// ──────────────────────────────────────────────────────────────────────────

// ─── Safe-delete confirmation modal ───────────────────────────────────────
// Returns a Promise<boolean>.  Replaces window.confirm() everywhere.
function showConfirm(message, { title = "تأكيد الحذف", icon = "⚠️", okLabel = "تأكيد الحذف", okClass = "danger-button" } = {}) {
  return new Promise(resolve => {
    const modal  = document.getElementById("confirm-modal");
    const titleEl = document.getElementById("confirm-modal-title");
    const bodyEl  = document.getElementById("confirm-modal-body");
    const iconEl  = document.getElementById("confirm-modal-icon");
    const okBtn  = document.getElementById("confirm-modal-ok");
    const cancelBtn = document.getElementById("confirm-modal-cancel");
    if (!modal) { resolve(window.confirm(message)); return; }

    titleEl.textContent = title;
    bodyEl.textContent  = message;
    iconEl.textContent  = icon;
    okBtn.textContent   = okLabel;
    okBtn.className     = okClass;

    modal.removeAttribute("hidden");

    function finish(result) {
      modal.setAttribute("hidden", "");
      okBtn.removeEventListener("click", onOk);
      cancelBtn.removeEventListener("click", onCancel);
      modal.removeEventListener("click", onBackdrop);
      document.removeEventListener("keydown", onEsc);
      resolve(result);
    }
    const onOk = () => finish(true);
    const onCancel = () => finish(false);
    const onBackdrop = e => { if (e.target === modal) finish(false); };
    const onEsc = e => { if (e.key === "Escape") finish(false); };

    okBtn.addEventListener("click", onOk);
    cancelBtn.addEventListener("click", onCancel);
    modal.addEventListener("click", onBackdrop);
    document.addEventListener("keydown", onEsc);
  });
}

// ─── Save-status indicator ────────────────────────────────────────────────
let _saveIndicatorTimer = null;
function setSaveIndicator(state) {
  const el = document.querySelector("[data-save-indicator]");
  if (!el) return;
  clearTimeout(_saveIndicatorTimer);
  el.removeAttribute("hidden");
  el.className = `save-indicator save-indicator--${state}`;
  if (state === "saving") {
    el.textContent = "💾 جاري الحفظ...";
  } else if (state === "saved") {
    el.textContent = "✓ محفوظ";
    _saveIndicatorTimer = setTimeout(() => el.setAttribute("hidden", ""), 2500);
  } else if (state === "error") {
    el.textContent = "⚠ فشل الحفظ";
    _saveIndicatorTimer = setTimeout(() => el.setAttribute("hidden", ""), 5000);
  }
}

// ─── Change-password modal ────────────────────────────────────────────────
(function initChangePassword() {
  const openBtn  = document.querySelector("[data-open-change-password]");
  const modal    = document.getElementById("change-password-modal");
  const cancelBtn = document.getElementById("change-password-cancel");
  const form     = document.getElementById("change-password-form");
  if (!modal || !form) return;

  const title = document.getElementById("change-password-modal-title");
  const hint = form.querySelector(".change-password-hint");
  const defaultTitle = title?.textContent || "تغيير كلمة المرور";
  const defaultHint = hint?.textContent || "12 حرفاً على الأقل مع أرقام وحروف";
  let forcedPasswordChange = false;

  function openModal(options = {}) {
    forcedPasswordChange = options.forced === true;
    modal.toggleAttribute("data-force-password-change", forcedPasswordChange);
    if (title) title.textContent = forcedPasswordChange ? "اختر كلمة مرور دائمة" : defaultTitle;
    if (hint) {
      hint.textContent = forcedPasswordChange
        ? "أدخل كلمة المرور المؤقتة، ثم اختر كلمة مرور دائمة قوية قبل استخدام النظام."
        : defaultHint;
    }
    if (cancelBtn) cancelBtn.hidden = forcedPasswordChange;
    modal.removeAttribute("hidden");
    form.reset();
    form.elements.oldPassword?.focus();
  }
  function closeModal(options = {}) {
    if (forcedPasswordChange && options.force !== true) return;
    modal.setAttribute("hidden", "");
    modal.removeAttribute("data-force-password-change");
    forcedPasswordChange = false;
    if (cancelBtn) cancelBtn.hidden = false;
  }

  openBtn?.addEventListener("click", openModal);
  cancelBtn?.addEventListener("click", closeModal);
  modal.addEventListener("click", e => { if (e.target === modal) closeModal(); });
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && !modal.hasAttribute("hidden")) closeModal();
  });

  form.addEventListener("submit", async e => {
    e.preventDefault();
    if (runtime.mode !== "live") {
      showToast("تغيير كلمة المرور متاح فقط في الحسابات الحقيقية", "error");
      return;
    }
    const fd = new FormData(form);
    const oldPassword = fd.get("oldPassword");
    const newPassword = fd.get("newPassword");
    const confirmPassword = fd.get("confirmPassword");

    if (newPassword !== confirmPassword) {
      showToast("كلمتا المرور غير متطابقتين", "error");
      return;
    }
    if (newPassword.length < 12) {
      showToast("كلمة المرور الجديدة يجب أن تكون 12 حرفاً على الأقل", "error");
      return;
    }

    const submitBtn = form.querySelector("[type=submit]");
    submitBtn.disabled = true;
    submitBtn.textContent = "جاري الحفظ...";

    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": runtime.csrfToken
        },
        body: JSON.stringify({ oldPassword, newPassword })
      });
      const result = await response.json().catch(() => ({}));
      if (response.ok) {
        if (runtime.session?.user) {
          runtime.session.user = result.user || { ...runtime.session.user, mustChangePassword: false };
        }
        closeModal({ force: true });
        showToast("✓ تم تغيير كلمة المرور بنجاح", "success");
      } else if (response.status === 401) {
        showToast("كلمة المرور الحالية غير صحيحة", "error");
      } else {
        showToast(result.error || "تعذر تغيير كلمة المرور", "error");
      }
    } catch {
      showToast("خطأ في الاتصال بالخادم", "error");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "حفظ كلمة المرور";
    }
  });

  window.RiaayaOpenRequiredPasswordChange = () => openModal({ forced: true });
})();

// ──────────────────────────────────────────────────────────────────────────

// ─── تكملة الدفع — Follow-up Payment ─────────────────────────────────────
function openFollowupModal(entryId) {
  const entry = state.entries.find(e => e.id === entryId);
  if (!entry) return;
  currentFollowupId = entryId;
  selectedFollowupMethod = "cash";

  const paid = paidAmount(entry);
  const net = netAmount(entry);
  const remaining = Math.max(net - paid, 0);

  if (els.followupSummary) {
    els.followupSummary.innerHTML = `
      <div class="followup-patient-row">
        <span class="followup-patient-name">${entry.patient}</span>
        <span class="followup-service-name">${serviceLabel(entry)}</span>
      </div>
      <div class="followup-amounts-strip">
        <div class="followup-kpi">
          <span class="followup-kpi-label">قيمة الجلسة</span>
          <strong class="followup-kpi-value">${money(net)}</strong>
        </div>
        <div class="followup-kpi followup-kpi--paid">
          <span class="followup-kpi-label">المدفوع</span>
          <strong class="followup-kpi-value">${money(paid)}</strong>
        </div>
        <div class="followup-kpi followup-kpi--remaining">
          <span class="followup-kpi-label">المتبقي</span>
          <strong class="followup-kpi-value">${money(remaining)}</strong>
        </div>
      </div>`;
  }

  if (els.followupAmount) {
    els.followupAmount.value = remaining > 0 ? remaining.toFixed(2) : "";
    els.followupAmount.max = remaining > 0 ? remaining.toFixed(2) : "";
  }
  if (els.followupRemainingHint) {
    els.followupRemainingHint.textContent = `الحد الأقصى: ${money(remaining)}`;
  }
  if (els.followupNote) els.followupNote.value = "";

  document.querySelectorAll("[data-followup-method]").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.followupMethod === "cash");
  });

  if (els.followupModal) {
    els.followupModal.hidden = false;
    requestAnimationFrame(() => els.followupModal.classList.add("open"));
  }
}

function closeFollowupModal() {
  if (!els.followupModal) return;
  els.followupModal.classList.remove("open");
  els.followupModal.addEventListener("transitionend", function hide() {
    els.followupModal.hidden = true;
    els.followupModal.removeEventListener("transitionend", hide);
  }, { once: true });
  currentFollowupId = null;
}

function submitFollowup() {
  if (!currentFollowupId) return;
  const entry = state.entries.find(e => e.id === currentFollowupId);
  if (!entry) return;

  const rawVal = parseFloat(els.followupAmount?.value || "0");
  if (!rawVal || rawVal <= 0) {
    alert("يرجى إدخال مبلغ صحيح أكبر من صفر.");
    return;
  }

  const net = netAmount(entry);
  const remaining = Math.max(net - paidAmount(entry), 0);
  const amount = Math.min(rawVal, remaining > 0 ? remaining : rawVal);

  const note = (els.followupNote?.value || "").trim();
  const date = new Date().toISOString().slice(0, 10);
  const methodLabels = { cash: "كاش", card: "فيزا", transfer: "تحويل" };
  const methodLabel = methodLabels[selectedFollowupMethod] || selectedFollowupMethod;

  if (!entry.paymentBreakdown) {
    entry.paymentBreakdown = { cash: 0, card: 0, transfer: 0, insurance: 0 };
  }
  entry.paymentBreakdown[selectedFollowupMethod] =
    (entry.paymentBreakdown[selectedFollowupMethod] || 0) + amount;

  const newPaid = paidAmount(entry);
  entry.status = newPaid >= net - 0.01 ? "completed" : "partial_payment";

  const noteStamp = `تكملة ${date}: ${money(amount)} (${methodLabel})`;
  const combined = [note ? `${noteStamp} — ${note}` : noteStamp];
  if (entry.notes) combined.unshift(entry.notes);
  entry.notes = combined.join(" | ");

  const isNowComplete = entry.status === "completed";
  logEdit("تكملة دفع", `${entry.visitNumber ? "#" + entry.visitNumber + " " : ""}${entry.patient || ""} · ${money(amount)} (${methodLabel})`);
  saveState();
  closeFollowupModal();
  render();
  showToast(
    isNowComplete
      ? `✓ تم الدفع الكامل — ${entry.patient} | ${money(paidAmount(entry))}`
      : `✓ تم تسجيل التكملة — المتبقي ${money(netAmount(entry) - paidAmount(entry))}`,
    isNowComplete ? "success" : "partial"
  );
}
// ──────────────────────────────────────────────────────────────────────────

function saveState() {
  if (runtime.mode !== "live") {
    storageSet(STORAGE_KEY, JSON.stringify(state));
    return;
  }
  if (!runtime.ready) return;
  runtime.savePending = true;
  setSaveIndicator("saving");
  clearTimeout(runtime.saveTimer);
  runtime.saveTimer = setTimeout(flushLiveState, 350);
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForSaveIdle() {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (!runtime.saveInFlight) return true;
    await wait(150);
  }
  return !runtime.saveInFlight;
}

async function saveStateImmediately() {
  if (runtime.mode !== "live") {
    storageSet(STORAGE_KEY, JSON.stringify(state));
    return true;
  }
  clearTimeout(runtime.saveTimer);
  runtime.savePending = false;
  if (!await waitForSaveIdle()) throw new Error("save_busy");
  runtime.saveInFlight = true;
  setSaveIndicator("saving");
  try {
    const response = await fetch("/api/clinic-state", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": runtime.csrfToken
      },
      body: JSON.stringify({ state, stateVersion: runtime.stateVersion })
    });
    const result = await response.json().catch(() => ({}));
    if (response.ok) {
      runtime.stateVersion = Number(result.stateVersion ?? runtime.stateVersion);
      setSaveIndicator("saved");
      return true;
    }
    if (response.status === 401) { location.href = "/login?expired=1"; return false; }
    if (response.status === 409) {
      alert("تم تحديث بيانات العيادة من مستخدم آخر. سنعيد تحميل أحدث نسخة لمنع فقدان البيانات.");
      location.reload();
    }
    setSaveIndicator("error");
    throw new Error(result.error || "save_failed");
  } finally {
    runtime.saveInFlight = false;
    if (runtime.savePending) saveState();
  }
}

async function flushLiveState() {
  if (runtime.saveInFlight || !runtime.savePending || runtime.mode !== "live") return;
  runtime.saveInFlight = true;
  runtime.savePending = false;
  try {
    const response = await fetch("/api/clinic-state", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": runtime.csrfToken
      },
      body: JSON.stringify({ state, stateVersion: runtime.stateVersion })
    });
    const result = await response.json().catch(() => ({}));
    if (response.ok) {
      runtime.stateVersion = Number(result.stateVersion ?? runtime.stateVersion);
      runtime.conflictRetries = 0;
      setSaveIndicator("saved");
    } else if (response.status === 401) {
      location.href = "/login?expired=1";
      return;
    } else if (response.status === 409 && Number.isInteger(result.stateVersion) && (runtime.conflictRetries || 0) < 4) {
      // Version drift (another tab/owner, or an earlier failed save): adopt the
      // server's version and retry so the edit is NOT silently discarded.
      runtime.conflictRetries = (runtime.conflictRetries || 0) + 1;
      runtime.stateVersion = Number(result.stateVersion);
      runtime.savePending = true;
      setSaveIndicator("saving");
    } else if (response.status === 409) {
      alert("تعذّرت مزامنة بيانات العيادة بعد عدة محاولات. سنعيد تحميل أحدث نسخة.");
      location.reload();
    } else {
      setSaveIndicator("error");
      showToast(`تعذّر حفظ التغييرات: ${result.error || "خطأ " + response.status}. أعد المحاولة.`, "error");
    }
  } catch {
    setSaveIndicator("error");
    // A later user action retries the save without blocking the current screen.
  } finally {
    runtime.saveInFlight = false;
    if (runtime.savePending) saveState();
  }
}

function nearestAllowedDate(account) {
  if (calendarDateAllowed(account, today)) return today;
  for (let offset = 1; offset <= 31; offset += 1) {
    const future = dateOffset(offset, today);
    if (calendarDateAllowed(account, future)) return future;
    const past = dateOffset(-offset, today);
    if (calendarDateAllowed(account, past)) return past;
  }
  return today;
}

const BRAND_VARS = ["--teal", "--teal-light", "--teal-dark", "--teal-pale", "--status-done", "--status-done-pale", "--sidebar-bg", "--sidebar-text", "--sidebar-text-active", "--sidebar-active", "--sidebar-hover"];
// Derive the whole palette — including the sidebar background — from one brand
// color so an owner-set clinic color re-skins the entire app (sidebar included).
// An optional explicit sidebar color overrides; either way it's forced dark
// enough that the white nav text stays legible.
function applyBrandColor(hex, sidebarHex) {
  const root = document.documentElement;
  const parse = value => [1, 3, 5].map(i => parseInt(value.slice(i, i + 2), 16));
  const clamp = value => Math.max(0, Math.min(255, Math.round(value)));
  const toHex = arr => "#" + arr.map(value => clamp(value).toString(16).padStart(2, "0")).join("");
  const towardWhite = (rgb, t) => rgb.map(channel => channel + (255 - channel) * t);
  const darken = (rgb, t) => rgb.map(channel => channel * (1 - t));
  const rgb = parse(hex);
  root.style.setProperty("--teal", hex);
  root.style.setProperty("--teal-light", toHex(towardWhite(rgb, 0.14)));
  root.style.setProperty("--teal-dark", toHex(darken(rgb, 0.22)));
  root.style.setProperty("--teal-pale", toHex(towardWhite(rgb, 0.88)));
  root.style.setProperty("--status-done", hex);
  root.style.setProperty("--status-done-pale", toHex(towardWhite(rgb, 0.88)));
  // Sidebar background: explicit color if given, else a dark shade of the brand.
  let side = sidebarHex && /^#[0-9a-fA-F]{6}$/.test(sidebarHex) ? parse(sidebarHex) : darken(rgb, 0.55);
  const lum = 0.299 * side[0] + 0.587 * side[1] + 0.114 * side[2];
  if (lum > 70) side = side.map(channel => channel * (60 / lum)); // keep it dark for white text
  root.style.setProperty("--sidebar-bg", toHex(side));
  root.style.setProperty("--sidebar-text", "rgba(255,255,255,0.65)");
  root.style.setProperty("--sidebar-text-active", "#ffffff");
  root.style.setProperty("--sidebar-active", "rgba(255,255,255,0.14)");
  root.style.setProperty("--sidebar-hover", "rgba(255,255,255,0.08)");
}
function clearBrandColor() {
  BRAND_VARS.forEach(variable => document.documentElement.style.removeProperty(variable));
}

function applyRuntimeUI() {
  const live = runtime.mode === "live";
  const branding = runtime.session?.clinic?.branding || {};
  if (live && branding.accentColor && /^#[0-9a-fA-F]{6}$/.test(branding.accentColor)) {
    applyBrandColor(branding.accentColor, branding.sidebarColor);
  } else {
    clearBrandColor();
  }
  if (els.runtimeLabel) {
    els.runtimeLabel.textContent = live ? (branding.workspaceLabel || "مساحة عيادة آمنة") : "نموذج تجريبي تفاعلي";
  }
  if (els.loginLink) els.loginLink.hidden = live;
  if (els.logoutButton) els.logoutButton.hidden = !live;
  if (els.securityButton) els.securityButton.hidden = !live;
  if (els.runtimeBanner) {
    els.runtimeBanner.classList.toggle("trial", !live);
    els.runtimeBanner.classList.toggle("live", live);
    if (live) {
      const clinic = runtime.session?.clinic;
      const account = currentAccount();
      const limits = clinic?.limits || {};
      const trialText = clinic?.status === "trial" && clinic.trialEndsAt
        ? `الفترة التجريبية حتى ${displayDate(clinic.trialEndsAt.slice(0, 10))}`
        : "اشتراك العيادة فعال";
      els.runtimeBanner.innerHTML = `
        <div>
          <strong>${clinic?.name || state.settings.clinicName}</strong>
          <span>${accountDisplayName(account)} | ${roleLabel(account.role)} | ${trialText}</span>
          <span>${clinic?.plan || "professional"} | ${clinic?.supportTier || "standard"} | ${limits.maxUsers || "-"} مستخدمين كحد أقصى</span>
        </div>
        <span class="secure-runtime-note">بيانات هذه العيادة معزولة ومحمية بحسابك.</span>
      `;
    }
  }
  document.body.classList.toggle("live-workspace", live);
}

async function initializeApp() {
  const forceTrial = new URLSearchParams(location.search).get("trial") === "1";
  let initializeClinicState = false;
  if (!forceTrial) {
    try {
      const sessionResponse = await fetch("/api/auth/session", { headers: { Accept: "application/json" } });
      const session = await sessionResponse.json();
      if (session.authenticated && session.user?.role === "platform_owner") {
        location.href = "/owner";
        return;
      }
      if (session.authenticated && session.clinic) {
        runtime.mode = "live";
        runtime.session = session;
        runtime.csrfToken = session.csrfToken;
        const stateResponse = await fetch("/api/clinic-state", { headers: { Accept: "application/json" } });
        if (stateResponse.status === 402) {
          location.href = "/login?expired=1";
          return;
        }
        if (!stateResponse.ok) throw new Error("clinic_state_unavailable");
        const result = await stateResponse.json();
        runtime.stateVersion = Number(result.stateVersion || 0);
        state = hydrateClinicState(result.state, result.clinic || session.clinic, result.accounts || []);
        await loadClinicIntegrations();
        const account = currentAccount();
        if (!calendarDateAllowed(account, state.settings.activeDate)) {
          state.settings.activeDate = nearestAllowedDate(account);
        }
        selectedPatientId = state.patients?.[0]?.id || "";
        initializeClinicState = !result.state;
      }
    } catch {
      runtime.mode = "trial";
      runtime.session = null;
      runtime.csrfToken = "";
      state = loadState();
    }
  }
  runtime.ready = true;
  applyRuntimeUI();
  renderImpersonationBanner();
  render();
  applyAccountViewMode();
  enforce2faRequirement();
  if (runtime.mode === "live" && runtime.session?.user?.mustChangePassword) {
    window.RiaayaOpenRequiredPasswordChange?.();
  }
  if (initializeClinicState) saveState();
  loadCommunicationBackendStatus();
  loadStorageSafetyStatus();
  if (runtime.mode === "live") loadServerNotifications();
}

async function loadServerNotifications() {
  try {
    const response = await fetch("/api/clinic/notifications", { headers: { Accept: "application/json" } });
    const data = await response.json();
    if (data.notifications) {
      runtime.serverNotifications = data.notifications;
      renderNotificationCenters();
    }
  } catch {
    // non-critical — notifications will appear on next load
  }
}

function currentLanguage() {
  return state?.settings?.language || storageGet("riaayaLanguage") || "ar";
}

function money(value) {
  const isEnglish = currentLanguage() === "en";
  return `${Number(value || 0).toLocaleString(isEnglish ? "en-US" : "ar-JO-u-nu-latn", {
    maximumFractionDigits: 2
  })}${isEnglish ? " JOD" : " د.أ"}`;
}

function numberValue(value) {
  return Number.parseFloat(value || 0) || 0;
}

function nextId(prefix) {
  if (crypto.randomUUID) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function roleLabel(role) {
  const labels = currentLanguage() === "en"
    ? {
      admin: "Admin",
      data_entry: "Data Entry",
      doctor: "Doctor",
      specialist: "Specialist"
    }
    : {
      admin: "مدير",
      data_entry: "مساعد / استقبال",
      doctor: "طبيب",
      specialist: "أخصائي"
    };
  return labels[role] || role;
}

function paymentLabel(method) {
  const labels = currentLanguage() === "en"
    ? { cash: "Cash", card: "Card", transfer: "Transfer", mixed: "Split" }
    : { cash: "كاش", card: "فيزا", transfer: "تحويل", mixed: "مقسّم" };
  return labels[method] || method;
}

function displayDate(date) {
  if (!date) return "";
  return new Date(`${date}T12:00:00`).toLocaleDateString(currentLanguage() === "en" ? "en-US" : "ar-JO-u-nu-latn");
}

function translateLiteral(text, language) {
  if (!text) return text;
  if (language === "en") return APP_TEXT_EN[text] || text;
  const arabicMap = Object.fromEntries(Object.entries(APP_TEXT_EN).map(([arabic, english]) => [english, arabic]));
  return arabicMap[text] || text;
}

function translateElementText(root, language) {
  if (!root) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent || ["SCRIPT", "STYLE"].includes(parent.tagName)) return NodeFilter.FILTER_REJECT;
      return node.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    }
  });
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach(node => {
    const original = node.nodeValue;
    const trimmed = original.trim();
    const translated = translateLiteral(trimmed, language);
    if (translated !== trimmed) {
      node.nodeValue = `${original.match(/^\s*/)[0]}${translated}${original.match(/\s*$/)[0]}`;
    }
  });

  root.querySelectorAll("[placeholder], [aria-label], [title]").forEach(element => {
    ["placeholder", "aria-label", "title"].forEach(attribute => {
      const value = element.getAttribute(attribute);
      if (!value) return;
      const translated = translateLiteral(value.trim(), language);
      if (translated !== value) element.setAttribute(attribute, translated);
    });
  });
}

function applyLanguage() {
  const language = currentLanguage();
  document.documentElement.lang = language;
  document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
  document.body.classList.toggle("english-ui", language === "en");
  document.title = language === "en"
    ? "Riaaya — Clinic Management Prototype"
    : "رعاية — النموذج التجريبي للعيادات";
  if (els.languageSelect) els.languageSelect.value = language;
  translateElementText(document.body, language);
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

function canUseFeature(featureId) {
  const account = currentAccount();
  return account.role === "admin" || (account.permissionFeatures || []).includes(featureId);
}

function currentAllowedViews() {
  const account = currentAccount();
  if (account.role === "admin") return ADMIN_VIEWS.filter(clinicModuleEnabledForView);
  const views = (account.allowedViews || []).filter(view => VIEW_LABELS[view]);
  return (views.length ? views : defaultViewsForRole(account.role)).filter(clinicModuleEnabledForView);
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
  if (!clinicModuleEnabledForView(viewName)) return false;
  if (viewName === "leads") return false;
  if (viewName === "accounts") return canManagePermissions();
  if (["reconcile", "salaries", "collections"].includes(viewName) && !canViewSensitive()) return false;
  return currentAllowedViews().includes(viewName);
}

function clinicModuleEnabledForView(viewName) {
  if (runtime.mode !== "live") return true;
  const module = VIEW_MODULES[viewName];
  if (!module) return true;
  const modules = runtime.session?.clinic?.enabledModules;
  return !Array.isArray(modules) || !modules.length || modules.includes(module);
}

function firstAllowedView() {
  return currentAllowedViews().find(view => view !== "accounts" || canManagePermissions()) || "entries";
}

function filterEntriesForAccount(entries) {
  const account = currentAccount();
  return entries.filter(entry => (
    calendarDateAllowed(account, entry.date)
    && (!account.ownEntriesOnly || !account.staffId || entry.doctorId === account.staffId || entry.specialistId === account.staffId)
  ));
}

function dayDistanceFromToday(date) {
  return Math.round((Date.parse(`${date}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`)) / 86400000);
}

function calendarDateAllowed(account, date) {
  if (!date || account.role === "admin" || account.calendarScope === "all") return true;
  const difference = dayDistanceFromToday(date);
  if (account.calendarScope === "today") return difference === 0;
  const inWindow = difference >= -numberValue(account.calendarDaysBack)
    && difference <= numberValue(account.calendarDaysAhead);
  if (account.calendarScope === "rolling" || account.calendarScope === "assigned") return inWindow;
  if (account.calendarScope === "working_days") {
    return inWindow && (account.workingDays || []).includes(new Date(`${date}T12:00:00Z`).getUTCDay());
  }
  return false;
}

function accountStaffScoped(account) {
  return Boolean(account.staffId && (account.ownEntriesOnly || account.calendarScope === "assigned"));
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

function getPatient(id) {
  return (state.patients || []).find(patient => patient.id === id);
}

function findPatientByName(name) {
  const key = patientNameKey(name);
  return (state.patients || []).find(patient => patientNameKey(patient.name) === key);
}

function nextPatientNumber() {
  const highest = (state.patients || []).reduce((max, patient) => (
    Math.max(max, Number.parseInt(patient.patientNumber, 10) || 1000)
  ), 1000);
  return String(highest + 1);
}

function nextVisitNumber() {
  const highest = (state.entries || []).reduce((max, entry) => (
    Math.max(max, Number.parseInt(entry.visitNumber, 10) || 1000)
  ), 1000);
  return String(highest + 1);
}

function ensurePatientFile(name, phone = "") {
  const cleanPhone = phoneDigits(phone);
  const nameKey = patientNameKey(name);
  let existing;
  if (cleanPhone) {
    // Same name + same phone = the same person (all their ops land in one file).
    // A same name with a DIFFERENT phone becomes its own file; a same-name file
    // that has no phone yet absorbs this record and fills in the phone.
    existing = (state.patients || []).find(p => patientNameKey(p.name) === nameKey && phoneDigits(p.phone) === cleanPhone)
      || (state.patients || []).find(p => patientNameKey(p.name) === nameKey && !phoneDigits(p.phone));
  } else {
    existing = findPatientByName(name);
  }
  if (existing) {
    if (!existing.phone && phone) existing.phone = phone;
    return existing;
  }
  const patient = normalizePatient({
    id: nextId("patient"),
    patientNumber: nextPatientNumber(),
    profileType: "visitor",
    name: name || "زائر",
    phone,
    createdAt: today
  });
  state.patients.push(patient);
  logEdit("إضافة ملف مريض", patient.name);
  return patient;
}

function patientEntries(patient) {
  if (!patient) return [];
  return filterEntriesForAccount(state.entries || [])
    .filter(entry => entry.patientId === patient.id || patientNameKey(entry.patient) === patientNameKey(patient.name))
    .sort((a, b) => `${b.date} ${b.createdAt || ""}`.localeCompare(`${a.date} ${a.createdAt || ""}`));
}

function patientBookings(patient) {
  if (!patient) return [];
  return filterBookingsForAccount(state.bookings || [])
    .filter(booking => booking.patientId === patient.id || patientNameKey(booking.patient) === patientNameKey(patient.name))
    .sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`));
}

function patientLastActivity(patient) {
  const dates = [
    ...patientEntries(patient).map(entry => entry.date),
    ...patientBookings(patient).map(booking => booking.date),
    patient.createdAt
  ].filter(Boolean).sort();
  return dates.at(-1) || "";
}

function normalizeSearchText(value) {
  return String(value || "")
    .toLocaleLowerCase("ar")
    .normalize("NFKD")
    .replace(/[\u064B-\u065F]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/\s+/g, " ")
    .trim();
}

function matchesSmartQuery(values, query) {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return true;
  const haystack = normalizeSearchText(values.flat().filter(Boolean).join(" | "));
  return normalizedQuery.split(" ").every(token => haystack.includes(token));
}

function paginateItems(items, page, pageSize) {
  const size = Math.max(Number(pageSize) || 25, 1);
  const pageCount = Math.max(Math.ceil(items.length / size), 1);
  const safePage = Math.min(Math.max(Number(page) || 1, 1), pageCount);
  const start = (safePage - 1) * size;
  return {
    page: safePage,
    pageCount,
    pageSize: size,
    total: items.length,
    start,
    end: Math.min(start + size, items.length),
    items: items.slice(start, start + size)
  };
}

function renderPagination(container, pagination, scope) {
  if (!container) return;
  const isEnglish = currentLanguage() === "en";
  const previous = isEnglish ? "Previous" : "السابق";
  const next = isEnglish ? "Next" : "التالي";
  const summary = pagination.total
    ? (isEnglish
      ? `Showing ${pagination.start + 1}-${pagination.end} of ${pagination.total}`
      : `عرض ${pagination.start + 1}-${pagination.end} من ${pagination.total}`)
    : (isEnglish ? "No results" : "لا توجد نتائج");
  const pageButtons = Array.from({ length: pagination.pageCount }, (_, index) => index + 1)
    .filter(page => page === 1 || page === pagination.pageCount || Math.abs(page - pagination.page) <= 1)
    .map(page => `<button class="pagination-button ${page === pagination.page ? "active" : ""}" type="button" data-pagination-scope="${scope}" data-pagination-page="${page}">${page}</button>`)
    .join("");

  container.innerHTML = `
    <span>${summary}</span>
    <div class="pagination-actions">
      <button class="pagination-button" type="button" data-pagination-scope="${scope}" data-pagination-page="${pagination.page - 1}" ${pagination.page <= 1 ? "disabled" : ""}>${previous}</button>
      ${pageButtons}
      <button class="pagination-button" type="button" data-pagination-scope="${scope}" data-pagination-page="${pagination.page + 1}" ${pagination.page >= pagination.pageCount ? "disabled" : ""}>${next}</button>
    </div>
  `;
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

function entryStatusLabel(status) {
  const labels = currentLanguage() === "en"
    ? {
      completed: "Completed",
      partial_payment: "Partial — follow-up due",
      pending_assignment: "Pending assignment",
      scheduled: "Scheduled",
      pending_payment: "Pending payment",
      cancelled: "Cancelled"
    }
    : {
      completed: "مكتملة",
      partial_payment: "دفع جزئي — تكملة حساب",
      pending_assignment: "بانتظار التعيين",
      scheduled: "محجوزة",
      pending_payment: "بانتظار الدفع",
      cancelled: "ملغاة"
    };
  return labels[status] || status || labels.completed;
}

function bookingStatusLabel(status) {
  const labels = currentLanguage() === "en"
    ? {
      scheduled: "Scheduled",
      confirmed: "Confirmed",
      arrived: "Arrived",
      completed: "Completed",
      no_show: "No show",
      cancelled: "Cancelled",
      pending_confirmation: "Online — Pending"
    }
    : {
      scheduled: "محجوز",
      confirmed: "مؤكد",
      arrived: "وصل",
      completed: "تمت العملية",
      no_show: "لم يحضر",
      cancelled: "ملغي",
      pending_confirmation: "حجز إلكتروني — بانتظار التأكيد"
    };
  return labels[status] || status || labels.scheduled;
}

function statusClass(status) {
  if (["completed", "confirmed", "arrived", "received", "paid", "approved"].includes(status)) return "good";
  if (["cancelled", "no_show"].includes(status)) return "bad";
  if (status === "partial_payment") return "partial";
  if (status === "pending_confirmation") return "pending-online";
  return "warn";
}

function salaryStatusLabel(status) {
  const labels = currentLanguage() === "en"
    ? { draft: "Draft", approved: "Approved", paid: "Paid" }
    : { draft: "مسودة", approved: "معتمد", paid: "مدفوع" };
  return labels[status] || labels.draft;
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
  const people = rule.personIds?.length ? rule.personIds : (rule.personId ? [rule.personId] : []);
  const services = rule.serviceIds?.length ? rule.serviceIds : (rule.serviceId ? [rule.serviceId] : []);
  const personLabel = people.length
    ? people.map(id => getStaffMember(id)?.name).filter(Boolean).join("، ")
    : "كل الفريق";
  const serviceLabelText = rule.category
    ? `كل فئة: ${rule.category}`
    : (services.length ? services.map(id => getService(id)?.name).filter(Boolean).join("، ") : "كل الخدمات");
  const value = rule.model === "member_rate" ? "حسب نسبة الموظف" : `${rule.value}%`;
  const fixedValue = rule.model === "fixed" ? money(rule.value) : value;
  return `${roleLabel(rule.appliesTo)} | ${personLabel} | ${serviceLabelText} | ${ruleModelLabel(rule.model)} (${fixedValue})`;
}

function findRule(appliesTo, personId, serviceId, category = "") {
  const candidates = state.rules.filter(rule => {
    const people = rule.personIds?.length ? rule.personIds : (rule.personId ? [rule.personId] : []);
    const services = rule.serviceIds?.length ? rule.serviceIds : (rule.serviceId ? [rule.serviceId] : []);
    const roleMatches = rule.active !== false && rule.appliesTo === appliesTo;
    const personMatches = !people.length || people.includes(personId);
    const serviceMatches = !services.length || services.includes(serviceId);
    const categoryMatches = !rule.category || rule.category === category;
    return roleMatches && personMatches && serviceMatches && categoryMatches;
  });

  if (!candidates.length) return null;

  return candidates
    .map(rule => ({
      rule,
      score: (rule.personIds?.length ? 10 : 0) + (rule.serviceIds?.length ? 5 : 0) + (rule.category ? 3 : 0)
    }))
    .sort((a, b) => b.score - a.score)[0].rule;
}

function netAmount(entry) {
  return Math.max(numberValue(entry.amount) - numberValue(entry.discount), 0);
}

function entryPaymentBreakdown(entry) {
  return cleanPaymentBreakdown(entry.paymentBreakdown || entry.payment_breakdown, entry.paymentMethod, netAmount(entry));
}

function paidAmount(entry) {
  const breakdown = entryPaymentBreakdown(entry);
  return PAYMENT_METHODS.reduce((sum, method) => sum + numberValue(breakdown[method]), 0);
}

function paymentTotal(breakdown = {}) {
  return PAYMENT_METHODS.reduce((sum, method) => sum + numberValue(breakdown[method]), 0);
}

function entryPaymentLabel(entry) {
  const breakdown = entryPaymentBreakdown(entry);
  const activeMethods = PAYMENT_METHODS.filter(method => numberValue(breakdown[method]) > 0.009);
  if (activeMethods.length > 1) {
    return activeMethods.map(method => `${paymentLabel(method)} ${money(breakdown[method])}`).join(" + ");
  }
  return paymentLabel(activeMethods[0] || entry.paymentMethod || "cash");
}

function receiptPaymentLabel(receipt) {
  const breakdown = cleanPaymentBreakdown(receipt.paymentBreakdown || receipt.payment_breakdown, receipt.paymentMethod, receipt.total);
  const activeMethods = PAYMENT_METHODS.filter(method => numberValue(breakdown[method]) > 0.009);
  if (activeMethods.length > 1) {
    return activeMethods.map(method => `${paymentLabel(method)} ${money(breakdown[method])}`).join(" + ");
  }
  return paymentLabel(activeMethods[0] || receipt.paymentMethod || "cash");
}

function entryMatchesPayment(entry, method) {
  return !method || numberValue(entryPaymentBreakdown(entry)[method]) > 0.009 || entry.paymentMethod === method;
}

function entryCost(entry) {
  return numberValue(entry.cost) * Math.max(numberValue(entry.quantity) || 1, 1);
}

function profitAmount(entry) {
  return Math.max(paidAmount(entry) - entryCost(entry), 0);
}

function isBillableEntry(entry) {
  return entry.status !== "cancelled";
}

function billableEntries(entries) {
  return entries.filter(isBillableEntry);
}

function calculateMemberPayout(entry, member) {
  if (!member || !isBillableEntry(entry)) return null;
  const isEnglish = currentLanguage() === "en";
  const appliesTo = member.role === "doctor" ? "doctor" : "specialist";
  const rule = findRule(appliesTo, member.id, entry.serviceId, entryCategory(entry));
  // Salary-only staff earn no default commission — only an explicit per-service rule pays out.
  if (!rule && member.model === "none") return null;
  const quantity = Math.max(numberValue(entry.quantity) || 1, 1);
  const gross = paidAmount(entry);
  const profit = profitAmount(entry);
  const fallbackRate = numberValue(member.rate);

  // Per-visit doctor rate override (set at operation entry time)
  const hasVisitOverride = appliesTo === "doctor" && numberValue(entry.doctorRate) > 0;
  const visitRate = hasVisitOverride ? numberValue(entry.doctorRate) : fallbackRate;
  const visitModel = hasVisitOverride && entry.doctorModel ? entry.doctorModel : (member.model || "member_rate");

  const activeRule = rule || {
    model: hasVisitOverride ? visitModel : (member.model || "member_rate"),
    value: visitRate,
    name: hasVisitOverride ? "نسبة مخصوصة للزيارة" : "نسبة العضو الافتراضية"
  };

  if (activeRule.model === "member_rate") {
    // Use member's own model if defined, otherwise fall back to role-based default
    const effectiveModel = member.model && member.model !== "member_rate" ? member.model : (appliesTo === "doctor" ? "pct_net" : "pct_gross");
    const base = effectiveModel === "pct_net" ? profit : gross;
    const baseLabel = isEnglish
      ? (effectiveModel === "pct_net" ? "profit" : "collected amount")
      : (effectiveModel === "pct_net" ? "الربح" : "المقبوض");
    const payout = base * (visitRate / 100);
    return {
      member,
      payout,
      formula: isEnglish
        ? `${visitRate}% of ${baseLabel} ${money(base)}${hasVisitOverride ? " (visit override)" : ""}`
        : `${visitRate}% من ${baseLabel} ${money(base)}${hasVisitOverride ? " (تعديل الزيارة)" : ""}`
    };
  }

  if (activeRule.model === "fixed") {
    const fixedVal = numberValue(activeRule.value);
    const payout = fixedVal * quantity;
    return {
      member,
      payout,
      formula: isEnglish
        ? `${money(fixedVal)} fixed × ${quantity}`
        : `${money(fixedVal)} ثابت × ${quantity}`
    };
  }

  if (activeRule.model === "pct_gross") {
    const rate = numberValue(activeRule.value);
    const payout = gross * (rate / 100);
    return {
      member,
      payout,
      formula: isEnglish
        ? `${rate}% of collected amount ${money(gross)}`
        : `${rate}% من المقبوض ${money(gross)}`
    };
  }

  if (activeRule.model === "pct_net") {
    const rate = numberValue(activeRule.value);
    const payout = profit * (rate / 100);
    return {
      member,
      payout,
      formula: isEnglish
        ? `${rate}% of profit ${money(profit)}`
        : `${rate}% من الربح ${money(profit)}`
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
      formula: isEnglish
        ? `${rate}% tiered rate of profit ${money(profit)}`
        : `${rate}% متدرجة من الربح ${money(profit)}`
    };
  }

  const payout = gross * (fallbackRate / 100);
  return {
    member,
    payout,
    formula: isEnglish
      ? `${fallbackRate}% of collected amount ${money(gross)}`
      : `${fallbackRate}% من المقبوض ${money(gross)}`
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

function normalizeDateRange(fromDate, toDate) {
  let from = fromDate || state.settings.activeDate || today;
  let to = toDate || from;
  if (from > to) {
    [from, to] = [to, from];
  }
  return { from, to };
}

function reportDateRange() {
  return normalizeDateRange(
    els.reportDateFrom?.value || state.settings.reportDateFrom || state.settings.activeDate,
    els.reportDateTo?.value || state.settings.reportDateTo || state.settings.activeDate
  );
}

function isDateInRange(date, from, to) {
  return Boolean(date) && date >= from && date <= to;
}

function entriesForDateRange(fromDate, toDate) {
  const { from, to } = normalizeDateRange(fromDate, toDate);
  return filterEntriesForAccount(state.entries)
    .filter(entry => isDateInRange(entry.date, from, to))
    .sort((a, b) => `${a.date} ${a.createdAt || ""}`.localeCompare(`${b.date} ${b.createdAt || ""}`));
}

function filterBookingsForAccount(bookings) {
  const account = currentAccount();
  return bookings.filter(booking => (
    calendarDateAllowed(account, booking.date)
    && bookingColumnAllowedForAccount(booking, account)
    && (
      (!account.ownEntriesOnly && account.calendarScope !== "assigned")
      || (account.staffId && (booking.doctorId === account.staffId || booking.specialistId === account.staffId))
    )
  ));
}

function activeBookings() {
  return filterBookingsForAccount(state.bookings || [])
    .filter(booking => booking.date === state.settings.activeDate)
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
}

function bookingsForDateRange(fromDate, toDate) {
  const { from, to } = normalizeDateRange(fromDate, toDate);
  return filterBookingsForAccount(state.bookings || [])
    .filter(booking => isDateInRange(booking.date, from, to))
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
}

function groupedBookingsByDate(bookings) {
  return bookings.reduce((groups, booking) => {
    groups[booking.date] = groups[booking.date] || [];
    groups[booking.date].push(booking);
    return groups;
  }, {});
}

function unassignedEntries(entries = activeEntries()) {
  return entries.filter(entry => !entry.doctorId && !entry.specialistId);
}

function specialistAssignmentRows(entries = activeEntries()) {
  return state.staff
    .filter(member => member.role === "specialist")
    .map(member => {
      const related = entries.filter(entry => entry.specialistId === member.id);
      return {
        member,
        operations: related.length,
        revenue: related.reduce((sum, entry) => sum + paidAmount(entry), 0),
        payout: salaryEntryRows(entries, member).reduce((sum, row) => sum + row.payout.payout, 0)
      };
    })
    .filter(row => row.operations > 0)
    .sort((a, b) => b.operations - a.operations || b.revenue - a.revenue);
}

function assignmentSummaryText(entries = activeEntries()) {
  const rows = specialistAssignmentRows(entries);
  const total = rows.reduce((sum, row) => sum + row.operations, 0);
  if (!total) return "";
  if (currentLanguage() === "en") {
    return `${total} operations linked to specialists: ${rows.map(row => `${row.member.name} ${row.operations}`).join(", ")}`;
  }
  return `${total} عملية مرتبطة بالأخصائيين: ${rows.map(row => `${row.member.name} ${row.operations}`).join("، ")}`;
}

function activeReconciliation() {
  return latestReconciliationForDate(state.settings.activeDate);
}

function totalsForDateFromEntries(entries, date) {
  return totalsFor((entries || []).filter(entry => entry.date === date));
}

function reconciliationStatusFromDiffs(cashDiff, cardDiff, transferDiff) {
  return [cashDiff, cardDiff, transferDiff].every(value => Math.abs(numberValue(value)) < 0.01)
    ? "matched"
    : "mismatch";
}

function reconciliationStatusLabel(status) {
  if (currentLanguage() === "en") {
    return status === "matched" ? "Matched" : "Needs review";
  }
  return status === "matched" ? "مطابق" : "يحتاج مراجعة";
}

function reconciliationStatusClass(status) {
  return status === "matched" ? "good" : "bad";
}

function normalizeReconciliationRecord(record = {}, entries = [], fallbackDate = today) {
  const date = record.date || fallbackDate || today;
  const expectedTotals = totalsForDateFromEntries(entries, date);
  const countedCash = numberValue(record.countedCash);
  const countedCard = numberValue(record.countedCard);
  const countedTransfer = numberValue(record.countedTransfer);
  const expectedCash = numberValue(record.expectedCash ?? expectedTotals.cash);
  const expectedCard = numberValue(record.expectedCard ?? expectedTotals.card);
  const expectedTransfer = numberValue(record.expectedTransfer ?? expectedTotals.transfer);
  const diffCash = numberValue(record.diffCash ?? countedCash - expectedCash);
  const diffCard = numberValue(record.diffCard ?? countedCard - expectedCard);
  const diffTransfer = numberValue(record.diffTransfer ?? countedTransfer - expectedTransfer);
  const createdAtDate = record.createdAt ? new Date(record.createdAt) : new Date(`${date}T18:00:00`);
  const createdAt = Number.isNaN(createdAtDate.getTime()) ? new Date().toISOString() : createdAtDate.toISOString();
  const totalExpected = expectedCash + expectedCard + expectedTransfer;
  const totalCounted = countedCash + countedCard + countedTransfer;
  const totalDiff = numberValue(record.totalDiff ?? diffCash + diffCard + diffTransfer);
  const status = record.status || reconciliationStatusFromDiffs(diffCash, diffCard, diffTransfer);

  return {
    id: record.id || `reconciliation-${date}-${createdAt.replace(/[^0-9]/g, "").slice(0, 12)}`,
    date,
    createdAt,
    createdBy: String(record.createdBy || record.userName || "النظام").trim(),
    note: String(record.note || record.notes || "").trim(),
    countedCash,
    countedCard,
    countedTransfer,
    expectedCash,
    expectedCard,
    expectedTransfer,
    diffCash,
    diffCard,
    diffTransfer,
    totalExpected,
    totalCounted,
    totalDiff,
    status
  };
}

function normalizeReconciliationData(source = {}, entries = []) {
  const records = [];
  const seen = new Set();
  const pushRecord = (record, fallbackDate) => {
    const normalized = normalizeReconciliationRecord(record, entries, fallbackDate);
    if (seen.has(normalized.id)) return;
    seen.add(normalized.id);
    records.push(normalized);
  };

  Object.entries(source.reconciliations || {}).forEach(([date, record]) => {
    pushRecord({
      ...record,
      id: record?.id || `reconciliation-legacy-${date}`,
      date,
      createdAt: record?.createdAt || `${date}T18:00:00`,
      createdBy: record?.createdBy || "legacy",
      note: record?.note || "إغلاق محفوظ من نسخة أقدم."
    }, date);
  });

  (Array.isArray(source.reconciliationHistory) ? source.reconciliationHistory : [])
    .forEach(record => pushRecord(record, record?.date || today));

  records.sort((a, b) => `${a.date} ${a.createdAt}`.localeCompare(`${b.date} ${b.createdAt}`));
  const latest = {};
  records.forEach(record => {
    latest[record.date] = record;
  });
  return {
    reconciliations: latest,
    reconciliationHistory: records
  };
}

function reconciliationRecordsForDate(date) {
  return (state.reconciliationHistory || [])
    .map(record => normalizeReconciliationRecord(record, state.entries || [], record.date || date))
    .filter(record => record.date === date)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function latestReconciliationForDate(date) {
  return reconciliationRecordsForDate(date)[0] || null;
}

function reconciliationRecordsForDateRange(fromDate, toDate, filters = {}) {
  const { from, to } = normalizeDateRange(fromDate, toDate);
  return (state.reconciliationHistory || [])
    .map(record => normalizeReconciliationRecord(record, state.entries || [], record.date || from))
    .filter(record => isDateInRange(record.date, from, to))
    .filter(record => reconciliationRecordMatchesFilters(record, filters))
    .sort((a, b) => `${b.date} ${b.createdAt}`.localeCompare(`${a.date} ${a.createdAt}`));
}

function reconciliationRecordMatchesFilters(record, filters = {}) {
  const method = filters.paymentMethod;
  const methodMatches = !method
    || numberValue(record[`expected${capitalize(method)}`])
    || numberValue(record[`counted${capitalize(method)}`])
    || numberValue(record[`diff${capitalize(method)}`]);
  const statusFilter = String(filters.status || "");
  const statusMatches = !statusFilter
    || !["matched", "mismatch"].includes(statusFilter)
    || record.status === statusFilter;
  return methodMatches
    && statusMatches
    && matchesSmartQuery([
      record.date,
      record.createdAt,
      record.createdBy,
      record.note,
      record.status,
      reconciliationStatusLabel(record.status),
      money(record.totalExpected),
      money(record.totalCounted),
      money(record.totalDiff)
    ], filters.query);
}

function capitalize(value) {
  const text = String(value || "");
  return text ? `${text[0].toUpperCase()}${text.slice(1)}` : "";
}

function displayDateTimeMinute(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString(currentLanguage() === "en" ? "en-US" : "ar-JO-u-nu-latn", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function displayClockMinute(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleTimeString(currentLanguage() === "en" ? "en-US" : "ar-JO-u-nu-latn", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function createReconciliationRecordFromForm(data, totals) {
  const countedCash = numberValue(data.countedCash);
  const countedCard = numberValue(data.countedCard);
  const countedTransfer = numberValue(data.countedTransfer);
  const diffCash = countedCash - totals.cash;
  const diffCard = countedCard - totals.card;
  const diffTransfer = countedTransfer - totals.transfer;
  const account = currentAccount();
  return normalizeReconciliationRecord({
    id: nextId("reconciliation"),
    date: state.settings.activeDate,
    createdAt: new Date().toISOString(),
    createdBy: accountDisplayName(account),
    note: data.note,
    countedCash,
    countedCard,
    countedTransfer,
    expectedCash: totals.cash,
    expectedCard: totals.card,
    expectedTransfer: totals.transfer,
    diffCash,
    diffCard,
    diffTransfer,
    status: reconciliationStatusFromDiffs(diffCash, diffCard, diffTransfer)
  }, state.entries || [], state.settings.activeDate);
}

function totalsFor(entries) {
  return entries.reduce((totals, entry) => {
    if (!isBillableEntry(entry)) return totals;
    const net = netAmount(entry);
    const payments = entryPaymentBreakdown(entry);
    totals.revenue += net;
    totals.paid += PAYMENT_METHODS.reduce((sum, method) => sum + numberValue(payments[method]), 0);
    totals.discount += numberValue(entry.discount);
    totals.count += 1;
    totals.cash += numberValue(payments.cash);
    totals.card += numberValue(payments.card);
    totals.transfer += numberValue(payments.transfer);
    totals.unpaid += Math.max(net - PAYMENT_METHODS.reduce((sum, method) => sum + numberValue(payments[method]), 0), 0);
    return totals;
  }, { revenue: 0, paid: 0, discount: 0, count: 0, cash: 0, card: 0, transfer: 0, unpaid: 0 });
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
  return totals.count ? totals.paid / totals.count : 0;
}

function topServices(entries) {
  const services = new Map();
  entries.forEach(entry => {
    const name = serviceLabel(entry);
    const current = services.get(name) || { service: name, count: 0, revenue: 0 };
    current.count += 1;
    current.revenue += paidAmount(entry);
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

function salaryStatusFor(memberId) {
  return state.salaryApprovals?.[state.settings.activeDate]?.[memberId] || "draft";
}

function setSalaryStatus(memberId, status) {
  state.salaryApprovals = state.salaryApprovals || {};
  state.salaryApprovals[state.settings.activeDate] = state.salaryApprovals[state.settings.activeDate] || {};
  state.salaryApprovals[state.settings.activeDate][memberId] = status;
}

function salaryEntryRows(entries, member) {
  if (!member) return [];
  return entries.map(entry => {
    const payout = entryPayouts(entry).find(row => row.member.id === member.id);
    if (!payout) return null;
    const roleInOperation = entry.doctorId === member.id
      ? (currentLanguage() === "en" ? "Doctor" : "طبيب")
      : (currentLanguage() === "en" ? "Specialist" : "أخصائي");
    return { entry, payout, roleInOperation };
  }).filter(Boolean);
}

function renderSalarySlip(entries) {
  if (!els.salarySlip || !els.salarySlipSelect) return;
  if (!canViewSensitive()) {
    els.salarySlip.innerHTML = `<div class="empty-state">كشف الراتب الفردي مخفي لهذا الحساب.</div>`;
    return;
  }

  const payableRows = salaryRows(entries).filter(row => row.operations > 0);
  const staffOptions = payableRows.length ? payableRows.map(row => row.member) : state.staff;
  if (!staffOptions.length) {
    els.salarySlipSelect.innerHTML = `<option value="">لا يوجد موظفون</option>`;
    els.salarySlip.innerHTML = `<div class="empty-state">أضف موظفين وعمليات لإظهار كشف فردي.</div>`;
    return;
  }

  if (!selectedSalaryMemberId || !staffOptions.some(member => member.id === selectedSalaryMemberId)) {
    selectedSalaryMemberId = staffOptions[0].id;
  }

  els.salarySlipSelect.innerHTML = staffOptions.map(member => (
    `<option value="${member.id}">${member.name} | ${roleLabel(member.role)}</option>`
  )).join("");
  els.salarySlipSelect.value = selectedSalaryMemberId;

  const member = getStaffMember(selectedSalaryMemberId);
  const rows = salaryEntryRows(entries, member);
  const totalPayout = rows.reduce((sum, row) => sum + row.payout.payout, 0);
  const totalRevenue = rows.reduce((sum, row) => sum + netAmount(row.entry), 0);
  const totalCost = rows.reduce((sum, row) => sum + entryCost(row.entry), 0);
  const label = currentLanguage() === "en"
    ? {
      salarySlip: "Salary Slip",
      date: "Date",
      branch: "Branch",
      status: "Status",
      role: "Role",
      operations: "Matched operations",
      totalRevenue: "Net revenue",
      directCost: "Direct cost",
      totalPayout: "Total payout",
      match: "Salary reconciliation",
      matchText: "Matched against operations linked to this staff member.",
      patient: "Patient",
      service: "Service",
      teamRole: "Team role",
      net: "Net",
      formula: "Formula",
      payout: "Payout",
      notes: "Notes",
      empty: "No operations are linked to this staff member for the selected date."
    }
    : {
      salarySlip: "كشف راتب",
      date: "التاريخ",
      branch: "الفرع",
      status: "الحالة",
      role: "الدور",
      operations: "عمليات مطابقة",
      totalRevenue: "الصافي المرتبط",
      directCost: "التكلفة المباشرة",
      totalPayout: "إجمالي المستحق",
      match: "مطابقة الراتب",
      matchText: "مطابق مع العمليات المرتبطة بهذا الموظف في سجل اليوم.",
      patient: "المريض",
      service: "الخدمة",
      teamRole: "دوره في العملية",
      net: "الصافي",
      formula: "طريقة الحساب",
      payout: "المستحق",
      notes: "ملاحظات",
      empty: "لا توجد عمليات مرتبطة بهذا الموظف في التاريخ المحدد."
    };

  const operationRows = rows.length ? rows.map(row => `
    <tr>
      <td>${row.entry.patient}</td>
      <td>${serviceLabel(row.entry)}</td>
      <td>${row.roleInOperation}</td>
      <td>${money(netAmount(row.entry))}</td>
      <td>${row.payout.formula}</td>
      <td><strong>${money(row.payout.payout)}</strong></td>
      <td>${row.entry.notes || "-"}</td>
    </tr>
  `).join("") : `<tr><td colspan="7">${label.empty}</td></tr>`;

  els.salarySlip.innerHTML = `
    <div class="salary-slip-heading">
      <div>
        <span>${label.salarySlip}</span>
        <h3>${member?.name || ""}</h3>
        <p>${label.date}: ${displayDate(state.settings.activeDate)} | ${label.branch}: ${state.settings.branch || "الفرع الرئيسي"} | ${label.status}: ${salaryStatusLabel(salaryStatusFor(member?.id))}</p>
      </div>
      <div class="salary-slip-total">
        <span>${label.totalPayout}</span>
        <strong>${money(totalPayout)}</strong>
      </div>
    </div>
    <div class="salary-slip-stats">
      <div><span>${label.role}</span><strong>${roleLabel(member?.role)}</strong></div>
      <div><span>${label.operations}</span><strong>${rows.length}</strong></div>
      <div><span>${label.totalRevenue}</span><strong>${money(totalRevenue)}</strong></div>
      <div><span>${label.directCost}</span><strong>${money(totalCost)}</strong></div>
    </div>
    <div class="rule-note salary-match-note"><strong>${label.match}:</strong> ${label.matchText}</div>
    <div class="table-wrap salary-slip-table">
      <table>
        <thead>
          <tr>
            <th>${label.patient}</th>
            <th>${label.service}</th>
            <th>${label.teamRole}</th>
            <th>${label.net}</th>
            <th>${label.formula}</th>
            <th>${label.payout}</th>
            <th>${label.notes}</th>
          </tr>
        </thead>
        <tbody>${operationRows}</tbody>
      </table>
    </div>
  `;
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

function renderAccountColumnsSelect(selectedIds = []) {
  if (!els.accountColumnsSelect) return;
  const columns = (state.scheduleColumns || []).filter(col => col.active !== false);
  if (!columns.length) {
    els.accountColumnsSelect.innerHTML = `<p class="field-hint">لا توجد أعمدة في الجدول بعد.</p>`;
    return;
  }
  els.accountColumnsSelect.innerHTML = columns
    .map(col => `
      <label class="column-permission-check">
        <input type="checkbox" name="allowedColumnIds" value="${col.id}" ${selectedIds.includes(col.id) ? "checked" : ""}>
        ${col.label}
      </label>
    `)
    .join("");
}

function roleCodeLabel(role) {
  const labels = {
    admin: "مدير",
    data_entry: "مساعد / استقبال",
    doctor: "طبيب",
    specialist: "أخصائي"
  };
  return labels[role] || role;
}

function accountFilterValues() {
  if (!els.accountFilterForm) return {};
  return Object.fromEntries(new FormData(els.accountFilterForm).entries());
}

function filteredAccounts() {
  const filters = accountFilterValues();
  const includesText = (value, query) => !query || String(value || "").toLowerCase().includes(query.toLowerCase());
  return (state.accounts || []).filter(account => {
    const fullName = `${account.name} ${account.firstName} ${account.lastName} ${account.arabicFirstName} ${account.arabicLastName}`;
    return (!filters.active || String(account.active !== false) === filters.active)
      && (!filters.role || account.role === filters.role)
      && includesText(account.userName, filters.userName)
      && includesText(account.arabicFirstName, filters.arabicFirstName)
      && includesText(fullName, filters.firstName)
      && includesText(account.mobile, filters.mobile)
      && includesText(account.telNo, filters.telNo);
  });
}

function renderPermissionSelects() {
  if (els.permissionAccountSelect) {
    const selectedAccounts = [...els.permissionAccountSelect.selectedOptions].map(option => option.value);
    els.permissionAccountSelect.innerHTML = (state.accounts || [])
      .filter(account => account.role !== "admin")
      .map(account => `<option value="${account.id}">${accountDisplayName(account)}</option>`)
      .join("");
    [...els.permissionAccountSelect.options].forEach(option => {
      option.selected = selectedAccounts.includes(option.value);
    });
  }

  const categories = uniqueValues(PERMISSION_FEATURES.map(feature => feature.category));
  if (els.permissionCategorySelect) {
    const selectedCategory = els.permissionCategorySelect.value;
    els.permissionCategorySelect.innerHTML = [
      `<option value="">— كل الأقسام —</option>`,
      ...categories.map(category => `<option value="${category}">${permissionCategoryLabel(category)}</option>`)
    ].join("");
    els.permissionCategorySelect.value = selectedCategory;
  }

  if (els.permissionFeatureSelect) {
    const currentFeature = els.permissionFeatureSelect.value;
    const category = els.permissionCategorySelect?.value || "";
    const query = els.permissionSearch?.value || "";
    const filtered = PERMISSION_FEATURES.filter(feature => (
      (!category || feature.category === category)
      && matchesSmartQuery([feature.label, permissionCategoryLabel(feature.category)], query)
    ));
    const grouped = uniqueValues(filtered.map(feature => feature.category)).map(group => `
      <optgroup label="${permissionCategoryLabel(group)}">
        ${filtered.filter(feature => feature.category === group).map(feature => `<option value="${feature.id}">${feature.label}</option>`).join("")}
      </optgroup>
    `).join("");
    els.permissionFeatureSelect.innerHTML = `<option value="">— اختر ميزة —</option>${grouped}`;
    if (filtered.some(feature => feature.id === currentFeature)) {
      els.permissionFeatureSelect.value = currentFeature;
    }
  }
}

function renderPermissionCatalog() {
  if (!els.permissionCatalog) return;
  const categories = uniqueValues(PERMISSION_FEATURES.map(feature => feature.category));
  els.permissionCatalog.innerHTML = categories.map(category => {
    const features = PERMISSION_FEATURES.filter(feature => feature.category === category);
    const assignedCount = features.reduce((sum, feature) => (
      sum + (state.accounts || []).filter(account => account.role !== "admin" && account.permissionFeatures?.includes(feature.id)).length
    ), 0);
    return `
      <div class="permission-module-card">
        <strong>${permissionCategoryLabel(category)}</strong>
        <span>${features.length} permissions</span>
        <small>${assignedCount} user assignments</small>
      </div>
    `;
  }).join("");
}

function renderAccountList() {
  if (!els.accountTable) return;
  if (!canManagePermissions()) {
    els.accountTable.innerHTML = `<tr><td colspan="12">هذا الحساب لا يملك صلاحية إدارة الحسابات.</td></tr>`;
    return;
  }

  const rows = filteredAccounts();
  if (!rows.length) {
    els.accountTable.innerHTML = `<tr><td colspan="12">لا يوجد مستخدمون مطابقون للفلاتر.</td></tr>`;
    return;
  }

  els.accountTable.innerHTML = rows.map(account => {
    const canDelete = account.role !== "admin" && account.id !== state.currentAccountId;
    return `
      <tr>
        <td>${account.userName}</td>
        <td>${account.arabicFirstName || "-"}</td>
        <td>${account.arabicLastName || "-"}</td>
        <td>${account.uid}</td>
        <td>${account.firstName || "-"}</td>
        <td>${account.lastName || "-"}</td>
        <td>${roleCodeLabel(account.role)}</td>
        <td><span class="status-pill ${account.active === false ? "bad" : "good"}">${account.active === false ? "موقوف" : "نشط"}</span></td>
        <td>${account.memberSince ? displayDate(account.memberSince) : "-"}</td>
        <td>${account.lastAccess || "-"}</td>
        <td><button class="text-button" type="button" data-edit-account="${account.id}">تعديل</button></td>
        <td>${canDelete ? `<button class="icon-button danger compact-delete" type="button" data-delete-account="${account.id}">×</button>` : "-"}</td>
      </tr>
    `;
  }).join("");
}

function permissionRows() {
  return PERMISSION_FEATURES.map(feature => {
    const accounts = (state.accounts || []).filter(account => (
      account.role !== "admin" && account.permissionFeatures?.includes(feature.id)
    ));
    return { feature, accounts };
  }).filter(row => row.accounts.length);
}

function renderPermissionTable() {
  if (!els.permissionTable) return;
  if (!canManagePermissions()) {
    els.permissionTable.innerHTML = `<tr><td colspan="4">هذا الحساب لا يملك صلاحية إدارة الحسابات.</td></tr>`;
    return;
  }

  const rows = permissionRows();
  if (!rows.length) {
    els.permissionTable.innerHTML = `<tr><td colspan="4">لا توجد صلاحيات محفوظة بعد.</td></tr>`;
    return;
  }

  els.permissionTable.innerHTML = rows.map(row => `
    <tr>
      <td>${row.accounts.map(account => accountDisplayName(account)).join(", ")}</td>
      <td>${row.feature.label}</td>
      <td><button class="text-button" type="button" data-edit-permission="${row.feature.id}">تعديل</button></td>
      <td><button class="icon-button danger compact-delete" type="button" data-delete-permission="${row.feature.id}">×</button></td>
    </tr>
  `).join("");
}

function renderAccessControls() {
  if (els.languageSelect) {
    els.languageSelect.value = currentLanguage();
  }
  renderAccountSwitcher();
  renderAccountStaffSelect();
  renderAccountColumnsSelect();
  if (els.accountSwitcher?.closest(".account-switcher")) {
    els.accountSwitcher.closest(".account-switcher").hidden = runtime.mode === "live";
  }

  const activeView = document.querySelector(".view.active")?.dataset.view;
  if (!activeView || !canView(activeView)) {
    setView(firstAllowedView());
  }

  els.viewButtons.forEach(button => {
    button.hidden = !canView(button.dataset.viewButton);
  });
  document.querySelectorAll("[data-report-jump]").forEach(button => {
    button.hidden = !canView("reports");
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
  const canAddAppointments = canUseFeature("add_appointment");
  if (els.bookingForm) {
    els.bookingForm.querySelectorAll("input, select, button").forEach(control => {
      const sensitiveControl = Boolean(control.closest("[data-sensitive]"));
      control.disabled = !canAddAppointments || (sensitiveControl && !showSensitive);
    });
  }
  const canMaintainPatients = canUseFeature("add_patient") || canUseFeature("edit_patient_information");
  const patientCreatePanel = document.querySelector(".patient-create-panel");
  if (patientCreatePanel) patientCreatePanel.hidden = !canMaintainPatients;
  if (els.printSelectedReport) {
    els.printSelectedReport.hidden = !canUseFeature("print_reports");
  }
  renderPermissionSelects();
  renderPermissionCatalog();
  renderAccountList();
  renderPermissionTable();
}

function setView(viewName) {
  const targetView = canView(viewName) ? viewName : firstAllowedView();
  if (targetView !== "bookings") setCalendarFocus(false);
  let activeButton = null;
  els.viewButtons.forEach(button => {
    const isActive = button.dataset.viewButton === targetView;
    button.classList.toggle("active", isActive);
    if (isActive) activeButton = button;
  });
  els.views.forEach(view => {
    view.classList.toggle("active", view.dataset.view === targetView);
  });
  if (targetView !== "reports") {
    document.querySelectorAll("[data-report-jump]").forEach(button => button.classList.remove("active"));
  }
  keepActiveNavItemVisible(activeButton);
}

function keepActiveNavItemVisible(activeButton) {
  const nav = activeButton?.closest(".side-nav");
  if (!nav) return;
  const navRect = nav.getBoundingClientRect();
  const buttonRect = activeButton.getBoundingClientRect();
  const hasHorizontalScroll = nav.scrollWidth > nav.clientWidth;
  const hasVerticalScroll = nav.scrollHeight > nav.clientHeight;

  if (hasHorizontalScroll) {
    if (buttonRect.left < navRect.left) {
      nav.scrollLeft -= navRect.left - buttonRect.left + 12;
    } else if (buttonRect.right > navRect.right) {
      nav.scrollLeft += buttonRect.right - navRect.right + 12;
    }
  }

  if (hasVerticalScroll) {
    if (buttonRect.top < navRect.top) {
      nav.scrollTop -= navRect.top - buttonRect.top + 12;
    } else if (buttonRect.bottom > navRect.bottom) {
      nav.scrollTop += buttonRect.bottom - navRect.bottom + 12;
    }
  }
}

function setActiveDate(dateString) {
  const requestedDate = dateString || today;
  if (!calendarDateAllowed(currentAccount(), requestedDate)) return;
  state.settings.activeDate = requestedDate;
  if (els.clinicForm) {
    els.clinicForm.elements.activeDate.value = state.settings.activeDate;
  }
  if (els.bookingForm) {
    els.bookingForm.elements.date.value = state.settings.activeDate;
  }
  saveState();
  render();
}

function renderClinicForm() {
  els.clinicForm.elements.clinicName.value = state.settings.clinicName;
  els.clinicForm.elements.activeDate.value = state.settings.activeDate;
  els.clinicForm.elements.branch.value = state.settings.branch || "";
  if (els.clinicForm.elements.workStart) els.clinicForm.elements.workStart.value = state.settings.workStart || "08:00";
  if (els.clinicForm.elements.workEnd) els.clinicForm.elements.workEnd.value = state.settings.workEnd || "18:00";
  els.clinicTitle.textContent = state.settings.clinicName;
  if (els.bookingForm && !els.bookingForm.elements.date.value) {
    els.bookingForm.elements.date.value = state.settings.activeDate;
  }
}

function renderStaffSelects() {
  const account = currentAccount();
  const scopedMember = accountStaffScoped(account) ? getStaffMember(account.staffId) : null;
  const doctors = scopedMember?.role === "doctor"
    ? [scopedMember]
    : state.staff.filter(member => member.role === "doctor");
  const specialists = scopedMember?.role === "specialist"
    ? [scopedMember]
    : state.staff.filter(member => member.role === "specialist");
  const services = activeServices();
  const staffOptionLabel = member => member.name;

  const doctorOptions = doctors.map(member => (
    `<option value="${member.id}">${staffOptionLabel(member)}</option>`
  ));
  els.doctorSelect.innerHTML = scopedMember?.role === "doctor"
    ? doctorOptions.join("")
    : [`<option value="">بدون طبيب</option>`, ...doctorOptions].join("");

  const specialistOptions = specialists.map(member => (
    `<option value="${member.id}">${staffOptionLabel(member)}</option>`
  ));
  els.specialistSelect.innerHTML = scopedMember?.role === "specialist"
    ? specialistOptions.join("")
    : [`<option value="">بدون أخصائي</option>`, ...specialistOptions].join("");

  if (els.bookingDoctorSelect) {
    els.bookingDoctorSelect.innerHTML = scopedMember?.role === "doctor"
      ? doctorOptions.join("")
      : [`<option value="">بدون طبيب</option>`, ...doctorOptions].join("");
  }

  if (els.bookingSpecialistSelect) {
    els.bookingSpecialistSelect.innerHTML = scopedMember?.role === "specialist"
      ? specialistOptions.join("")
      : [`<option value="">بدون أخصائي</option>`, ...specialistOptions].join("");
  }

  if (els.operationScheduleColumn) {
    const columns = scheduleColumnsForAccount();
    const current = els.operationScheduleColumn.value;
    els.operationScheduleColumn.innerHTML = columns.length
      ? columns.map(column => `<option value="${column.id}">${column.label}</option>`).join("")
      : `<option value="">لا أعمدة مسموح بها</option>`;
    els.operationScheduleColumn.value = current;
  }

  if (els.operationCategorySelect) {
    const categories = serviceCategories();
    const current = els.operationCategorySelect.value;
    els.operationCategorySelect.innerHTML = `<option value="">كل الفئات</option>`
      + categories.map(category => `<option value="${category}">${category}</option>`).join("");
    els.operationCategorySelect.value = current;
    els.operationCategorySelect.parentElement.hidden = categories.length === 0;
  }

  if (els.operationSubcategorySelect) {
    const activeCategory = els.operationCategorySelect?.value || "";
    const subs = [...new Set(services
      .filter(service => !activeCategory || (service.category || "") === activeCategory)
      .map(service => service.subcategory).filter(Boolean))].sort((a, b) => a.localeCompare(b, "ar"));
    const currentSub = els.operationSubcategorySelect.value;
    els.operationSubcategorySelect.innerHTML = `<option value="">الكل</option>`
      + subs.map(sub => `<option value="${sub}">${sub}</option>`).join("");
    els.operationSubcategorySelect.value = subs.includes(currentSub) ? currentSub : "";
    const field = els.operationSubcategorySelect.closest("[data-operation-subcategory-field]");
    if (field) field.hidden = subs.length === 0;
  }

  if (els.serviceSelect) {
    const activeCategory = els.operationCategorySelect?.value || "";
    const activeSub = els.operationSubcategorySelect?.value || "";
    const filtered = services.filter(service =>
      (!activeCategory || (service.category || "") === activeCategory)
      && (!activeSub || (service.subcategory || "") === activeSub));
    els.serviceSelect.innerHTML = filtered.length
      ? filtered.map(service => `<option value="${service.id}">${service.name}</option>`).join("")
      : `<option value="">${activeCategory ? "لا خدمات في هذه الفئة" : "أضف خدمة أولاً"}</option>`;

    const selectedService = getService(els.serviceSelect.value) || filtered[0];
    if (selectedService && els.entryForm) {
      if (!els.entryForm.elements.amount.value) {
        els.entryForm.elements.amount.value = selectedService.defaultPrice || "";
      }
      if (!els.entryForm.elements.cost.value || els.entryForm.elements.cost.value === "0") {
        els.entryForm.elements.cost.value = selectedService.defaultCost || 0;
      }
    }
  }

  const svcCatSelect = document.querySelector("[data-service-category-select]");
  if (svcCatSelect) {
    const current = svcCatSelect.value;
    svcCatSelect.innerHTML = `<option value="">— بدون فئة —</option>`
      + serviceCategories().map(category => `<option value="${category}">${category}</option>`).join("")
      + `<option value="__new__">➕ فئة جديدة…</option>`;
    svcCatSelect.value = [...svcCatSelect.options].some(option => option.value === current) ? current : "";
  }
  if (els.serviceCategoryList) {
    els.serviceCategoryList.innerHTML = serviceCategories().map(category => `<option value="${category}"></option>`).join("");
  }

  if (els.bookingServiceSelect) {
    // The chosen calendar row (column) can restrict bookings to its category.
    const bookingCol = (state.scheduleColumns || []).find(col => col.id === els.bookingColumnSelect?.value);
    const colCategory = (bookingCol?.categories || [])[0] || "";
    const allCats = serviceCategories();
    if (els.bookingCategorySelect) {
      const catField = els.bookingCategorySelect.closest("[data-booking-category-field]");
      if (colCategory) {
        els.bookingCategorySelect.innerHTML = `<option value="${colCategory}">${colCategory}</option>`;
        els.bookingCategorySelect.value = colCategory;
        els.bookingCategorySelect.disabled = true;
      } else {
        const current = els.bookingCategorySelect.value;
        els.bookingCategorySelect.disabled = false;
        els.bookingCategorySelect.innerHTML = `<option value="">كل الفئات</option>` + allCats.map(cat => `<option value="${cat}">${cat}</option>`).join("");
        els.bookingCategorySelect.value = allCats.includes(current) ? current : "";
      }
      if (catField) catField.hidden = allCats.length === 0;
    }
    const activeCat = colCategory || els.bookingCategorySelect?.value || "";
    if (els.bookingSubcategorySelect) {
      const subs = [...new Set(services.filter(svc => !activeCat || (svc.category || "") === activeCat).map(svc => svc.subcategory).filter(Boolean))].sort((a, b) => a.localeCompare(b, "ar"));
      const currentSub = els.bookingSubcategorySelect.value;
      els.bookingSubcategorySelect.innerHTML = `<option value="">الكل</option>` + subs.map(sub => `<option value="${sub}">${sub}</option>`).join("");
      els.bookingSubcategorySelect.value = subs.includes(currentSub) ? currentSub : "";
      const subField = els.bookingSubcategorySelect.closest("[data-booking-subcategory-field]");
      if (subField) subField.hidden = subs.length === 0;
    }
    const activeSub = els.bookingSubcategorySelect?.value || "";
    const filtered = services.filter(svc =>
      (!activeCat || (svc.category || "") === activeCat) && (!activeSub || (svc.subcategory || "") === activeSub));
    els.bookingServiceSelect.innerHTML = filtered.length
      ? filtered.map(service => `<option value="${service.id}">${service.name}</option>`).join("")
      : `<option value="">${activeCat ? "لا خدمات في هذه الفئة" : "أضف خدمة أولاً"}</option>`;

    const selectedService = getService(els.bookingServiceSelect.value) || filtered[0];
    if (selectedService && els.bookingForm && !els.bookingForm.elements.expectedAmount.value) {
      els.bookingForm.elements.expectedAmount.value = selectedService.defaultPrice || "";
    }
  }

  renderScheduleColumnControls();

  if (els.ruleServiceSelect) {
    const current = els.ruleServiceSelect.value;
    els.ruleServiceSelect.innerHTML = ruleTargetOptionsHtml("كل الخدمات");
    els.ruleServiceSelect.value = current;
  }

  if (els.operationPatientOptions) {
    els.operationPatientOptions.innerHTML = (state.patients || [])
      .filter(patient => patient.active !== false)
      .map(patient => `<option value="${patient.name}">${patient.patientNumber} | ${patient.phone || patient.profileType}</option>`)
      .join("");
  }

  if (els.entryFilterService) {
    const currentValue = els.entryFilterService.value;
    els.entryFilterService.innerHTML = [
      `<option value="">كل الخدمات</option>`,
      ...state.services.map(service => `<option value="${service.id}">${service.name}</option>`)
    ].join("");
    els.entryFilterService.value = currentValue;
  }

  if (els.entryFilterStaff) {
    const currentValue = els.entryFilterStaff.value;
    els.entryFilterStaff.innerHTML = [
      `<option value="">كل الفريق</option>`,
      ...state.staff.map(member => `<option value="${member.id}">${member.name}</option>`)
    ].join("");
    els.entryFilterStaff.value = currentValue;
  }

  renderRulePersonSelect();
}

let _editingRuleId = "";

function renderRulePersonSelect() {
  if (!els.rulePersonSelect || !els.ruleForm) return;
  const appliesTo = els.ruleForm.elements.appliesTo.value;
  const editing = _editingRuleId ? (state.rules || []).find(rule => rule.id === _editingRuleId) : null;
  const checkedPeople = new Set(editing ? (editing.personIds?.length ? editing.personIds : (editing.personId ? [editing.personId] : [])) : []);
  const people = state.staff.filter(member => member.role === appliesTo);
  els.rulePersonSelect.innerHTML = people.length
    ? people.map(member => `
      <label class="rule-person-check">
        <input type="checkbox" name="personId" value="${member.id}"${checkedPeople.has(member.id) ? " checked" : ""}>
        <span>${member.name}</span>
      </label>`).join("")
    : `<div class="empty-state">لا يوجد ${appliesTo === "doctor" ? "أطباء" : "أخصائيون"} بعد — أضف الموظفين أولاً.</div>`;
  renderRuleServiceSelect();
}

function renderRuleServiceSelect() {
  if (!els.ruleServiceSelect) return;
  const editing = _editingRuleId ? (state.rules || []).find(rule => rule.id === _editingRuleId) : null;
  const checked = new Set(editing ? (editing.serviceIds?.length ? editing.serviceIds : (editing.serviceId ? [editing.serviceId] : [])) : []);
  const services = (state.services || []).filter(service => service.active !== false);
  if (!services.length) { els.ruleServiceSelect.innerHTML = `<div class="empty-state">أضف خدمات أولاً.</div>`; return; }
  const byCat = new Map();
  services.forEach(svc => {
    const cat = svc.category || "بدون فئة";
    const sub = svc.subcategory || "";
    if (!byCat.has(cat)) byCat.set(cat, new Map());
    const subMap = byCat.get(cat);
    if (!subMap.has(sub)) subMap.set(sub, []);
    subMap.get(sub).push(svc);
  });
  const svcRow = (svc, cat, subKey) =>
    `<label class="rule-tree-service${checked.has(svc.id) ? " on" : ""}"><input type="checkbox" name="serviceId" value="${svc.id}"${checked.has(svc.id) ? " checked" : ""} data-svc-cat="${cat}" data-svc-subkey="${subKey}"><span class="rule-tree-plus">${checked.has(svc.id) ? "✓" : "+"}</span><span>${svc.name}</span></label>`;
  const selCount = list => list.filter(svc => checked.has(svc.id)).length;
  els.ruleServiceSelect.innerHTML = [...byCat.entries()].map(([cat, subMap]) => {
    const all = [...subMap.values()].flat();
    const noSub = subMap.get("") || [];
    const subs = [...subMap.entries()].filter(([sub]) => sub).sort((a, b) => a[0].localeCompare(b[0], "ar"));
    return `
      <details class="rule-tree-cat"${selCount(all) ? " open" : ""}>
        <summary><span class="rule-tree-cat-name">${cat}</span><span class="tree-count">${selCount(all)}/${all.length}</span></summary>
        <label class="rule-tree-all"><input type="checkbox" data-rule-cat-all="${cat}"> تحديد كل «${cat}»</label>
        ${noSub.map(svc => svcRow(svc, cat, `${cat}__`)).join("")}
        ${subs.map(([sub, list]) => `
          <details class="rule-tree-sub" open>
            <summary><span class="rule-tree-sub-name">${sub}</span><span class="tree-count">${selCount(list)}/${list.length}</span></summary>
            <label class="rule-tree-all"><input type="checkbox" data-rule-sub-all="${cat}__${sub}"> تحديد كل «${sub}»</label>
            ${list.map(svc => svcRow(svc, cat, `${cat}__${sub}`)).join("")}
          </details>`).join("")}
      </details>`;
  }).join("");
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

function scheduleColumnIdFromLabel(label) {
  const base = String(label || "column")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06FF]+/g, "-")
    .replace(/^-+|-+$/g, "")
    || "column";
  let candidate = base;
  let index = 2;
  const existing = new Set(activeScheduleColumns().map(column => column.id));
  while (existing.has(candidate)) {
    candidate = `${base}-${index}`;
    index += 1;
  }
  return candidate;
}

function renderScheduleColumnControls() {
  const columns = activeScheduleColumns();
  const formColumns = scheduleColumnsForAccount();
  const slotMinutes = scheduleSlotMinutes();
  if (els.bookingColumnSelect) {
    const current = els.bookingColumnSelect.value;
    els.bookingColumnSelect.disabled = !formColumns.length;
    els.bookingColumnSelect.innerHTML = formColumns.length
      ? formColumns.map(column => `<option value="${column.id}">${column.label}</option>`).join("")
      : `<option value="">لا توجد أعمدة تقويم متاحة لهذا الحساب</option>`;
    els.bookingColumnSelect.value = formColumns.some(column => column.id === current)
      ? current
      : formColumns[0]?.id || "";
  }

  if (els.scheduleColumnList) {
    els.scheduleColumnList.innerHTML = columns.map(column => `
      <span class="schedule-column-pill">
        <span>${column.label}</span>
        ${canViewSensitive() && columns.length > 1 ? `<button class="icon-button danger" type="button" data-delete-schedule-column="${column.id}" aria-label="حذف العمود">×</button>` : ""}
      </span>
    `).join("");
  }

  if (els.scheduleSlotMinutes) {
    els.scheduleSlotMinutes.value = String(slotMinutes);
  }

  if (els.bookingForm?.elements.time) {
    els.bookingForm.elements.time.step = String(slotMinutes * 60);
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

  document.querySelector('[data-kpi="revenue"]').textContent = money(totals.paid);
  document.querySelector('[data-kpi-note="revenue"]').textContent = `مدفوع من ${totals.count} عملية${totals.unpaid ? ` | غير مدفوع ${money(totals.unpaid)}` : ""}`;
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
    ? `تم تسجيل ${totals.count} عملية اليوم بمدفوعات ${money(totals.paid)}. إجمالي آخر 7 أيام ${money(weekTotals.paid)} عبر ${weekEntries.length} عملية.`
    : `لا توجد عمليات لهذا التاريخ بعد. يعرض هذا القسم الإيرادات، طرق الدفع، النسب، وحالة الإغلاق بمجرد إدخال العمليات.`;

  els.closeChip.textContent = closeLabel;
  els.discountChip.textContent = `الخصومات ${money(totals.discount)}`;
  els.averageChip.textContent = `متوسط العملية ${money(avg)}`;

  document.querySelector('[data-kpi="weekRevenue"]').textContent = money(weekTotals.paid);
  document.querySelector('[data-kpi-note="weekRevenue"]').textContent = `${weekEntries.length} عملية خلال آخر 7 أيام`;
}

function phoneDigits(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("962")) return digits;
  if (digits.startsWith("0")) return `962${digits.slice(1)}`;
  return digits;
}

function nextVisitorBooking() {
  const bookings = activeBookings().filter(booking => !["completed", "cancelled", "no_show"].includes(booking.status));
  if (!bookings.length) return null;
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  if (state.settings.activeDate === today) {
    const upcoming = bookings.find(booking => minutesFromTime(booking.time) >= currentMinutes);
    if (upcoming) return upcoming;
  }
  return bookings.find(booking => ["scheduled", "confirmed"].includes(booking.status))
    || bookings[0];
}

function renderNextVisitor() {
  if (!els.nextVisitor) return;
  const booking = nextVisitorBooking();
  if (!booking) {
    els.nextVisitor.innerHTML = `
      <span class="next-visitor-label">الموعد القادم</span>
      <strong>لا يوجد موعد قادم</strong>
      <p>الجدول المتبقي لليوم فارغ.</p>
      <button class="text-button" type="button" data-jump="bookings">فتح التقويم</button>
    `;
    return;
  }
  const patient = getPatient(booking.patientId) || findPatientByName(booking.patient);
  const doctor = getStaffMember(booking.doctorId);
  const specialist = getStaffMember(booking.specialistId);
  const canSeePhone = canUseFeature("see_mobile");
  const whatsappNumber = phoneDigits(booking.phone || patient?.phone);
  const team = [doctor?.name, specialist?.name].filter(Boolean).join(" / ") || "بانتظار التعيين";
  els.nextVisitor.innerHTML = `
    <div class="next-visitor-top">
      <span class="next-visitor-label">الموعد القادم</span>
      <span class="status-pill ${statusClass(booking.status)}">${bookingStatusLabel(booking.status)}</span>
    </div>
    <div class="next-visitor-time">${displayTime(booking.time)}</div>
    <button class="next-visitor-name" type="button" data-open-patient="${patient?.id || ""}">${booking.patient}</button>
    <p>${serviceLabel(booking)} | ${team}</p>
    ${canSeePhone && (booking.phone || patient?.phone) ? `<p class="next-visitor-phone">${booking.phone || patient?.phone}</p>` : ""}
    <div class="next-visitor-actions">
      ${canSeePhone && (booking.phone || patient?.phone) ? `<a class="text-button" href="tel:${booking.phone || patient?.phone}">اتصال</a>` : ""}
      ${canSeePhone && whatsappNumber ? `<a class="text-button whatsapp-action" href="https://wa.me/${whatsappNumber}" target="_blank" rel="noreferrer">WhatsApp</a>` : ""}
      ${canUseFeature("change_appointment_status") && booking.status === "confirmed" ? `<button class="dark-button" type="button" data-booking-status-id="${booking.id}" data-booking-status="arrived">تسجيل الوصول</button>` : ""}
    </div>
  `;
}

function renderBookingFunnel() {
  if (!els.bookingFunnel) return;
  const bookings = activeBookings();
  const rows = [
    { status: "scheduled", label: "محجوز", color: "blue" },
    { status: "confirmed", label: "مؤكد", color: "violet" },
    { status: "arrived", label: "وصل", color: "amber" },
    { status: "completed", label: "مكتمل", color: "green" },
    { status: "no_show", label: "لم يحضر", color: "red" }
  ].map(row => ({
    ...row,
    count: bookings.filter(booking => booking.status === row.status).length
  }));
  const max = Math.max(...rows.map(row => row.count), 1);
  els.bookingFunnel.innerHTML = rows.map(row => `
    <div class="funnel-row">
      <div><span>${row.label}</span><strong>${row.count}</strong></div>
      <div class="funnel-track"><span class="${row.color}" style="--funnel-width:${Math.max((row.count / max) * 100, row.count ? 12 : 2)}%"></span></div>
    </div>
  `).join("");
}

// The "highway": today's workflow as five stations on a road
// (appointment → arrival → service → payment → closing), each marked done
// based on the real state of the working day.
function renderDayHighway() {
  const host = document.querySelector("[data-day-highway]");
  if (!host) return;
  const date = state.settings.activeDate;
  const bookingsToday = (state.bookings || []).filter(booking => booking.date === date);
  const entriesToday = (state.entries || []).filter(entry => entry.date === date && isBillableEntry(entry));
  const arrived = bookingsToday.some(booking => ["arrived", "confirmed", "completed"].includes(booking.status)) || entriesToday.length > 0;
  const paidToday = entriesToday.reduce((sum, entry) => sum + paidAmount(entry), 0);
  const recos = state.reconciliations;
  const closedToday = Array.isArray(recos)
    ? recos.some(record => record.date === date)
    : Boolean(recos && typeof recos === "object" && recos[date]);
  const steps = [
    { ic: "calendar", label: "موعد", sub: "حجز وتأكيد الموعد", done: bookingsToday.length > 0 },
    { ic: "user", label: "وصول المريض", sub: "تسجيل الوصول", done: arrived },
    { ic: "receipt", label: "الخدمة / العملية", sub: "تقديم الخدمة أو العملية", done: entriesToday.length > 0 },
    { ic: "cash", label: "الدفع", sub: "تحصيل المبلغ", done: paidToday > 0 },
    { ic: "check", label: "الإغلاق", sub: "إغلاق الملف والمطابقة", done: closedToday }
  ];
  const doneCount = steps.filter(step => step.done).length;
  host.innerHTML = `
    <div class="highway-head">
      <div><h3>سير العمل اليومي</h3><p>تابع سير العمل وأكمل كل خطوة بسلاسة</p></div>
      <span class="highway-progress">${doneCount}/${steps.length} مكتملة</span>
    </div>
    <div class="highway-road">
      ${steps.map(step => `
        <div class="highway-step ${step.done ? "done" : ""}">
          <div class="highway-node"><svg class="nav-ic" aria-hidden="true"><use href="#ic-${step.ic}"/></svg></div>
          <strong>${step.label}</strong>
          <small>${step.sub}</small>
          <span class="highway-check" aria-hidden="true">${step.done ? "✓" : ""}</span>
        </div>
      `).join("")}
    </div>`;
}

function renderDashboardSchedule() {
  if (!els.dashboardSchedule) return;
  const bookings = activeBookings().slice(0, 6);
  if (!bookings.length) {
    els.dashboardSchedule.innerHTML = `<div class="empty-state">لا توجد حجوزات في تاريخ العمل المحدد.</div>`;
    return;
  }
  els.dashboardSchedule.innerHTML = bookings.map(booking => {
    const patient = getPatient(booking.patientId) || findPatientByName(booking.patient);
    const member = getStaffMember(booking.doctorId || booking.specialistId);
    return `
      <div class="dashboard-appointment ${booking.status}">
        <time>${displayTime(booking.time)}</time>
        ${genderAvatar(patient || booking, 36)}
        <div>
          <button class="table-link" type="button" data-open-patient="${patient?.id || ""}">${booking.patient}</button>
          <span>${serviceLabel(booking)} | ${member?.name || "غير معين"}</span>
        </div>
        <span class="status-pill ${statusClass(booking.status)}">${bookingStatusLabel(booking.status)}</span>
      </div>
    `;
  }).join("");
}

function operationalNotifications() {
  const bookings = activeBookings();
  const scheduled = bookings.filter(booking => booking.status === "scheduled");
  const noShows = bookings.filter(booking => booking.status === "no_show");
  const pendingPayments = activeEntries().filter(entry => entry.status === "pending_payment");
  // All entries across all dates where payment is incomplete
  const allEntries = state.entries || [];
  const partialPayments = allEntries.filter(entry => entry.status === "partial_payment");
  const draftReceipts = (state.receipts || []).filter(receipt => ["draft", "ready"].includes(receipt.status));
  const notifications = [];
  const nextBooking = nextVisitorBooking();

  // ── Subscription & account status notifications ────────────────────────────
  const clinic = runtime.session?.clinic;
  if (clinic) {
    if (clinic.status === "suspended") {
      notifications.push({
        id: "account-suspended",
        severity: "danger",
        title: "الحساب موقوف مؤقتاً",
        body: "تواصل مع الدعم لإعادة تفعيل العيادة.",
        view: "dashboard"
      });
    }

    if (clinic.accountDeadline) {
      const deadlineDate = clinic.accountDeadline.slice(0, 10);
      const daysLeft = Math.ceil((new Date(deadlineDate) - new Date(today)) / 86400000);
      if (daysLeft <= 0) {
        notifications.push({
          id: "account-deadline-passed",
          severity: "danger",
          title: "موعد إغلاق الحساب وصل",
          body: `الحساب كان مقرراً إغلاقه بتاريخ ${displayDate(deadlineDate)}. تواصل مع الدعم فوراً.`,
          view: "dashboard"
        });
      } else if (daysLeft <= 3) {
        notifications.push({
          id: `account-deadline-${deadlineDate}`,
          severity: "danger",
          title: `الحساب سيُغلق بعد ${daysLeft} ${daysLeft === 1 ? "يوم" : "أيام"}`,
          body: `تاريخ الإغلاق: ${displayDate(deadlineDate)}. تواصل مع الدعم الآن.`,
          view: "dashboard"
        });
      } else if (daysLeft <= 14) {
        notifications.push({
          id: `account-deadline-${deadlineDate}`,
          severity: "warning",
          title: `تذكير: إغلاق الحساب بعد ${daysLeft} يوماً`,
          body: `الحساب سيُغلق بتاريخ ${displayDate(deadlineDate)}.`,
          view: "dashboard"
        });
      } else if (daysLeft <= 30) {
        notifications.push({
          id: `account-deadline-${deadlineDate}`,
          severity: "info",
          title: `إشعار: إغلاق الحساب بعد ${daysLeft} يوماً`,
          body: `الحساب سيُغلق بتاريخ ${displayDate(deadlineDate)}.`,
          view: "dashboard"
        });
      }
    }

    if (clinic.status === "trial" && clinic.trialEndsAt) {
      const trialDate = clinic.trialEndsAt.slice(0, 10);
      const daysLeft = Math.ceil((new Date(trialDate) - new Date(today)) / 86400000);
      if (daysLeft > 0 && daysLeft <= 3) {
        notifications.push({
          id: `trial-ending-${trialDate}`,
          severity: "warning",
          title: `الفترة التجريبية تنتهي بعد ${daysLeft} ${daysLeft === 1 ? "يوم" : "أيام"}`,
          body: "تواصل معنا للاشتراك قبل انتهاء الفترة.",
          view: "dashboard"
        });
      }
    }

    // Owner-sent messages
    (runtime.serverNotifications || []).forEach(n => {
      if (!notifications.find(existing => existing.id === n.id)) {
        notifications.push(n);
      }
    });
  }

  if (nextBooking) {
    notifications.push({
      id: `next-${state.settings.activeDate}-${nextBooking.id}`,
      severity: "info",
      title: `الموعد القادم ${displayTime(nextBooking.time)}`,
      body: `${nextBooking.patient} | ${serviceLabel(nextBooking)}`,
      view: "bookings"
    });
  }
  if (scheduled.length) {
    notifications.push({
      id: `confirm-${state.settings.activeDate}`,
      severity: "warning",
      title: `${scheduled.length} حجز بانتظار التأكيد`,
      body: "تواصل مع المرضى قبل موعدهم لتقليل عدم الحضور.",
      view: "bookings"
    });
  }
  if (noShows.length) {
    notifications.push({
      id: `no-show-${state.settings.activeDate}`,
      severity: "danger",
      title: `${noShows.length} لم يحضروا`,
      body: "أرسل متابعة أو اعرض موعداً بديلاً.",
      view: "communications"
    });
  }
  if (partialPayments.length) {
    const names = [...new Set(partialPayments.map(e => e.patient))].slice(0, 4);
    notifications.push({
      id: "partial-payments-outstanding",
      severity: "warning",
      title: `${partialPayments.length} ${partialPayments.length === 1 ? "مريض" : "مرضى"} بحساب غير مكتمل`,
      body: names.join("، ") + (partialPayments.length > 4 ? ` وآخرون…` : ""),
      view: "entries"
    });
  }
  if (pendingPayments.length) {
    notifications.push({
      id: `pending-payment-${state.settings.activeDate}`,
      severity: "danger",
      title: `${pendingPayments.length} عملية بانتظار الدفع`,
      body: "راجع السجل المالي قبل إغلاق اليوم.",
      view: "entries"
    });
  }
  if (lowStockItems().length) {
    notifications.push({
      id: `low-stock-${state.settings.activeDate}`,
      severity: "warning",
      title: `${lowStockItems().length} أصناف منخفضة`,
      body: lowStockItems().slice(0, 2).map(item => item.name).join("، "),
      view: "inventory"
    });
  }
  if (draftReceipts.length) {
    notifications.push({
      id: `receipts-${state.settings.activeDate}`,
      severity: "info",
      title: `${draftReceipts.length} فواتير بانتظار JoFotara`,
      body: state.integrations?.jofotara?.configured ? "جاهزة للإرسال." : "أكمل إعداد الربط أولاً.",
      view: "communications"
    });
  }

  // Last physical count had unexplained discrepancies — alert the admin.
  const lastCount = (state.inventoryCounts || []).slice(-1)[0];
  if (lastCount) {
    const disc = lastCount.lines.filter(line => Math.abs(line.variance) > 0.009);
    if (disc.length) {
      notifications.push({
        id: `count-discrepancy-${lastCount.id}`,
        severity: "warn",
        title: `فروقات جرد في ${disc.length} صنف`,
        body: disc.slice(0, 3).map(line => `${line.name} ${line.variance > 0 ? "+" : ""}${line.variance}`).join("، "),
        view: "inventory"
      });
    }
  }
  return notifications;
}

function renderNotificationCenters() {
  const notifications = operationalNotifications();
  const unread = notifications.filter(notification => !state.notificationReads?.[notification.id]);
  if (els.notificationCount) {
    els.notificationCount.textContent = unread.length;
    els.notificationCount.hidden = unread.length === 0;
  }
  const content = notifications.length
    ? notifications.map(notification => `
      <button class="notification-item ${notification.severity} ${state.notificationReads?.[notification.id] ? "read" : ""}" type="button" data-notification-view="${notification.view}" data-notification-id="${notification.id}">
        <span></span>
        <div><strong>${notification.title}</strong><small>${notification.body}</small></div>
      </button>
    `).join("")
    : `<div class="empty-state">لا توجد تنبيهات تشغيلية حالياً.</div>`;
  if (els.notificationList) els.notificationList.innerHTML = content;
  if (els.communicationNotifications) els.communicationNotifications.innerHTML = content;
}

function renderSmartActions() {
  if (!els.smartActions) return;
  const actions = operationalNotifications().filter(notification => notification.severity !== "info").slice(0, 5);
  if (!actions.length) {
    els.smartActions.innerHTML = `
      <div class="smart-action success">
        <span>✓</span>
        <div><strong>اليوم تحت السيطرة</strong><p>لا توجد إجراءات عاجلة في الوقت الحالي.</p></div>
      </div>
    `;
    return;
  }
  els.smartActions.innerHTML = actions.map(action => `
    <button class="smart-action ${action.severity}" type="button" data-jump="${action.view}">
      <span>${action.severity === "danger" ? "!" : "•"}</span>
      <div><strong>${action.title}</strong><p>${action.body}</p></div>
    </button>
  `).join("");
}

function renderDashboardCommandCenter(entries) {
  const bookings = activeBookings();
  const expenses = activeDateExpenses();
  const revenue = entries.reduce((sum, entry) => sum + paidAmount(entry), 0);
  const expenseAmount = expenseTotal(expenses);
  const attention = bookings.filter(booking => ["scheduled", "no_show"].includes(booking.status)).length
    + unassignedEntries(entries).length
    + lowStockItems().length;
  const setDashboardMetric = (name, value, note) => {
    const valueElement = document.querySelector(`[data-dashboard-kpi="${name}"]`);
    const noteElement = document.querySelector(`[data-dashboard-note="${name}"]`);
    if (valueElement) valueElement.textContent = value;
    if (noteElement && note) noteElement.textContent = note;
  };
  setDashboardMetric("bookings", bookings.length, `${bookings.filter(booking => booking.status === "confirmed").length} مؤكدة`);
  setDashboardMetric("arrived", bookings.filter(booking => booking.status === "arrived").length, "بانتظار الخدمة");
  setDashboardMetric("operations", entries.length, `${new Set(entries.map(entry => entry.visitId || entry.id)).size} زيارة`);
  setDashboardMetric("expenses", canViewSensitive() ? money(expenseAmount) : "مخفي", `${expenses.length} حركة اليوم`);
  setDashboardMetric("net", canViewSensitive() ? money(revenue - expenseAmount) : "مخفي", "دخل اليوم بعد المصروفات");
  setDashboardMetric("attention", attention, "مواعيد وتنبيهات تشغيلية");
  renderNextVisitor();
  renderBookingFunnel();
  renderDashboardSchedule();
  renderSmartActions();
  renderNotificationCenters();
}

function renderDailyCommandCenter(entries, totals, diffs) {
  if (!els.dailyCommandDate) return;
  const notifications = operationalNotifications();
  const urgent = notifications.filter(notification => notification.severity !== "info");
  const revenueVisible = canViewSensitive();
  const date = state.settings.activeDate;
  const yesterday = new Date(new Date(date + "T12:00:00").getTime() - 86400000).toISOString().slice(0, 10);

  els.dailyCommandDate.textContent = displayDate(date);
  els.dailyCommandClinic.textContent = state.settings.clinicName || "عيادة رعاية";

  // Day-over-day deltas for operations / bookings / payments
  const yEntries = (state.entries || []).filter(entry => entry.date === yesterday && isBillableEntry(entry));
  const todayBookings = (state.bookings || []).filter(booking => booking.date === date);
  const yBookings = (state.bookings || []).filter(booking => booking.date === yesterday);
  const deltaLabel = (now, before) => {
    const diff = now - before;
    if (!diff) return "كما أمس";
    return `${diff > 0 ? "▲ +" : "▼ "}${Math.abs(diff)} عن أمس`;
  };

  if (revenueVisible) {
    const paidY = yEntries.reduce((sum, entry) => sum + paidAmount(entry), 0);
    const pct = paidY > 0 ? Math.round((totals.paid - paidY) / paidY * 100) : null;
    els.dailyCommandRevenue.textContent = money(totals.paid);
    els.dailyCommandRevenueNote.textContent = pct === null
      ? `${totals.count} ${totals.count === 1 ? "عملية" : "عمليات"} اليوم`
      : `${pct >= 0 ? "▲ +" : "▼ "}${Math.abs(pct)}% عن أمس`;
    els.dailyCommandReconcileStatus.textContent = !diffs ? "بانتظار" : Math.abs(diffs.totalDiff) < 0.01 ? "متوازنة" : "فرق";
    els.dailyCommandReconcileNote.textContent = !diffs
      ? "لم يتم إغلاق اليوم بعد"
      : Math.abs(diffs.totalDiff) < 0.01 ? "الإغلاق متطابق" : `الفرق ${money(diffs.totalDiff)}`;
  } else {
    els.dailyCommandRevenue.textContent = "مخفي";
    els.dailyCommandRevenueNote.textContent = "حسب صلاحيات هذا الحساب";
    els.dailyCommandReconcileStatus.textContent = "مخفي";
    els.dailyCommandReconcileNote.textContent = "الإغلاق المالي غير ظاهر لهذا الدور";
  }

  if (els.dailyCommandOps) {
    els.dailyCommandOps.textContent = totals.count;
    els.dailyCommandOpsNote.textContent = deltaLabel(totals.count, yEntries.length);
  }
  if (els.dailyCommandBookings) {
    els.dailyCommandBookings.textContent = todayBookings.length;
    els.dailyCommandBookingsNote.textContent = deltaLabel(todayBookings.length, yBookings.length);
  }

  els.dailyCommandAlerts.textContent = urgent.length;
  els.dailyCommandAlertsNote.textContent = urgent.length
    ? urgent.slice(0, 2).map(notification => notification.title).join("، ")
    : "لا توجد إجراءات عاجلة";
}

function renderWeekChart(series) {
  const showSensitive = canViewSensitive();
  const maxValue = Math.max(...series.map(day => showSensitive ? day.totals.paid : day.totals.count), 1);
  const formatter = new Intl.DateTimeFormat("ar-JO-u-nu-latn", { weekday: "short" });
  const activeDate = state.settings.activeDate;
  const totalCount = series.reduce((sum, day) => sum + day.totals.count, 0);

  els.weekCount.textContent = `${totalCount} عملية`;
  els.weekChart.innerHTML = series.map(day => {
    const value = showSensitive ? day.totals.paid : day.totals.count;
    const height = Math.max((value / maxValue) * 100, value ? 12 : 4);
    const label = formatter.format(new Date(`${day.date}T12:00:00`));
    return `
      <div class="chart-day ${day.date === activeDate ? "today" : ""}">
        <div class="chart-value">${showSensitive ? money(day.totals.paid).replace(" د.أ", "") : day.totals.count}</div>
        <div class="bar-track">
          <div class="bar-fill" style="--bar-height:${height}%"></div>
        </div>
        <div class="chart-label">${label}</div>
      </div>
    `;
  }).join("");
}

function renderRevenueTrend(series = weeklySeries(14)) {
  if (!els.revenueTrend) return;
  const showSensitive = canViewSensitive();
  const width = 780;
  const height = 240;
  const padding = { top: 30, right: 18, bottom: 40, left: 18 };
  const revVals = series.map(day => showSensitive ? day.totals.paid : day.totals.count);
  const expVals = showSensitive
    ? series.map(day => (state.expenses || []).filter(exp => (exp.date || "").slice(0, 10) === day.date).reduce((sum, exp) => sum + numberValue(exp.amount), 0))
    : [];
  const maximum = Math.max(...revVals, ...expVals, 1);
  const usableWidth = width - padding.left - padding.right;
  const usableHeight = height - padding.top - padding.bottom;
  const toPoints = vals => vals.map((value, index) => ({
    x: padding.left + (series.length === 1 ? usableWidth / 2 : index * usableWidth / (series.length - 1)),
    y: padding.top + usableHeight - (value / maximum) * usableHeight,
    value, date: series[index].date
  }));
  const revPts = toPoints(revVals);
  const revLine = revPts.map(point => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");
  const revArea = `${padding.left},${padding.top + usableHeight} ${revLine} ${padding.left + usableWidth},${padding.top + usableHeight}`;
  const expPts = expVals.length ? toPoints(expVals) : [];
  const expLine = expPts.map(point => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");
  const formatter = new Intl.DateTimeFormat(currentLanguage() === "en" ? "en-US" : "ar-JO-u-nu-latn", { day: "numeric", month: "numeric" });
  const gridLines = [0, 0.25, 0.5, 0.75, 1].map(portion => {
    const y = padding.top + usableHeight * portion;
    return `<line class="trend-grid" x1="${padding.left}" y1="${y}" x2="${padding.left + usableWidth}" y2="${y}"></line>`;
  }).join("");
  const legend = showSensitive
    ? `<div class="trend-legend"><span class="leg rev">الإيرادات</span><span class="leg exp">المصروفات</span></div>`
    : "";
  els.revenueTrend.innerHTML = `
    ${legend}
    <svg class="trend-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="اتجاه الإيرادات والمصروفات خلال أربعة عشر يوماً">
      ${gridLines}
      <polygon class="trend-area" points="${revArea}"></polygon>
      <polyline class="trend-line" points="${revLine}"></polyline>
      ${expPts.length ? `<polyline class="trend-line expenses" points="${expLine}"></polyline>` : ""}
      ${revPts.map((point, index) => `
        <circle class="trend-dot" cx="${point.x}" cy="${point.y}" r="3.5"></circle>
        ${index % 3 === 0 || index === revPts.length - 1 ? `<text class="trend-value" text-anchor="middle" x="${point.x}" y="${Math.max(point.y - 9, 12)}">${showSensitive ? Math.round(point.value) : point.value}</text>` : ""}
        <text class="trend-label" text-anchor="middle" x="${point.x}" y="${height - 12}">${formatter.format(new Date(`${point.date}T12:00:00`))}</text>
      `).join("")}
      ${expPts.map(point => `<circle class="trend-dot expenses" cx="${point.x}" cy="${point.y}" r="3"></circle>`).join("")}
    </svg>
  `;
}

function renderCapacityHeatmap() {
  if (!els.capacityHeatmap) return;
  const bookings = activeBookings().filter(booking => !["cancelled", "no_show"].includes(booking.status));
  els.capacityHeatmap.innerHTML = Array.from({ length: 10 }, (_, index) => index + 8).map(hour => {
    const count = bookings.filter(booking => Number.parseInt(booking.time, 10) === hour).length;
    const level = count >= 4 ? "high" : count >= 2 ? "medium" : count ? "low" : "";
    return `
      <div class="capacity-hour">
        <strong class="capacity-block ${level}">${count}</strong>
        <span>${String(hour).padStart(2, "0")}:00</span>
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
    { label: "تحويل", value: totals.transfer, className: "transfer" },
    { label: "غير مدفوع", value: totals.unpaid, className: "pending" }
  ];
  const total = Math.max(totals.cash + totals.card + totals.transfer + totals.unpaid, 0);

  els.paymentSummary.textContent = total
    ? `المقبوض اليوم ${money(totals.paid)}${totals.unpaid ? ` | المتبقي ${money(totals.unpaid)}` : ""}`
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
      title: `نسبة الخصم ${discountRate.toLocaleString("ar-JO-u-nu-latn", { maximumFractionDigits: 1 })}%`,
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
        <td><span class="pill">${entryPaymentLabel(entry)}</span></td>
        <td>${canViewSensitive() ? money(paidAmount(entry)) : "مخفي"}</td>
      </tr>
  `).join("");
}

function entryFilterValues() {
  if (!els.entryFilterForm) return {};
  return Object.fromEntries(new FormData(els.entryFilterForm).entries());
}

function filteredActiveEntries(entries) {
  const filters = entryFilterValues();
  return entries.filter(entry => {
    const doctor = getStaffMember(entry.doctorId);
    const specialist = getStaffMember(entry.specialistId);
    return (!filters.serviceId || entry.serviceId === filters.serviceId)
      && (!filters.staffId || entry.doctorId === filters.staffId || entry.specialistId === filters.staffId)
      && (!filters.status || entry.status === filters.status)
      && entryMatchesPayment(entry, filters.paymentMethod)
      && matchesSmartQuery([
        entry.patient,
        serviceLabel(entry),
        doctor?.name,
        specialist?.name,
        entryStatusLabel(entry.status),
        entryPaymentLabel(entry),
        entry.notes
      ], filters.query);
  });
}

function receiptForEntry(entryId) {
  return (state.receipts || []).find(receipt => receipt.entryIds?.includes(entryId));
}

function patientReceipts(patient) {
  return (state.receipts || [])
    .filter(receipt => receipt.patientId === patient.id || patientNameKey(receipt.patient) === patientNameKey(patient.name))
    .sort((a, b) => `${b.date} ${b.createdAt}`.localeCompare(`${a.date} ${a.createdAt}`));
}

function canViewReceipts() {
  return canUseFeature("view_receipts") || canUseFeature("issue_receipts") || canUseFeature("manage_jofotara");
}

function renderEntryTable(entries) {
  const showSensitive = canViewSensitive();
  const filters = entryFilterValues();
  const filtered = filteredActiveEntries(entries).slice().reverse();
  const pagination = paginateItems(filtered, operationPage, filters.pageSize || 25);
  operationPage = pagination.page;
  renderPagination(els.entryPagination, pagination, "operations");

  if (!pagination.items.length) {
    els.entryTable.innerHTML = `<tr><td colspan="${showSensitive ? 9 : 6}">لا توجد عمليات مطابقة للفلاتر الحالية.</td></tr>`;
    return;
  }

  els.entryTable.innerHTML = pagination.items.map(entry => {
    const doctor = getStaffMember(entry.doctorId);
    const specialist = getStaffMember(entry.specialistId);
    const payouts = entryPayouts(entry);
    const patient = getPatient(entry.patientId) || findPatientByName(entry.patient);
    const payoutText = payouts.length
      ? payouts.map(row => `${row.member.name}: ${money(row.payout)}`).join("<br>")
      : "لا يوجد";
    const time = entry.createdAt
      ? new Date(entry.createdAt).toLocaleTimeString(currentLanguage() === "en" ? "en-US" : "ar-JO-u-nu-latn", { hour: "2-digit", minute: "2-digit" })
      : "-";
    const canDelete = canUseFeature("delete_treatments_medical") && showSensitive;
    const receipt = receiptForEntry(entry.id);
    return `
      <tr>
        <td>${time}</td>
        <td>
          ${patient ? `<button class="table-link" type="button" data-open-patient="${patient.id}">${entry.patient}</button>` : entry.patient}
        </td>
        <td>${serviceLabel(entry)}</td>
        <td>${[doctor?.name, specialist?.name].filter(Boolean).join(" / ") || "بانتظار التعيين"}</td>
        <td><span class="pill">${entryPaymentLabel(entry)}</span></td>
        <td><span class="status-pill ${statusClass(entry.status)}">${entryStatusLabel(entry.status)}</span></td>
        ${showSensitive ? `<td>${money(paidAmount(entry))}</td>` : ""}
        ${showSensitive ? `<td><span class="formula-pill">${payoutText}</span></td>` : ""}
        <td><div class="row-actions">
          ${entry.status === "partial_payment" ? `<button class="text-button followup-button" type="button" data-followup-entry="${entry.id}">تكملة الدفع</button>` : ""}
          ${receipt && canViewReceipts() ? `<button class="text-button" type="button" data-open-receipt="${receipt.id}">إيصال</button>` : ""}
          ${canDelete ? `<button class="icon-button danger" type="button" data-delete-entry="${entry.id}">حذف</button>` : ""}
        </div></td>
      </tr>
    `;
  }).join("");
}

function patientFilterValues() {
  if (!els.patientFilterForm) return {};
  return Object.fromEntries(new FormData(els.patientFilterForm).entries());
}

function profileTypeLabel(profileType) {
  if (currentLanguage() === "en") return profileType === "visitor" ? "Visitor" : "Patient";
  return profileType === "visitor" ? "زائر" : "مريض";
}

function genderLabel(gender) {
  const labels = currentLanguage() === "en"
    ? { female: "Female", male: "Male" }
    : { female: "أنثى", male: "ذكر" };
  return labels[gender] || "-";
}

// Gender-based sticker avatar (no real photos) in the brand teal palette.
// Female = dress silhouette, male = shoulders silhouette, unknown = initial.
function genderAvatar(person, size = 38) {
  const raw = ((person && (person.gender || person.sex)) || "").toString().toLowerCase();
  const name = (person && (person.name || person.patient)) || "";
  const female = ["female", "أنثى", "f", "انثى"].includes(raw);
  const male = ["male", "ذكر", "m"].includes(raw);
  if (female) {
    return `<span class="g-avatar female" style="--av:${size}px" title="${name}" aria-hidden="true"><svg viewBox="0 0 40 40"><circle class="g-bg" cx="20" cy="20" r="20"/><g class="g-fig"><circle cx="20" cy="15" r="5.6"/><path d="M20 21.5c-3.2 0-5.4 1.6-6.4 4.3L10.4 35h19.2l-3.2-9.2c-1-2.7-3.2-4.3-6.4-4.3z"/></g></svg></span>`;
  }
  if (male) {
    return `<span class="g-avatar male" style="--av:${size}px" title="${name}" aria-hidden="true"><svg viewBox="0 0 40 40"><circle class="g-bg" cx="20" cy="20" r="20"/><g class="g-fig"><circle cx="20" cy="15" r="5.8"/><path d="M10.4 34.5c0-5.6 4.3-9 9.6-9s9.6 3.4 9.6 9z"/></g></svg></span>`;
  }
  const initial = (name.trim().charAt(0) || "؟");
  return `<span class="g-avatar neutral" style="--av:${size}px" title="${name}">${initial}</span>`;
}

function filteredPatients() {
  const filters = patientFilterValues();
  const rows = (state.patients || []).filter(patient => (
    patient.active !== false
    && (!filters.profileType || patient.profileType === filters.profileType)
    && (!filters.gender || patient.gender === filters.gender)
    && matchesSmartQuery([
      patient.patientNumber,
      patient.name,
      patient.phone,
      patient.email,
      patient.nationality,
      patient.city,
      patient.category,
      patient.notes,
      profileTypeLabel(patient.profileType)
    ], filters.query)
  ));

  if (filters.sort === "name") {
    rows.sort((a, b) => a.name.localeCompare(b.name, currentLanguage() === "en" ? "en" : "ar"));
  } else if (filters.sort === "activity") {
    rows.sort((a, b) => patientEntries(b).length + patientBookings(b).length - patientEntries(a).length - patientBookings(a).length);
  } else {
    rows.sort((a, b) => `${patientLastActivity(b)} ${b.createdAt}`.localeCompare(`${patientLastActivity(a)} ${a.createdAt}`));
  }
  return rows;
}

function renderPatientDirectory() {
  if (!els.patientTable) return;
  const filters = patientFilterValues();
  const pagination = paginateItems(filteredPatients(), patientPage, filters.pageSize || 10);
  patientPage = pagination.page;
  renderPagination(els.patientPagination, pagination, "patients");

  document.body.classList.toggle("can-bulk-delete", canUseFeature("delete_patient"));
  if (!pagination.items.length) {
    els.patientTable.innerHTML = `<tr><td colspan="8">لا توجد ملفات مطابقة للبحث.</td></tr>`;
    syncPatientBulkBar();
    return;
  }

  const canSeePhone = canUseFeature("see_mobile");
  els.patientTable.innerHTML = pagination.items.map(patient => {
    const operations = patientEntries(patient);
    return `
      <tr class="${selectedPatientId === patient.id ? "selected-row" : ""}">
        <td class="patient-bulk-col"><input type="checkbox" class="patient-check" value="${patient.id}" aria-label="تحديد ${patient.name}"></td>
        <td>${canUseFeature("patient_number") ? patient.patientNumber : "—"}</td>
        <td><span class="cell-with-avatar">${genderAvatar(patient, 32)}<button class="table-link" type="button" data-open-patient="${patient.id}">${patient.name}</button>${patient.rating ? ` ${ratingStarsStatic(patient.rating)}` : ""}</span></td>
        <td><span class="pill">${profileTypeLabel(patient.profileType)}</span></td>
        <td>${canSeePhone ? (patient.phone || "-") : "مخفي"}</td>
        <td>${displayDate(patientLastActivity(patient)) || "-"}</td>
        <td>${operations.length}</td>
        <td><button class="text-button" type="button" data-open-patient="${patient.id}">فتح الملف</button></td>
      </tr>
    `;
  }).join("");
  syncPatientBulkBar();
}

// Bulk patient delete: select rows (or the whole page) and remove the files at once.
function syncPatientBulkBar() {
  const checks = [...document.querySelectorAll(".patient-check")];
  const selected = checks.filter(cb => cb.checked).length;
  const bar = document.querySelector("[data-patient-bulk-bar]");
  if (bar) bar.hidden = selected === 0;
  const count = document.querySelector("[data-patient-selected-count]");
  if (count) count.textContent = `${selected} محدد`;
  const all = document.querySelector("[data-patient-select-all]");
  if (all) all.checked = checks.length > 0 && selected === checks.length;
}
document.addEventListener("change", event => {
  if (event.target.closest("[data-patient-select-all]")) {
    const on = event.target.checked;
    document.querySelectorAll(".patient-check").forEach(cb => { cb.checked = on; });
    syncPatientBulkBar();
  } else if (event.target.classList && event.target.classList.contains("patient-check")) {
    syncPatientBulkBar();
  }
});
document.addEventListener("click", async event => {
  if (!event.target.closest("[data-delete-selected-patients]")) return;
  if (!canUseFeature("delete_patient")) return;
  const ids = [...document.querySelectorAll(".patient-check:checked")].map(cb => cb.value);
  if (!ids.length) return;
  if (!await showConfirm(`سيتم حذف ${ids.length} ملفاً. تبقى العمليات والحجوزات محفوظة بدون رابط الملف. هل تريد المتابعة؟`)) return;
  const idSet = new Set(ids);
  const removed = (state.patients || []).filter(patient => idSet.has(patient.id));
  state.patients = (state.patients || []).filter(patient => !idSet.has(patient.id));
  state.entries = (state.entries || []).map(entry => idSet.has(entry.patientId) ? { ...entry, patientId: "" } : entry);
  state.bookings = (state.bookings || []).map(booking => idSet.has(booking.patientId) ? { ...booking, patientId: "" } : booking);
  if (idSet.has(selectedPatientId)) selectedPatientId = state.patients[0]?.id || "";
  logEdit("حذف ملفات مرضى بالجملة", `${removed.length} ملف: ${removed.slice(0, 6).map(patient => patient.name).join("، ")}${removed.length > 6 ? "…" : ""}`);
  saveState();
  render();
  showToast(`تم حذف ${ids.length} ملفاً`, "success");
});

function renderPatientFile() {
  if (!els.patientFile) return;
  let patient = getPatient(selectedPatientId);
  if (!patient) {
    patient = filteredPatients()[0] || null;
    selectedPatientId = patient?.id || "";
  }
  if (!patient) {
    els.patientFile.innerHTML = `<div class="empty-state">لا توجد ملفات مرضى أو زوار بعد.</div>`;
    return;
  }

  const operations = patientEntries(patient);
  const bookings = patientBookings(patient);
  const receipts = patientReceipts(patient);
  const totalPaid = operations.reduce((sum, entry) => sum + paidAmount(entry), 0);
  const lastActivity = patientLastActivity(patient);
  const canSeePhone = canUseFeature("see_mobile");
  const canEdit = canUseFeature("edit_patient_information");
  const canDelete = canUseFeature("delete_patient");
  const showSensitivePf = canViewSensitive();
  const operationRows = canUseFeature("patient_history") && operations.length
    ? operations.slice(0, 30).map(entry => {
      const net = netAmount(entry);
      const paid = paidAmount(entry);
      const due = Math.max(net - paid, 0);
      const staffNames = [getStaffMember(entry.doctorId)?.name, getStaffMember(entry.specialistId)?.name]
        .filter(Boolean).join(" / ") || "بدون تعيين";
      const receipt = receiptForEntry(entry.id);
      return `
      <tr class="op-summary-row" data-toggle-operation="${entry.id}">
        <td>${displayDate(entry.date)}</td>
        <td>${entry.visitNumber ? `#${entry.visitNumber}` : "—"}</td>
        <td>${serviceLabel(entry)} <span class="op-expand-caret">▾</span></td>
        <td><span class="status-pill ${statusClass(entry.status)}">${entryStatusLabel(entry.status)}</span></td>
        <td>${showSensitivePf ? money(paid) : "مخفي"}</td>
        <td>${showSensitivePf ? (due > 0.009 ? money(due) : "—") : "مخفي"}</td>
      </tr>
      <tr class="op-detail-row" data-operation-detail="${entry.id}" hidden>
        <td colspan="6">
          <div class="op-detail">
            <div class="op-detail-grid">
              <div><span>رقم العملية</span><strong>${entry.visitNumber ? `#${entry.visitNumber}` : "—"}</strong></div>
              <div><span>المنفّذ</span><strong>${staffNames}</strong></div>
              <div><span>الإجمالي</span><strong>${showSensitivePf ? money(net) : "مخفي"}</strong></div>
              <div><span>المدفوع</span><strong>${showSensitivePf ? money(paid) : "مخفي"}</strong></div>
              <div><span>المتبقي</span><strong>${showSensitivePf ? money(due) : "مخفي"}</strong></div>
              <div><span>طريقة الدفع</span><strong>${entryPaymentLabel(entry)}</strong></div>
            </div>
            <div class="op-detail-actions">
              ${showSensitivePf && due > 0.009 ? `<button class="primary-button" type="button" data-followup-entry="${entry.id}">تكملة الدفع (${money(due)})</button>` : (showSensitivePf ? `<span class="op-paid-full">مدفوعة بالكامل ✓</span>` : "")}
              ${receipt && canUseFeature("view_receipts") ? `<button class="text-button" type="button" data-open-receipt="${receipt.id}">عرض الإيصال</button>` : ""}
              ${showSensitivePf ? `<button class="text-button danger" type="button" data-delete-entry="${entry.id}">حذف العملية</button>` : ""}
            </div>
          </div>
        </td>
      </tr>`;
    }).join("")
    : `<tr><td colspan="6">${canUseFeature("patient_history") ? "لا توجد عمليات في هذا الملف." : "لا توجد صلاحية لعرض سجل العمليات."}</td></tr>`;
  const bookingRows = canUseFeature("patient_bookings") && bookings.length
    ? bookings.slice(0, 20).map(booking => `
      <tr>
        <td>${displayDate(booking.date)}</td>
        <td>${booking.time}</td>
        <td>${serviceLabel(booking)}</td>
        <td><span class="status-pill ${statusClass(booking.status)}">${bookingStatusLabel(booking.status)}</span></td>
      </tr>
    `).join("")
    : `<tr><td colspan="4">${canUseFeature("patient_bookings") ? "لا توجد حجوزات في هذا الملف." : "لا توجد صلاحية لعرض سجل الحجوزات."}</td></tr>`;
  const receiptRows = canUseFeature("view_receipts") && receipts.length
    ? receipts.map(receipt => `
      <div class="patient-receipt-row">
        <div>
          <strong>${receipt.invoiceNumber}</strong>
          <span>${displayDate(receipt.date)} | ${receiptStatusLabel(receipt.status)}</span>
        </div>
        <strong>${canViewSensitive() ? money(receipt.total) : `${receipt.itemCount} بنود`}</strong>
        <button class="text-button" type="button" data-open-receipt="${receipt.id}">فتح الإيصال</button>
      </div>
    `).join("")
    : `<div class="empty-state">${canUseFeature("view_receipts") ? "لا توجد إيصالات لهذا الملف." : "لا توجد صلاحية لعرض الإيصالات."}</div>`;

  const allergyAlert = hasAllergyKeywords(patient.notes)
    ? `<div class="allergy-alert" role="alert">
        <span class="allergy-alert-icon">⚠️</span>
        <div>
          <strong>تنبيه حساسية / سلامة المريض</strong>
          <p>${allergySnippet(patient.notes)}</p>
        </div>
      </div>`
    : "";

  els.patientFile.innerHTML = `
    <div class="patient-file-header">
      <div>
        <span class="pill">${profileTypeLabel(patient.profileType)}</span>
        <h2>${patient.name}</h2>
        <p>${canUseFeature("patient_number") ? `ملف #${patient.patientNumber}` : "رقم الملف مخفي"} | آخر نشاط ${displayDate(lastActivity) || "-"}</p>
        ${ratingStars(patient.id, patient.rating)}
      </div>
      <div class="form-actions">
        ${canView("entries") ? `<button class="primary-button" type="button" data-add-operation-patient="${patient.id}">＋ تسجيل عملية</button>` : ""}
        <button class="text-button patient-focus-back" type="button" data-patient-focus-list>رجوع للملفات</button>
        <button class="focus-icon-button" type="button" data-expand-view="patients" data-patient-focus="file" aria-label="تكبير ملف المريض" title="تكبير ملف المريض">
          <span aria-hidden="true">⛶</span>
        </button>
        ${canEdit ? `<button class="text-button" type="button" data-edit-patient="${patient.id}">تعديل</button>` : ""}
        ${canDelete ? `<button class="text-button danger" type="button" data-delete-patient="${patient.id}">حذف</button>` : ""}
      </div>
    </div>
    ${allergyAlert}
    <div class="patient-file-kpis">
      <div><span>العمليات</span><strong>${operations.length}</strong></div>
      <div><span>الحجوزات</span><strong>${bookings.length}</strong></div>
      <div><span>إجمالي المدفوع</span><strong>${canViewSensitive() ? money(totalPaid) : "مخفي"}</strong></div>
    </div>
    <div class="patient-demographics">
      <div><span>الهاتف</span><strong>${canSeePhone ? (patient.phone || "-") : "مخفي"}</strong></div>
      <div><span>البريد</span><strong>${patient.email || "-"}</strong></div>
      <div><span>الجنس</span><strong>${genderLabel(patient.gender)}</strong></div>
      <div><span>الجنسية</span><strong>${patient.nationality || "-"}</strong></div>
      <div><span>المدينة</span><strong>${patient.city || "-"}</strong></div>
      <div><span>الفئة</span><strong>${patient.category || "-"}</strong></div>
      <div><span>موافقة الرسائل</span><strong>${patient.marketingConsent ? "فعالة" : "غير متوفرة"}</strong></div>
    </div>
    ${patient.notes ? `<div class="patient-note"><strong>ملاحظات سريرية</strong><p style="white-space:pre-line">${patient.notes}</p></div>` : ""}
    <div class="patient-history-section">
      <h3>سجل العمليات</h3>
      <div class="table-wrap">
        <table>
          <thead><tr><th>التاريخ</th><th>رقم</th><th>الخدمة</th><th>الحالة</th><th>المدفوع</th><th>المتبقي</th></tr></thead>
          <tbody>${operationRows}</tbody>
        </table>
      </div>
    </div>
    <div class="patient-history-section">
      <h3>الإيصالات والفواتير</h3>
      <div class="patient-receipt-list">${receiptRows}</div>
    </div>
    <div class="patient-history-section">
      <h3>سجل الحجوزات</h3>
      <div class="table-wrap">
        <table>
          <thead><tr><th>التاريخ</th><th>الوقت</th><th>الخدمة</th><th>الحالة</th></tr></thead>
          <tbody>${bookingRows}</tbody>
        </table>
      </div>
    </div>
  `;
}

function renderPatients() {
  if (!canView("patients")) return;
  renderPatientDirectory();
  renderPatientFile();
}

function renderStaffList() {
  if (!state.staff.length) {
    els.staffList.innerHTML = `<div class="empty-state">أضف أعضاء الفريق ونسبهم لبدء حساب المستحقات.</div>`;
    return;
  }

  els.staffList.innerHTML = state.staff.map(member => {
    const memberRules = state.rules.filter(r => r.personId === member.id);
    const rateDisplay = member.model === "fixed"
      ? money(member.rate) + " ثابت"
      : member.rate + "%";
    const modelDisplay = ruleModelLabel(member.model || (member.role === "doctor" ? "pct_net" : "pct_gross"));
    return `
      <div class="staff-card">
        <div>
          <strong>${member.name}</strong>
          <div class="staff-meta">
            <span class="pill">${roleLabel(member.role)}</span>
            ${member.phone ? `<span class="pill">${member.phone}</span>` : ""}
            ${canViewSensitive() ? `<span class="pill sensitive-pill">${rateDisplay} · ${modelDisplay}</span>` : ""}
            ${canViewSensitive() && memberRules.length ? `<span class="pill">+${memberRules.length} قاعدة خاصة</span>` : ""}
          </div>
        </div>
        ${canViewSensitive() ? `<button class="icon-button danger" type="button" data-delete-staff="${member.id}">حذف</button>` : ""}
      </div>
    `;
  }).join("");
}

function serviceBrowseRows(category, query) {
  return (state.services || []).filter(service =>
    (!category || (service.category || "") === category)
    && matchesSmartQuery([service.name, service.category, service.active === false ? "متوقفة inactive" : "فعالة active"], query)
  );
}

function serviceBrowseTableHtml(services) {
  if (!services.length) return `<div class="empty-state">لا توجد خدمات مطابقة للفلتر.</div>`;
  const showSensitive = canViewSensitive();
  const rows = services.map(service => `
    <tr class="${showSensitive ? "report-edit-row" : ""}" ${showSensitive ? `data-edit-service="${service.id}" title="اضغط للتعديل"` : ""}>
      <td>${service.name}</td>
      <td>${service.category || "—"}</td>
      <td>${service.defaultPrice ? money(service.defaultPrice) : "بدون سعر ثابت"}</td>
      ${showSensitive ? `<td>${money(service.defaultCost)}</td>` : ""}
      <td><span class="pill">${service.active === false ? "متوقفة" : "فعالة"}</span></td>
      <td>${showSensitive ? `<button class="text-button danger" type="button" data-delete-service="${service.id}">حذف</button>` : ""}</td>
    </tr>`).join("");
  return `
    ${showSensitive ? `<p class="report-edit-hint">اضغط على أي خدمة لتعديل الاسم أو الفئة أو السعر أو التكلفة.</p>` : ""}
    <div class="table-wrap">
      <table class="practical-table">
        <thead><tr><th>الخدمة</th><th>الفئة</th><th>السعر</th>${showSensitive ? "<th>التكلفة</th>" : ""}<th>الحالة</th><th></th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

function serviceTreeHtml(services) {
  if (!services.length) return `<div class="empty-state">لا توجد خدمات مطابقة. أضف خدمة لتظهر في الشجرة.</div>`;
  const showSensitive = canViewSensitive();
  const byCat = new Map();
  services.forEach(svc => {
    const cat = svc.category || "بدون فئة";
    const sub = svc.subcategory || "";
    if (!byCat.has(cat)) byCat.set(cat, new Map());
    const subMap = byCat.get(cat);
    if (!subMap.has(sub)) subMap.set(sub, []);
    subMap.get(sub).push(svc);
  });
  const serviceRow = svc => showSensitive
    ? `<div class="tree-service"><button class="tree-service-main" type="button" data-edit-service="${svc.id}" title="اضغط للتعديل"><span class="tree-service-name">${svc.name}</span><span class="tree-service-price">${money(svc.defaultPrice)}${svc.active === false ? " · متوقفة" : ""}</span></button><button class="tree-service-del" type="button" data-delete-service="${svc.id}" title="حذف الخدمة" aria-label="حذف ${svc.name}">×</button></div>`
    : `<div class="tree-service readonly"><span class="tree-service-name">${svc.name}</span><span class="tree-service-price">${money(svc.defaultPrice)}</span></div>`;
  return [...byCat.entries()].map(([cat, subMap]) => {
    const total = [...subMap.values()].reduce((sum, arr) => sum + arr.length, 0);
    const noSub = subMap.get("") || [];
    const subs = [...subMap.entries()].filter(([sub]) => sub).sort((a, b) => a[0].localeCompare(b[0], "ar"));
    return `
      <details class="tree-cat" open>
        <summary><span class="tree-cat-name">${cat}</span><span class="tree-count">${total}</span></summary>
        ${noSub.length ? `<div class="tree-services">${noSub.map(serviceRow).join("")}</div>` : ""}
        ${subs.map(([sub, list]) => `
          <details class="tree-sub" open>
            <summary><span class="tree-sub-name">${sub}</span><span class="tree-count">${list.length}</span></summary>
            <div class="tree-services">${list.map(serviceRow).join("")}</div>
          </details>`).join("")}
      </details>`;
  }).join("");
}

function renderServiceBrowse() {
  if (els.serviceBrowseCategory) {
    const categories = serviceCategories();
    const current = els.serviceBrowseCategory.value;
    els.serviceBrowseCategory.innerHTML = `<option value="">كل الفئات</option>`
      + categories.map(category => `<option value="${category}">${category}</option>`).join("");
    els.serviceBrowseCategory.value = current;
  }
  const subDatalist = document.getElementById("service-subcategories");
  if (subDatalist) {
    const subs = [...new Set((state.services || []).map(svc => svc.subcategory).filter(Boolean))].sort((a, b) => a.localeCompare(b, "ar"));
    subDatalist.innerHTML = subs.map(sub => `<option value="${sub}"></option>`).join("");
  }
  if (els.serviceBrowse) {
    const category = els.serviceBrowseCategory?.value || "";
    const query = (els.serviceBrowseSearch?.value || "").trim().toLowerCase();
    const filtered = (state.services || []).filter(svc =>
      (!category || (svc.category || "") === category)
      && (!query || `${svc.name} ${svc.category || ""} ${svc.subcategory || ""}`.toLowerCase().includes(query))
    );
    els.serviceBrowse.innerHTML = serviceTreeHtml(filtered);
  }
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
          ${service.category ? `<span class="pill">${service.category}</span>` : ""}
          <span class="pill">السعر ${money(service.defaultPrice)}</span>
          ${canViewSensitive() ? `<span class="pill">التكلفة ${money(service.defaultCost)}</span>` : ""}
          <span class="pill">${service.active === false ? "متوقفة" : "فعالة"}</span>
        </div>
      </div>
      ${canViewSensitive() ? `<button class="icon-button danger" type="button" data-delete-service="${service.id}">حذف</button>` : ""}
    </div>
  `).join("");
}

function renderPackages() {
  const templates = state.packageTemplates || [];
  const packages = state.patientPackages || [];

  if (els.packageTemplateForm) {
    const serviceSelect = els.packageTemplateForm.querySelector("[name='serviceId']");
    if (serviceSelect) {
      const current = serviceSelect.value;
      serviceSelect.innerHTML = `<option value="">— بدون ربط —</option>`
        + (state.services || []).map(service => `<option value="${service.id}">${service.name}</option>`).join("");
      serviceSelect.value = current;
    }
  }

  if (els.packageTemplateList) {
    els.packageTemplateList.innerHTML = templates.length ? templates.map(template => {
      const service = (state.services || []).find(item => item.id === template.serviceId);
      return `
      <div class="staff-card">
        <div>
          <strong>${template.name}</strong>
          <div class="staff-meta">
            <span class="pill">${template.sessions} جلسة</span>
            ${canViewSensitive() ? `<span class="pill">${money(template.price)}</span>` : ""}
            ${service ? `<span class="pill">${service.name}</span>` : ""}
            ${template.validityDays ? `<span class="pill">صلاحية ${template.validityDays} يوم</span>` : ""}
            <span class="pill">${template.active === false ? "متوقفة" : "فعالة"}</span>
          </div>
        </div>
        ${canViewSensitive() ? `<button class="icon-button danger" type="button" data-delete-package-template="${template.id}">حذف</button>` : ""}
      </div>`;
    }).join("") : `<div class="empty-state">عرّف باقاتك (مثل 6 جلسات ليزر) لتبيعها للمرضى وتتابع جلساتهم.</div>`;
  }

  if (els.packageSellForm) {
    const patientSelect = els.packageSellForm.querySelector("[name='patientId']");
    const templateSelect = els.packageSellForm.querySelector("[name='templateId']");
    const staffSelect = els.packageSellForm.querySelector("[name='soldByStaffId']");
    if (patientSelect) patientSelect.innerHTML = `<option value="">اختر المريض</option>`
      + (state.patients || []).map(patient => `<option value="${patient.id}">${patient.name}</option>`).join("");
    if (templateSelect) templateSelect.innerHTML = `<option value="">اختر الباقة</option>`
      + templates.filter(template => template.active !== false)
        .map(template => `<option value="${template.id}" data-sessions="${template.sessions}" data-price="${template.price}">${template.name} — ${template.sessions} جلسة</option>`).join("");
    if (staffSelect) staffSelect.innerHTML = `<option value="">—</option>`
      + (state.staff || []).map(member => `<option value="${member.id}">${member.name}</option>`).join("");
  }

  if (els.operationPackageTemplate) {
    const current = els.operationPackageTemplate.value;
    els.operationPackageTemplate.innerHTML = `<option value="">اختر الباقة</option>`
      + templates.filter(template => template.active !== false)
        .map(template => `<option value="${template.id}" data-price="${template.price}">${template.name} — ${template.sessions} جلسة</option>`).join("");
    els.operationPackageTemplate.value = current;
  }

  if (els.packageList) {
    els.packageList.innerHTML = packages.length ? packages.slice().reverse().map(pkg => {
      const patient = patientById(pkg.patientId);
      const remaining = packageRemaining(pkg);
      const status = packageComputedStatus(pkg);
      const statusLabel = status === "completed" ? "مكتملة" : status === "expired" ? "منتهية" : "نشطة";
      const statusClass = status === "completed" ? "muted" : status === "expired" ? "warn" : "ok";
      const due = Math.max(0, (pkg.price || 0) - (pkg.paid || 0));
      return `
      <div class="staff-card">
        <div>
          <strong>${patient ? patient.name : "—"} · ${pkg.name}</strong>
          <div class="staff-meta">
            <span class="pill">${pkg.usedSessions}/${pkg.totalSessions} جلسة · المتبقي ${remaining}</span>
            <span class="pill pkg-${statusClass}">${statusLabel}</span>
            ${pkg.expiresAt ? `<span class="pill">تنتهي ${pkg.expiresAt}</span>` : ""}
            ${canViewSensitive() ? `<span class="pill">مدفوع ${money(pkg.paid)}${due ? ` · متبقٍ ${money(due)}` : ""}</span>` : ""}
          </div>
        </div>
        <div class="pkg-actions">
          ${remaining > 0 ? `<button class="text-button" type="button" data-package-use="${pkg.id}">تسجيل جلسة</button>` : ""}
          ${pkg.usedSessions > 0 ? `<button class="text-button" type="button" data-package-unuse="${pkg.id}" title="تراجع عن آخر جلسة">↺ تراجع</button>` : ""}
          ${canViewSensitive() ? `<button class="icon-button danger" type="button" data-delete-package="${pkg.id}">حذف</button>` : ""}
        </div>
      </div>`;
    }).join("") : `<div class="empty-state">لا توجد باقات مُباعة بعد. اختر مريضاً وباقة ثم اضغط «بيع الباقة».</div>`;
  }

  if (els.packageSessionForm) {
    const packageSelect = els.packageSessionForm.querySelector("[name='packageId']");
    const columnSelect = els.packageSessionForm.querySelector("[name='scheduleColumnId']");
    const dateInput = els.packageSessionForm.querySelector("[name='date']");
    if (dateInput && !dateInput.value) dateInput.value = new Date().toISOString().slice(0, 10);
    if (packageSelect) {
      const current = packageSelect.value;
      packageSelect.innerHTML = `<option value="">اختر الباقة</option>`
        + (state.patientPackages || [])
          .filter(pkg => packageComputedStatus(pkg) === "active")
          .map(pkg => {
            const patient = patientById(pkg.patientId);
            return `<option value="${pkg.id}">${patient ? patient.name : "—"} · ${pkg.name} (المتبقي ${packageRemaining(pkg)})</option>`;
          }).join("");
      packageSelect.value = current;
    }
    if (columnSelect) {
      const current = columnSelect.value;
      columnSelect.innerHTML = `<option value="">—</option>`
        + (state.scheduleColumns || []).map(column => `<option value="${column.id}">${column.label}</option>`).join("");
      columnSelect.value = current;
    }
  }

  if (els.packageSessionList) {
    const sessions = upcomingPackageSessions();
    els.packageSessionList.innerHTML = sessions.length ? sessions.map(booking => {
      const pkg = patientPackageById(booking.packageId);
      const patient = (pkg && patientById(pkg.patientId)) || patientById(booking.patientId);
      const remaining = pkg ? packageRemaining(pkg) : 0;
      return `
      <div class="staff-card">
        <div>
          <strong>${booking.date} · ${booking.time}</strong>
          <div class="staff-meta">
            <span class="pill">${patient ? patient.name : booking.patient}</span>
            ${pkg ? `<span class="pill">${pkg.name} · المتبقي ${remaining}</span>` : ""}
            ${booking.service ? `<span class="pill">${booking.service}</span>` : ""}
          </div>
        </div>
        <div class="pkg-actions">
          <button class="text-button" type="button" data-package-session-done="${booking.id}">تمت</button>
          <button class="icon-button danger" type="button" data-package-session-cancel="${booking.id}">إلغاء</button>
        </div>
      </div>`;
    }).join("") : `<div class="empty-state">لا توجد جلسات مجدولة. اختر باقة وحدد تاريخاً لجدولتها على التقويم.</div>`;
  }
}

const REFERRAL_LABELS = {
  instagram: "إنستغرام", facebook: "فيسبوك", tiktok: "تيك توك", google: "جوجل",
  friend: "صديق/توصية", walkin: "مرّ بالعيادة", doctor: "إحالة طبيب",
  returning: "مريض سابق", other: "أخرى"
};

function renderReferralSummary() {
  if (!els.referralSummary) return;
  const counts = {};
  (state.patients || []).forEach(patient => {
    if (patient.referralSource) counts[patient.referralSource] = (counts[patient.referralSource] || 0) + 1;
  });
  const ranked = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  els.referralSummary.innerHTML = ranked.length
    ? `<span class="referral-summary-title">مصادر الإحالة:</span> `
      + ranked.map(([key, value]) => `<span class="pill">${REFERRAL_LABELS[key] || key} · ${value}</span>`).join(" ")
    : "";
}

function outstandingByPatient() {
  const map = new Map();
  const bump = (patientId, name, field, amount) => {
    if (amount <= 0.009) return;
    const key = patientId || `name:${name}`;
    const row = map.get(key) || { patientId, name, operations: 0, packages: 0 };
    row[field] += amount;
    if (!row.name && name) row.name = name;
    map.set(key, row);
  };
  (state.entries || []).forEach(entry => {
    const due = netAmount(entry) - paidAmount(entry);
    const field = entry.packageId ? "packages" : "operations";
    bump(entry.patientId, entry.patient, field, due);
  });
  return [...map.values()]
    .map(row => ({ ...row, total: row.operations + row.packages }))
    .filter(row => row.total > 0.009)
    .sort((a, b) => b.total - a.total);
}

const AUDIT_RETENTION_DAYS = 60;   // keep well over the required one month
const AUDIT_MAX_ENTRIES = 8000;    // runaway guard, far above a normal month

function logEdit(action, detail, snapshot) {
  state.auditTrail = state.auditTrail || [];
  const account = currentAccount();
  const entry = {
    id: nextId("audit"),
    at: new Date().toISOString(),
    who: account?.name || account?.email || "—",
    role: account?.role || "",
    action,
    detail: detail || ""
  };
  // snapshot = { type, record } — lets a deleted record be restored later.
  if (snapshot && snapshot.type && snapshot.record) {
    entry.restore = { type: snapshot.type, record: JSON.parse(JSON.stringify(snapshot.record)), restored: false };
  }
  state.auditTrail.push(entry);
  // Time-based retention: never drop anything younger than the window (≥ 1 month).
  const cutoff = new Date(Date.now() - AUDIT_RETENTION_DAYS * 86400000).toISOString();
  state.auditTrail = state.auditTrail.filter(item => !item.at || item.at >= cutoff);
  if (state.auditTrail.length > AUDIT_MAX_ENTRIES) state.auditTrail = state.auditTrail.slice(-AUDIT_MAX_ENTRIES);
}

const AUDIT_RESTORE_TARGETS = {
  entry: { list: "entries", label: "عملية" },
  patient: { list: "patients", label: "ملف مريض" },
  patientPackage: { list: "patientPackages", label: "باقة" },
  service: { list: "services", label: "خدمة" },
  packageTemplate: { list: "packageTemplates", label: "قالب باقة" },
  staff: { list: "staff", label: "موظف" },
  supplier: { list: "suppliers", label: "مورد" },
  inventory: { list: "inventory", label: "صنف مخزون" },
  expense: { list: "expenses", label: "مصروف" },
  booking: { list: "bookings", label: "حجز" }
};

function restoreAuditEntry(auditId) {
  const item = (state.auditTrail || []).find(record => record.id === auditId);
  if (!item || !item.restore || item.restore.restored) return;
  const target = AUDIT_RESTORE_TARGETS[item.restore.type];
  if (!target) return;
  state[target.list] = state[target.list] || [];
  const record = item.restore.record;
  // Don't duplicate if a record with the same id already exists.
  if (!state[target.list].some(existing => existing.id === record.id)) {
    state[target.list].push(JSON.parse(JSON.stringify(record)));
  }
  item.restore.restored = true;
  logEdit("استرجاع محذوف", `${target.label}: ${item.detail || record.name || record.patient || ""}`);
  saveState();
  render();
}

let auditWhoFilter = "";
let auditActionFilter = "";

function renderAuditReport(items) {
  const trail = state.auditTrail || [];
  const whoOptions = [...new Set(trail.map(entry => entry.who).filter(Boolean))].sort((a, b) => a.localeCompare(b, "ar"));
  const actionOptions = [...new Set(trail.map(entry => entry.action).filter(Boolean))].sort((a, b) => a.localeCompare(b, "ar"));
  const opt = (value, selected) => `<option value="${value}"${value === selected ? " selected" : ""}>${value}</option>`;
  const filterBar = `
    <div class="audit-filter-bar">
      <label>المستخدم <select data-audit-who><option value="">كل المستخدمين</option>${whoOptions.map(value => opt(value, auditWhoFilter)).join("")}</select></label>
      <label>نوع الإجراء <select data-audit-action><option value="">كل الإجراءات</option>${actionOptions.map(value => opt(value, auditActionFilter)).join("")}</select></label>
      ${(auditWhoFilter || auditActionFilter) ? `<button type="button" class="ghost-chip" data-audit-clear>مسح الفلاتر ✕</button>` : ""}
      <span class="audit-filter-count">${items.length} سجل</span>
    </div>`;
  const body = items.length ? items.map(item => {
    const canRestore = item.restore && item.restore.record && !item.restore.restored;
    const restoreCell = canRestore
      ? `<button class="text-button" type="button" data-restore-audit="${item.id}">استرجاع</button>`
      : (item.restore && item.restore.restored ? `<span class="pill pkg-muted">تم الاسترجاع</span>` : "—");
    return `
    <tr>
      <td>${displayDate(String(item.at).slice(0, 10))} · ${displayClockMinute ? displayClockMinute(item.at) : ""}</td>
      <td>${item.who}${item.role ? ` <span class="audit-role">${roleLabel(item.role) || item.role}</span>` : ""}</td>
      <td>${item.action}</td>
      <td>${item.detail || "—"}</td>
      <td>${restoreCell}</td>
    </tr>`;
  }).join("") : `<tr><td colspan="5" class="report-empty">لا توجد تعديلات مطابقة للفلاتر.</td></tr>`;
  return `
    ${filterBar}
    <div class="table-wrap">
      <table class="practical-table">
        <thead><tr><th>التاريخ والوقت</th><th>المستخدم</th><th>الإجراء</th><th>التفاصيل</th><th></th></tr></thead>
        <tbody>${body}</tbody>
      </table>
    </div>`;
}

function renderDashboardZones() {
  const activePackages = (state.patientPackages || []).filter(pkg => packageComputedStatus(pkg) === "active");
  const remainingSessions = activePackages.reduce((sum, pkg) => sum + packageRemaining(pkg), 0);
  const kpiEl = document.querySelector('[data-dashboard-kpi="activePackages"]');
  if (kpiEl) kpiEl.textContent = activePackages.length;
  const kpiNote = document.querySelector('[data-dashboard-note="activePackages"]');
  if (kpiNote) kpiNote.textContent = `${remainingSessions} جلسة متبقية`;

  const outEl = document.querySelector("[data-dashboard-outstanding]");
  if (outEl) {
    const rows = outstandingByPatient().slice(0, 5);
    outEl.innerHTML = rows.length
      ? rows.map(row => `<div class="dash-row"><span>${row.name || "—"}</span><span class="dash-due">${canViewSensitive() ? money(row.total) : "—"}</span></div>`).join("")
      : `<div class="empty-state">لا مستحقات — كل الحسابات مسددة.</div>`;
  }

  const sesEl = document.querySelector("[data-dashboard-sessions]");
  if (sesEl) {
    const todayDate = state.settings.activeDate;
    const sessions = (state.bookings || [])
      .filter(booking => booking.packageId && booking.status === "scheduled" && booking.date === todayDate)
      .sort((a, b) => String(a.time).localeCompare(String(b.time)));
    sesEl.innerHTML = sessions.length
      ? sessions.slice(0, 6).map(booking => {
          const patient = patientById(booking.patientId);
          return `<div class="dash-row"><span>${patient ? patient.name : booking.patient} · ${booking.service}</span><span class="dash-time">${booking.time}</span></div>`;
        }).join("")
      : `<div class="empty-state">لا جلسات باقات مجدولة اليوم.</div>`;
  }
}

function renderCollections() {
  if (!els.collectionsBody) return;
  if (!canViewSensitive()) {
    els.collectionsBody.innerHTML = `<tr><td colspan="4">المبالغ المستحقة مخفية لهذا الحساب.</td></tr>`;
    if (els.collectionsTotal) els.collectionsTotal.textContent = "—";
    return;
  }
  const rows = outstandingByPatient();
  const total = rows.reduce((sum, row) => sum + row.total, 0);
  if (els.collectionsTotal) els.collectionsTotal.textContent = money(total);
  els.collectionsBody.innerHTML = rows.length ? rows.map(row => {
    const patient = row.patientId ? patientById(row.patientId) : null;
    return `
      <tr>
        <td>${patient ? patient.name : (row.name || "—")}</td>
        <td>${row.operations > 0.009 ? money(row.operations) : "—"}</td>
        <td>${row.packages > 0.009 ? money(row.packages) : "—"}</td>
        <td><strong>${money(row.total)}</strong></td>
      </tr>`;
  }).join("") : `<tr><td colspan="4">لا توجد مبالغ مستحقة — كل العمليات والباقات مدفوعة بالكامل. 🎉</td></tr>`;
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
    <div class="staff-card${rule.id === _editingRuleId ? " editing" : ""}">
      <div>
        <strong>${rule.name}</strong>
        <p>${ruleDescription(rule)}</p>
      </div>
      <div class="rule-card-actions">
        <button class="text-button" type="button" data-edit-rule="${rule.id}">تعديل</button>
        <button class="icon-button danger" type="button" data-delete-rule="${rule.id}">حذف</button>
      </div>
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
    const lastOrder = item.lastOrderedAt ? new Date(`${item.lastOrderedAt}T12:00:00`).toLocaleDateString("ar-JO-u-nu-latn") : "لا يوجد";
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
        <td>${new Date(`${order.date}T12:00:00`).toLocaleDateString("ar-JO-u-nu-latn")}</td>
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

function expenseGroupById(groupId) {
  return (state.expenseGroups || []).find(group => group.id === groupId);
}

function expenseSubgroupById(groupId, subgroupId) {
  return expenseGroupById(groupId)?.subgroups.find(subgroup => subgroup.id === subgroupId);
}

function expenseGroupName(expense) {
  return expenseGroupById(expense.groupId)?.name || expense.groupName || "غير مصنف";
}

function expenseSubgroupName(expense) {
  return expenseSubgroupById(expense.groupId, expense.subgroupId)?.name || expense.subgroupName || "غير مصنف";
}

function expenseFilterValues() {
  return els.expenseFilterForm
    ? Object.fromEntries(new FormData(els.expenseFilterForm).entries())
    : {};
}

function expensesForDateRange(from, to) {
  return (state.expenses || []).filter(expense => (
    (!from || expense.date >= from) && (!to || expense.date <= to)
  ));
}

function filteredExpenses() {
  const filters = expenseFilterValues();
  return expensesForDateRange(filters.dateFrom, filters.dateTo)
    .filter(expense => !filters.groupId || expense.groupId === filters.groupId)
    .filter(expense => !filters.subgroupId || expense.subgroupId === filters.subgroupId)
    .filter(expense => !filters.paymentMethod || expense.paymentMethod === filters.paymentMethod)
    .filter(expense => matchesSmartQuery([
      expenseGroupName(expense),
      expenseSubgroupName(expense),
      expense.vendor,
      expense.reference,
      expense.notes,
      expense.branch,
      paymentLabel(expense.paymentMethod),
      expense.date,
      expense.amount
    ], filters.query))
    .sort((a, b) => `${b.date} ${b.createdAt}`.localeCompare(`${a.date} ${a.createdAt}`));
}

function expenseTotal(expenses) {
  return expenses.reduce((sum, expense) => sum + numberValue(expense.amount), 0);
}

function activeDateExpenses() {
  return (state.expenses || []).filter(expense => expense.date === state.settings.activeDate);
}

function fillExpenseSubgroups(groupSelect, subgroupSelect, selected = "") {
  if (!groupSelect || !subgroupSelect) return;
  const group = expenseGroupById(groupSelect.value);
  const prefix = subgroupSelect === els.expenseFilterSubgroup
    ? `<option value="">كل الفئات</option>`
    : `<option value="">اختر الفئة</option>`;
  subgroupSelect.innerHTML = `${prefix}${(group?.subgroups || []).map(subgroup => (
    `<option value="${subgroup.id}">${subgroup.name}</option>`
  )).join("")}`;
  subgroupSelect.value = (group?.subgroups || []).some(subgroup => subgroup.id === selected) ? selected : "";
}

function renderExpenseSelects() {
  const groups = state.expenseGroups || [];
  const currentGroup = els.expenseGroup?.value || groups[0]?.id || "";
  const currentSubgroup = els.expenseSubgroup?.value || "";
  if (els.expenseGroup) {
    els.expenseGroup.innerHTML = groups.length
      ? groups.map(group => `<option value="${group.id}">${group.name}</option>`).join("")
      : `<option value="">أضف مجموعة أولاً</option>`;
    els.expenseGroup.value = groups.some(group => group.id === currentGroup) ? currentGroup : groups[0]?.id || "";
    fillExpenseSubgroups(els.expenseGroup, els.expenseSubgroup, currentSubgroup);
    if (els.expenseSubgroup && !els.expenseSubgroup.value) {
      els.expenseSubgroup.value = expenseGroupById(els.expenseGroup.value)?.subgroups[0]?.id || "";
    }
  }

  if (els.expenseFilterGroup) {
    const filterGroup = els.expenseFilterGroup.value;
    const filterSubgroup = els.expenseFilterSubgroup?.value || "";
    els.expenseFilterGroup.innerHTML = `<option value="">كل المجموعات</option>${groups.map(group => (
      `<option value="${group.id}">${group.name}</option>`
    )).join("")}`;
    els.expenseFilterGroup.value = groups.some(group => group.id === filterGroup) ? filterGroup : "";
    fillExpenseSubgroups(els.expenseFilterGroup, els.expenseFilterSubgroup, filterSubgroup);
  }
}

function renderExpenseCategoryList() {
  if (!els.expenseCategoryList) return;
  const groups = state.expenseGroups || [];
  els.expenseCategoryList.innerHTML = groups.length ? groups.map(group => `
    <div class="expense-category-row">
      <strong>${group.name}</strong>
      <div>
        ${group.subgroups.map(subgroup => `
          <span class="pill">
            ${subgroup.name}
            ${canUseFeature("manage_expense_categories") ? `<button class="pill-remove" type="button" data-delete-expense-subgroup="${subgroup.id}" data-expense-group-id="${group.id}" aria-label="حذف ${subgroup.name}">×</button>` : ""}
          </span>
        `).join("")}
      </div>
    </div>
  `).join("") : `<div class="empty-state">أضف أول مجموعة وفئة لبدء تسجيل المصروفات.</div>`;
}

function renderExpenseKpis() {
  const month = state.settings.activeDate.slice(0, 7);
  const monthExpenses = (state.expenses || []).filter(expense => expense.date.startsWith(month));
  const monthEntries = (state.entries || []).filter(entry => entry.date.startsWith(month));
  const byGroup = new Map();
  monthExpenses.forEach(expense => {
    const name = expenseGroupName(expense);
    byGroup.set(name, (byGroup.get(name) || 0) + numberValue(expense.amount));
  });
  const top = [...byGroup.entries()].sort((a, b) => b[1] - a[1])[0];
  const monthRevenue = monthEntries.reduce((sum, entry) => sum + paidAmount(entry), 0);
  const monthTotal = expenseTotal(monthExpenses);
  const values = {
    today: money(expenseTotal(activeDateExpenses())),
    month: money(monthTotal),
    top: top?.[0] || "-",
    net: money(monthRevenue - monthTotal)
  };
  Object.entries(values).forEach(([key, value]) => {
    const element = document.querySelector(`[data-expense-kpi="${key}"]`);
    if (element) element.textContent = value;
  });
  const monthNote = document.querySelector('[data-expense-note="month"]');
  const topNote = document.querySelector('[data-expense-note="top"]');
  if (monthNote) monthNote.textContent = `${monthExpenses.length} حركة`;
  if (topNote) topNote.textContent = top ? money(top[1]) : "لا توجد بيانات";
}

function renderExpenseVisuals(expenses = filteredExpenses()) {
  if (!els.expenseVisuals) return;
  const byGroup = new Map();
  const byPayment = new Map();
  expenses.forEach(expense => {
    const group = expenseGroupName(expense);
    byGroup.set(group, (byGroup.get(group) || 0) + numberValue(expense.amount));
    const payment = paymentLabel(expense.paymentMethod);
    byPayment.set(payment, (byPayment.get(payment) || 0) + numberValue(expense.amount));
  });
  const groups = [...byGroup.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  const payments = [...byPayment.entries()].sort((a, b) => b[1] - a[1]);
  const maximum = Math.max(...groups.map(([, value]) => value), 1);
  els.expenseVisuals.innerHTML = `
    <div class="expense-chart">
      <div class="mini-panel-header"><strong>التوزيع حسب المجموعة</strong><span>${money(expenseTotal(expenses))}</span></div>
      ${groups.length ? groups.map(([name, value]) => `
        <div class="expense-chart-row">
          <span>${name}</span>
          <div><i style="--expense-bar:${(value / maximum) * 100}%"></i></div>
          <strong>${money(value)}</strong>
        </div>
      `).join("") : `<div class="empty-state">لا توجد مصروفات ضمن الفلاتر الحالية.</div>`}
    </div>
    <div class="expense-payment-summary">
      <div class="mini-panel-header"><strong>طرق الدفع</strong><span>${expenses.length} حركة</span></div>
      ${payments.length ? payments.map(([name, value]) => `
        <div><span>${name}</span><strong>${money(value)}</strong></div>
      `).join("") : `<div class="empty-state">لا توجد بيانات دفع.</div>`}
    </div>
  `;
}

function renderExpenseTable() {
  if (!els.expenseTable) return;
  const expenses = filteredExpenses();
  const pageSize = numberValue(expenseFilterValues().pageSize) || 25;
  const pagination = paginateItems(expenses, expensePage, pageSize);
  expensePage = pagination.page;
  els.expenseTable.innerHTML = pagination.items.length ? pagination.items.map(expense => `
    <tr>
      <td>${displayDate(expense.date)}</td>
      <td>${expenseGroupName(expense)}</td>
      <td>${expenseSubgroupName(expense)}</td>
      <td>${expense.vendor || "-"}</td>
      <td>${paymentLabel(expense.paymentMethod)}</td>
      <td>${expense.reference || "-"}</td>
      <td><strong>${money(expense.amount)}</strong></td>
      <td>${expense.notes || "-"}${expense.recurring ? ` <span class="pill">متكرر</span>` : ""}</td>
      <td>
        <div class="row-actions">
          ${canUseFeature("edit_expense") ? `<button class="text-button" type="button" data-edit-expense="${expense.id}">تعديل</button>` : ""}
          ${canUseFeature("delete_expense") ? `<button class="icon-button danger" type="button" data-delete-expense="${expense.id}" aria-label="حذف المصروف">×</button>` : ""}
        </div>
      </td>
    </tr>
  `).join("") : `<tr><td colspan="9"><div class="empty-state">لا توجد مصروفات مطابقة.</div></td></tr>`;
  renderExpenseVisuals(expenses);
  renderPagination(els.expensePagination, pagination, "expenses");
}

function resetExpenseForm() {
  if (!els.expenseForm) return;
  els.expenseForm.reset();
  els.expenseForm.elements.expenseId.value = "";
  els.expenseForm.elements.date.value = state.settings.activeDate;
  renderExpenseSelects();
  if (els.expenseSubmit) els.expenseSubmit.textContent = "حفظ المصروف";
}

function fillExpenseForm(expenseId) {
  if (!els.expenseForm) return;
  const expense = (state.expenses || []).find(item => item.id === expenseId);
  if (!expense) return;
  els.expenseForm.elements.expenseId.value = expense.id;
  els.expenseForm.elements.groupId.value = expense.groupId;
  fillExpenseSubgroups(els.expenseGroup, els.expenseSubgroup, expense.subgroupId);
  els.expenseForm.elements.amount.value = expense.amount;
  els.expenseForm.elements.date.value = expense.date;
  els.expenseForm.elements.paymentMethod.value = expense.paymentMethod;
  els.expenseForm.elements.vendor.value = expense.vendor;
  els.expenseForm.elements.reference.value = expense.reference;
  els.expenseForm.elements.notes.value = expense.notes;
  els.expenseForm.elements.recurring.checked = expense.recurring;
  if (els.expenseSubmit) els.expenseSubmit.textContent = "تحديث المصروف";
  els.expenseForm.scrollIntoView({ behavior: "smooth", block: "center" });
}

function renderExpenses() {
  if (!els.expenseForm) return;
  renderExpenseSelects();
  renderExpenseCategoryList();
  renderExpenseKpis();
  renderExpenseTable();
  if (!els.expenseForm.elements.date.value) els.expenseForm.elements.date.value = state.settings.activeDate;
}

const IMPORT_SCHEMAS = {
  patients: {
    label: "المرضى والزوار",
    fields: [
      ["name", "الاسم الكامل", true],
      ["patientNumber", "رقم الملف", false],
      ["profileType", "نوع الملف", false],
      ["phone", "الهاتف", false],
      ["email", "البريد", false],
      ["gender", "الجنس", false],
      ["nationality", "الجنسية", false],
      ["city", "المدينة", false],
      ["category", "الفئة", false],
      ["notes", "ملاحظات", false],
      ["marketingConsent", "موافقة التسويق", false]
    ]
  },
  bookings: {
    label: "الحجوزات",
    fields: [
      ["patient", "المريض", true],
      ["date", "التاريخ", true],
      ["time", "الوقت", true],
      ["phone", "الهاتف", false],
      ["service", "الخدمة", false],
      ["doctor", "الطبيب", false],
      ["specialist", "الأخصائي", false],
      ["status", "الحالة", false],
      ["expectedAmount", "المبلغ المتوقع", false],
      ["notes", "ملاحظات", false]
    ]
  },
  operations: {
    label: "العمليات",
    fields: [
      ["patient", "المريض", true],
      ["phone", "الهاتف", false],
      ["date", "التاريخ", true],
      ["service", "الخدمة", true],
      ["amount", "المبلغ", false],
      ["quantity", "الكمية", false],
      ["discount", "الخصم", false],
      ["paymentMethod", "طريقة الدفع", false],
      ["doctor", "الطبيب", false],
      ["specialist", "الأخصائي", false],
      ["status", "الحالة", false],
      ["notes", "ملاحظات", false]
    ]
  },
  expenses: {
    label: "المصروفات",
    fields: [
      ["date", "التاريخ", true],
      ["amount", "المبلغ", true],
      ["group", "المجموعة", true],
      ["subgroup", "المجموعة الفرعية", false],
      ["paymentMethod", "طريقة الدفع", false],
      ["vendor", "المورد / المستفيد", false],
      ["reference", "المرجع", false],
      ["notes", "ملاحظات", false],
      ["branch", "الفرع", false]
    ]
  }
};

const IMPORT_ALIASES = {
  name: ["name", "full name", "patient name", "اسم", "الاسم", "اسم المريض"],
  patientNumber: ["patient number", "patient no", "file number", "id", "رقم الملف", "رقم المريض"],
  profileType: ["profile type", "type", "نوع الملف", "النوع"],
  phone: ["phone", "mobile", "mobile no", "tel", "هاتف", "الهاتف", "موبايل"],
  email: ["email", "e-mail", "البريد", "البريد الالكتروني"],
  gender: ["gender", "sex", "الجنس"],
  nationality: ["nationality", "الجنسية"],
  city: ["city", "المدينة"],
  category: ["category", "patient category", "الفئة", "التصنيف"],
  notes: ["notes", "note", "remarks", "ملاحظات", "ملاحظة"],
  marketingConsent: ["marketing consent", "consent", "موافقة التسويق"],
  patient: ["patient", "patient name", "customer", "name", "المريض", "اسم المريض", "الاسم"],
  date: ["date", "booking date", "operation date", "expense date", "التاريخ", "تاريخ"],
  time: ["time", "booking time", "الوقت", "وقت"],
  service: ["service", "procedure", "treatment", "الخدمة", "العملية", "العلاج"],
  doctor: ["doctor", "physician", "الطبيب", "دكتور"],
  specialist: ["specialist", "assistant", "staff", "therapist", "الاخصائي", "الأخصائي", "الموظف"],
  status: ["status", "الحالة"],
  expectedAmount: ["expected amount", "amount", "price", "المبلغ المتوقع", "المبلغ", "السعر"],
  amount: ["amount", "total", "price", "value", "المبلغ", "القيمة", "الاجمالي", "الإجمالي"],
  quantity: ["quantity", "qty", "count", "الكمية", "العدد"],
  discount: ["discount", "الخصم"],
  paymentMethod: ["payment method", "payment", "طريقة الدفع", "الدفع"],
  group: ["group", "expense group", "category", "المجموعة", "مجموعة المصروفات"],
  subgroup: ["subgroup", "sub group", "subcategory", "الفئة الفرعية", "المجموعة الفرعية"],
  vendor: ["vendor", "supplier", "payee", "المورد", "المستفيد"],
  reference: ["reference", "receipt", "receipt number", "invoice", "المرجع", "رقم الايصال", "رقم الإيصال"],
  branch: ["branch", "الفرع"]
};

function normalizeImportHeader(value) {
  return normalizeSearchText(value).replace(/[_-]+/g, " ");
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  const source = String(text || "").replace(/^\uFEFF/, "");
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (quoted) {
      if (character === '"' && source[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
    } else if (character === '"') {
      quoted = true;
    } else if (character === ",") {
      row.push(field.trim());
      field = "";
    } else if (character === "\n") {
      row.push(field.trim());
      if (row.some(value => value !== "")) rows.push(row);
      row = [];
      field = "";
    } else if (character !== "\r") {
      field += character;
    }
  }
  row.push(field.trim());
  if (row.some(value => value !== "")) rows.push(row);
  return rows;
}

async function parseImportFile(file) {
  const text = await file.text();
  if (file.name.toLocaleLowerCase().endsWith(".json") || file.type.includes("json")) {
    const parsed = JSON.parse(text);
    const candidate = Array.isArray(parsed)
      ? parsed
      : Object.values(parsed || {}).find(value => Array.isArray(value));
    if (!Array.isArray(candidate) || !candidate.length) throw new Error("empty_import");
    const headers = uniqueValues(candidate.flatMap(record => Object.keys(record || {})));
    return {
      headers,
      rawRows: candidate.map(record => Object.fromEntries(headers.map(header => [header, record?.[header] ?? ""])))
    };
  }
  // Clinica & many EHRs "export to Excel" as an HTML <table> with a .xls name.
  // Parse it natively — the browser reads the Arabic in correct (logical) order.
  if (/<table[\s>]/i.test(text)) {
    const doc = new DOMParser().parseFromString(text, "text/html");
    const table = [...doc.querySelectorAll("table")].sort((a, b) => b.rows.length - a.rows.length)[0];
    if (!table || table.rows.length < 2) throw new Error("empty_import");
    const grid = [...table.rows].map(tr => [...tr.cells].map(td => td.textContent.replace(/\s+/g, " ").trim()));
    const htmlHeaders = grid[0].map((header, index) => header || `column_${index + 1}`);
    return {
      headers: htmlHeaders,
      rawRows: grid.slice(1).map(values => Object.fromEntries(htmlHeaders.map((header, index) => [header, values[index] ?? ""])))
    };
  }
  const rows = parseCsv(text);
  if (rows.length < 2) throw new Error("empty_import");
  const headers = rows[0].map((header, index) => header || `column_${index + 1}`);
  return {
    headers,
    rawRows: rows.slice(1).map(values => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])))
  };
}

function autoImportMapping(headers, entity) {
  const mapping = {};
  IMPORT_SCHEMAS[entity].fields.forEach(([field]) => {
    const aliases = (IMPORT_ALIASES[field] || [field]).map(normalizeImportHeader);
    const exact = headers.find(header => aliases.includes(normalizeImportHeader(header)));
    const partial = headers.find(header => aliases.some(alias => (
      normalizeImportHeader(header).includes(alias) || alias.includes(normalizeImportHeader(header))
    )));
    mapping[field] = exact || partial || "";
  });
  return mapping;
}

function normalizeImportedDate(value) {
  const text = String(value || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}

function normalizeImportedPayment(value) {
  const key = normalizeImportHeader(value);
  if (["card", "visa", "فيزا", "بطاقه", "بطاقة"].includes(key)) return "card";
  if (["transfer", "bank", "تحويل", "حواله", "حوالة"].includes(key)) return "transfer";
  return "cash";
}

function importedNumber(value) {
  return numberValue(String(value || "").replace(/[^\d.-]/g, ""));
}

function mappedImportRecord(rawRow) {
  return Object.fromEntries(Object.entries(importSession.mapping).map(([field, header]) => (
    [field, header ? rawRow[header] ?? "" : ""]
  )));
}

function importDuplicateKey(entity, record) {
  if (entity === "patients") return normalizeSearchText(`${record.patientNumber || ""}|${record.name}|${record.phone || ""}`);
  if (entity === "bookings") return normalizeSearchText(`${record.patient}|${record.date}|${record.time}|${record.service || ""}`);
  if (entity === "operations") return normalizeSearchText(`${record.patient}|${record.date}|${record.service}|${record.amount || ""}`);
  return normalizeSearchText(`${record.date}|${record.amount}|${record.group}|${record.subgroup || ""}|${record.reference || ""}`);
}

function importRecordExists(entity, record) {
  const key = importDuplicateKey(entity, record);
  const collections = {
    patients: (state.patients || []).map(patient => ({
      patientNumber: patient.patientNumber,
      name: patient.name,
      phone: patient.phone
    })),
    bookings: state.bookings || [],
    operations: (state.entries || []).map(entry => ({ ...entry, service: serviceLabel(entry) })),
    expenses: (state.expenses || []).map(expense => ({
      ...expense,
      group: expenseGroupName(expense),
      subgroup: expenseSubgroupName(expense)
    }))
  };
  return collections[entity].some(item => importDuplicateKey(entity, item) === key);
}

function validateImportRecord(entity, source) {
  const record = { ...source };
  const errors = [];
  if (record.date !== undefined) record.date = normalizeImportedDate(record.date);
  if (record.amount !== undefined) record.amount = importedNumber(record.amount);
  if (record.expectedAmount !== undefined) record.expectedAmount = importedNumber(record.expectedAmount);
  if (record.quantity !== undefined) record.quantity = Math.max(importedNumber(record.quantity) || 1, 1);
  if (record.discount !== undefined) record.discount = Math.max(importedNumber(record.discount), 0);
  if (record.paymentMethod !== undefined) record.paymentMethod = normalizeImportedPayment(record.paymentMethod);
  if (record.marketingConsent !== undefined) {
    record.marketingConsent = ["true", "yes", "1", "نعم", "موافق"].includes(normalizeImportHeader(record.marketingConsent));
  }
  IMPORT_SCHEMAS[entity].fields.filter(([, , required]) => required).forEach(([field, label]) => {
    if (record[field] === "" || record[field] === null || record[field] === undefined) errors.push(`${label} مطلوب`);
  });
  if ("date" in record && !record.date) errors.push("صيغة التاريخ غير صحيحة");
  if ("amount" in record && record.amount <= 0) errors.push("المبلغ يجب أن يكون أكبر من صفر");
  if (record.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(record.email)) errors.push("البريد غير صحيح");
  return { record, errors };
}

function buildImportRows() {
  if (!importSession) return [];
  const seen = new Set();
  return importSession.rawRows.map((rawRow, index) => {
    const validated = validateImportRecord(importSession.entity, mappedImportRecord(rawRow));
    const key = importDuplicateKey(importSession.entity, validated.record);
    const duplicate = Boolean(key && (seen.has(key) || importRecordExists(importSession.entity, validated.record)));
    if (key) seen.add(key);
    return { index: index + 1, ...validated, duplicate };
  });
}

function renderImportMapping() {
  if (!els.importMapping || !importSession) return;
  const schema = IMPORT_SCHEMAS[importSession.entity];
  els.importMapping.innerHTML = `
    <div class="mini-panel-header"><strong>مطابقة أعمدة ${schema.label}</strong><span>راجع الحقول المطلوبة قبل الاعتماد</span></div>
    <div class="import-mapping-grid">
      ${schema.fields.map(([field, label, required]) => `
        <label>
          ${label}${required ? " *" : ""}
          <select data-import-field="${field}">
            <option value="">تجاهل / غير موجود</option>
            ${importSession.headers.map(header => `<option value="${header}" ${importSession.mapping[field] === header ? "selected" : ""}>${header}</option>`).join("")}
          </select>
        </label>
      `).join("")}
    </div>
  `;
}

function renderImportPreview() {
  if (!importSession || !els.importPreviewHead || !els.importPreviewBody) return;
  const rows = buildImportRows();
  importSession.rows = rows;
  const schema = IMPORT_SCHEMAS[importSession.entity];
  const valid = rows.filter(row => !row.errors.length && !row.duplicate);
  const invalid = rows.filter(row => row.errors.length);
  const duplicates = rows.filter(row => row.duplicate);
  if (els.importSummary) {
    els.importSummary.innerHTML = `
      <div><strong>${rows.length}</strong><span>إجمالي الصفوف</span></div>
      <div class="good"><strong>${valid.length}</strong><span>جاهزة للاستيراد</span></div>
      <div class="warn"><strong>${duplicates.length}</strong><span>مكررة وستتخطى</span></div>
      <div class="bad"><strong>${invalid.length}</strong><span>تحتاج تصحيح</span></div>
    `;
  }
  const previewFields = schema.fields.slice(0, 6);
  els.importPreviewHead.innerHTML = `<tr><th>#</th>${previewFields.map(([, label]) => `<th>${label}</th>`).join("")}<th>النتيجة</th></tr>`;
  els.importPreviewBody.innerHTML = rows.slice(0, 100).map(row => `
    <tr class="${row.errors.length ? "invalid" : row.duplicate ? "duplicate" : ""}">
      <td>${row.index}</td>
      ${previewFields.map(([field]) => `<td>${row.record[field] || "-"}</td>`).join("")}
      <td class="${row.errors.length ? "import-cell-error" : ""}">
        ${row.errors.length ? row.errors.join("، ") : row.duplicate ? "سجل مكرر" : "جاهز"}
      </td>
    </tr>
  `).join("");
  if (els.commitImport) {
    els.commitImport.disabled = !valid.length || !canUseFeature("import_data");
    els.commitImport.textContent = `اعتماد ${valid.length} سجل صالح`;
  }
}

function renderImportWorkspace() {
  if (!els.importWorkspace) return;
  els.importWorkspace.hidden = !importSession;
  if (!importSession) return;
  renderImportMapping();
  renderImportPreview();
}

function resetImportWorkspace() {
  importSession = null;
  els.importSourceForm?.reset();
  if (els.importWorkspace) els.importWorkspace.hidden = true;
  if (els.importMapping) els.importMapping.innerHTML = "";
  if (els.importPreviewHead) els.importPreviewHead.innerHTML = "";
  if (els.importPreviewBody) els.importPreviewBody.innerHTML = "";
}

// Token-based name similarity (0–1): handles extra/missing words, spacing, and
// minor spelling differences after normalization. (Cross-script Latin↔Arabic is
// out of scope — those score low and stay unmatched for manual review.)
function nameSimilarity(a, b) {
  const na = normalizeSearchText(a), nb = normalizeSearchText(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  const ca = na.replace(/ /g, ""), cb = nb.replace(/ /g, "");
  if (ca === cb) return 0.95;                          // عبدالله ↔ عبد الله
  if (ca.includes(cb) || cb.includes(ca)) return 0.8;  // one name within the other, ignoring spaces
  const sa = new Set(na.split(" ").filter(Boolean));
  const sb = new Set(nb.split(" ").filter(Boolean));
  const inter = [...sa].filter(token => sb.has(token)).length;
  const union = new Set([...sa, ...sb]).size;
  const jaccard = union ? inter / union : 0;
  const sub = (na.includes(nb) || nb.includes(na)) ? 0.35 : 0;
  return Math.min(1, jaccard + sub);
}

let _importFuzzyMatches = [];
let _importCreatedStaff = [];
function importedStaffId(name, role) {
  if (!name || !String(name).trim()) return "";
  const key = normalizeSearchText(name);
  const candidates = (state.staff || []).filter(member => member.role === role);
  const exact = candidates.find(member => normalizeSearchText(member.name) === key);
  if (exact) return exact.id;
  // Fuzzy fallback: pick the closest existing staff above a confidence threshold,
  // and record it so the import summary can flag near-matches for review.
  let best = null, bestScore = 0;
  candidates.forEach(member => {
    const score = nameSimilarity(name, member.name);
    if (score > bestScore) { bestScore = score; best = member; }
  });
  if (best && bestScore >= 0.6) {
    _importFuzzyMatches.push({ imported: String(name).trim(), matched: best.name, role, score: Math.round(bestScore * 100) });
    return best.id;
  }
  // No match — auto-create the staff member so the imported operations stay linked
  // to them (role/commission can be set later). Same idea as auto-created services.
  const member = normalizeStaffMember({ id: nextId("staff"), name: String(name).trim(), role });
  state.staff.push(member);
  _importCreatedStaff = _importCreatedStaff || [];
  _importCreatedStaff.push({ name: member.name, role });
  return member.id;
}

function ensureImportedService(name, amount = 0) {
  const serviceName = String(name || "خدمة مستوردة").trim();
  const existing = state.services.find(service => normalizeSearchText(service.name) === normalizeSearchText(serviceName));
  if (existing) return existing;
  const service = normalizeService({
    id: nextId("service"),
    name: serviceName,
    defaultPrice: amount,
    defaultCost: 0,
    active: true
  });
  state.services.push(service);
  return service;
}

function ensureImportedExpenseCategory(groupName, subgroupName) {
  const normalizedGroup = normalizeSearchText(groupName || "مصروفات مستوردة");
  let group = (state.expenseGroups || []).find(item => normalizeSearchText(item.name) === normalizedGroup);
  if (!group) {
    group = normalizeExpenseGroup({ id: nextId("expense-group"), name: groupName || "مصروفات مستوردة", subgroups: [] });
    state.expenseGroups.push(group);
  }
  const normalizedSubgroup = normalizeSearchText(subgroupName || "عام");
  let subgroup = group.subgroups.find(item => normalizeSearchText(item.name) === normalizedSubgroup);
  if (!subgroup) {
    subgroup = { id: nextId("expense-subgroup"), name: subgroupName || "عام" };
    group.subgroups.push(subgroup);
  }
  return { group, subgroup };
}

function commitImportRecords() {
  if (!importSession || !canUseFeature("import_data")) return;
  _importFuzzyMatches = [];
  _importCreatedStaff = [];
  const rows = buildImportRows();
  const validRows = rows.filter(row => !row.errors.length && !row.duplicate);
  // Track every record this import creates so the whole batch can be undone later.
  const created = { entries: [], bookings: [], patients: [], expenses: [] };
  const existingPatientIds = new Set((state.patients || []).map(patient => patient.id));
  const trackPatient = patient => {
    if (patient && !existingPatientIds.has(patient.id)) { existingPatientIds.add(patient.id); created.patients.push(patient.id); }
  };
  validRows.forEach(({ record }) => {
    if (importSession.entity === "patients") {
      const patientId = nextId("patient");
      // Only honour an imported file number when it's actually numeric; otherwise
      // continue the clinic's own sequence so files stay numbered (not named).
      const importedNo = String(record.patientNumber || "").trim();
      state.patients.push(normalizePatient({
        id: patientId,
        patientNumber: /^\d+$/.test(importedNo) ? importedNo : nextPatientNumber(),
        profileType: record.profileType || "patient",
        name: String(record.name).trim(),
        phone: String(record.phone || "").trim(),
        email: String(record.email || "").trim(),
        gender: record.gender,
        nationality: record.nationality,
        city: record.city,
        category: record.category,
        notes: record.notes,
        marketingConsent: record.marketingConsent,
        createdAt: today
      }));
      created.patients.push(patientId);
    } else if (importSession.entity === "bookings") {
      const patient = ensurePatientFile(String(record.patient).trim(), String(record.phone || "").trim());
      trackPatient(patient);
      const service = ensureImportedService(record.service, record.expectedAmount);
      const bookingId = nextId("booking");
      state.bookings.push(normalizeBooking({
        id: bookingId,
        patientId: patient.id,
        patient: patient.name,
        phone: record.phone,
        date: record.date,
        time: record.time,
        serviceId: service.id,
        service: service.name,
        doctorId: importedStaffId(record.doctor, "doctor"),
        specialistId: importedStaffId(record.specialist, "specialist"),
        status: record.status || "scheduled",
        expectedAmount: record.expectedAmount,
        notes: record.notes
      }, state.services));
      created.bookings.push(bookingId);
    } else if (importSession.entity === "operations") {
      const patient = ensurePatientFile(String(record.patient).trim(), String(record.phone || "").trim());
      trackPatient(patient);
      const service = ensureImportedService(record.service, record.amount);
      const entryId = nextId("entry");
      state.entries.push(normalizeEntry({
        id: entryId,
        visitId: nextId("visit"),
        patientId: patient.id,
        patient: patient.name,
        date: record.date,
        serviceId: service.id,
        service: service.name,
        doctorId: importedStaffId(record.doctor, "doctor"),
        specialistId: importedStaffId(record.specialist, "specialist"),
        quantity: record.quantity,
        amount: record.amount,
        unitPrice: record.quantity ? record.amount / record.quantity : record.amount,
        discount: record.discount,
        paymentMethod: record.paymentMethod,
        status: record.status || "completed",
        notes: record.notes
      }, state.services));
      created.entries.push(entryId);
    } else {
      const category = ensureImportedExpenseCategory(record.group, record.subgroup);
      const expenseId = nextId("expense");
      state.expenses.push(normalizeExpense({
        id: expenseId,
        groupId: category.group.id,
        subgroupId: category.subgroup.id,
        amount: record.amount,
        date: record.date,
        paymentMethod: record.paymentMethod,
        vendor: record.vendor,
        reference: record.reference,
        notes: record.notes,
        branch: record.branch || state.settings.branch
      }));
      created.expenses.push(expenseId);
    }
  });
  state.importHistory = state.importHistory || [];
  state.importHistory.unshift(normalizeImportHistory({
    id: nextId("import"),
    fileName: importSession.fileName,
    sourceSystem: importSession.sourceSystem,
    entity: importSession.entity,
    total: rows.length,
    imported: validRows.length,
    duplicates: rows.filter(row => row.duplicate).length,
    invalid: rows.filter(row => row.errors.length).length,
    createdAt: new Date().toISOString(),
    entryIds: created.entries,
    bookingIds: created.bookings,
    patientIds: created.patients,
    expenseIds: created.expenses
  }));
  saveState();
  resetImportWorkspace();
  render();
  // Surface near-matches so the owner can verify them — never silently guess on
  // payroll-affecting links.
  if (_importCreatedStaff.length) {
    logEdit("إضافة موظفين بالاستيراد", `${_importCreatedStaff.length} موظف: ${_importCreatedStaff.map(member => member.name).slice(0, 8).join("، ")}`);
  }
  if (_importFuzzyMatches.length) {
    logEdit("مطابقة تقريبية بالاستيراد", `${_importFuzzyMatches.length} اسم: ${_importFuzzyMatches.slice(0, 6).map(match => `${match.imported}→${match.matched} (${match.score}%)`).join("، ")}`);
    showToast(`تم ربط ${_importFuzzyMatches.length} اسماً بأقرب موظف (مطابقة تقريبية) — راجِعها`, "warn");
    const lines = _importFuzzyMatches.map(match => `• «${match.imported}» ← ${roleLabel(match.role)} ${match.matched} (${match.score}%)`).join("\n");
    alert(`أسماء طُوبقت تقريبياً بأقرب موظف — تحقّق منها (مسجّلة في سجل التعديلات):\n\n${lines}`);
  } else {
    showToast(`تم الاستيراد بنجاح ✓${_importCreatedStaff.length ? ` — أُضيف ${_importCreatedStaff.length} موظف جديد` : ""}`, "success");
  }
}

function renderImportHistory() {
  if (!els.importHistory) return;
  const history = state.importHistory || [];
  els.importHistory.innerHTML = history.length ? history.map(record => `
    <div class="staff-card">
      <div>
        <strong>${IMPORT_SCHEMAS[record.entity]?.label || record.entity} | ${record.fileName}</strong>
        <p>${record.sourceSystem || "نظام سابق غير محدد"} | ${new Date(record.createdAt).toLocaleString(currentLanguage() === "en" ? "en-US" : "ar-JO-u-nu-latn")}</p>
      </div>
      <div class="row-actions">
        <span class="status-pill good">${record.imported} مستورد</span>
        ${record.duplicates ? `<span class="status-pill warn">${record.duplicates} مكرر</span>` : ""}
        ${record.invalid ? `<span class="status-pill bad">${record.invalid} خطأ</span>` : ""}
        ${canUseFeature("import_data") ? `<button class="text-button danger" type="button" data-delete-import="${record.id}" title="حذف هذا الاستيراد وكل ما أنشأه">حذف الاستيراد</button>` : ""}
      </div>
    </div>
  `).join("") : `<div class="empty-state">لم تنفذ أي عملية استيراد بعد.</div>`;
}

// Undo an entire import: remove exactly the records it created (and any patients
// it created that have no other activity), then drop the history entry.
async function deleteImportBatch(importId) {
  if (!canUseFeature("import_data")) return;
  const record = (state.importHistory || []).find(item => item.id === importId);
  if (!record) return;
  const entrySet = new Set(record.entryIds || []);
  const bookingSet = new Set(record.bookingIds || []);
  const expenseSet = new Set(record.expenseIds || []);
  const patientSet = new Set(record.patientIds || []);
  const total = entrySet.size + bookingSet.size + expenseSet.size + patientSet.size;
  const label = IMPORT_SCHEMAS[record.entity]?.label || record.entity;
  if (!await showConfirm(`سيتم حذف ${total} سجلاً أُنشئ من هذا الاستيراد (${label} · ${record.fileName}).\nلا يمكن التراجع. هل تريد المتابعة؟`)) return;
  state.entries = (state.entries || []).filter(item => !entrySet.has(item.id));
  state.bookings = (state.bookings || []).filter(item => !bookingSet.has(item.id));
  state.expenses = (state.expenses || []).filter(item => !expenseSet.has(item.id));
  if (patientSet.size) {
    const stillUsed = new Set();
    (state.entries || []).forEach(entry => entry.patientId && stillUsed.add(entry.patientId));
    (state.bookings || []).forEach(booking => booking.patientId && stillUsed.add(booking.patientId));
    state.patients = (state.patients || []).filter(patient => !(patientSet.has(patient.id) && !stillUsed.has(patient.id)));
  }
  state.importHistory = (state.importHistory || []).filter(item => item.id !== importId);
  logEdit("حذف استيراد", `${label} · ${record.fileName} · ${total} سجل`);
  saveState();
  render();
  showToast(`تم حذف الاستيراد وما أنشأه (${total} سجل)`, "success");
}
document.addEventListener("click", event => {
  const btn = event.target.closest("[data-delete-import]");
  if (btn) deleteImportBatch(btn.dataset.deleteImport);
});

function renderBookingCalendar() {
  const isEnglish = currentLanguage() === "en";
  const activeDate = state.settings.activeDate || today;
  const monthDate = dateFromInput(activeDate);
  if (els.bookingDateInput && els.bookingDateInput.value !== activeDate) els.bookingDateInput.value = activeDate;
  const calendarBookings = filterBookingsForAccount(state.bookings || []);
  const bookingsByDate = groupedBookingsByDate(calendarBookings);
  const monthPrefix = activeDate.slice(0, 7);
  const monthBookings = calendarBookings.filter(booking => booking.date?.startsWith(monthPrefix));
  const selectedBookings = bookingsByDate[activeDate] || [];
  const expected = monthBookings
    .filter(booking => !["cancelled", "no_show"].includes(booking.status))
    .reduce((sum, booking) => sum + numberValue(booking.expectedAmount), 0);
  const weekdays = isEnglish
    ? ["Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"]
    : ["السبت", "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"];
  const dayTitle = new Intl.DateTimeFormat(isEnglish ? "en-US" : "ar-JO-u-nu-latn", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(monthDate);

  if (els.bookingCalendarTitle) {
    els.bookingCalendarTitle.textContent = dayTitle;
  }

  if (els.bookingCalendarSummary) {
    els.bookingCalendarSummary.textContent = isEnglish
      ? `${selectedBookings.length} bookings on ${displayDate(activeDate)}. ${monthBookings.length} bookings this month${canViewSensitive() ? `, expected ${money(expected)}` : ""}.`
      : `${selectedBookings.length} حجز في هذا اليوم · ${monthBookings.length} حجز هذا الشهر${canViewSensitive() ? `، المتوقع ${money(expected)}` : ""}.`;
  }

  if (els.bookingCalendarWeekdays) els.bookingCalendarWeekdays.innerHTML = weekdays.map(day => `<span>${day}</span>`).join("");

  if (els.bookingCalendar) els.bookingCalendar.innerHTML = calendarDaysForMonth(activeDate).map(day => {
    const isAllowed = calendarDateAllowed(currentAccount(), day.date);
    const dayBookings = (bookingsByDate[day.date] || [])
      .slice()
      .sort((a, b) => a.time.localeCompare(b.time));
    const visibleBookings = dayBookings.slice(0, 3);
    const moreCount = dayBookings.length - visibleBookings.length;
    const isSelected = day.date === activeDate;
    const isToday = day.date === today;
    const dayClasses = [
      "calendar-day",
      day.inMonth ? "" : "outside-month",
      isSelected ? "selected" : "",
      isToday ? "today" : "",
      !isAllowed ? "restricted" : "",
      dayBookings.length ? "has-bookings" : ""
    ].filter(Boolean).join(" ");
    const chips = visibleBookings.map(booking => `
      <span class="calendar-booking-chip ${booking.status}">
        <b>${booking.time}</b>
        <span>${booking.patient}</span>
      </span>
    `).join("");
    const more = moreCount > 0
      ? `<span class="calendar-more">${isEnglish ? `+${moreCount} more` : `+${moreCount} المزيد`}</span>`
      : "";

    return `
      <button class="${dayClasses}" type="button" data-calendar-date="${day.date}" aria-label="${displayDate(day.date)}" ${isAllowed ? "" : "disabled"}>
        <span class="calendar-day-head">
          <strong>${day.dayNumber}</strong>
          ${dayBookings.length ? `<small>${dayBookings.length}</small>` : ""}
        </span>
        <span class="calendar-day-bookings">
          ${isAllowed ? (chips || `<span class="calendar-empty">${isEnglish ? "Available" : "متاح"}</span>`) : `<span class="calendar-empty">${isEnglish ? "Restricted" : "غير متاح"}</span>`}
          ${more}
        </span>
      </button>
    `;
  }).join("");
}

function minutesFromTime(timeString) {
  const [hours = 0, minutes = 0] = String(timeString || "00:00").split(":").map(Number);
  return (Number.isFinite(hours) ? hours : 0) * 60 + (Number.isFinite(minutes) ? minutes : 0);
}

function timeFromMinutes(totalMinutes) {
  const minutes = Math.max(0, Math.round(totalMinutes));
  const hoursPart = String(Math.floor(minutes / 60)).padStart(2, "0");
  const minutesPart = String(minutes % 60).padStart(2, "0");
  return `${hoursPart}:${minutesPart}`;
}

function displayTime(timeString) {
  const [hours = 0, minutes = 0] = String(timeString || "00:00").split(":").map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date.toLocaleTimeString(currentLanguage() === "en" ? "en-US" : "ar-JO-u-nu-latn", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function scheduleSlotMinutes() {
  const value = Number(state.settings?.scheduleSlotMinutes);
  return [10, 15, 20, 30, 45, 60].includes(value) ? value : 15;
}

function scheduleSlotForTime(timeString, stepMinutes = scheduleSlotMinutes()) {
  const safeStep = [10, 15, 20, 30, 45, 60].includes(Number(stepMinutes)) ? Number(stepMinutes) : 15;
  return timeFromMinutes(Math.floor(minutesFromTime(timeString) / safeStep) * safeStep);
}

function isTimeOnScheduleSlot(timeString, stepMinutes = scheduleSlotMinutes()) {
  return minutesFromTime(timeString) % stepMinutes === 0;
}

function dayScheduleSlots(bookings) {
  const stepMinutes = scheduleSlotMinutes();
  const openMinute = minutesFromTime(state.settings.workStart || "08:00");
  const closeMinute = Math.max(minutesFromTime(state.settings.workEnd || "18:00"), openMinute + stepMinutes);
  const bookingMinutes = bookings.map(booking => minutesFromTime(booking.time));
  const firstMinute = bookingMinutes.length
    ? Math.min(openMinute, Math.floor(Math.min(...bookingMinutes) / stepMinutes) * stepMinutes)
    : openMinute;
  const lastMinute = bookingMinutes.length
    ? Math.max(closeMinute, Math.ceil((Math.max(...bookingMinutes) + stepMinutes) / stepMinutes) * stepMinutes)
    : closeMinute;

  const slots = [];
  for (let minute = firstMinute; minute <= lastMinute; minute += stepMinutes) {
    slots.push(timeFromMinutes(minute));
  }
  return slots;
}

function activeScheduleColumns() {
  const savedColumns = Array.isArray(state.scheduleColumns)
    ? state.scheduleColumns.map(normalizeScheduleColumn).filter(column => column.active !== false)
    : [];
  const columns = savedColumns.length ? savedColumns : DEFAULT_SCHEDULE_COLUMNS.map(normalizeScheduleColumn);
  state.scheduleColumns = columns;
  return columns;
}

function scheduleColumnLabel(columnId) {
  return activeScheduleColumns().find(column => column.id === columnId)?.label || "";
}

function scheduleConflictMessage(conflict, stepMinutes = scheduleSlotMinutes()) {
  const firstPatient = conflict.first?.patient || "مريض";
  const secondPatient = conflict.second?.patient || "مريض آخر";
  const columnName = scheduleColumnLabel(conflict.columnId) || "هذا العمود";
  return `لا يمكن وجود حجزين في نفس خانة التقويم. ${columnName} عند ${displayTime(conflict.slot)} يحتوي ${firstPatient} و ${secondPatient}. مدة الخانة الحالية ${stepMinutes} دقيقة.`;
}

function bookingScheduleColumns() {
  return activeScheduleColumns().map(column => {
    const categories = Array.isArray(column.categories) ? column.categories : (column.category ? [column.category] : []);
    return {
      id: column.id,
      label: column.label,
      categories,
      role: categories.length
        ? categories.join("، ")
        : (currentLanguage() === "en" ? "Calendar column" : "عمود تقويم")
    };
  });
}

function scheduleColumnsForAccount(account = currentAccount()) {
  const columns = bookingScheduleColumns();
  const allowedIds = Array.isArray(account?.allowedColumnIds) ? account.allowedColumnIds : [];
  if (account?.role === "admin" || !allowedIds.length) return columns;
  return columns.filter(column => allowedIds.includes(column.id));
}

function scheduleColumnAllowedForAccount(columnId, account = currentAccount()) {
  if (!columnId || !bookingScheduleColumns().some(column => column.id === columnId)) return false;
  const allowedIds = Array.isArray(account?.allowedColumnIds) ? account.allowedColumnIds : [];
  if (account?.role === "admin" || !allowedIds.length) return true;
  return allowedIds.includes(columnId);
}

function bookingColumnAllowedForAccount(booking, account = currentAccount()) {
  const allowedIds = Array.isArray(account?.allowedColumnIds) ? account.allowedColumnIds : [];
  if (account?.role === "admin" || !allowedIds.length) return true;
  const columnId = bookingScheduleColumnId(booking, bookingScheduleColumns());
  return allowedIds.includes(columnId);
}

function bookingScheduleColumnId(booking, columns) {
  if (columns.some(column => column.id === booking.scheduleColumnId)) return booking.scheduleColumnId;
  if (columns.some(column => column.id === "doctor") && booking.doctorId) return "doctor";
  const text = normalizeSearchText(`${serviceLabel(booking)} ${booking.notes || ""}`);
  const patient = getPatient(booking.patientId) || findPatientByName(booking.patient);
  const isMale = patient?.gender === "male" || text.includes("men") || text.includes("رجال");
  const isFemale = patient?.gender === "female" || text.includes("women") || text.includes("نساء");
  if (text.includes("laser") || text.includes("ليزر")) {
    const preferred = isMale ? "laser-men" : "laser-women";
    if (columns.some(column => column.id === preferred)) return preferred;
  }
  if (text.includes("facial") || text.includes("عناية") || text.includes("بشرة")) {
    const preferred = isMale ? "facial-men" : "facial-women";
    if (columns.some(column => column.id === preferred)) return preferred;
  }
  if (text.includes("تغذية") || text.includes("nutrition")) {
    if (columns.some(column => column.id === "nutrition")) return "nutrition";
  }
  if (columns.some(column => column.id === "waiting")) return "waiting";
  return columns[0]?.id || "";
}

function scheduleSlotForBooking(booking) {
  return scheduleSlotForTime(booking.time);
}

function bookingSlotConflict(candidate, ignoreId = "", stepMinutes = scheduleSlotMinutes()) {
  const columns = bookingScheduleColumns();
  const candidateColumn = bookingScheduleColumnId(candidate, columns);
  const candidateSlot = scheduleSlotForTime(candidate.time, stepMinutes);
  return (state.bookings || []).find(booking => (
    booking.id !== ignoreId
    && booking.date === candidate.date
    && !["cancelled", "no_show"].includes(booking.status)
    && bookingScheduleColumnId(booking, columns) === candidateColumn
    && scheduleSlotForTime(booking.time, stepMinutes) === candidateSlot
  ));
}

function scheduleConflictForBookings(stepMinutes = scheduleSlotMinutes()) {
  const columns = bookingScheduleColumns();
  const seen = new Map();
  for (const booking of (state.bookings || [])) {
    if (["cancelled", "no_show"].includes(booking.status)) continue;
    const columnId = bookingScheduleColumnId(booking, columns);
    const slot = scheduleSlotForTime(booking.time, stepMinutes);
    const key = `${booking.date}|${columnId}|${slot}`;
    const first = seen.get(key);
    if (first) {
      return { first, second: booking, columnId, slot };
    }
    seen.set(key, booking);
  }
  return null;
}

function renderBookingDayCalendar() {
  if (!els.bookingDayCalendar) return;
  const isEnglish = currentLanguage() === "en";
  const bookings = activeBookings();
  const columns = scheduleColumnsForAccount();
  const slots = dayScheduleSlots(bookings);
  const grouped = new Map();

  bookings.forEach(booking => {
    const key = `${scheduleSlotForBooking(booking)}|${bookingScheduleColumnId(booking, columns)}`;
    const items = grouped.get(key) || [];
    items.push(booking);
    grouped.set(key, items);
  });

  const headerCells = columns.map(column => `
    <div class="day-schedule-cell day-schedule-header-cell">
      <strong>${column.label}</strong>
      <small>${column.role}</small>
    </div>
  `).join("");

  const bodyCells = slots.map(slot => {
    const slotCells = columns.map(column => {
      const slotBookings = (grouped.get(`${slot}|${column.id}`) || [])
        .slice()
        .sort((a, b) => a.time.localeCompare(b.time));
      const bookingCards = slotBookings.map(booking => `
        <div class="day-schedule-booking ${booking.status}"
             draggable="true"
             data-drag-booking="${booking.id}">
          <span class="drag-handle" aria-hidden="true">⠿</span>
          <strong>${booking.patient}</strong>
          <span>${booking.time} | ${serviceLabel(booking)}</span>
          <small>${bookingStatusLabel(booking.status)}${booking.phone && canUseFeature("see_mobile") ? ` | ${booking.phone}` : ""}</small>
        </div>
      `).join("");

      return `
        <div class="day-schedule-cell day-schedule-slot ${slotBookings.length ? "filled" : ""}"
             data-drop-slot="${slot}"
             data-drop-column="${column.id}">
          ${bookingCards}
        </div>
      `;
    }).join("");

    return `
      <div class="day-schedule-cell day-schedule-time-cell">${displayTime(slot)}</div>
      ${slotCells}
    `;
  }).join("");

  const summary = isEnglish
    ? `${bookings.length} bookings on ${displayDate(state.settings.activeDate)}`
    : `${bookings.length} حجز في ${displayDate(state.settings.activeDate)}`;
  const slotMinutes = scheduleSlotMinutes();
  const empty = !columns.length
    ? `<div class="day-schedule-empty">${isEnglish ? "No calendar columns are available for this account." : "لا توجد أعمدة تقويم متاحة لهذا الحساب."}</div>`
    : bookings.length
    ? ""
    : `<div class="day-schedule-empty">${isEnglish ? "No bookings are scheduled for this day yet." : "لا توجد حجوزات مجدولة لهذا اليوم بعد."}</div>`;

  const titleHtml = `
    <div class="day-schedule-title">
      <div>
        <strong>${isEnglish ? "Day Calendar" : "تقويم اليوم"}</strong>
        <span>${summary}</span>
      </div>
      <span>${isEnglish ? `${slotMinutes}-minute slots` : `خانات كل ${slotMinutes} دقيقة`}</span>
    </div>`;

  if (!columns.length) {
    els.bookingDayCalendar.innerHTML = `${titleHtml}${empty}`;
    return;
  }

  els.bookingDayCalendar.innerHTML = `
    ${titleHtml}
    ${empty}
    <div class="day-schedule-scroll">
      <div class="day-schedule-grid" style="--schedule-column-count: ${columns.length};">
        <div class="day-schedule-cell day-schedule-header-cell day-schedule-time-head">${isEnglish ? "Time" : "الوقت"}</div>
        ${headerCells}
        ${bodyCells}
      </div>
    </div>
  `;
}

function renderBookingKpis() {
  const todayBookings = activeBookings();
  if (!document.querySelector('[data-booking-kpi="today"]')) return;
  const expected = todayBookings
    .filter(booking => !["cancelled", "no_show"].includes(booking.status))
    .reduce((sum, booking) => sum + numberValue(booking.expectedAmount), 0);
  document.querySelector('[data-booking-kpi="today"]').textContent = todayBookings.length;
  document.querySelector('[data-booking-kpi="pending"]').textContent = todayBookings.filter(booking => booking.status === "scheduled").length;
  document.querySelector('[data-booking-kpi="arrived"]').textContent = todayBookings.filter(booking => booking.status === "arrived").length;
  document.querySelector('[data-booking-kpi="expected"]').textContent = money(expected);
}

function renderBookingList() {
  if (!els.bookingList) return;

  /* Pending online bookings (all dates, shown as inbox at top) */
  const allBookings = filterBookingsForAccount(state.bookings || []);
  const pendingOnline = allBookings.filter(b => b.status === "pending_confirmation");
  const pendingHtml = pendingOnline.length
    ? `<div class="pending-online-section">
        <div class="pending-online-header">
          <span class="pending-online-badge">${pendingOnline.length}</span>
          حجوزات إلكترونية بانتظار التأكيد
        </div>
        ${pendingOnline.map(b => `
          <div class="staff-card pending-online-card">
            <div>
              <strong>${b.time} | ${b.patient}</strong>
              <p>${b.service || "—"} | ${b.date}</p>
              ${b.phone && canUseFeature("see_mobile") ? `<p>📞 ${b.phone}</p>` : ""}
              ${b.notes ? `<p style="color:#666;font-size:12px">${b.notes}</p>` : ""}
              ${b.reference ? `<p style="font-size:11px;color:#999">Ref: ${b.reference}</p>` : ""}
            </div>
            <div class="row-actions">
              ${canUseFeature("change_appointment_status") ? `
                <button class="text-button" type="button" data-booking-status-id="${b.id}" data-booking-status="scheduled">✓ تأكيد</button>
                <button class="icon-button danger" type="button" data-booking-status-id="${b.id}" data-booking-status="cancelled">رفض</button>
              ` : ""}
            </div>
          </div>
        `).join("")}
      </div>`
    : "";

  const bookings = activeBookings();
  if (!bookings.length && !pendingOnline.length) {
    els.bookingList.innerHTML = `<div class="empty-state">لا توجد حجوزات لهذا التاريخ بعد.</div>`;
    return;
  }
  if (!bookings.length) {
    els.bookingList.innerHTML = pendingHtml;
    return;
  }

  els.bookingList.innerHTML = bookings.map(booking => {
    const doctor = getStaffMember(booking.doctorId);
    const specialist = getStaffMember(booking.specialistId);
    const nextAction = canUseFeature("change_appointment_status") && booking.status === "scheduled"
      ? `<button class="text-button" type="button" data-booking-status-id="${booking.id}" data-booking-status="confirmed">تأكيد</button>`
      : canUseFeature("change_appointment_status") && booking.status === "confirmed"
        ? `<button class="text-button" type="button" data-booking-status-id="${booking.id}" data-booking-status="arrived">وصل</button>`
        : "";
    const canConvert = !["completed", "cancelled", "no_show"].includes(booking.status);
    const patient = getPatient(booking.patientId) || findPatientByName(booking.patient);
    const phone = booking.phone || patient?.phone || "";
    const canCopyReminder = canUseFeature("see_mobile") && phone;
    const canSendSms     = canUseFeature("see_mobile") && phone && canUseFeature("send_sms_campaigns");
    return `
      <div class="staff-card booking-card">
        ${genderAvatar(patient || booking, 42)}
        <div>
          <strong>${booking.time} | ${booking.patient}</strong>
          <p>${serviceLabel(booking)}${phone && canUseFeature("see_mobile") ? ` | ${phone}` : ""}</p>
          <p>الفريق: ${[doctor?.name, specialist?.name].filter(Boolean).join(" / ") || "بانتظار التعيين"}${canViewSensitive() ? ` | المتوقع ${money(booking.expectedAmount)}` : ""}</p>
          ${booking.notes ? `<p>${booking.notes}</p>` : ""}
        </div>
        <div class="row-actions">
          <span class="status-pill ${statusClass(booking.status)}">${bookingStatusLabel(booking.status)}</span>
          ${nextAction}
          ${canCopyReminder ? `<button class="text-button whatsapp-copy-btn" type="button" data-copy-reminder="${booking.id}" title="نسخ رسالة تذكير واتساب">📋 واتساب</button>` : ""}
          ${canSendSms ? `<button class="text-button sms-send-btn" type="button" data-send-sms="${booking.id}" title="إرسال SMS تذكير">📱 SMS</button>` : ""}
          ${canConvert ? `<button class="text-button" type="button" data-booking-to-entry="${booking.id}">تسجيل كعملية</button>` : ""}
          ${canUseFeature("delete_appointment") ? `<button class="icon-button danger" type="button" data-delete-booking="${booking.id}">حذف</button>` : ""}
        </div>
      </div>
    `;
  }).join("");
  els.bookingList.innerHTML = pendingHtml + els.bookingList.innerHTML;
}

/* ─── PATIENT BALANCE REPORT ─────────────────────────────────────────────── */

function patientBalanceRows(entries, doctorId = "") {
  const isEnglish = currentLanguage() === "en";
  const filtered = doctorId
    ? entries.filter(e => e.doctorId === doctorId || e.specialistId === doctorId)
    : entries;

  const rows = new Map();
  filtered.forEach(entry => {
    const key = entry.patient || (isEnglish ? "Unknown" : "غير محدد");
    const cur = rows.get(key) || {
      patient: key,
      doctorId: entry.doctorId || entry.specialistId || "",
      paid: 0,
      procedures: 0,
      count: 0,
      hasPartial: false,
      lastDate: entry.date || ""
    };
    cur.paid       += paidAmount(entry);
    cur.procedures += netAmount(entry);
    cur.count      += 1;
    if (entry.status === "partial_payment") cur.hasPartial = true;
    if ((entry.date || "") > cur.lastDate) cur.lastDate = entry.date;
    rows.set(key, cur);
  });

  return [...rows.values()].map(row => {
    const balance   = row.paid - row.procedures;
    const remaining = Math.max(-balance, 0);
    const doctor    = getStaffMember(row.doctorId);
    const doctorName = doctor ? doctor.name : (isEnglish ? "—" : "—");

    let status, className;
    if (row.hasPartial && balance < -0.01) {
      status    = isEnglish ? "Partial — follow-up" : "دفع جزئي — تكملة";
      className = "partial";
    } else if (Math.abs(balance) < 0.01 && row.procedures > 0) {
      status    = isEnglish ? "✓ Match"   : "✓ مطابق";
      className = "match";
    } else if (row.paid < 0.01 && row.procedures > 0) {
      status    = isEnglish ? "Service, Not Paid" : "خدمة بلا دفع";
      className = "no-pay";
    } else if (row.procedures < 0.01 && row.paid > 0.01) {
      status    = isEnglish ? "Paid, No Service"  : "دفع بلا خدمة";
      className = "no-service";
    } else if (balance > 0.01) {
      status    = isEnglish ? "Overpaid"   : "زيادة دفع";
      className = "overpaid";
    } else {
      status    = isEnglish ? "Underpaid"  : "ناقص دفع";
      className = "underpaid";
    }

    return { ...row, balance, remaining, status, className, doctorName };
  }).sort((a, b) => {
    const order = { partial: 0, "no-pay": 1, underpaid: 2, "no-service": 3, overpaid: 4, match: 5 };
    const od = (order[a.className] ?? 9) - (order[b.className] ?? 9);
    return od !== 0 ? od : Math.abs(b.balance) - Math.abs(a.balance);
  });
}

function renderPatientBalanceReport(entries) {
  const isEnglish = currentLanguage() === "en";
  const doctorEl  = document.querySelector("[data-report-doctor]");
  const doctorId  = doctorEl ? doctorEl.value : "";

  /* Populate doctor select with doctors from state */
  if (doctorEl && doctorEl.options.length <= 1) {
    const doctors = (state.staff || []).filter(m => m.role === "doctor" || m.role === "specialist");
    doctors.forEach(d => {
      const opt = document.createElement("option");
      opt.value = d.id; opt.textContent = d.name;
      doctorEl.appendChild(opt);
    });
  }

  const L = isEnglish ? {
    title:       "Patient Balance — Follow-up Accounts",
    subtitle:    "Per-patient comparison of payments received vs procedures performed. Flags partial payments and outstanding balances.",
    totalPaid:   "Total Paid",
    totalProc:   "Procedures Value",
    difference:  "Net Difference",
    patients:    "Patients",
    partial:     "Partial Payments",
    unresolved:  "Unresolved",
    patient:     "Patient",
    doctor:      "Doctor",
    paid:        "Paid",
    procedures:  "Procedures",
    balance:     "Balance",
    remaining:   "Remaining Due",
    visits:      "Visits",
    status:      "Status",
    empty:       "No data for this period.",
    allClear:    "All accounts balanced",
    needsAction: "accounts need follow-up"
  } : {
    title:       "ميزان المريض — تكملة الحسابات",
    subtitle:    "مقارنة المدفوعات المستلمة مقابل قيمة الإجراءات المنجزة لكل مريض. يُظهر الدفع الجزئي والمبالغ المتبقية بوضوح.",
    totalPaid:   "إجمالي المدفوع",
    totalProc:   "قيمة الإجراءات",
    difference:  "الفرق الصافي",
    patients:    "عدد المرضى",
    partial:     "دفع جزئي",
    unresolved:  "تحتاج متابعة",
    patient:     "المريض",
    doctor:      "الطبيب",
    paid:        "المدفوع",
    procedures:  "قيمة الإجراءات",
    balance:     "الرصيد",
    remaining:   "المتبقي",
    visits:      "الزيارات",
    status:      "الحالة",
    empty:       "لا توجد بيانات لهذه الفترة.",
    allClear:    "جميع الحسابات متوازنة",
    needsAction: "تحتاج متابعة"
  };

  const rows        = patientBalanceRows(entries, doctorId);
  const totalPaid   = rows.reduce((s, r) => s + r.paid, 0);
  const totalProc   = rows.reduce((s, r) => s + r.procedures, 0);
  const difference  = totalPaid - totalProc;
  const partialCount   = rows.filter(r => r.className === "partial").length;
  const unresolvedCount = rows.filter(r => !["match"].includes(r.className)).length;

  const statusBadge = (row) => {
    const cls = {
      "partial":    "partial",
      "match":      "good",
      "no-pay":     "bad",
      "no-service": "warn",
      "overpaid":   "overpaid-pill",
      "underpaid":  "bad"
    }[row.className] || "warn";
    return `<span class="status-pill ${cls}">${row.status}</span>`;
  };

  const body = rows.length
    ? rows.map(row => `
      <tr class="balance-row balance-row--${row.className}">
        <td class="patient-cell">
          <strong>${row.patient}</strong>
          <small>${displayDate(row.lastDate)}</small>
        </td>
        <td>${row.doctorName}</td>
        <td>${money(row.paid)}</td>
        <td>${money(row.procedures)}</td>
        <td class="${row.balance < -0.01 ? "balance-negative" : row.balance > 0.01 ? "balance-positive" : ""}">
          <strong>${row.balance > 0.01 ? "+" : ""}${money(row.balance)}</strong>
        </td>
        <td>${row.remaining > 0.01 ? `<span class="remaining-badge">${money(row.remaining)}</span>` : "—"}</td>
        <td>${row.count}</td>
        <td>${statusBadge(row)}</td>
      </tr>
    `).join("")
    : `<tr><td colspan="8" class="empty-cell">${L.empty}</td></tr>`;

  /* Status summary chips */
  const statusGroups = [
    { key: "partial",     label: isEnglish ? "Partial" : "دفع جزئي",      cls: "chip-partial"  },
    { key: "underpaid",   label: isEnglish ? "Underpaid" : "ناقص دفع",    cls: "chip-bad"      },
    { key: "no-pay",      label: isEnglish ? "Not Paid" : "خدمة بلا دفع", cls: "chip-bad"      },
    { key: "no-service",  label: isEnglish ? "No Service" : "دفع بلا خدمة", cls: "chip-warn"   },
    { key: "overpaid",    label: isEnglish ? "Overpaid" : "زيادة دفع",    cls: "chip-over"     },
    { key: "match",       label: isEnglish ? "Match" : "مطابق",            cls: "chip-good"     }
  ].map(g => {
    const count = rows.filter(r => r.className === g.key).length;
    if (!count) return "";
    return `<span class="balance-chip ${g.cls}">${g.label} <strong>${count}</strong></span>`;
  }).join("");

  return `
    <div class="balance-report-toolbar no-print">
      <button class="text-button balance-print-btn" type="button" data-print-balance-report>🖨 طباعة / PDF</button>
    </div>
    ${reportHeader(L.title, L.subtitle)}
    ${reportKpis([
      { label: L.totalPaid,  value: money(totalPaid) },
      { label: L.totalProc,  value: money(totalProc) },
      { label: L.difference, value: money(difference),
        note: Math.abs(difference) < 0.01 ? L.allClear : `${unresolvedCount} ${L.needsAction}` },
      { label: L.partial, value: partialCount },
      { label: L.patients, value: rows.length }
    ])}
    ${statusGroups ? `<div class="balance-chips">${statusGroups}</div>` : ""}
    <div class="table-wrap report-table">
      <table class="patient-balance-table">
        <thead>
          <tr>
            <th>${L.patient}</th>
            <th>${L.doctor}</th>
            <th>${L.paid}</th>
            <th>${L.procedures}</th>
            <th>${L.balance}</th>
            <th>${L.remaining}</th>
            <th>${L.visits}</th>
            <th>${L.status}</th>
          </tr>
        </thead>
        <tbody>${body}</tbody>
      </table>
    </div>
  `;
}

/* ─────────────────────────────────────────────────────────────────────────── */

function patientReconciliationRows(entries) {
  const isEnglish = currentLanguage() === "en";
  const rows = new Map();
  billableEntries(entries).forEach(entry => {
    const current = rows.get(entry.patient) || { patient: entry.patient, paid: 0, procedures: 0, count: 0 };
    current.paid += paidAmount(entry);
    current.procedures += netAmount(entry);
    current.count += 1;
    rows.set(entry.patient, current);
  });
  return [...rows.values()].map(row => {
    const balance = row.paid - row.procedures;
    const status = Math.abs(balance) < 0.01
      ? (isEnglish ? "Match" : "مطابق")
      : balance > 0
        ? (isEnglish ? "Overpaid" : "زيادة دفع")
        : (isEnglish ? "Underpaid" : "ناقص دفع");
    const className = Math.abs(balance) < 0.01 ? "match" : balance > 0 ? "overpaid" : "underpaid";
    return { ...row, balance, status, className };
  }).sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance));
}

function reportHeader(title, subtitle) {
  const { from, to } = reportDateRange();
  const dateLabel = from === to ? displayDate(from) : `${displayDate(from)} - ${displayDate(to)}`;
  return `
    <div class="report-heading">
      <div>
        <span class="report-brand">RIAAYA</span>
        <h3>${title}</h3>
        <p>${subtitle}</p>
      </div>
      <div class="report-meta">
        <span>${state.settings.clinicName}</span>
        <span>${state.settings.branch || "الفرع الرئيسي"}</span>
        <span>${dateLabel}</span>
      </div>
    </div>
  `;
}

function reportKpis(rows) {
  return `<div class="report-kpis">${rows.map(row => `
    <div>
      <span>${row.label}</span>
      <strong>${row.value}</strong>
      ${row.note ? `<small>${row.note}</small>` : ""}
    </div>
  `).join("")}</div>`;
}

function reportFilterValues() {
  if (!els.reportFilterForm) return {};
  return Object.fromEntries(new FormData(els.reportFilterForm).entries());
}

function entryMatchesReportFilters(entry, filters) {
  const doctor = getStaffMember(entry.doctorId);
  const specialist = getStaffMember(entry.specialistId);
  return (!filters.status || entry.status === filters.status)
    && (!filters.category || entryCategory(entry) === filters.category)
    && entryMatchesPayment(entry, filters.paymentMethod)
    && matchesSmartQuery([
      entry.patient,
      serviceLabel(entry),
      doctor?.name,
      specialist?.name,
      entryStatusLabel(entry.status),
      entry.status,
      entryPaymentLabel(entry),
      entry.paymentMethod,
      entry.notes,
      entry.date
    ], filters.query);
}

function bookingMatchesReportFilters(booking, filters) {
  const doctor = getStaffMember(booking.doctorId);
  const specialist = getStaffMember(booking.specialistId);
  return (!filters.status || booking.status === filters.status)
    && (!filters.paymentMethod)
    && matchesSmartQuery([
      booking.patient,
      booking.phone,
      serviceLabel(booking),
      doctor?.name,
      specialist?.name,
      bookingStatusLabel(booking.status),
      booking.status,
      booking.notes,
      booking.date,
      booking.time
    ], filters.query);
}

function patientMatchesReportFilters(patient, filters) {
  return !filters.status && !filters.paymentMethod && matchesSmartQuery([
    patient.patientNumber,
    patient.name,
    patient.phone,
    patient.email,
    patient.nationality,
    patient.city,
    patient.category,
    patient.notes,
    profileTypeLabel(patient.profileType)
  ], filters.query);
}

function expenseMatchesReportFilters(expense, filters) {
  return (!filters.paymentMethod || expense.paymentMethod === filters.paymentMethod)
    && !filters.status
    && matchesSmartQuery([
      expenseGroupName(expense),
      expenseSubgroupName(expense),
      expense.vendor,
      expense.reference,
      expense.notes,
      expense.branch,
      paymentLabel(expense.paymentMethod),
      expense.paymentMethod,
      expense.date,
      expense.amount
    ], filters.query);
}

function universalReportItems(from, to) {
  const filters = reportFilterValues();
  const sources = [];
  entriesForDateRange(from, to).forEach(entry => {
    const doctor = getStaffMember(entry.doctorId);
    const specialist = getStaffMember(entry.specialistId);
    sources.push({
      id: entry.id,
      source: "operation",
      date: entry.date,
      title: entry.patient,
      details: `${serviceLabel(entry)} | ${[doctor?.name, specialist?.name].filter(Boolean).join(" / ") || "بانتظار التعيين"}`,
      status: entry.status,
      statusLabel: entryStatusLabel(entry.status),
      paymentMethod: entry.paymentMethod,
      value: netAmount(entry),
      searchValues: [entry.patient, serviceLabel(entry), doctor?.name, specialist?.name, entry.notes, entryStatusLabel(entry.status), entry.status, entryPaymentLabel(entry), entry.paymentMethod]
    });
  });
  bookingsForDateRange(from, to).forEach(booking => {
    const doctor = getStaffMember(booking.doctorId);
    const specialist = getStaffMember(booking.specialistId);
    sources.push({
      id: booking.id,
      source: "booking",
      date: booking.date,
      title: booking.patient,
      details: `${booking.time} | ${serviceLabel(booking)} | ${[doctor?.name, specialist?.name].filter(Boolean).join(" / ") || "بانتظار التعيين"}`,
      status: booking.status,
      statusLabel: bookingStatusLabel(booking.status),
      paymentMethod: "",
      value: booking.expectedAmount,
      searchValues: [booking.patient, booking.phone, booking.time, serviceLabel(booking), doctor?.name, specialist?.name, booking.notes, bookingStatusLabel(booking.status), booking.status]
    });
  });
  (state.patients || []).forEach(patient => {
    sources.push({
      id: patient.id,
      source: "patient",
      date: patientLastActivity(patient) || patient.createdAt,
      title: patient.name,
      details: `${profileTypeLabel(patient.profileType)} | ${patient.category || "بدون فئة"} | ${patient.city || "-"}`,
      status: "",
      statusLabel: profileTypeLabel(patient.profileType),
      paymentMethod: "",
      value: patientEntries(patient).length,
      searchValues: [patient.patientNumber, patient.name, patient.phone, patient.email, patient.nationality, patient.city, patient.category, patient.notes, profileTypeLabel(patient.profileType)]
    });
  });
  expensesForDateRange(from, to).forEach(expense => {
    sources.push({
      id: expense.id,
      source: "expense",
      date: expense.date,
      title: expenseGroupName(expense),
      details: `${expenseSubgroupName(expense)} | ${expense.vendor || "بدون مورد"} | ${expense.reference || "بدون مرجع"}`,
      status: "",
      statusLabel: paymentLabel(expense.paymentMethod),
      paymentMethod: expense.paymentMethod,
      value: expense.amount,
      searchValues: [expenseGroupName(expense), expenseSubgroupName(expense), expense.vendor, expense.reference, expense.notes, expense.branch, paymentLabel(expense.paymentMethod), expense.paymentMethod]
    });
  });
  state.inventory.forEach(item => {
    const status = stockStatus(item);
    sources.push({
      id: item.id,
      source: "inventory",
      date: item.lastOrderedAt || "",
      title: item.name,
      details: `${item.sku || "بدون رمز"} | ${item.quantity} ${item.unit} | ${getSupplier(item.supplierId)?.name || "بدون مورد"}`,
      status: status.className,
      statusLabel: status.label,
      paymentMethod: "",
      value: item.quantity,
      searchValues: [item.name, item.sku, item.unit, status.label, getSupplier(item.supplierId)?.name]
    });
  });
  state.services.forEach(service => {
    sources.push({
      id: service.id,
      source: "service",
      date: "",
      title: service.name,
      details: `${service.active === false ? "متوقفة" : "فعالة"} | ${canViewSensitive() ? `${money(service.defaultPrice)} | ${money(service.defaultCost)}` : "الأسعار مخفية"}`,
      status: service.active === false ? "inactive" : "active",
      statusLabel: service.active === false ? "متوقفة" : "فعالة",
      paymentMethod: "",
      value: service.defaultPrice,
      searchValues: [service.name, service.active === false ? "متوقفة inactive" : "فعالة active"]
    });
  });
  state.suppliers.forEach(supplier => {
    sources.push({
      id: supplier.id,
      source: "supplier",
      date: "",
      title: supplier.name,
      details: `${supplier.category || "عام"} | ${supplier.city || "-"} | ${supplier.contact || "-"}`,
      status: supplier.active === false ? "inactive" : "active",
      statusLabel: supplier.active === false ? "متوقف" : "فعال",
      paymentMethod: "",
      value: 0,
      searchValues: [supplier.name, supplier.category, supplier.city, supplier.contact, supplier.notes]
    });
  });
  state.staff.forEach(member => {
    sources.push({
      id: member.id,
      source: "staff",
      date: "",
      title: member.name,
      details: `${roleLabel(member.role)} | ${member.rate}%`,
      status: "",
      statusLabel: roleLabel(member.role),
      paymentMethod: "",
      value: 0,
      searchValues: [member.name, roleLabel(member.role), member.role]
    });
  });
  reconciliationRecordsForDateRange(from, to).forEach(record => {
    sources.push({
      id: record.id,
      source: "reconciliation",
      date: record.date,
      title: reconciliationStatusLabel(record.status),
      details: `${displayDateTimeMinute(record.createdAt)} | ${record.createdBy || "-"} | ${record.note || "-"}`,
      status: record.status,
      statusLabel: reconciliationStatusLabel(record.status),
      paymentMethod: "mixed",
      value: record.totalDiff,
      searchValues: [
        record.date,
        record.createdAt,
        record.createdBy,
        record.note,
        record.status,
        reconciliationStatusLabel(record.status),
        money(record.totalExpected),
        money(record.totalCounted),
        money(record.totalDiff)
      ]
    });
  });

  return sources
    .filter(item => !filters.source || item.source === filters.source)
    .filter(item => !filters.status || item.status === filters.status)
    .filter(item => !filters.paymentMethod || (item.source === "operation"
      ? entryMatchesPayment(state.entries.find(entry => entry.id === item.id) || {}, filters.paymentMethod)
      : item.paymentMethod === filters.paymentMethod))
    .filter(item => matchesSmartQuery([...item.searchValues, item.title, item.details, item.statusLabel, item.date], filters.query))
    .sort((a, b) => `${b.date} ${b.id}`.localeCompare(`${a.date} ${a.id}`));
}

function reportSourceLabel(source) {
  const labels = currentLanguage() === "en"
    ? { operation: "Operation", booking: "Booking", patient: "Patient / Visitor", expense: "Expense", inventory: "Inventory", service: "Service", supplier: "Supplier", staff: "Staff", reconciliation: "Daily Close" }
    : { operation: "عملية", booking: "حجز", patient: "مريض / زائر", expense: "مصروف", inventory: "مخزون", service: "خدمة", supplier: "مورد", staff: "موظف", reconciliation: "مطابقة يومية" };
  return labels[source] || source;
}

function renderUniversalReport(items) {
  const isEnglish = currentLanguage() === "en";
  const body = items.length ? items.map(item => `
    <tr>
      <td>${item.date ? displayDate(item.date) : "-"}</td>
      <td><span class="pill">${reportSourceLabel(item.source)}</span></td>
      <td>${item.source === "patient" ? `<button class="table-link" type="button" data-open-patient="${item.id}">${item.title}</button>` : item.title}</td>
      <td>${item.details}</td>
      <td>${item.statusLabel || "-"}</td>
      <td>${canViewSensitive() && ["operation", "booking", "expense", "reconciliation"].includes(item.source) ? money(item.value) : item.source === "patient" ? `${item.value} ${isEnglish ? "operations" : "عملية"}` : item.value || "-"}</td>
    </tr>
  `).join("") : `<tr><td colspan="6">${isEnglish ? "No matching results." : "لا توجد نتائج مطابقة."}</td></tr>`;

  return `
    ${reportHeader(isEnglish ? "Universal Clinic Search" : "البحث الشامل في العيادة", isEnglish ? "Search across operations, appointments, patient files, staff, and inventory from one place." : "ابحث في العمليات والحجوزات وملفات المرضى والموظفين والمخزون من مكان واحد.")}
    <div class="table-wrap report-table">
      <table>
        <thead><tr><th>${isEnglish ? "Date" : "التاريخ"}</th><th>${isEnglish ? "Source" : "المصدر"}</th><th>${isEnglish ? "Record" : "السجل"}</th><th>${isEnglish ? "Details" : "التفاصيل"}</th><th>${isEnglish ? "Status" : "الحالة"}</th><th>${isEnglish ? "Value" : "القيمة"}</th></tr></thead>
        <tbody>${body}</tbody>
      </table>
    </div>
  `;
}

function renderExpensesReport(expenses) {
  const isEnglish = currentLanguage() === "en";
  const total = expenseTotal(expenses);
  const byGroup = new Map();
  expenses.forEach(expense => {
    const group = expenseGroupName(expense);
    byGroup.set(group, (byGroup.get(group) || 0) + numberValue(expense.amount));
  });
  const top = [...byGroup.entries()].sort((a, b) => b[1] - a[1])[0];
  const body = expenses.length ? expenses.map(expense => `
    <tr>
      <td>${displayDate(expense.date)}</td>
      <td>${expenseGroupName(expense)}</td>
      <td>${expenseSubgroupName(expense)}</td>
      <td>${expense.vendor || "-"}</td>
      <td>${paymentLabel(expense.paymentMethod)}</td>
      <td>${expense.reference || "-"}</td>
      <td><strong>${money(expense.amount)}</strong></td>
      <td>${expense.notes || "-"}</td>
    </tr>
  `).join("") : `<tr><td colspan="8">${isEnglish ? "No matching expenses." : "لا توجد مصروفات مطابقة."}</td></tr>`;
  return `
    ${reportHeader(isEnglish ? "Expenses Report" : "تقرير المصروفات", isEnglish ? "A filtered view of clinic spend by date, group, vendor, and payment method." : "عرض مصروفات العيادة حسب التاريخ والمجموعة والمورد وطريقة الدفع.")}
    ${reportKpis([
      { label: isEnglish ? "Total expenses" : "إجمالي المصروفات", value: money(total) },
      { label: isEnglish ? "Expense rows" : "عدد الحركات", value: expenses.length },
      { label: isEnglish ? "Largest group" : "أكبر مجموعة", value: top?.[0] || "-", note: top ? money(top[1]) : "" }
    ])}
    <div class="table-wrap report-table">
      <table>
        <thead><tr><th>${isEnglish ? "Date" : "التاريخ"}</th><th>${isEnglish ? "Group" : "المجموعة"}</th><th>${isEnglish ? "Subgroup" : "الفرعية"}</th><th>${isEnglish ? "Vendor" : "المورد"}</th><th>${isEnglish ? "Payment" : "الدفع"}</th><th>${isEnglish ? "Reference" : "المرجع"}</th><th>${isEnglish ? "Amount" : "المبلغ"}</th><th>${isEnglish ? "Notes" : "ملاحظات"}</th></tr></thead>
        <tbody>${body}</tbody>
      </table>
    </div>
  `;
}

function clinicProfitSummary(entries, expenses) {
  const rows = billableEntries(entries);
  const gross = rows.reduce((sum, entry) => sum + netAmount(entry), 0);
  const collected = rows.reduce((sum, entry) => sum + paidAmount(entry), 0);
  const unpaid = Math.max(gross - collected, 0);
  const directCost = rows.reduce((sum, entry) => sum + entryCost(entry), 0);
  const salaries = rows.reduce((sum, entry) => (
    sum + entryPayouts(entry).reduce((total, row) => total + row.payout, 0)
  ), 0);
  const expensesTotal = expenseTotal(expenses);
  const profit = collected - directCost - salaries - expensesTotal;
  return { rows, gross, collected, unpaid, directCost, salaries, expensesTotal, profit };
}

// Vertical P&L statement: revenue → gross profit → net profit (waterfall), plus a
// cash-position panel (collected by method + receivables) and expenses by group.
function pnlStatement(summary, expenses, isEnglish) {
  const t = isEnglish
    ? { pnl: "Profit & Loss", revenue: "Collected revenue", directCost: "Direct operation cost",
        grossProfit: "Gross profit", payouts: "Team payouts", expenses: "Operating expenses",
        net: "Net profit", margin: "margin", cash: "Cash position", c: "Cash", card: "Card",
        transfer: "Transfer", receivable: "Unbilled / receivables", byGroup: "Expenses by group", other: "Other" }
    : { pnl: "قائمة الأرباح والخسائر", revenue: "الإيراد المحصّل", directCost: "تكلفة العمليات المباشرة",
        grossProfit: "مجمل الربح", payouts: "مستحقات الفريق", expenses: "المصروفات التشغيلية",
        net: "صافي الربح", margin: "هامش", cash: "الوضع النقدي", c: "نقد", card: "بطاقة",
        transfer: "تحويل", receivable: "ذمم غير محصّلة", byGroup: "المصروفات حسب البند", other: "أخرى" };
  const pay = totalsFor(summary.rows);
  const grossProfit = summary.collected - summary.directCost;
  const margin = summary.collected > 0 ? Math.round(summary.profit / summary.collected * 100) : 0;
  const groups = new Map();
  (expenses || []).forEach(expense => {
    const key = expenseGroupName(expense) || t.other;
    groups.set(key, (groups.get(key) || 0) + numberValue(expense.amount));
  });
  const groupList = [...groups.entries()].sort((a, b) => b[1] - a[1]);
  const line = (text, value, opts = {}) => `
    <div class="pnl-line${opts.cls ? " " + opts.cls : ""}">
      <span>${text}</span><strong>${opts.minus ? "−&nbsp;" : ""}${money(Math.abs(value))}</strong>
    </div>`;
  return `
    <div class="pnl-grid">
      <div class="pnl-statement">
        <h4>${t.pnl}</h4>
        ${line(t.revenue, summary.collected)}
        ${line(t.directCost, summary.directCost, { minus: true })}
        ${line(t.grossProfit, grossProfit, { cls: "subtotal" })}
        ${line(t.payouts, summary.salaries, { minus: true })}
        ${line(t.expenses, summary.expensesTotal, { minus: true })}
        ${line(`${t.net} · ${t.margin} ${margin}%`, summary.profit, { cls: "net " + (summary.profit >= 0 ? "positive" : "negative") })}
      </div>
      <div class="pnl-side">
        <div class="pnl-card">
          <h4>${t.cash}</h4>
          ${line(t.c, pay.cash)}
          ${line(t.card, pay.card)}
          ${line(t.transfer, pay.transfer)}
          ${line(t.receivable, summary.unpaid, { cls: "receivable" })}
        </div>
        ${groupList.length ? `<div class="pnl-card">
          <h4>${t.byGroup}</h4>
          ${groupList.map(([name, amount]) => line(name, amount)).join("")}
        </div>` : ""}
      </div>
    </div>`;
}

function renderProfitReport(entries, expenses) {
  const isEnglish = currentLanguage() === "en";
  const label = isEnglish
    ? {
      title: "Clinic Profit Report",
      subtitle: "Collected money minus operation costs, team payouts, and clinic expenses.",
      gross: "Gross service value",
      collected: "Collected / paid",
      unpaid: "Unpaid",
      directCost: "Operation cost",
      salaries: "Team payouts",
      expenses: "Expenses",
      profit: "Clinic profit",
      formula: "Profit formula",
      explanation: "Collected - operation cost - salaries - expenses",
      service: "Service",
      operations: "Operations",
      serviceGross: "Gross",
      servicePaid: "Paid",
      serviceCost: "Cost",
      servicePayouts: "Payouts",
      serviceProfit: "Profit",
      empty: "No billable operations in this range."
    }
    : {
      title: "تقرير ربح العيادة",
      subtitle: "المدفوع فعلياً ناقص تكلفة العمليات ومستحقات الفريق ومصروفات العيادة.",
      gross: "قيمة الخدمات",
      collected: "المدفوع",
      unpaid: "غير مدفوع",
      directCost: "تكلفة العمليات",
      salaries: "مستحقات الفريق",
      expenses: "المصروفات",
      profit: "ربح العيادة",
      formula: "معادلة الربح",
      explanation: "المدفوع - تكلفة العمليات - مستحقات الفريق - المصروفات",
      service: "الخدمة",
      operations: "العمليات",
      serviceGross: "القيمة",
      servicePaid: "المدفوع",
      serviceCost: "التكلفة",
      servicePayouts: "المستحقات",
      serviceProfit: "الربح",
      empty: "لا توجد عمليات قابلة للاحتساب ضمن هذا النطاق."
    };
  const summary = clinicProfitSummary(entries, expenses);
  const byService = new Map();
  summary.rows.forEach(entry => {
    const key = serviceLabel(entry);
    const current = byService.get(key) || { service: key, operations: 0, gross: 0, paid: 0, cost: 0, payouts: 0 };
    current.operations += 1;
    current.gross += netAmount(entry);
    current.paid += paidAmount(entry);
    current.cost += entryCost(entry);
    current.payouts += entryPayouts(entry).reduce((sum, row) => sum + row.payout, 0);
    byService.set(key, current);
  });
  const rows = [...byService.values()].sort((a, b) => (b.paid - b.cost - b.payouts) - (a.paid - a.cost - a.payouts));
  const body = rows.length ? rows.map(row => `
    <tr>
      <td>${row.service}</td>
      <td>${row.operations}</td>
      <td>${money(row.gross)}</td>
      <td><strong>${money(row.paid)}</strong></td>
      <td>${money(row.cost)}</td>
      <td>${money(row.payouts)}</td>
      <td><strong>${money(row.paid - row.cost - row.payouts)}</strong></td>
    </tr>
  `).join("") : `<tr><td colspan="7">${label.empty}</td></tr>`;

  return `
    ${reportHeader(label.title, label.subtitle)}
    ${reportKpis([
      { label: label.gross, value: money(summary.gross), note: label.unpaid + " " + money(summary.unpaid) },
      { label: label.collected, value: money(summary.collected), note: summary.rows.length + " " + label.operations },
      { label: label.directCost, value: money(summary.directCost) },
      { label: label.salaries, value: money(summary.salaries) },
      { label: label.expenses, value: money(summary.expensesTotal) },
      { label: label.profit, value: money(summary.profit), note: label.explanation }
    ])}
    ${reportTrendChart(entries)}
    ${pnlStatement(summary, expenses, isEnglish)}
    <div class="table-wrap report-table">
      <table>
        <thead>
          <tr>
            <th>${label.service}</th>
            <th>${label.operations}</th>
            <th>${label.serviceGross}</th>
            <th>${label.servicePaid}</th>
            <th>${label.serviceCost}</th>
            <th>${label.servicePayouts}</th>
            <th>${label.serviceProfit}</th>
          </tr>
        </thead>
        <tbody>${body}</tbody>
      </table>
    </div>
  `;
}

function renderPatientsReport(patients) {
  const isEnglish = currentLanguage() === "en";
  const body = patients.length ? patients.map(patient => `
    <tr>
      <td>${canUseFeature("patient_number") ? patient.patientNumber : "—"}</td>
      <td><button class="table-link" type="button" data-open-patient="${patient.id}">${patient.name}</button></td>
      <td>${profileTypeLabel(patient.profileType)}</td>
      <td>${canUseFeature("see_mobile") ? (patient.phone || "-") : "مخفي"}</td>
      <td>${patient.category || "-"}</td>
      <td>${patientEntries(patient).length}</td>
      <td>${patientBookings(patient).length}</td>
      <td>${displayDate(patientLastActivity(patient)) || "-"}</td>
    </tr>
  `).join("") : `<tr><td colspan="8">${isEnglish ? "No matching patient files." : "لا توجد ملفات مطابقة."}</td></tr>`;
  return `
    ${reportHeader(isEnglish ? "Patients & Visitors Directory" : "دليل المرضى والزوار", isEnglish ? "A searchable operational directory linked to each patient's activity." : "دليل تشغيلي قابل للبحث ومرتبط بنشاط كل ملف.")}
    <div class="table-wrap report-table">
      <table>
        <thead><tr><th>${isEnglish ? "File #" : "رقم الملف"}</th><th>${isEnglish ? "Name" : "الاسم"}</th><th>${isEnglish ? "Type" : "النوع"}</th><th>${isEnglish ? "Phone" : "الهاتف"}</th><th>${isEnglish ? "Category" : "الفئة"}</th><th>${isEnglish ? "Operations" : "العمليات"}</th><th>${isEnglish ? "Bookings" : "الحجوزات"}</th><th>${isEnglish ? "Last activity" : "آخر نشاط"}</th></tr></thead>
        <tbody>${body}</tbody>
      </table>
    </div>
  `;
}

function renderReportVisuals(entries, bookings, patients, universalItems, expenses = []) {
  if (!els.reportVisuals) return;
  const serviceMap = new Map();
  entries.forEach(entry => {
    const key = serviceLabel(entry);
    serviceMap.set(key, (serviceMap.get(key) || 0) + paidAmount(entry));
  });
  bookings.forEach(booking => {
    const key = serviceLabel(booking);
    if (!serviceMap.has(key)) serviceMap.set(key, 0);
  });
  const services = [...serviceMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxService = Math.max(...services.map(([, value]) => value), 1);
  const statusMap = new Map();
  [...entries, ...bookings].forEach(item => {
    const label = "time" in item ? bookingStatusLabel(item.status) : entryStatusLabel(item.status);
    statusMap.set(label, (statusMap.get(label) || 0) + 1);
  });
  const statuses = [...statusMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxStatus = Math.max(...statuses.map(([, value]) => value), 1);
  const profitSummary = clinicProfitSummary(entries, expenses);

  const serviceBars = services.length ? services.map(([label, value]) => `
    <div class="report-bar-row">
      <span>${label}</span>
      <div><i style="--report-bar:${(value / maxService) * 100}%"></i></div>
      <strong>${canViewSensitive() ? money(value) : entries.filter(entry => serviceLabel(entry) === label).length}</strong>
    </div>
  `).join("") : `<div class="empty-state">لا توجد بيانات خدمات ضمن النطاق.</div>`;
  const statusBars = statuses.length ? statuses.map(([label, value]) => `
    <div class="report-bar-row status">
      <span>${label}</span>
      <div><i style="--report-bar:${(value / maxStatus) * 100}%"></i></div>
      <strong>${value}</strong>
    </div>
  `).join("") : `<div class="empty-state">لا توجد حالات ضمن النطاق.</div>`;

  els.reportVisuals.innerHTML = `
    <div class="report-summary-strip">
      <div><span>نتائج البحث</span><strong>${universalItems.length}</strong></div>
      <div><span>العمليات</span><strong>${entries.length}</strong></div>
      <div><span>الحجوزات</span><strong>${bookings.length}</strong></div>
      <div><span>المرضى والزوار</span><strong>${patients.length}</strong></div>
      <div><span>المدفوع</span><strong>${canViewSensitive() ? money(profitSummary.collected) : "مخفي"}</strong></div>
      <div><span>غير مدفوع</span><strong>${canViewSensitive() ? money(profitSummary.unpaid) : "مخفي"}</strong></div>
      <div><span>ربح العيادة</span><strong>${canViewSensitive() ? money(profitSummary.profit) : "مخفي"}</strong></div>
    </div>
    <div class="report-chart-grid">
      <div class="report-chart-block"><h3>الخدمات حسب المدفوع</h3>${serviceBars}</div>
      <div class="report-chart-block"><h3>توزيع الحالات</h3>${statusBars}</div>
    </div>
  `;
}

function renderReconciliationReport(entries) {
  const isEnglish = currentLanguage() === "en";
  const label = isEnglish
    ? {
      title: "Patient & Payment Reconciliation",
      subtitle: "Review patient payments and procedure totals with clear exceptions.",
      paidTotal: "Total paid",
      proceduresTotal: "Total procedures",
      difference: "Difference",
      needsReview: "Needs review",
      matched: "Matched",
      patientCount: "Patients",
      patient: "Patient",
      paid: "Paid",
      procedures: "Procedures",
      balance: "Balance",
      status: "Status",
      empty: "No reconciliation data yet.",
      match: "Match",
      overpaid: "Overpaid",
      underpaid: "Underpaid"
    }
    : {
      title: "مطابقة المرضى والمدفوعات",
      subtitle: "مراجعة مدفوعات المرضى وإجمالي الإجراءات مع إظهار الاستثناءات بوضوح.",
      paidTotal: "إجمالي المدفوع",
      proceduresTotal: "إجمالي الإجراءات",
      difference: "الفرق",
      needsReview: "يحتاج مراجعة",
      matched: "مطابق",
      patientCount: "عدد المرضى",
      patient: "المريض",
      paid: "المدفوع",
      procedures: "الإجراءات",
      balance: "الرصيد",
      status: "الحالة",
      empty: "لا توجد بيانات للمطابقة.",
      match: "مطابق",
      overpaid: "زيادة دفع",
      underpaid: "ناقص دفع"
    };
  const rows = patientReconciliationRows(entries);
  const paid = rows.reduce((sum, row) => sum + row.paid, 0);
  const procedures = rows.reduce((sum, row) => sum + row.procedures, 0);
  const difference = paid - procedures;
  const body = rows.length ? rows.map(row => `
    <tr class="${row.className}">
      <td>${row.patient}</td>
      <td>${money(row.paid)}</td>
      <td>${money(row.procedures)}</td>
      <td><strong>${money(row.balance)}</strong></td>
      <td><span class="status-pill ${row.className === "match" ? "good" : row.className === "overpaid" ? "warn" : "bad"}">${row.status}</span></td>
    </tr>
  `).join("") : `<tr><td colspan="5">${label.empty}</td></tr>`;

  return `
    ${reportHeader(label.title, label.subtitle)}
    ${reportKpis([
      { label: label.paidTotal, value: money(paid) },
      { label: label.proceduresTotal, value: money(procedures) },
      { label: label.difference, value: money(difference), note: Math.abs(difference) < 0.01 ? label.matched : label.needsReview },
      { label: label.patientCount, value: rows.length }
    ])}
    <div class="table-wrap report-table">
      <table>
        <thead>
          <tr>
            <th>${label.patient}</th>
            <th>${label.paid}</th>
            <th>${label.procedures}</th>
            <th>${label.balance}</th>
            <th>${label.status}</th>
          </tr>
        </thead>
        <tbody>${body}</tbody>
      </table>
    </div>
    <div class="report-legend">
      <span class="match">${label.match}</span>
      <span class="overpaid">${label.overpaid}</span>
      <span class="underpaid">${label.underpaid}</span>
    </div>
  `;
}

function renderCashReconciliationReport(records, allRecords = records) {
  const isEnglish = currentLanguage() === "en";
  const label = isEnglish
    ? {
      title: "Daily Cash Reconciliation Ledger",
      subtitle: "Every close attempt is registered with exact time, expected totals, counted money, and the reason to review mismatches.",
      attempts: "Close attempts",
      matched: "Matched",
      mismatch: "Needs review",
      totalDiff: "Total difference",
      dateTime: "Date / time",
      status: "Status",
      cash: "Cash",
      card: "Card",
      transfer: "Transfer",
      total: "Total diff",
      by: "By",
      note: "Note",
      why: "Why",
      expected: "Expected",
      counted: "Counted",
      diff: "Diff",
      empty: "No daily closes in this range yet.",
      details: "Mismatch details",
      currentDay: "Current day operations now"
    }
    : {
      title: "سجل المطابقة اليومية",
      subtitle: "كل محاولة إغلاق محفوظة بالوقت الدقيق، والمتوقع، والموجود، وسبب المراجعة عند وجود فرق.",
      attempts: "محاولات الإغلاق",
      matched: "مطابق",
      mismatch: "يحتاج مراجعة",
      totalDiff: "إجمالي الفرق",
      dateTime: "التاريخ / الوقت",
      status: "الحالة",
      cash: "الكاش",
      card: "الفيزا",
      transfer: "التحويل",
      total: "فرق الإجمالي",
      by: "بواسطة",
      note: "الملاحظة",
      why: "سبب الفرق",
      expected: "المتوقع",
      counted: "الموجود",
      diff: "الفرق",
      empty: "لا توجد إغلاقات يومية ضمن هذا النطاق بعد.",
      details: "تفاصيل الفرق",
      currentDay: "عمليات هذا اليوم حالياً"
    };
  const matched = allRecords.filter(record => record.status === "matched").length;
  const mismatch = allRecords.length - matched;
  const totalDiff = allRecords.reduce((sum, record) => sum + numberValue(record.totalDiff), 0);
  const methodCell = (expected, counted, diff) => `
    <div class="reconcile-method-cell">
      <span>${label.expected}: ${money(expected)}</span>
      <span>${label.counted}: ${money(counted)}</span>
      <strong class="${Math.abs(numberValue(diff)) < 0.01 ? "match" : "mismatch"}">${label.diff}: ${money(diff)}</strong>
    </div>
  `;
  const rows = records.length ? records.map(record => {
    const currentTotals = totalsForDateFromEntries(state.entries || [], record.date);
    const details = [
      `${label.cash}: ${label.expected} ${money(record.expectedCash)} | ${label.counted} ${money(record.countedCash)} | ${label.diff} ${money(record.diffCash)}`,
      `${label.card}: ${label.expected} ${money(record.expectedCard)} | ${label.counted} ${money(record.countedCard)} | ${label.diff} ${money(record.diffCard)}`,
      `${label.transfer}: ${label.expected} ${money(record.expectedTransfer)} | ${label.counted} ${money(record.countedTransfer)} | ${label.diff} ${money(record.diffTransfer)}`,
      `${label.currentDay}: ${currentTotals.count} / ${money(currentTotals.paid)}`
    ];
    return `
      <tr class="${record.status === "matched" ? "match" : "mismatch"}">
        <td>
          <strong>${displayDate(record.date)}</strong>
          <small>${displayDateTimeMinute(record.createdAt)}</small>
        </td>
        <td><span class="status-pill ${reconciliationStatusClass(record.status)}">${reconciliationStatusLabel(record.status)}</span></td>
        <td>${methodCell(record.expectedCash, record.countedCash, record.diffCash)}</td>
        <td>${methodCell(record.expectedCard, record.countedCard, record.diffCard)}</td>
        <td>${methodCell(record.expectedTransfer, record.countedTransfer, record.diffTransfer)}</td>
        <td><strong>${money(record.totalDiff)}</strong></td>
        <td>${record.createdBy || "-"}</td>
        <td>${record.note || "-"}</td>
        <td>
          <details class="reconcile-audit-details">
            <summary>${label.details}</summary>
            ${details.map(item => `<p>${item}</p>`).join("")}
          </details>
        </td>
      </tr>
    `;
  }).join("") : `<tr><td colspan="9">${label.empty}</td></tr>`;

  return `
    ${reportHeader(label.title, label.subtitle)}
    ${reportKpis([
      { label: label.attempts, value: allRecords.length },
      { label: label.matched, value: matched },
      { label: label.mismatch, value: mismatch },
      { label: label.totalDiff, value: money(totalDiff), note: mismatch ? label.mismatch : label.matched }
    ])}
    <div class="report-note reconciliation-report-note">
      ${isEnglish
        ? "Each row is a snapshot at close time. If later operations change, register a new close instead of editing the old one."
        : "كل صف هو لقطة وقت الإغلاق. إذا تغيرت عمليات اليوم لاحقاً، سجّل إغلاقاً جديداً بدلاً من تعديل الإغلاق القديم."}
    </div>
    <div class="table-wrap report-table reconciliation-report-table">
      <table>
        <thead>
          <tr>
            <th>${label.dateTime}</th>
            <th>${label.status}</th>
            <th>${label.cash}</th>
            <th>${label.card}</th>
            <th>${label.transfer}</th>
            <th>${label.total}</th>
            <th>${label.by}</th>
            <th>${label.note}</th>
            <th>${label.why}</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function renderByPatientReport(entries) {
  const isEnglish = currentLanguage() === "en";
  const label = isEnglish
    ? {
      title: "By Patient Report",
      subtitle: "Every operation grouped by patient with a clear subtotal for review and printing.",
      date: "Date",
      patient: "Patient",
      treatment: "Treatment",
      payment: "Payment Method",
      paid: "Paid",
      cost: "Cost",
      profit: "Profit",
      status: "Status",
      subtotal: "Subtotal",
      operations: "operations",
      empty: "No operations for this date."
    }
    : {
      title: "تقرير حسب المريض",
      subtitle: "يعرض كل عملية تحت اسم المريض مع إجماليات واضحة للمراجعة والطباعة.",
      date: "التاريخ",
      patient: "المريض",
      treatment: "العلاج",
      payment: "طريقة الدفع",
      paid: "المدفوع",
      cost: "التكلفة",
      profit: "الربح",
      status: "الحالة",
      subtotal: "Subtotal",
      operations: "عملية",
      empty: "لا توجد عمليات لهذا التاريخ."
    };
  const groups = new Map();
  billableEntries(entries).forEach(entry => {
    if (!groups.has(entry.patient)) groups.set(entry.patient, []);
    groups.get(entry.patient).push(entry);
  });
  const body = [...groups.entries()].map(([patient, patientEntries]) => {
    const rows = patientEntries.map(entry => `
      <tr>
        <td>${displayDate(entry.date)}</td>
        <td>${patient}</td>
        <td>${serviceLabel(entry)}</td>
        <td>${entryPaymentLabel(entry)}</td>
        <td>${money(paidAmount(entry))}</td>
        <td>${money(entryCost(entry))}</td>
        <td>${money(profitAmount(entry))}</td>
        <td>${entryStatusLabel(entry.status)}</td>
      </tr>
    `).join("");
    const subtotal = patientEntries.reduce((sum, entry) => sum + paidAmount(entry), 0);
    const cost = patientEntries.reduce((sum, entry) => sum + entryCost(entry), 0);
    return `${rows}
      <tr class="subtotal-row">
        <td colspan="4">${label.subtotal} | ${patient}</td>
        <td>${money(subtotal)}</td>
        <td>${money(cost)}</td>
        <td>${money(subtotal - cost)}</td>
        <td>${patientEntries.length} ${label.operations}</td>
      </tr>`;
  }).join("") || `<tr><td colspan="8">${label.empty}</td></tr>`;

  return `
    ${reportHeader(label.title, label.subtitle)}
    <div class="table-wrap report-table">
      <table>
        <thead>
          <tr>
            <th>${label.date}</th>
            <th>${label.patient}</th>
            <th>${label.treatment}</th>
            <th>${label.payment}</th>
            <th>${label.paid}</th>
            <th>${label.cost}</th>
            <th>${label.profit}</th>
            <th>${label.status}</th>
          </tr>
        </thead>
        <tbody>${body}</tbody>
      </table>
    </div>
  `;
}

// Period comparison: current window vs the immediately-preceding equal-length
// window, with ▲/▼ deltas on revenue, operation count, and average ticket.
function periodComparisonStrip(from, to, filters) {
  if (!from || !to) return "";
  const isEnglish = currentLanguage() === "en";
  const dayMs = 86400000;
  const start = new Date(from + "T12:00:00").getTime();
  const end = new Date(to + "T12:00:00").getTime();
  const spanDays = Math.max(1, Math.round((end - start) / dayMs) + 1);
  const prevTo = new Date(start - dayMs).toISOString().slice(0, 10);
  const prevFrom = new Date(start - spanDays * dayMs).toISOString().slice(0, 10);
  const metric = rows => {
    const revenue = rows.reduce((sum, entry) => sum + paidAmount(entry), 0);
    return { revenue, count: rows.length, avg: rows.length ? revenue / rows.length : 0 };
  };
  const cur = metric(billableEntries(entriesForDateRange(from, to).filter(entry => entryMatchesReportFilters(entry, filters))));
  const prev = metric(billableEntries(entriesForDateRange(prevFrom, prevTo).filter(entry => entryMatchesReportFilters(entry, filters))));
  const cell = (labelAr, labelEn, value, now, before) => {
    let dir = "flat", text = "0%";
    if (!before) { dir = now ? "up" : "flat"; text = now ? (isEnglish ? "new" : "جديد") : "—"; }
    else { const pct = Math.round((now - before) / before * 100); dir = pct > 0 ? "up" : pct < 0 ? "down" : "flat"; text = `${Math.abs(pct)}%`; }
    const arrow = dir === "up" ? "▲" : dir === "down" ? "▼" : "—";
    return `<div class="cmp-cell ${dir}"><span>${isEnglish ? labelEn : labelAr}</span><strong>${value}</strong><em class="cmp-delta">${arrow} ${text}</em></div>`;
  };
  const note = isEnglish ? `vs ${prevFrom} → ${prevTo}` : `مقابل ${displayDate(prevFrom)} – ${displayDate(prevTo)}`;
  return `
    <div class="report-comparison">
      <div class="cmp-head"><span>${isEnglish ? "Compared to previous period" : "مقارنة بالفترة السابقة"}</span><em>${note}</em></div>
      <div class="cmp-cells">
        ${cell("المحصّل", "Revenue", money(cur.revenue), cur.revenue, prev.revenue)}
        ${cell("عدد العمليات", "Operations", cur.count, cur.count, prev.count)}
        ${cell("متوسط العملية", "Avg ticket", money(cur.avg), cur.avg, prev.avg)}
      </div>
    </div>`;
}

// Revenue-over-time trend for a report's entries. Buckets by the data's actual
// span (daily up to ~31 days, otherwise grouped so there are ≤ ~26 points) and
// reuses the dashboard's .trend-* SVG styling.
function reportTrendChart(entries) {
  const rows = billableEntries(entries).filter(entry => entry.date);
  const dates = rows.map(entry => entry.date).sort();
  if (new Set(dates).size < 2) return "";
  const showSensitive = canViewSensitive();
  const dayMs = 86400000;
  const start = new Date(dates[0] + "T12:00:00").getTime();
  const end = new Date(dates[dates.length - 1] + "T12:00:00").getTime();
  const totalDays = Math.max(1, Math.round((end - start) / dayMs) + 1);
  const bucketDays = totalDays <= 31 ? 1 : Math.ceil(totalDays / 26);
  const buckets = [];
  for (let offset = 0; offset < totalDays; offset += bucketDays) {
    const bStart = start + offset * dayMs;
    buckets.push({ start: bStart, end: bStart + bucketDays * dayMs, date: new Date(bStart).toISOString().slice(0, 10), paid: 0, count: 0 });
  }
  rows.forEach(entry => {
    const time = new Date(entry.date + "T12:00:00").getTime();
    let bucket = buckets.find(item => time >= item.start && time < item.end);
    if (!bucket) bucket = time < buckets[0].start ? buckets[0] : buckets[buckets.length - 1];
    bucket.paid += paidAmount(entry);
    bucket.count += 1;
  });
  const values = buckets.map(bucket => showSensitive ? bucket.paid : bucket.count);
  if (!values.reduce((sum, value) => sum + value, 0)) return "";
  const width = 780, height = 220;
  const pad = { top: 26, right: 18, bottom: 34, left: 18 };
  const maximum = Math.max(...values, 1);
  const usableWidth = width - pad.left - pad.right;
  const usableHeight = height - pad.top - pad.bottom;
  const points = values.map((value, index) => ({
    x: pad.left + (buckets.length === 1 ? usableWidth / 2 : index * usableWidth / (buckets.length - 1)),
    y: pad.top + usableHeight - (value / maximum) * usableHeight,
    value, date: buckets[index].date
  }));
  const line = points.map(point => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");
  const area = `${pad.left},${pad.top + usableHeight} ${line} ${pad.left + usableWidth},${pad.top + usableHeight}`;
  const formatter = new Intl.DateTimeFormat(currentLanguage() === "en" ? "en-US" : "ar-JO-u-nu-latn", { day: "numeric", month: "numeric" });
  const grid = [0, 0.25, 0.5, 0.75, 1].map(portion => {
    const y = pad.top + usableHeight * portion;
    return `<line class="trend-grid" x1="${pad.left}" y1="${y}" x2="${pad.left + usableWidth}" y2="${y}"></line>`;
  }).join("");
  const step = Math.max(1, Math.ceil(points.length / 8));
  const title = currentLanguage() === "en" ? "Revenue trend" : "اتجاه الإيراد";
  const totalPaid = buckets.reduce((sum, bucket) => sum + bucket.paid, 0);
  return `
    <div class="report-trend">
      <div class="report-trend-head"><span>${title}</span><strong>${showSensitive ? money(totalPaid) : values.reduce((sum, value) => sum + value, 0)}</strong></div>
      <svg class="trend-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="${title}">
        ${grid}
        <polygon class="trend-area" points="${area}"></polygon>
        <polyline class="trend-line" points="${line}"></polyline>
        ${points.map((point, index) => `
          <circle class="trend-dot" cx="${point.x}" cy="${point.y}" r="3.5"></circle>
          ${index % step === 0 || index === points.length - 1 ? `<text class="trend-value" text-anchor="middle" x="${point.x}" y="${Math.max(point.y - 9, 12)}">${showSensitive ? Math.round(point.value) : point.value}</text>` : ""}
          ${index % step === 0 || index === points.length - 1 ? `<text class="trend-label" text-anchor="middle" x="${point.x}" y="${height - 10}">${formatter.format(new Date(point.date + "T12:00:00"))}</text>` : ""}
        `).join("")}
      </svg>
    </div>`;
}

// Aggregated breakdown of operations by a chosen dimension (category / service /
// payment method / team), with subtotals, share %, and a grand-total row.
let operationsBreakdownDim = "category";
const BREAKDOWN_DIMS = [
  { key: "category", label: "الفئة", keyFn: entry => entryCategory(entry) || "بدون فئة" },
  { key: "service", label: "الخدمة", keyFn: entry => serviceLabel(entry) || "—" },
  { key: "payment", label: "طريقة الدفع", keyFn: entry => entryPaymentLabel(entry) || "—" },
  { key: "team", label: "الفريق", keyFn: entry => {
    const names = [getStaffMember(entry.doctorId)?.name, getStaffMember(entry.specialistId)?.name].filter(Boolean);
    return names.length ? names.join(" / ") : "بانتظار التعيين";
  } }
];

function reportBreakdown(entries) {
  const dim = BREAKDOWN_DIMS.find(item => item.key === operationsBreakdownDim) || BREAKDOWN_DIMS[0];
  const rows = billableEntries(entries);
  const groups = new Map();
  rows.forEach(entry => {
    const key = dim.keyFn(entry);
    const group = groups.get(key) || { key, count: 0, paid: 0, cost: 0, profit: 0, serviceId: "" };
    group.count += 1;
    group.paid += paidAmount(entry);
    group.cost += entryCost(entry);
    group.profit += profitAmount(entry);
    if (dim.key === "service" && entry.serviceId) group.serviceId = entry.serviceId;
    groups.set(key, group);
  });
  const list = [...groups.values()].sort((a, b) => b.paid - a.paid);
  const grand = list.reduce((total, group) => ({
    count: total.count + group.count, paid: total.paid + group.paid,
    cost: total.cost + group.cost, profit: total.profit + group.profit
  }), { count: 0, paid: 0, cost: 0, profit: 0 });
  const maxPaid = Math.max(1, ...list.map(group => group.paid));
  const tabs = BREAKDOWN_DIMS.map(item =>
    `<button type="button" class="breakdown-tab${item.key === dim.key ? " active" : ""}" data-breakdown-dim="${item.key}">${item.label}</button>`
  ).join("");
  const canEditService = dim.key === "service" && canViewSensitive();
  const bodyRows = list.length ? list.map(group => {
    const editable = canEditService && group.serviceId;
    return `
    <tr${editable ? ` class="report-edit-row" data-edit-service="${group.serviceId}" title="اضغط لتعديل الخدمة"` : ""}>
      <td><div class="breakdown-bar" style="--bar:${Math.round(group.paid / maxPaid * 100)}%"><span>${group.key}</span></div></td>
      <td>${group.count}</td>
      <td>${money(group.paid)}</td>
      <td>${money(group.cost)}</td>
      <td>${money(group.profit)}</td>
      <td>${grand.paid ? Math.round(group.paid / grand.paid * 100) : 0}%</td>
    </tr>`; }).join("") : `<tr><td colspan="6" class="report-empty">لا توجد بيانات للتوزيع.</td></tr>`;
  return `
    <div class="report-breakdown">
      <div class="breakdown-head">
        <span class="breakdown-title">التوزيع حسب${canEditService ? " · اضغط على خدمة لتعديلها" : ""}</span>
        <div class="breakdown-tabs">${tabs}</div>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>${dim.label}</th><th>عدد</th><th>المحصّل</th><th>التكلفة</th><th>الربح</th><th>الحصة</th></tr></thead>
          <tbody>${bodyRows}</tbody>
          <tfoot><tr><th>الإجمالي</th><th>${grand.count}</th><th>${money(grand.paid)}</th><th>${money(grand.cost)}</th><th>${money(grand.profit)}</th><th>100%</th></tr></tfoot>
        </table>
      </div>
    </div>`;
}

function renderPerProcedureReport(entries, allEntries = entries) {
  const isEnglish = currentLanguage() === "en";
  const label = isEnglish
    ? {
      title: "Per Procedure Report",
      subtitle: "A direct list of each procedure with payment, cost, profit, and linked team.",
      operationCount: "Operations",
      netRevenue: "Collected",
      directCost: "Direct cost",
      profitBeforePayouts: "Profit before payouts",
      date: "Date",
      patient: "Patient",
      treatment: "Treatment",
      team: "Team",
      payment: "Payment",
      paid: "Paid",
      cost: "Cost",
      profit: "Profit",
      pendingAssignment: "Pending assignment",
      empty: "No operations for this date."
    }
    : {
      title: "تقرير كل عملية",
      subtitle: "قائمة مباشرة لكل إجراء مع الدفع والتكلفة والربح والفريق المرتبط.",
      operationCount: "عدد العمليات",
      netRevenue: "المدفوع",
      directCost: "الكلفة المباشرة",
      profitBeforePayouts: "الربح قبل المستحقات",
      date: "التاريخ",
      patient: "المريض",
      treatment: "العلاج",
      team: "الفريق",
      payment: "الدفع",
      paid: "المدفوع",
      cost: "التكلفة",
      profit: "الربح",
      pendingAssignment: "بانتظار التعيين",
      empty: "لا توجد عمليات لهذا التاريخ."
    };
  const rows = billableEntries(entries);
  const allRows = billableEntries(allEntries);
  const totals = totalsFor(allRows);
  const body = rows.length ? rows.map((entry, index) => {
    const doctor = getStaffMember(entry.doctorId);
    const specialist = getStaffMember(entry.specialistId);
    const rowPatient = getPatient(entry.patientId) || findPatientByName(entry.patient);
    return `
      <tr class="report-edit-row" data-edit-entry="${entry.id}" title="اضغط للتعديل">
        <td>${index + 1}</td>
        <td>${displayDate(entry.date)}</td>
        <td><span class="cell-with-avatar">${genderAvatar(rowPatient || entry, 30)}${entry.patient}</span></td>
        <td>${serviceLabel(entry)}</td>
        <td>${[doctor?.name, specialist?.name].filter(Boolean).join(" / ") || label.pendingAssignment}</td>
        <td>${entryPaymentLabel(entry)}</td>
        <td>${money(paidAmount(entry))}</td>
        <td>${money(entryCost(entry))}</td>
        <td>${money(profitAmount(entry))}</td>
      </tr>
    `;
  }).join("") : `<tr><td colspan="9">${label.empty}</td></tr>`;

  return `
    ${reportHeader(label.title, label.subtitle)}
    ${reportKpis([
      { label: label.operationCount, value: allRows.length },
      { label: label.netRevenue, value: money(totals.paid) },
      { label: label.directCost, value: money(allRows.reduce((sum, entry) => sum + entryCost(entry), 0)) },
      { label: label.profitBeforePayouts, value: money(allRows.reduce((sum, entry) => sum + profitAmount(entry), 0)) }
    ])}
    ${reportTrendChart(allEntries)}
    ${reportBreakdown(allEntries)}
    <div class="table-wrap report-table">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>${label.date}</th>
            <th>${label.patient}</th>
            <th>${label.treatment}</th>
            <th>${label.team}</th>
            <th>${label.payment}</th>
            <th>${label.paid}</th>
            <th>${label.cost}</th>
            <th>${label.profit}</th>
          </tr>
        </thead>
        <tbody>${body}</tbody>
      </table>
    </div>
  `;
}

function renderBookingsReport(bookings) {
  const isEnglish = currentLanguage() === "en";
  const label = isEnglish
    ? {
      title: "Bookings & Schedule Report",
      subtitle: "Track bookings, statuses, and expected team for each appointment.",
      todayBookings: "Bookings",
      confirmedArrived: "Confirmed/arrived",
      pendingFollowup: "Pending follow-up",
      expectedValue: "Expected value",
      time: "Time",
      patient: "Patient",
      phone: "Phone",
      service: "Service",
      team: "Team",
      expected: "Expected",
      status: "Status",
      notes: "Notes",
      pendingAssignment: "Pending assignment",
      empty: "No bookings for this date."
    }
    : {
      title: "تقرير الحجوزات والجدول",
      subtitle: "متابعة الحجوزات، الحالات، والفريق المتوقع لكل موعد.",
      todayBookings: "الحجوزات",
      confirmedArrived: "مؤكد/وصل",
      pendingFollowup: "بانتظار متابعة",
      expectedValue: "القيمة المتوقعة",
      time: "الوقت",
      patient: "المريض",
      phone: "الهاتف",
      service: "الخدمة",
      team: "الفريق",
      expected: "المتوقع",
      status: "الحالة",
      notes: "ملاحظات",
      pendingAssignment: "بانتظار التعيين",
      empty: "لا توجد حجوزات لهذا التاريخ."
    };
  const rows = bookings;
  const expected = rows
    .filter(booking => !["cancelled", "no_show"].includes(booking.status))
    .reduce((sum, booking) => sum + numberValue(booking.expectedAmount), 0);
  const body = rows.length ? rows.map(booking => {
    const doctor = getStaffMember(booking.doctorId);
    const specialist = getStaffMember(booking.specialistId);
    return `
      <tr>
        <td>${booking.time}</td>
        <td>${booking.patient}</td>
        <td>${canUseFeature("see_mobile") ? (booking.phone || "-") : "مخفي"}</td>
        <td>${serviceLabel(booking)}</td>
        <td>${[doctor?.name, specialist?.name].filter(Boolean).join(" / ") || label.pendingAssignment}</td>
        <td>${money(booking.expectedAmount)}</td>
        <td><span class="status-pill ${statusClass(booking.status)}">${bookingStatusLabel(booking.status)}</span></td>
        <td>${booking.notes || "-"}</td>
      </tr>
    `;
  }).join("") : `<tr><td colspan="8">${label.empty}</td></tr>`;

  return `
    ${reportHeader(label.title, label.subtitle)}
    ${reportKpis([
      { label: label.todayBookings, value: rows.length },
      { label: label.confirmedArrived, value: rows.filter(booking => ["confirmed", "arrived"].includes(booking.status)).length },
      { label: label.pendingFollowup, value: rows.filter(booking => booking.status === "scheduled").length },
      { label: label.expectedValue, value: money(expected) }
    ])}
    <div class="table-wrap report-table">
      <table>
        <thead>
          <tr>
            <th>${label.time}</th>
            <th>${label.patient}</th>
            <th>${label.phone}</th>
            <th>${label.service}</th>
            <th>${label.team}</th>
            <th>${label.expected}</th>
            <th>${label.status}</th>
            <th>${label.notes}</th>
          </tr>
        </thead>
        <tbody>${body}</tbody>
      </table>
    </div>
  `;
}

function renderCostsReport(services = state.services) {
  const isEnglish = currentLanguage() === "en";
  const label = isEnglish
    ? {
      title: "Cost List",
      subtitle: "A quick reference for default pricing and direct cost before entering operations.",
      service: "Service",
      defaultPrice: "Default price",
      defaultCost: "Default cost",
      margin: "Margin before payouts",
      status: "Status",
      inactive: "Inactive",
      active: "Active",
      empty: "No services yet."
    }
    : {
      title: "قائمة التكاليف",
      subtitle: "مرجع سريع للتكلفة الافتراضية والسعر قبل إدخال العمليات.",
      service: "الخدمة",
      defaultPrice: "السعر الافتراضي",
      defaultCost: "التكلفة الافتراضية",
      margin: "الهامش قبل المستحقات",
      status: "الحالة",
      inactive: "متوقفة",
      active: "فعالة",
      empty: "لا توجد خدمات بعد."
    };
  const rows = services.map(service => `
    <tr>
      <td>${service.name}</td>
      <td>${money(service.defaultPrice)}</td>
      <td>${money(service.defaultCost)}</td>
      <td>${money(numberValue(service.defaultPrice) - numberValue(service.defaultCost))}</td>
      <td><span class="status-pill ${service.active === false ? "bad" : "good"}">${service.active === false ? label.inactive : label.active}</span></td>
    </tr>
  `).join("") || `<tr><td colspan="5">${label.empty}</td></tr>`;

  return `
    ${reportHeader(label.title, label.subtitle)}
    <div class="table-wrap report-table">
      <table>
        <thead>
          <tr>
            <th>${label.service}</th>
            <th>${label.defaultPrice}</th>
            <th>${label.defaultCost}</th>
            <th>${label.margin}</th>
            <th>${label.status}</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function renderAssignmentsReport(entries) {
  const isEnglish = currentLanguage() === "en";
  const label = isEnglish
    ? {
      title: "Specialist Assignments",
      subtitle: "Count of operations linked to each specialist, with a separate pending-assignment queue.",
      specialistOperations: "Specialist operations",
      specialists: "Specialists",
      pendingAssignment: "Pending assignment",
      todayNotice: "Today notice",
      noSpecialists: "No specialist-linked operations for this date.",
      specialist: "Specialist",
      operations: "Operations",
      linkedRevenue: "Linked revenue",
      payout: "Payout",
      rate: "Rate",
      needsAssignment: "Operations Needing Assignment",
      patient: "Patient",
      service: "Service",
      payment: "Payment",
      status: "Status",
      notes: "Notes",
      hidden: "Hidden",
      noSigned: "No specialist-signed operations",
      noPending: "No operations are pending assignment."
    }
    : {
      title: "تعيين الأخصائيين",
      subtitle: "ملخص عدد العمليات المرتبطة بكل أخصائي، مع قائمة منفصلة لما يحتاج تعيين.",
      specialistOperations: "عمليات الأخصائيين",
      specialists: "عدد الأخصائيين",
      pendingAssignment: "بانتظار التعيين",
      todayNotice: "تنبيه اليوم",
      noSpecialists: "لا توجد عمليات مرتبطة بالأخصائيين لهذا التاريخ.",
      specialist: "الأخصائي",
      operations: "عدد العمليات",
      linkedRevenue: "الإيراد المرتبط",
      payout: "المستحق",
      rate: "النسبة",
      needsAssignment: "عمليات تحتاج تعيين",
      patient: "المريض",
      service: "الخدمة",
      payment: "الدفع",
      status: "الحالة",
      notes: "ملاحظات",
      hidden: "مخفي",
      noSigned: "لا توجد عمليات موقعة للأخصائيين",
      noPending: "لا توجد عمليات بانتظار التعيين."
    };
  const rows = specialistAssignmentRows(entries);
  const unassigned = unassignedEntries(entries);
  const body = rows.length ? rows.map(row => `
    <tr>
      <td>${row.member.name}</td>
      <td>${row.operations}</td>
      <td>${canViewSensitive() ? money(row.revenue) : label.hidden}</td>
      <td>${canViewSensitive() ? money(row.payout) : label.hidden}</td>
      <td>${row.member.rate}%</td>
    </tr>
  `).join("") : `<tr><td colspan="5">${label.noSpecialists}</td></tr>`;
  const reviewRows = unassigned.length ? unassigned.map(entry => `
    <tr>
      <td>${entry.patient}</td>
      <td>${serviceLabel(entry)}</td>
      <td>${entryPaymentLabel(entry)}</td>
      <td>${entryStatusLabel(entry.status)}</td>
      <td>${entry.notes || "-"}</td>
    </tr>
  `).join("") : `<tr><td colspan="5">${label.noPending}</td></tr>`;

  return `
    ${reportHeader(label.title, label.subtitle)}
    ${reportKpis([
      { label: label.specialistOperations, value: rows.reduce((sum, row) => sum + row.operations, 0) },
      { label: label.specialists, value: rows.length },
      { label: label.pendingAssignment, value: unassigned.length },
      { label: label.todayNotice, value: assignmentSummaryText(entries) || label.noSigned }
    ])}
    <div class="table-wrap report-table">
      <table>
        <thead>
          <tr>
            <th>${label.specialist}</th>
            <th>${label.operations}</th>
            <th>${label.linkedRevenue}</th>
            <th>${label.payout}</th>
            <th>${label.rate}</th>
          </tr>
        </thead>
        <tbody>${body}</tbody>
      </table>
    </div>
    <h4 class="report-subtitle">${label.needsAssignment}</h4>
    <div class="table-wrap report-table">
      <table>
        <thead>
          <tr>
            <th>${label.patient}</th>
            <th>${label.service}</th>
            <th>${label.payment}</th>
            <th>${label.status}</th>
            <th>${label.notes}</th>
          </tr>
        </thead>
        <tbody>${reviewRows}</tbody>
      </table>
    </div>
  `;
}

function renderReportDateControls() {
  if (!els.reportDateFrom || !els.reportDateTo) return;
  const range = normalizeDateRange(
    state.settings.reportDateFrom || state.settings.activeDate,
    state.settings.reportDateTo || state.settings.activeDate
  );
  state.settings.reportDateFrom = range.from;
  state.settings.reportDateTo = range.to;
  els.reportDateFrom.value = range.from;
  els.reportDateTo.value = range.to;
}

/* ─── RETENTION / LTV / CHURN REPORT ─────────────────────────────────────── */
function renderRetentionReport(entries, patients) {
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const CHURN_DAYS = 90;

  /* Per-patient aggregation */
  const map = new Map();
  entries.forEach(entry => {
    const name = entry.patient || "غير محدد";
    const cur = map.get(name) || { name, paid: 0, visits: 0, firstDate: entry.date, lastDate: entry.date };
    cur.paid      += paidAmount(entry);
    cur.visits    += 1;
    if (entry.date && entry.date < cur.firstDate) cur.firstDate = entry.date;
    if (entry.date && entry.date > cur.lastDate)  cur.lastDate  = entry.date;
    map.set(name, cur);
  });

  const rows = [...map.values()].map(r => {
    const ltv      = r.paid;
    const avgVisit = r.visits > 0 ? r.paid / r.visits : 0;
    const daysSince = r.lastDate
      ? Math.floor((today - new Date(r.lastDate + "T12:00:00")) / 86400000)
      : 999;
    const isChurned = daysSince >= CHURN_DAYS && r.visits > 0;
    const isReturned = r.visits > 1;
    return { ...r, ltv, avgVisit, daysSince, isChurned, isReturned };
  });

  const totalPatients  = rows.length;
  const returned       = rows.filter(r => r.isReturned).length;
  const retentionRate  = totalPatients ? Math.round((returned / totalPatients) * 100) : 0;
  const churned        = rows.filter(r => r.isChurned).length;
  const churnRate      = totalPatients ? Math.round((churned / totalPatients) * 100) : 0;
  const avgLtv         = totalPatients ? rows.reduce((s, r) => s + r.ltv, 0) / totalPatients : 0;
  const topPatients    = [...rows].sort((a, b) => b.ltv - a.ltv).slice(0, 10);
  const churnList      = rows.filter(r => r.isChurned).sort((a, b) => b.daysSince - a.daysSince).slice(0, 10);

  return `
    ${reportHeader("الاحتفاظ بالمرضى — LTV والتسرب", "تحليل قيمة كل مريض على المدى البعيد، نسبة العائدين، والمرضى المعرضين للتسرب.")}
    ${reportKpis([
      { label: "معدل الاحتفاظ",  value: `${retentionRate}%`,     note: `${returned} من ${totalPatients} عادوا للعيادة` },
      { label: "معدل التسرب",    value: `${churnRate}%`,          note: `${churned} مريض لم يزور منذ +${CHURN_DAYS} يوم` },
      { label: "متوسط LTV",      value: money(avgLtv),             note: "متوسط الإيراد لكل مريض" },
      { label: "إجمالي المرضى",  value: totalPatients },
    ])}
    <div class="report-two-col">
      <div class="retention-section">
        <h4 class="retention-title">🏆 أعلى 10 مرضى بقيمة مدى الحياة (LTV)</h4>
        <table class="patient-balance-table">
          <thead><tr><th>المريض</th><th>LTV</th><th>الزيارات</th><th>متوسط الزيارة</th><th>آخر زيارة</th></tr></thead>
          <tbody>
            ${topPatients.map(r => `
              <tr>
                <td><strong>${r.name}</strong></td>
                <td class="balance-positive"><strong>${money(r.ltv)}</strong></td>
                <td>${r.visits}</td>
                <td>${money(r.avgVisit)}</td>
                <td>${r.lastDate || "—"}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
      <div class="retention-section">
        <h4 class="retention-title">⚠️ مرضى معرضون للتسرب (لم يزوروا +${CHURN_DAYS} يوم)</h4>
        ${churnList.length ? `
          <table class="patient-balance-table">
            <thead><tr><th>المريض</th><th>آخر زيارة</th><th>منذ</th><th>LTV</th></tr></thead>
            <tbody>
              ${churnList.map(r => `
                <tr class="balance-row balance-row--underpaid">
                  <td><strong>${r.name}</strong></td>
                  <td>${r.lastDate || "—"}</td>
                  <td><span class="remaining-badge">${r.daysSince} يوم</span></td>
                  <td>${money(r.ltv)}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        ` : `<div class="empty-state" style="padding:24px 0">لا يوجد مرضى في خطر التسرب حالياً. 🎉</div>`}
      </div>
    </div>
  `;
}
/* ──────────────────────────────────────────────────────────────────────────── */

// Catalog of every report, shown as the table-first "report center" landing.
const REPORTS_CATALOG = [
  { type: "universal", name: "بحث شامل في العيادة", desc: "نتائج موحّدة من العمليات والحجوزات والمرضى والمصروفات والخدمات.", cat: "op", period: "من / إلى", columns: "المصدر، الحالة، الدفع، الطبيب" },
  { type: "perProcedure", name: "تقرير كل عملية", desc: "قائمة عمليات تفصيلية مع الخدمة والفريق والدفع والمستحقات.", cat: "op", period: "الفترة", columns: "الوقت، المريض، الخدمة، الفريق، الحالة" },
  { type: "packages", name: "تقرير الباقات والجلسات", desc: "بيع الباقات والجلسات المستخدمة والمتبقية وأداء كل موظف.", cat: "op", period: "الفترة", columns: "الموظف، الباقة، الجلسات، المدفوع" },
  { type: "specialist", name: "تقرير الموظفين", desc: "مستحقات ونسب كل أخصائي حسب العمليات المنفّذة.", cat: "op", period: "الفترة", columns: "الموظف، العمليات، المحصّل، المستحق" },
  { type: "byPatient", name: "حسب المريض", desc: "تجميع العمليات والمبالغ والزيارات لكل مريض.", cat: "op", period: "الفترة", columns: "المريض، الزيارات، المحصّل" },
  { type: "audit", name: "سجل التعديلات", desc: "من عدّل، ماذا تغيّر، ومتى — مع فلاتر التاريخ والبحث.", cat: "op", period: "من / إلى", columns: "المستخدم، الإجراء، التفاصيل، الوقت" },
  { type: "profit", name: "التقرير المالي (الأرباح والخسائر)", desc: "الإيراد ناقص التكلفة والمستحقات والمصروفات = صافي الربح.", cat: "fin", period: "الفترة", columns: "الإيراد، التكلفة، المصروف، الصافي" },
  { type: "cash", name: "الكاش والمقبوضات", desc: "المقبوضات حسب كاش وفيزا وتحويل وحالة المطابقة.", cat: "fin", period: "الفترة", columns: "طريقة الدفع، المبلغ، المريض، المطابقة" },
  { type: "patientBalance", name: "ميزان المريض", desc: "المدفوع والمتبقي وآخر تكملة حساب لكل مريض.", cat: "fin", period: "الفترة", columns: "المريض، المدفوع، المستحق، آخر دفعة" },
  { type: "reconciliation", name: "الإغلاق اليومي", desc: "مطابقة الكاش والبطاقة والتحويل لكل يوم عمل.", cat: "fin", period: "الفترة", columns: "اليوم، المتوقع، الفعلي، الفرق" },
  { type: "expenses", name: "المصروفات", desc: "مصروفات العيادة حسب البند والتاريخ والفئة.", cat: "fin", period: "الفترة", columns: "البند، المبلغ، التاريخ، الفئة" },
  { type: "costs", name: "قائمة التكاليف", desc: "تكلفة كل خدمة وحالتها (فعّالة/متوقفة).", cat: "fin", period: "—", columns: "الخدمة، التكلفة، الحالة" },
  { type: "retention", name: "الاحتفاظ بالمرضى — LTV والتسرب", desc: "قيمة المريض والزيارات المتكررة ونسبة الانقطاع.", cat: "ana", period: "السنة", columns: "LTV، آخر زيارة، الزيارات، التسرب" },
  { type: "bookings", name: "الحجوزات والجدول", desc: "الحجوزات وحالاتها والفريق المتوقع لكل موعد.", cat: "ana", period: "الفترة", columns: "الوقت، المريض، الخدمة، الحالة" },
  { type: "patients", name: "دليل المرضى والزوار", desc: "كل الملفات مع التصنيف ومعلومات التواصل.", cat: "ana", period: "الكل", columns: "المريض، الهاتف، الفئة، النوع" },
  { type: "assignments", name: "تعيين الأخصائيين", desc: "العمليات بانتظار تعيين طبيب أو أخصائي.", cat: "ana", period: "الفترة", columns: "المريض، الخدمة، الحالة" }
];
const CATALOG_CATS = [{ key: "all", label: "كل التقارير" }, { key: "op", label: "تشغيلي" }, { key: "fin", label: "مالي" }, { key: "ana", label: "تحليلات" }];
const CATALOG_TAGS = { op: "تشغيلي", fin: "مالي", ana: "تحليلات" };
const CATALOG_FIN_GATED = ["profit", "reconciliation", "patientBalance", "byPatient", "perProcedure", "costs", "expenses", "retention", "packages", "cash", "audit", "specialist"];

function catalogPeriodLabel() {
  const { from, to } = reportDateRange();
  if (!from || !to) return "—";
  return from === to ? displayDate(from) : `${displayDate(from)} – ${displayDate(to)}`;
}

function renderReportCenter() {
  const visible = REPORTS_CATALOG.filter(report => canViewSensitive() || !CATALOG_FIN_GATED.includes(report.type));
  let rows = visible;
  if (catalogCategory !== "all") rows = rows.filter(report => report.cat === catalogCategory);
  if (catalogQuery) rows = rows.filter(report => matchesSmartQuery([report.name, report.desc, report.columns, CATALOG_TAGS[report.cat]], catalogQuery));
  const now = new Date();
  const updated = `اليوم ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const tabs = CATALOG_CATS.map(cat => `<button type="button" class="catalog-tab${cat.key === catalogCategory ? " active" : ""}" data-catalog-cat="${cat.key}">${cat.label}</button>`).join("");
  const body = rows.length ? rows.map(report => `
    <tr>
      <td><span class="catalog-name">${report.name}</span><span class="catalog-desc">${report.desc}</span></td>
      <td><span class="catalog-tag ${report.cat}">${CATALOG_TAGS[report.cat]}</span></td>
      <td>${report.period}</td>
      <td class="catalog-cols">${report.columns}</td>
      <td>${updated}</td>
      <td><span class="catalog-status"><i class="cstatus-dot"></i>جاهز</span></td>
      <td><div class="catalog-actions">
        <button type="button" class="catalog-act open" data-open-report="${report.type}">فتح</button>
        <button type="button" class="catalog-act" data-open-report="${report.type}" data-then-export="xls">XLS</button>
        <button type="button" class="catalog-act" data-open-report="${report.type}" data-then-export="print">طباعة</button>
      </div></td>
    </tr>`).join("") : `<tr><td colspan="7" class="report-empty">لا توجد تقارير مطابقة.</td></tr>`;
  return `
    <div class="report-center">
      <div class="report-center-head">
        <h2>مركز التقارير</h2>
        <p>كل تقرير يظهر كصف واضح — افتحه لتظهر النتائج كجدول قابل للفلترة والتصدير.</p>
      </div>
      <div class="catalog-kpis">
        <div class="catalog-kpi"><span>عدد التقارير</span><strong>${visible.length}</strong></div>
        <div class="catalog-kpi"><span>تشغيلية</span><strong>${visible.filter(r => r.cat === "op").length}</strong></div>
        <div class="catalog-kpi"><span>مالية</span><strong>${visible.filter(r => r.cat === "fin").length}</strong></div>
        <div class="catalog-kpi"><span>تحليلية</span><strong>${visible.filter(r => r.cat === "ana").length}</strong></div>
        <div class="catalog-kpi"><span>الفترة الحالية</span><strong>${catalogPeriodLabel()}</strong></div>
      </div>
      <div class="catalog-toolbar">
        <div class="catalog-tabs">${tabs}</div>
        <input class="catalog-search" type="search" data-catalog-search placeholder="ابحث عن تقرير..." value="${catalogQuery}">
      </div>
      <div class="table-wrap report-table catalog-table">
        <table>
          <thead><tr><th>التقرير</th><th>التصنيف</th><th>الفترة</th><th>الأعمدة الرئيسية</th><th>آخر تحديث</th><th>الحالة</th><th>الإجراء</th></tr></thead>
          <tbody>${body}</tbody>
        </table>
      </div>
    </div>`;
}

// Reports are "table-first": the default landing is a catalog table (one row per
// report). Opening a report shows its filterable, exportable results.
let reportCenterMode = true;
let catalogCategory = "all";
let catalogQuery = "";

function renderReports() {
  if (!els.reportPage || !els.reportSelect) return;
  const panelEl = els.reportPage.closest(".full-report-panel");
  if (panelEl) panelEl.classList.toggle("report-center-mode", reportCenterMode);
  if (reportCenterMode) {
    if (els.reportVisuals) els.reportVisuals.innerHTML = "";
    if (els.reportPagination) els.reportPagination.innerHTML = "";
    els.reportPage.innerHTML = renderReportCenter();
    return;
  }
  const { from, to } = reportDateRange();
  const filters = reportFilterValues();
  const allEntries = (!filters.source || filters.source === "operation")
    ? entriesForDateRange(from, to).filter(entry => entryMatchesReportFilters(entry, filters))
    : [];
  const allBookings = (!filters.source || filters.source === "booking")
    ? bookingsForDateRange(from, to).filter(booking => bookingMatchesReportFilters(booking, filters))
    : [];
  const allPatients = (!filters.source || filters.source === "patient")
    ? (state.patients || []).filter(patient => patientMatchesReportFilters(patient, filters))
    : [];
  const allExpenses = (!filters.source || filters.source === "expense")
    ? expensesForDateRange(from, to).filter(expense => expenseMatchesReportFilters(expense, filters))
    : [];
  const allReconciliations = (!filters.source || filters.source === "operation" || filters.source === "reconciliation")
    ? reconciliationRecordsForDateRange(from, to, filters)
    : [];
  const universalItems = universalReportItems(from, to);
  const reportType = els.reportSelect.value || "reconciliation";
  // Clean Clinica-style layout (filter row + table only) for every report except
  // the detailed/universal search, which keeps its tabs + visuals.
  const reportPanelEl = els.reportPage?.closest(".full-report-panel");
  if (reportPanelEl) reportPanelEl.classList.toggle("report-clean", reportType !== "universal");
  const reportCatFilter = document.querySelector("[data-report-category]");
  if (reportCatFilter) {
    const currentCat = reportCatFilter.value;
    reportCatFilter.innerHTML = `<option value="">كل الفئات</option>`
      + serviceCategories().map(category => `<option value="${category}">${category}</option>`).join("");
    reportCatFilter.value = [...reportCatFilter.options].some(option => option.value === currentCat) ? currentCat : "";
  }
  const financialReports = ["profit", "reconciliation", "patientBalance", "byPatient", "perProcedure", "costs", "expenses", "retention", "packages", "cash", "audit", "specialist"];
  if (!canViewSensitive() && financialReports.includes(reportType)) {
    els.reportVisuals.innerHTML = "";
    els.reportPagination.innerHTML = "";
    els.reportPage.innerHTML = `<div class="empty-state">هذا التقرير يحتوي على معلومات مالية ويحتاج صلاحية مالية.</div>`;
    return;
  }

  const pageSize = filters.pageSize || 25;
  let pagination;
  let content;
  /* Show / hide the doctor filter based on report type */
  const doctorWrap = document.querySelector("[data-report-doctor-wrap]");
  if (doctorWrap) doctorWrap.style.display = reportType === "patientBalance" ? "" : "none";

  if (reportType === "patientBalance") {
    pagination = paginateItems(allEntries, 1, Math.max(allEntries.length, 1));
    content = renderPatientBalanceReport(pagination.items);
  } else if (reportType === "retention") {
    pagination = paginateItems(allEntries, 1, Math.max(allEntries.length, 1));
    content = renderRetentionReport(allEntries, allPatients);
  } else if (reportType === "universal") {
    pagination = paginateItems(universalItems, reportPage, pageSize);
    content = renderUniversalReport(pagination.items);
  } else if (reportType === "patients") {
    pagination = paginateItems(allPatients, reportPage, pageSize);
    content = renderPatientsReport(pagination.items);
  } else if (reportType === "bookings") {
    pagination = paginateItems(allBookings, reportPage, pageSize);
    content = renderBookingsReport(pagination.items);
  } else if (reportType === "expenses") {
    pagination = paginateItems(allExpenses, reportPage, pageSize);
    content = renderExpensesReport(pagination.items);
  } else if (reportType === "profit") {
    pagination = paginateItems(allEntries, 1, Math.max(allEntries.length, 1));
    content = periodComparisonStrip(from, to, filters) + renderProfitReport(allEntries, allExpenses);
  } else if (reportType === "reconciliation") {
    pagination = paginateItems(allReconciliations, reportPage, pageSize);
    content = renderCashReconciliationReport(pagination.items, allReconciliations);
  } else if (reportType === "costs") {
    const matchingServices = state.services.filter(service => matchesSmartQuery([
      service.name,
      service.active === false ? "inactive متوقفة" : "active فعالة"
    ], filters.query));
    pagination = paginateItems(matchingServices, reportPage, pageSize);
    content = renderCostsReport(pagination.items);
  } else if (reportType === "packages") {
    const packageEntries = allEntries.filter(entry => entry.packageId);
    pagination = paginateItems(packageEntries, reportPage, pageSize);
    content = renderPackagesReport(pagination.items);
  } else if (reportType === "specialist") {
    pagination = paginateItems([], 1, pageSize);
    content = renderSpecialistReport(allEntries);
  } else if (reportType === "audit") {
    // The audit log is a running history, not a daily report. When the date range
    // is the default single work-day, widen it to the full retained window so every
    // logged add/edit/delete shows — otherwise actions from other days are hidden.
    // Audit entries carry the REAL timestamp, so the window must always reach the
    // real "today" — even when the clinic's work date (which drives `to`) is a past
    // day, otherwise today's edits fall after `to` and never show.
    const auditTo = to >= today ? to : today;
    const auditFrom = from === to ? dateOffset(-AUDIT_RETENTION_DAYS, auditTo) : from;
    const auditItems = (state.auditTrail || []).slice().reverse()
      .filter(item => {
        const day = (item.at || "").slice(0, 10);
        return (!day || (day >= auditFrom && day <= auditTo))
          && (!auditWhoFilter || item.who === auditWhoFilter)
          && (!auditActionFilter || item.action === auditActionFilter)
          && (!filters.query || matchesSmartQuery([item.who, item.action, item.detail], filters.query));
      });
    pagination = paginateItems(auditItems, reportPage, pageSize);
    content = renderAuditReport(pagination.items);
  } else if (reportType === "cash") {
    const cashEntries = allEntries.filter(isBillableEntry);
    pagination = paginateItems(cashEntries, reportPage, pageSize);
    content = renderCashReport(pagination.items);
  } else {
    pagination = paginateItems(allEntries, reportPage, pageSize);
    content = reportType === "byPatient"
      ? renderByPatientReport(pagination.items)
      : reportType === "assignments"
        ? renderAssignmentsReport(pagination.items)
        : periodComparisonStrip(from, to, filters) + renderPerProcedureReport(pagination.items, allEntries);
  }

  reportPage = pagination.page;
  renderReportVisuals(allEntries, allBookings, allPatients, universalItems, allExpenses);
  renderPagination(els.reportPagination, pagination, "reports");
  els.reportPage.innerHTML = `<button class="report-back-btn" type="button" data-report-back>→ مركز التقارير</button>` + content;
}

function entryCategory(entry) {
  if (entry.category) return entry.category;
  if (entry.packageId) {
    const pkg = (state.patientPackages || []).find(item => item.id === entry.packageId);
    if (pkg?.category) return pkg.category;
  }
  return getService(entry.serviceId)?.category || "";
}

let specialistReportFilter = "";

function renderSpecialistReport(entries) {
  // For each staff member, gather their commission-bearing lines in the range.
  const memberData = (state.staff || []).map(member => {
    const lines = [];
    entries.forEach(entry => {
      const payout = entryPayouts(entry).find(row => row.member.id === member.id);
      if (payout) lines.push({ entry, commission: payout.payout });
    });
    return { member, lines };
  }).filter(item => item.lines.length > 0 || asNumber(item.member.baseSalary) > 0);

  if (!memberData.length) {
    const hasAny = (state.entries || []).some(entry => entry.doctorId || entry.specialistId);
    return `<div class="empty-state">لا توجد عمليات منسوبة لموظفين في هذه الفترة.${hasAny ? "<br><small>تظهر العمليات المستوردة على تواريخها الأصلية — وسّع نطاق التاريخ (من/إلى أو «السنة») ليشملها.</small>" : ""}</div>`;
  }

  const options = [`<option value="">كل الموظفين</option>`]
    .concat(memberData.map(item => `<option value="${item.member.id}"${item.member.id === specialistReportFilter ? " selected" : ""}>${item.member.name}</option>`))
    .join("");
  const shown = specialistReportFilter ? memberData.filter(item => item.member.id === specialistReportFilter) : memberData;

  const sections = shown.map(({ member, lines }) => {
    const byService = new Map();
    lines.forEach(({ entry, commission }) => {
      const key = serviceLabel(entry);
      const group = byService.get(key) || { service: key, count: 0, commission: 0 };
      group.count += Math.max(numberValue(entry.quantity) || 1, 1);
      group.commission += commission;
      byService.set(key, group);
    });
    const serviceRows = [...byService.values()].sort((a, b) => b.commission - a.commission);
    const totalCommission = lines.reduce((sum, line) => sum + line.commission, 0);
    const baseSalary = asNumber(member.baseSalary);
    const deduction = asNumber(member.deduction);
    const netPay = totalCommission + baseSalary - deduction;

    const breakdown = serviceRows.length ? serviceRows.map(group =>
      `<tr><td>${group.service}</td><td>${group.count}</td><td>${money(group.commission)}</td></tr>`).join("")
      : `<tr><td colspan="3" class="report-empty">لا توجد عمليات — راتب فقط.</td></tr>`;

    const detail = lines.slice()
      .sort((a, b) => `${a.entry.date}${a.entry.time || ""}`.localeCompare(`${b.entry.date}${b.entry.time || ""}`))
      .map(({ entry, commission }) =>
        `<tr><td>${displayDate(entry.date)}</td><td>${entry.time ? displayTime(entry.time) : "—"}</td><td>${entry.patient || "—"}</td><td>${serviceLabel(entry)}</td><td>${money(commission)}</td></tr>`).join("");

    return `
      <div class="specialist-card">
        <div class="specialist-head">
          <div><strong>${member.name}</strong> <span class="specialist-role">${roleLabel(member.role)}</span></div>
          <div class="specialist-netpay"><span>صافي المستحق هذه الفترة</span><strong>${money(netPay)}</strong></div>
        </div>
        <div class="specialist-stats">
          <div><span>عدد العمليات</span><strong>${lines.length}</strong></div>
          <div><span>إجمالي العمولة</span><strong>${money(totalCommission)}</strong></div>
          <div><span>الراتب الأساسي</span><strong>${money(baseSalary)}</strong></div>
          ${deduction ? `<div><span>خصومات</span><strong>−${money(deduction)}</strong></div>` : ""}
        </div>
        <table class="practical-table specialist-services">
          <thead><tr><th>العملية</th><th>العدد</th><th>العمولة</th></tr></thead>
          <tbody>${breakdown}</tbody>
          <tfoot><tr><td>الإجمالي</td><td>${lines.length}</td><td>${money(totalCommission)}</td></tr></tfoot>
        </table>
        ${lines.length ? `<details class="specialist-detail">
          <summary>تفاصيل كل عملية (${lines.length})</summary>
          <table class="practical-table">
            <thead><tr><th>التاريخ</th><th>الوقت</th><th>المريض</th><th>العملية</th><th>العمولة</th></tr></thead>
            <tbody>${detail}</tbody>
          </table>
        </details>` : ""}
      </div>`;
  }).join("");

  return `
    <div class="specialist-report">
      <div class="specialist-filter-bar"><label>الموظف <select data-specialist-filter>${options}</select></label></div>
      ${sections}
    </div>`;
}

function renderPackagesReport(entries) {
  if (!entries.length) return `<div class="empty-state">لا توجد باقات مبيعة في هذه الفترة.</div>`;
  let totalNet = 0, totalPaid = 0, totalDue = 0;
  const rows = entries.map(entry => {
    const net = netAmount(entry);
    const paid = paidAmount(entry);
    const due = Math.max(net - paid, 0);
    totalNet += net; totalPaid += paid; totalDue += due;
    const pkg = (state.patientPackages || []).find(item => item.id === entry.packageId);
    const sessions = pkg ? `${pkg.usedSessions}/${pkg.totalSessions}` : "—";
    const category = pkg?.category || "—";
    return `
      <tr class="report-edit-row" data-edit-entry="${entry.id}" title="اضغط للتعديل">
        <td>${entry.visitNumber ? "#" + entry.visitNumber : "—"}</td>
        <td>${displayDate(entry.date)}</td>
        <td>${entry.patient}</td>
        <td>${entry.service}</td>
        <td>${category}</td>
        <td>${sessions}</td>
        <td>${money(net)}</td>
        <td>${money(paid)}</td>
        <td>${due > 0.009 ? money(due) : "—"}</td>
        <td>${entryStatusLabel(entry.status)}</td>
      </tr>`;
  }).join("");
  return `
    <p class="report-edit-hint">اضغط على أي صف لتعديل السعر أو التكلفة أو الفئة أو الدفع.</p>
    <div class="table-wrap">
      <table class="practical-table">
        <thead><tr><th>رقم</th><th>التاريخ</th><th>المريض</th><th>الباقة</th><th>الفئة</th><th>الجلسات</th><th>السعر</th><th>المدفوع</th><th>المتبقي</th><th>الحالة</th></tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr><td colspan="6"><strong>الإجمالي (${entries.length})</strong></td><td><strong>${money(totalNet)}</strong></td><td><strong>${money(totalPaid)}</strong></td><td><strong>${money(totalDue)}</strong></td><td></td></tr></tfoot>
      </table>
    </div>`;
}

function renderCashReport(entries) {
  if (!entries.length) return `<div class="empty-state">لا توجد حركات نقدية في هذه الفترة.</div>`;
  let totalGross = 0, totalDiscount = 0, totalNet = 0, totalPaid = 0, totalDue = 0;
  const rows = entries.map(entry => {
    const gross = numberValue(entry.amount);
    const discount = numberValue(entry.discount);
    const net = netAmount(entry);
    const paid = paidAmount(entry);
    const due = Math.max(net - paid, 0);
    totalGross += gross; totalDiscount += discount; totalNet += net; totalPaid += paid; totalDue += due;
    const doctor = getStaffMember(entry.doctorId) || getStaffMember(entry.specialistId);
    return `
      <tr class="report-edit-row" data-edit-entry="${entry.id}" title="اضغط للتعديل">
        <td>${displayDate(entry.date)}</td>
        <td>${entry.visitNumber ? "#" + entry.visitNumber : "—"}</td>
        <td>${entry.patient}</td>
        <td>${serviceLabel(entry)}</td>
        <td>${money(gross)}</td>
        <td>${discount > 0.009 ? money(discount) : "—"}</td>
        <td>${money(net)}</td>
        <td>${money(paid)}</td>
        <td>${due > 0.009 ? money(due) : "—"}</td>
        <td><span class="pill">${entryPaymentLabel(entry)}</span></td>
        <td>${doctor?.name || "—"}</td>
      </tr>`;
  }).join("");
  return `
    <p class="report-edit-hint">اضغط على أي صف لتعديل السعر أو الخصم أو الدفع أو الفئة.</p>
    <div class="table-wrap">
      <table class="practical-table">
        <thead><tr><th>التاريخ</th><th>رقم</th><th>المريض</th><th>الخدمة</th><th>المبلغ</th><th>الخصم</th><th>الصافي</th><th>المدفوع</th><th>المتبقي</th><th>طريقة الدفع</th><th>الطبيب</th></tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr><td colspan="4"><strong>الإجمالي (${entries.length})</strong></td><td><strong>${money(totalGross)}</strong></td><td><strong>${money(totalDiscount)}</strong></td><td><strong>${money(totalNet)}</strong></td><td><strong>${money(totalPaid)}</strong></td><td><strong>${money(totalDue)}</strong></td><td colspan="2"></td></tr></tfoot>
      </table>
    </div>`;
}

function operationLineFromForm() {
  if (!els.entryForm) return null;
  const data = Object.fromEntries(new FormData(els.entryForm).entries());
  const service = getService(data.serviceId);
  if (!service) return null;
  const quantity = Math.max(numberValue(data.quantity) || 1, 1);
  // Managers set an explicit price; non-managers record only what was paid (resolved on submit)
  const unitPrice = canViewSensitive()
    ? numberValue(data.amount || service.defaultPrice)
    : numberValue(data.amount) || 0;
  const amount = unitPrice * quantity;
  // Cost: use the form's visible cost field if non-zero, else fall back to service default
  const formCost = numberValue(data.cost);
  return {
    id: nextId("operation-line"),
    serviceId: service.id,
    service: service.name,
    quantity,
    unitPrice,
    amount,
    cost: formCost > 0 ? formCost : numberValue(service.defaultCost),
    discount: Math.min(numberValue(data.discount), amount)
  };
}

function renderOperationLines() {
  if (!els.operationLines) return;
  if (!pendingOperationLines.length) {
    els.operationLines.innerHTML = `
      <div class="operation-line-empty">
        <strong>لا توجد خدمات في الزيارة بعد</strong>
        <span>اختر الخدمة واضغط إضافة للقائمة. يمكنك إضافة أكثر من خدمة قبل الحفظ.</span>
      </div>
    `;
  } else {
    els.operationLines.innerHTML = `
      <div class="operation-line-heading">
        <span>${pendingOperationLines.length} ${pendingOperationLines.length === 1 ? "خدمة" : "خدمات"}</span>
        <strong>${money(pendingOperationLines.reduce((sum, line) => sum + Math.max(line.amount - line.discount, 0), 0))}</strong>
      </div>
      ${pendingOperationLines.map((line, index) => `
        <div class="operation-line-row">
          <span class="operation-line-index">${index + 1}</span>
          <div>
            <strong>${line.service}</strong>
            <small>${line.quantity} × ${money(line.unitPrice)}${line.discount ? ` | خصم ${money(line.discount)}` : ""}</small>
          </div>
          <strong>${money(Math.max(line.amount - line.discount, 0))}</strong>
          <button class="icon-button danger" type="button" data-remove-operation-line="${line.id}" aria-label="حذف الخدمة">×</button>
        </div>
      `).join("")}
    `;
  }
  if (els.entrySubmit) {
    els.entrySubmit.textContent = pendingOperationLines.length > 1
      ? `حفظ الزيارة (${pendingOperationLines.length} عمليات)`
      : pendingOperationLines.length === 1
        ? "حفظ الزيارة (عملية واحدة)"
        : "حفظ الزيارة";
  }
}

function addCurrentOperationLine() {
  const line = operationLineFromForm();
  if (!line || line.unitPrice < 0) return;
  pendingOperationLines.push(line);
  if (els.entryForm) {
    els.entryForm.elements.quantity.value = 1;
    els.entryForm.elements.discount.value = 0;
    const selectedService = getService(els.entryForm.elements.serviceId.value);
    els.entryForm.elements.amount.value = selectedService?.defaultPrice || "";
  }
  renderOperationLines();
  updateEntryPreview();
}

function nextReceiptNumber() {
  const sequence = (state.receipts || []).length + 1;
  return `RIA-${state.settings.activeDate.replaceAll("-", "")}-${String(sequence).padStart(4, "0")}`;
}

function createReceiptForVisit(entries, patient, options = {}) {
  if (!entries.length) return null;
  const subtotal = entries.reduce((sum, entry) => sum + netAmount(entry), 0);
  const taxRate = Math.max(0, Math.min(numberValue(options.taxRate), 100));
  const taxAmount = subtotal * taxRate / 100;
  state.receipts = state.receipts || [];
  const receipt = normalizeReceipt({
    id: nextId("receipt"),
    invoiceNumber: nextReceiptNumber(),
    date: state.settings.activeDate,
    patientId: patient.id,
    patient: patient.name,
    entryIds: entries.map(entry => entry.id),
    itemCount: entries.length,
    subtotal,
    taxRate,
    taxAmount,
    total: subtotal + taxAmount,
    buyerType: options.buyerType || "individual",
    buyerTaxNumber: options.buyerTaxNumber || "",
    paymentBreakdown: options.paymentBreakdown || cleanPaymentBreakdown(null, options.paymentMethod || entries[0]?.paymentMethod || "cash", subtotal + taxAmount),
    paymentMethod: options.paymentMethod || paymentMethodFromBreakdown(options.paymentBreakdown, entries[0]?.paymentMethod || "cash"),
    reference: options.reference || "",
    notes: options.notes || "",
    status: state.integrations?.jofotara?.configured ? "ready" : "draft",
    createdAt: new Date().toISOString()
  });
  state.receipts.unshift(receipt);
  return receipt;
}

function renderPaymentQuickButtons() {
  if (!els.paymentQuickRow || !els.entryForm) return;
  const method = els.entryForm.elements.paymentMethod?.value || "cash";
  els.paymentQuickRow.querySelectorAll("[data-payment-option]").forEach(button => {
    button.classList.toggle("active", button.dataset.paymentOption === method);
  });
}

function currentOperationLines() {
  return pendingOperationLines.length
    ? pendingOperationLines
    : [operationLineFromForm()].filter(Boolean);
}

function visitNetForLines(lines = currentOperationLines()) {
  return lines.reduce((sum, line) => sum + Math.max(numberValue(line.amount) - numberValue(line.discount), 0), 0);
}

function paymentBreakdownFromForm(lines = currentOperationLines()) {
  if (!els.entryForm) return { cash: 0, card: 0, transfer: 0 };
  const data = Object.fromEntries(new FormData(els.entryForm).entries());
  const method = PAYMENT_METHODS.includes(data.paymentMethod) ? data.paymentMethod : "cash";
  const status = data.status || "completed";

  // Optional split across methods wins if the advanced boxes are used.
  const split = {
    cash: Math.max(numberValue(data.paidCash), 0),
    card: Math.max(numberValue(data.paidCard), 0),
    transfer: Math.max(numberValue(data.paidTransfer), 0)
  };
  if (split.cash + split.card + split.transfer > 0.009) return split;

  // Nothing collected yet
  if (status === "pending_payment") return { cash: 0, card: 0, transfer: 0 };

  // Single "paid now" field — this is what the patient actually handed over.
  const paidRaw = String(data.paidAmount ?? "").trim();
  if (paidRaw !== "") {
    return { cash: 0, card: 0, transfer: 0, [method]: Math.max(numberValue(paidRaw), 0) };
  }

  // Empty paid box:
  //   • partial  → 0 (they will normally type an amount)
  //   • completed → assume paid in full = the visit total (manager pricing)
  if (status === "partial_payment") return { cash: 0, card: 0, transfer: 0 };
  return { cash: 0, card: 0, transfer: 0, [method]: visitNetForLines(lines) };
}

function allocatePaymentBreakdown(line, visitPayments, visitTotal) {
  const lineTotal = Math.max(numberValue(line.amount) - numberValue(line.discount), 0);
  if (!visitTotal) return { cash: 0, card: 0, transfer: 0 };
  const ratio = lineTotal / visitTotal;
  return Object.fromEntries(PAYMENT_METHODS.map(method => [method, numberValue(visitPayments[method]) * ratio]));
}

// Show/hide the paid/remaining boxes based on the payment-status toggle.
//   completed → paid optional (empty = paid in full), no remaining
//   partial   → paid + remaining both shown
//   pending   → paid hidden (nothing collected), remaining = full balance owed
function updatePaymentFieldsForStatus() {
  if (!els.entryForm) return;
  const status = els.entryForm.elements.status?.value || "completed";
  const paidInput = els.entryForm.elements.paidAmount;
  if (els.paidAmountField) els.paidAmountField.hidden = status === "pending_payment";
  if (paidInput) {
    if (status === "pending_payment") paidInput.value = "";
    paidInput.placeholder = status === "completed" ? "كامل المبلغ" : "0";
  }
  if (els.remainingField) els.remainingField.hidden = status === "completed";
  if (status === "completed" && els.remainingInput && !els.remainingInput.dataset.touched) {
    els.remainingInput.value = "";
  }
  syncRemainingField();
}

// Auto-fill the remaining box from (price − paid) while the user hasn't typed
// their own remaining. Once they edit it, their value sticks.
function syncRemainingField() {
  if (!els.remainingInput || !els.entryForm) return;
  const status = els.entryForm.elements.status?.value || "completed";
  if (status === "completed") return;
  if (els.remainingInput.dataset.touched) return;
  const priceTotal = visitNetForLines();
  if (!canViewSensitive() || priceTotal <= 0) return; // no catalog price → user types remaining
  const paid = numberValue(els.entryForm.elements.paidAmount?.value);
  els.remainingInput.value = Math.max(priceTotal - paid, 0).toFixed(2);
}

// Single source of truth for the visit's money figures from the form.
function visitTotalsFromForm(lines = currentOperationLines()) {
  const paid = paymentTotal(paymentBreakdownFromForm(lines));
  const status = els.entryForm?.elements.status?.value || "completed";
  const remainingRaw = String(els.entryForm?.elements.remainingAmount?.value ?? "").trim();
  const hasRemaining = remainingRaw !== "" && status !== "completed";
  const manualRemaining = hasRemaining ? Math.max(numberValue(remainingRaw), 0) : 0;
  const priceTotal = visitNetForLines(lines);
  // Total charged: explicit (paid + remaining) wins when the user gives a remaining;
  // otherwise fall back to the catalog price, or just what was paid.
  let total;
  if (hasRemaining) total = paid + manualRemaining;
  else if (canViewSensitive() && priceTotal > 0) total = priceTotal;
  else total = paid;
  return { paid, remaining: Math.max(total - paid, 0), total, priceTotal, hasRemaining };
}

function resetEntryFormDefaults() {
  if (!els.entryForm) return;
  els.entryForm.reset();
  els.entryForm.elements.bookingId.value = "";
  els.entryForm.elements.quantity.value = 1;
  els.entryForm.elements.discount.value = 0;
  els.entryForm.elements.paymentMethod.value = "cash";
  if (els.entryForm.elements.paidAmount) els.entryForm.elements.paidAmount.value = "";
  if (els.entryForm.elements.remainingAmount) els.entryForm.elements.remainingAmount.value = "";
  if (els.remainingInput) delete els.remainingInput.dataset.touched;
  els.entryForm.elements.paidCash.value = "";
  els.entryForm.elements.paidCard.value = "";
  els.entryForm.elements.paidTransfer.value = "";
  els.entryForm.elements.status.value = "completed";
  // Reset payment status toggle to "fully paid"
  if (els.paymentStatusToggle) {
    els.paymentStatusToggle.querySelectorAll("[data-pstatus]").forEach(b => {
      b.classList.toggle("active", b.dataset.pstatus === "completed");
    });
  }
  // Reset doctor rate row
  if (els.doctorRateRow) els.doctorRateRow.hidden = true;
  if (els.doctorRateOverride) els.doctorRateOverride.hidden = true;
  if (els.doctorRateOverrideInput) els.doctorRateOverrideInput.value = "";
  pendingOperationLines = [];
  const firstService = activeServices()[0];
  if (firstService) {
    els.entryForm.elements.serviceId.value = firstService.id;
    // Only managers get a catalog price pre-filled; non-managers record what was paid.
    els.entryForm.elements.amount.value = canViewSensitive() ? (firstService.defaultPrice || "") : "";
    const costInput = els.entryForm.querySelector("[data-cost-input]");
    if (costInput) costInput.value = firstService.defaultCost || 0;
  }
  renderStaffRuleServiceSelect();
  renderOperationLines();
  updatePaymentFieldsForStatus();
  updateEntryPreview();
  renderPaymentQuickButtons();
}

function applyPriceFieldVisibility() {
  // Managers see price/discount (optional, from the service default); non-managers don't.
  // Price is never required — what the patient paid is the source of truth.
  const showPrice = canViewSensitive();
  if (!els.entryForm) return;
  els.entryForm.querySelectorAll("[data-price-field]").forEach(el => {
    el.hidden = !showPrice;
    const input = el.querySelector("input");
    if (input) input.required = false;
  });
}

function openOperationModal({ returnView = "", patientName = "", serviceId = "", category = "", bookingId = "" } = {}) {
  if (!canView("entries")) return;
  const currentView = document.querySelector(".view.active")?.dataset.view || "dashboard";
  runtime.operationReturnView = returnView || currentView;
  setView("entries");
  if (!els.operationModal) return;
  els.operationModal.hidden = false;
  document.body.classList.add("operation-modal-open");
  applyPriceFieldVisibility();
  updatePaymentFieldsForStatus();
  renderPaymentQuickButtons();
  if (els.entryForm) {
    const patientInput = els.entryForm.querySelector('input[name="patient"]');
    if (patientInput && patientName) patientInput.value = patientName;
    if (category && els.operationCategorySelect) {
      els.operationCategorySelect.value = category;
      els.operationCategorySelect.dispatchEvent(new Event("change", { bubbles: true }));
    }
    if (serviceId && els.serviceSelect) els.serviceSelect.value = serviceId;
    const bookingField = els.entryForm.querySelector('input[name="bookingId"]');
    if (bookingField) bookingField.value = bookingId || "";
  }
  window.setTimeout(() => {
    els.entryForm?.querySelector('input[name="patient"]')?.focus({ preventScroll: true });
  }, 120);
}

function closeOperationModal({ restoreView = "" } = {}) {
  if (!els.operationModal) return;
  els.operationModal.hidden = true;
  document.body.classList.remove("operation-modal-open");
  const target = restoreView || runtime.operationReturnView;
  if (target && target !== "entries" && canView(target)) setView(target);
}

function updateEntryPreview() {
  if (!els.entryPreview || !els.entryForm) return;
  const lines = currentOperationLines();
  if (!lines.length) {
    els.entryPreview.classList.remove("warning");
    els.entryPreview.textContent = "اختر خدمة وأضفها إلى الزيارة.";
    return;
  }

  // Keep the remaining box in sync with price − paid (until the user types their own).
  syncRemainingField();

  const data = Object.fromEntries(new FormData(els.entryForm).entries());
  const account = currentAccount();
  const scopedMember = accountStaffScoped(account) ? getStaffMember(account.staffId) : null;
  const doctorId = scopedMember?.role === "doctor" ? scopedMember.id : data.doctorId;
  const specialistId = scopedMember?.role === "specialist" ? scopedMember.id : data.specialistId;
  const previewEntries = lines.map(line => normalizeEntry({
    date: state.settings.activeDate,
    patient: data.patient || "مريض",
    ...line,
    doctorId,
    specialistId,
    paymentMethod: data.paymentMethod || "cash"
  }, state.services));
  const totals = visitTotalsFromForm(lines);
  const net = totals.total;
  const paid = totals.paid;
  const unpaid = totals.remaining;
  const overpaid = paid - net > 0.009;
  els.entryPreview.classList.toggle("warning", overpaid);

  if (!canViewSensitive()) {
    els.entryPreview.textContent = unpaid > 0.009
      ? `المدفوع ${money(paid)} | المتبقي ${money(unpaid)}.`
      : `${lines.length} ${lines.length === 1 ? "عملية" : "عمليات"} في هذه الزيارة. المدفوع ${money(paid)}.`;
    return;
  }

  const payoutTotal = previewEntries
    .flatMap(entryPayouts)
    .reduce((sum, row) => sum + row.payout, 0);
  els.entryPreview.innerHTML = `
    <span>${lines.length} ${lines.length === 1 ? "عملية" : "عمليات"}</span>
    <span>الإجمالي <strong>${money(net)}</strong></span>
    <span>المدفوع <strong>${money(paid)}</strong>${unpaid ? ` | المتبقي ${money(unpaid)}` : ""}</span>
    ${overpaid ? `<span>تنبيه: المدفوع أعلى من الإجمالي بـ <strong>${money(paid - net)}</strong></span>` : ""}
    <span>مستحقات الفريق <strong>${money(payoutTotal)}</strong></span>
  `;
}

function renderSalaries(entries) {
  if (!canViewSensitive()) {
    els.salaryTable.innerHTML = `<tr><td colspan="7">كشف الرواتب والنسب مخفي لهذا الحساب.</td></tr>`;
    renderSalarySlip(entries);
    return;
  }

  const rows = salaryRows(entries);
  if (!rows.length) {
    els.salaryTable.innerHTML = `<tr><td colspan="7">أضف موظفين وعمليات لإظهار الرواتب.</td></tr>`;
    renderSalarySlip(entries);
    return;
  }

  els.salaryTable.innerHTML = rows.map(row => {
    const salaryStatus = salaryStatusFor(row.member.id);
    return `
      <tr>
        <td>${row.member.name}</td>
        <td>${roleLabel(row.member.role)}</td>
        <td>${row.formulas.join("<br>") || `${row.member.rate}% افتراضي`}</td>
        <td>${row.operations}</td>
        <td><strong>${money(row.amount)}</strong></td>
        <td><span class="status-pill ${statusClass(salaryStatus)}">${salaryStatusLabel(salaryStatus)}</span></td>
        <td>
          <div class="row-actions">
            <button class="text-button" type="button" data-select-salary-slip="${row.member.id}">تفاصيل الكشف</button>
            <button class="text-button" type="button" data-approve-salary="${row.member.id}">اعتماد</button>
            <button class="text-button" type="button" data-pay-salary="${row.member.id}">تم الدفع</button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
  renderSalarySlip(entries);
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
  const history = reconciliationRecordsForDate(state.settings.activeDate);

  els.reconcileForm.elements.countedCash.value = totals.cash;
  els.reconcileForm.elements.countedCard.value = totals.card;
  els.reconcileForm.elements.countedTransfer.value = totals.transfer;
  if (els.reconcileForm.elements.note) els.reconcileForm.elements.note.value = "";

  const latestCards = rows.map(([label, expected, counted, diff]) => {
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
  const historyRows = history.length ? history.slice(0, 8).map(record => `
    <tr>
      <td>${displayClockMinute(record.createdAt)}</td>
      <td><span class="status-pill ${reconciliationStatusClass(record.status)}">${reconciliationStatusLabel(record.status)}</span></td>
      <td>${money(record.totalExpected)}</td>
      <td>${money(record.totalCounted)}</td>
      <td><strong>${money(record.totalDiff)}</strong></td>
      <td>${record.createdBy || "-"}</td>
      <td>${record.note || "-"}</td>
    </tr>
  `).join("") : `<tr><td colspan="7">لا يوجد إغلاق محفوظ لهذا اليوم بعد.</td></tr>`;

  els.reconcileResult.innerHTML = `
    <div class="reconciliation-latest">
      <h3>${reconciliation ? `آخر إغلاق: ${displayDateTimeMinute(reconciliation.createdAt)}` : "لم يتم حفظ إغلاق لهذا اليوم"}</h3>
      ${latestCards}
    </div>
    <div class="reconciliation-history">
      <h3>سجل إغلاقات اليوم</h3>
      <div class="table-wrap compact-table">
        <table>
          <thead>
            <tr><th>الوقت</th><th>الحالة</th><th>المتوقع</th><th>الموجود</th><th>الفرق</th><th>بواسطة</th><th>الملاحظة</th></tr>
          </thead>
          <tbody>${historyRows}</tbody>
        </table>
      </div>
    </div>
  `;
}

function renderLeads() {
  const leads = JSON.parse(storageGet(LEADS_KEY) || "[]");

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
      <span class="pill">${lead.createdAt ? new Date(lead.createdAt).toLocaleDateString("ar-JO-u-nu-latn") : "محلي"}</span>
    </div>
  `).join("");
}

function digestTemplateLabel(template) {
  const labels = {
    role_daily: "ملخص الدور اليومي",
    tomorrow_schedule: "جدول الغد",
    financial_close: "الإغلاق المالي",
    inventory_alerts: "تنبيهات المخزون"
  };
  return labels[template] || template;
}

function roleDigestText(account, template = "role_daily") {
  if (!account) return "";
  const activeDate = state.settings.activeDate;
  const tomorrow = dateOffset(1, activeDate);
  const ownBookings = (state.bookings || []).filter(booking => (
    !accountStaffScoped(account)
    || !account.staffId
    || booking.doctorId === account.staffId
    || booking.specialistId === account.staffId
  ));
  const dayBookings = ownBookings.filter(booking => booking.date === activeDate);
  const tomorrowBookings = ownBookings.filter(booking => booking.date === tomorrow);
  const ownEntries = (state.entries || []).filter(entry => (
    entry.date === activeDate
    && (
      !accountStaffScoped(account)
      || !account.staffId
      || entry.doctorId === account.staffId
      || entry.specialistId === account.staffId
    )
  ));
  const totals = totalsFor(ownEntries);
  const lines = [`رعاية | ${state.settings.clinicName}`, `${accountDisplayName(account)} - ${roleLabel(account.role)}`];

  if (template === "tomorrow_schedule") {
    lines.push(`جدول الغد: ${tomorrowBookings.length} موعد`);
    tomorrowBookings.slice(0, 6).forEach(booking => {
      lines.push(`${booking.time} ${booking.patient} - ${serviceLabel(booking)}`);
    });
    return lines.join("\n");
  }

  if (template === "inventory_alerts") {
    const items = lowStockItems();
    lines.push(`تنبيهات المخزون: ${items.length}`);
    items.slice(0, 6).forEach(item => lines.push(`${item.name}: ${item.quantity} ${item.unit}`));
    return lines.join("\n");
  }

  if (template === "financial_close") {
    lines.push(`عمليات اليوم: ${ownEntries.length}`);
    lines.push(account.role === "admin" || account.canViewSensitive
      ? `المدفوع: ${money(totals.paid)}`
      : "التفاصيل المالية غير متاحة لهذا الدور");
    const reconciliation = activeReconciliation();
    const diffs = reconciliationDiffs(totals, reconciliation);
    lines.push(diffs ? `فرق الإغلاق: ${money(diffs.totalDiff)}` : "الإغلاق غير محفوظ");
    return lines.join("\n");
  }

  lines.push(`المواعيد: ${dayBookings.length}`);
  lines.push(`المؤكدة: ${dayBookings.filter(booking => booking.status === "confirmed").length}`);
  lines.push(`وصل: ${dayBookings.filter(booking => booking.status === "arrived").length}`);
  lines.push(`العمليات: ${ownEntries.length}`);
  if (account.role === "admin" || account.canViewSensitive) {
    lines.push(`المدفوع: ${money(totals.paid)}`);
    lines.push(`فواتير JoFotara المعلقة: ${(state.receipts || []).filter(receipt => ["draft", "ready"].includes(receipt.status)).length}`);
  }
  if (account.role === "admin") {
    lines.push(`مخزون منخفض: ${lowStockItems().length}`);
  }
  return lines.join("\n");
}

async function sendCommunication(payload) {
  if (runtime.mode !== "live") {
    return { ok: true, mode: "preview", channel: payload.channel };
  }
  const response = await fetch("/api/communications", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-Token": runtime.csrfToken
    },
    body: JSON.stringify(payload)
  });
  const result = await response.json().catch(() => ({ ok: false, error: "invalid_provider_response" }));
  if (!response.ok || !result.ok) {
    throw new Error(result.error || "communication_failed");
  }
  return result;
}

async function loadCommunicationBackendStatus() {
  if (runtime.mode !== "live") {
    communicationBackendStatus = null;
    renderIntegrationSettings();
    return;
  }
  try {
    const response = await fetch("/api/communications");
    const result = await response.json();
    communicationBackendStatus = result.integrations || null;
  } catch {
    communicationBackendStatus = null;
  }
  renderIntegrationSettings();
}

async function loadClinicIntegrations() {
  if (runtime.mode !== "live") return;
  const response = await fetch("/api/clinic-integrations", { headers: { Accept: "application/json" } });
  if (!response.ok) return;
  const result = await response.json();
  (result.integrations || []).forEach(integration => {
    state.integrations[integration.provider] = {
      ...(state.integrations[integration.provider] || {}),
      ...(integration.config || {}),
      configured: integration.configured
    };
  });
}

function renderStorageSafety() {
  if (!els.storageSafetyPanel) return;
  const visible = canManagePermissions();
  els.storageSafetyPanel.hidden = !visible;
  if (!visible) return;

  const localTrial = runtime.mode !== "live";
  const storage = storageSafetyStatus?.storage || {};
  const safe = localTrial ? false : Boolean(storage.safeForRealData || storage.safeForPilot);
  const badgeClass = safe ? "good" : localTrial ? "warn" : "bad";
  const title = safe
    ? "جاهز لتجربة عيادة حقيقية بحذر"
    : localTrial ? "هذه نسخة تجربة داخل المتصفح" : "التخزين يحتاج تأكيد قبل البيانات الحقيقية";
  const detail = storageSafetyStatus?.message || (localTrial
    ? "بيانات التجربة محفوظة على هذا المتصفح فقط. استخدم تنزيل JSON قبل أي تجربة مهمة."
    : "لم يتم فحص التخزين بعد.");
  const meta = localTrial
    ? "الوضع: Trial محلي | النسخ الاحتياطي: تنزيل يدوي"
    : `النشر: ${storage.deploymentMode || "غير محدد"} | التخزين: ${storage.mode || "غير معروف"} | المزود: ${storage.provider || "غير محدد"} | آخر فحص: ${storage.checkedAt ? new Date(storage.checkedAt).toLocaleString("ar-JO-u-nu-latn") : "بانتظار"}`;

  els.storageStatusBadge.className = `status-pill ${badgeClass}`;
  els.storageStatusBadge.textContent = safe ? "آمن للبيانات" : localTrial ? "تجربة فقط" : "غير آمن للبيانات";
  els.storageStatusTitle.textContent = title;
  els.storageStatusDetail.textContent = detail;
  els.storageStatusMeta.textContent = meta;
}

async function loadStorageSafetyStatus() {
  if (!canManagePermissions()) return;
  if (runtime.mode !== "live") {
    storageSafetyStatus = null;
    renderStorageSafety();
    return;
  }
  try {
    const response = await fetch("/api/clinic-storage-status", { headers: { Accept: "application/json" } });
    storageSafetyStatus = response.ok ? await response.json() : null;
  } catch {
    storageSafetyStatus = null;
  }
  renderStorageSafety();
}

async function saveClinicIntegration(provider, config, secret = "") {
  if (runtime.mode !== "live") {
    return { provider, config, configured: Boolean(secret) || state.integrations[provider]?.configured };
  }
  const response = await fetch("/api/clinic-integrations", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-Token": runtime.csrfToken
    },
    body: JSON.stringify({ provider, config, secret })
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "integration_save_failed");
  return result.integration;
}

function xmlValue(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function receiptInvoiceXml(receipt) {
  const entries = receipt.entryIds
    .map(entryId => state.entries.find(entry => entry.id === entryId))
    .filter(Boolean);
  const taxNumber = state.integrations?.jofotara?.taxNumber || "";
  const incomeSourceSequence = state.integrations?.jofotara?.incomeSourceSequence || "";
  const taxRate = numberValue(receipt.taxRate);
  const subtotal = numberValue(receipt.subtotal || receipt.total);
  const taxAmount = numberValue(receipt.taxAmount);
  const total = numberValue(receipt.total);
  const paymentMeansCode = receipt.paymentMethod === "card" ? "48" : receipt.paymentMethod === "transfer" ? "30" : "10";
  const invoiceLines = entries.map((entry, index) => {
    const quantity = numberValue(entry.quantity) || 1;
    const lineTotal = netAmount(entry);
    const unitPrice = quantity ? lineTotal / quantity : lineTotal;
    return `
    <cac:InvoiceLine>
      <cbc:ID>${index + 1}</cbc:ID>
      <cbc:InvoicedQuantity unitCode="PCE">${quantity.toFixed(2)}</cbc:InvoicedQuantity>
      <cbc:LineExtensionAmount currencyID="JOD">${lineTotal.toFixed(3)}</cbc:LineExtensionAmount>
      <cac:Item>
        <cbc:Name>${xmlValue(serviceLabel(entry))}</cbc:Name>
        <cac:ClassifiedTaxCategory>
          <cbc:ID>${taxRate ? "S" : "Z"}</cbc:ID>
          <cbc:Percent>${taxRate.toFixed(2)}</cbc:Percent>
          <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
        </cac:ClassifiedTaxCategory>
      </cac:Item>
      <cac:Price><cbc:PriceAmount currencyID="JOD">${unitPrice.toFixed(3)}</cbc:PriceAmount></cac:Price>
    </cac:InvoiceLine>`;
  }).join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
  xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
  xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:UBLVersionID>2.1</cbc:UBLVersionID>
  <cbc:ID>${xmlValue(receipt.invoiceNumber)}</cbc:ID>
  <cbc:IssueDate>${xmlValue(receipt.date)}</cbc:IssueDate>
  <cbc:InvoiceTypeCode>388</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>JOD</cbc:DocumentCurrencyCode>
  <cbc:Note>${xmlValue(`Income source sequence: ${incomeSourceSequence}${receipt.reference ? ` | Reference: ${receipt.reference}` : ""}`)}</cbc:Note>
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyTaxScheme><cbc:CompanyID>${xmlValue(taxNumber)}</cbc:CompanyID></cac:PartyTaxScheme>
      <cac:PartyLegalEntity><cbc:RegistrationName>${xmlValue(state.settings.clinicName)}</cbc:RegistrationName></cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty>
    <cac:Party>
      ${receipt.buyerTaxNumber ? `<cac:PartyIdentification><cbc:ID>${xmlValue(receipt.buyerTaxNumber)}</cbc:ID></cac:PartyIdentification>` : ""}
      <cac:PartyLegalEntity><cbc:RegistrationName>${xmlValue(receipt.patient)}</cbc:RegistrationName></cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingCustomerParty>
  <cac:PaymentMeans><cbc:PaymentMeansCode>${paymentMeansCode}</cbc:PaymentMeansCode></cac:PaymentMeans>
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="JOD">${taxAmount.toFixed(3)}</cbc:TaxAmount>
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="JOD">${subtotal.toFixed(3)}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="JOD">${taxAmount.toFixed(3)}</cbc:TaxAmount>
      <cac:TaxCategory>
        <cbc:ID>${taxRate ? "S" : "Z"}</cbc:ID>
        <cbc:Percent>${taxRate.toFixed(2)}</cbc:Percent>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>
  </cac:TaxTotal>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="JOD">${subtotal.toFixed(3)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="JOD">${subtotal.toFixed(3)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="JOD">${total.toFixed(3)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="JOD">${total.toFixed(3)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>${invoiceLines}
</Invoice>`;
}

function renderDigestAccounts() {
  if (!els.digestAccount) return;
  const current = els.digestAccount.value;
  els.digestAccount.innerHTML = activeAccounts().map(account => `
    <option value="${account.id}">${accountDisplayName(account)} | ${roleLabel(account.role)} | ${account.mobile || "بدون رقم"}</option>
  `).join("");
  if (activeAccounts().some(account => account.id === current)) els.digestAccount.value = current;
}

function renderDigestPreview() {
  if (!els.digestPreview || !els.digestForm) return;
  const data = Object.fromEntries(new FormData(els.digestForm).entries());
  const account = state.accounts.find(item => item.id === data.accountId) || activeAccounts()[0];
  els.digestPreview.innerHTML = `
    <div>
      <span>معاينة التقرير</span>
      <strong>${accountDisplayName(account)}</strong>
    </div>
    <pre>${roleDigestText(account, data.template)}</pre>
  `;
}

function renderDigestRules() {
  if (!els.digestRules) return;
  const rules = state.digestRules || [];
  if (!rules.length) {
    els.digestRules.innerHTML = `<div class="empty-state">لا توجد تقارير يومية مفعلة.</div>`;
    return;
  }
  els.digestRules.innerHTML = rules.map(rule => {
    const account = state.accounts.find(item => item.id === rule.accountId);
    return `
      <div class="automation-row">
        <div>
          <strong>${accountDisplayName(account)} | ${rule.channel === "whatsapp" ? "WhatsApp" : "SMS"}</strong>
          <span>${digestTemplateLabel(rule.template)} عند ${rule.sendTime}</span>
        </div>
        <div class="row-actions">
          <span class="status-pill ${account?.mobile ? "good" : "warn"}">${account?.mobile ? "جاهز" : "رقم مطلوب"}</span>
          <button class="text-button" type="button" data-queue-digest="${rule.id}">إضافة للإرسال</button>
          <button class="icon-button danger" type="button" data-delete-digest="${rule.id}" aria-label="حذف">×</button>
        </div>
      </div>
    `;
  }).join("");
}

function campaignRecipients(audience, category = "") {
  const consented = (state.patients || []).filter(patient => patient.active !== false && patient.phone && patient.marketingConsent);
  if (audience === "visitors") return consented.filter(patient => patient.profileType === "visitor");
  if (audience === "no_show") {
    const patientIds = new Set((state.bookings || []).filter(booking => booking.status === "no_show").map(booking => booking.patientId));
    return consented.filter(patient => patientIds.has(patient.id));
  }
  if (audience === "inactive_60") {
    const cutoff = dateOffset(-60, state.settings.activeDate);
    return consented.filter(patient => patientLastActivity(patient) < cutoff);
  }
  if (audience === "service") {
    return consented.filter(patient => matchesSmartQuery([
      patient.category,
      ...patientEntries(patient).map(entry => serviceLabel(entry))
    ], category));
  }
  return consented;
}

function renderCampaignEstimate() {
  if (!els.campaignEstimate || !els.campaignForm) return;
  const data = Object.fromEntries(new FormData(els.campaignForm).entries());
  const recipients = campaignRecipients(data.audience, data.category);
  const length = [...String(data.message || "")].length;
  const segments = Math.max(Math.ceil(length / 70), 1);
  els.campaignEstimate.innerHTML = `
    <div><span>المستلمون</span><strong>${recipients.length}</strong></div>
    <div><span>الأحرف</span><strong>${length}/320</strong></div>
    <div><span>مقاطع SMS</span><strong>${segments}</strong></div>
    <div><span>الإجمالي المتوقع</span><strong>${recipients.length * segments} رسالة</strong></div>
  `;
}

function campaignStatusLabel(status) {
  const labels = { queued: "في الانتظار", scheduled: "مجدولة", sent: "تم الإرسال", failed: "فشل", cancelled: "ملغاة" };
  return labels[status] || status;
}

function renderCampaignList() {
  if (!els.campaignList) return;
  const campaigns = state.campaigns || [];
  if (!campaigns.length) {
    els.campaignList.innerHTML = `<div class="empty-state">لا توجد حملات بعد.</div>`;
    return;
  }
  els.campaignList.innerHTML = campaigns.slice(0, 10).map(campaign => `
    <div class="campaign-row">
      <div>
        <strong>${campaign.message.slice(0, 70)}${campaign.message.length > 70 ? "..." : ""}</strong>
        <span>${campaign.recipientCount} مستلم | ${campaign.segments} مقطع | ${campaign.scheduledAt ? new Date(campaign.scheduledAt).toLocaleString("ar-JO-u-nu-latn") : "الإرسال عند تفعيل المزود"}</span>
      </div>
      <span class="status-pill ${campaign.status === "sent" ? "good" : campaign.status === "failed" ? "bad" : "warn"}">${campaignStatusLabel(campaign.status)}</span>
    </div>
  `).join("");
}

function receiptStatusLabel(status) {
  const labels = { draft: "مسودة", ready: "جاهزة", queued: "قيد الإرسال", submitted: "مرسلة", failed: "فشل" };
  return labels[status] || status;
}

function renderReceiptDocument(receipt) {
  if (!els.receiptDocument || !receipt) return;
  const entries = (receipt.entryIds || [])
    .map(entryId => state.entries.find(entry => entry.id === entryId))
    .filter(Boolean);
  els.receiptDocument.innerHTML = `
    <div class="receipt-brand">
      <div>
        <span>Riaaya Clinic Receipt</span>
        <h2 id="receipt-dialog-title">${state.settings.clinicName}</h2>
        <p>${state.settings.branch || "الفرع الرئيسي"}</p>
      </div>
      <div>
        <strong>${receipt.invoiceNumber}</strong>
        <span>${displayDate(receipt.date)}</span>
      </div>
    </div>
    <div class="receipt-parties">
      <div><span>المريض / المشتري</span><strong>${receipt.patient}</strong></div>
      <div><span>النوع</span><strong>${receipt.buyerType === "business" ? "شركة / جهة" : "فرد"}</strong></div>
      <div><span>الرقم الوطني / الضريبي</span><strong>${receipt.buyerTaxNumber || "-"}</strong></div>
      <div><span>طريقة الدفع</span><strong>${receiptPaymentLabel(receipt)}</strong></div>
    </div>
    <table class="receipt-items">
      <thead><tr><th>#</th><th>الخدمة</th><th>الكمية</th><th>السعر</th><th>الإجمالي</th></tr></thead>
      <tbody>
        ${entries.map((entry, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${serviceLabel(entry)}</td>
            <td>${entry.quantity || 1}</td>
            <td>${money(numberValue(entry.unitPrice))}</td>
            <td>${money(netAmount(entry))}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
    <div class="receipt-totals">
      <div><span>المجموع قبل الضريبة</span><strong>${money(receipt.subtotal)}</strong></div>
      <div><span>ضريبة المبيعات (${receipt.taxRate || 0}%)</span><strong>${money(receipt.taxAmount)}</strong></div>
      <div class="receipt-grand-total"><span>الإجمالي المستحق</span><strong>${money(receipt.total)}</strong></div>
    </div>
    ${receipt.reference ? `<p class="receipt-note"><strong>المرجع:</strong> ${receipt.reference}</p>` : ""}
    ${receipt.notes ? `<p class="receipt-note"><strong>ملاحظات:</strong> ${receipt.notes}</p>` : ""}
    <div class="receipt-footer">
      <span>الحالة: ${receiptStatusLabel(receipt.status)}</span>
      <span>${receipt.providerReference ? `مرجع الإرسال: ${receipt.providerReference}` : "يخضع الإرسال الضريبي لإعداد JoFotara المعتمد للعيادة."}</span>
    </div>
  `;
}

function openReceipt(receiptId) {
  const receipt = (state.receipts || []).find(item => item.id === receiptId);
  if (!receipt || !canViewReceipts()) return;
  runtime.openReceiptId = receipt.id;
  renderReceiptDocument(receipt);
  if (els.submitOpenReceipt) {
    els.submitOpenReceipt.hidden = !canUseFeature("manage_jofotara") || !["draft", "ready", "failed"].includes(receipt.status);
  }
  if (els.receiptModal) els.receiptModal.hidden = false;
}

function closeReceipt() {
  runtime.openReceiptId = "";
  if (els.receiptModal) els.receiptModal.hidden = true;
  document.body.classList.remove("printing-receipt");
}

function renderReceipts() {
  if (!els.receiptTable) return;
  const receipts = state.receipts || [];
  if (!receipts.length) {
    els.receiptTable.innerHTML = `<tr><td colspan="7">ستظهر الفاتورة هنا بعد حفظ زيارة تحتوي على عملية واحدة أو أكثر.</td></tr>`;
    return;
  }
  els.receiptTable.innerHTML = receipts.map(receipt => `
    <tr>
      <td><strong>${receipt.invoiceNumber}</strong></td>
      <td>${displayDate(receipt.date)}</td>
      <td>${receipt.patient}</td>
      <td>${receipt.itemCount}</td>
      <td>${money(receipt.total)}</td>
      <td>
        <span class="status-pill ${receipt.status === "submitted" ? "good" : receipt.status === "failed" ? "bad" : "warn"}">${receiptStatusLabel(receipt.status)}</span>
        ${receipt.deliveryMode === "preview" ? `<small class="delivery-note">وضع معاينة، لم ترسل ضريبياً</small>` : ""}
      </td>
      <td><div class="row-actions"><button class="text-button" type="button" data-open-receipt="${receipt.id}">عرض</button>${["draft", "ready", "failed"].includes(receipt.status) ? `<button class="text-button" type="button" data-submit-receipt="${receipt.id}">إرسال إلى JoFotara</button>` : ""}</div></td>
    </tr>
  `).join("");
}

function renderIntegrationSettings() {
  const integrations = state.integrations || seedCommunicationState().integrations;
  const setStatus = (name, locallyReady) => {
    const status = document.querySelector(`[data-integration-status="${name}"]`);
    if (!status) return;
    const backend = communicationBackendStatus?.[name];
    if (backend?.configured && (name !== "jofotara" || backend.submissionEnabled)) {
      status.textContent = "متصل بالخادم";
      status.className = "status-pill good";
      return;
    }
    if (backend?.configured || locallyReady) {
      status.textContent = name === "jofotara" ? "جاهز للمعاينة" : "إعداد الخادم مطلوب";
      status.className = "status-pill warn";
      return;
    }
    status.textContent = name === "jofotara" ? "غير مهيأ" : "غير متصل";
    status.className = "status-pill warn";
  };
  setStatus("whatsapp", integrations.whatsapp?.configured);
  setStatus("sms", integrations.sms?.configured);
  setStatus("jofotara", integrations.jofotara?.configured);

  if (els.whatsappSettings) {
    els.whatsappSettings.elements.businessPhone.value = integrations.whatsapp?.businessPhone || "";
    els.whatsappSettings.elements.phoneNumberId.value = integrations.whatsapp?.phoneNumberId || "";
    els.whatsappSettings.elements.templateName.value = integrations.whatsapp?.templateName || "clinic_daily_role_report";
    els.whatsappSettings.elements.graphApiVersion.value = integrations.whatsapp?.graphApiVersion || "v23.0";
    els.whatsappSettings.elements.secret.value = "";
  }
  if (els.smsSettings) {
    els.smsSettings.elements.provider.value = integrations.sms?.provider || "local";
    els.smsSettings.elements.senderId.value = integrations.sms?.senderId || "";
    els.smsSettings.elements.endpoint.value = integrations.sms?.endpoint || "";
    els.smsSettings.elements.secret.value = "";
  }
  if (els.jofotaraSettings) {
    els.jofotaraSettings.elements.taxNumber.value = integrations.jofotara?.taxNumber || "";
    els.jofotaraSettings.elements.clientId.value = integrations.jofotara?.clientId || "";
    els.jofotaraSettings.elements.incomeSourceSequence.value = integrations.jofotara?.incomeSourceSequence || "";
    els.jofotaraSettings.elements.secret.value = "";
    els.jofotaraSettings.elements.submissionEnabled.checked = integrations.jofotara?.submissionEnabled === true;
  }
}

function renderCommunications() {
  /* Populate booking link */
  const slug = runtime.session?.clinic?.slug || "";
  const bookingUrl = slug ? `${location.origin}/book/${slug}` : "";
  const linkEl  = document.getElementById("booking-link-url");
  const copyBtn = document.getElementById("copy-booking-link");
  const openBtn = document.getElementById("open-booking-link");
  if (linkEl)  linkEl.textContent = bookingUrl || "سجّل الدخول لرؤية رابط العيادة";
  if (openBtn) { openBtn.href = bookingUrl; openBtn.style.pointerEvents = bookingUrl ? "" : "none"; }
  if (copyBtn && bookingUrl) {
    copyBtn.onclick = () => {
      navigator.clipboard.writeText(bookingUrl).then(() => {
        copyBtn.textContent = "✓ تم النسخ";
        setTimeout(() => { copyBtn.textContent = "📋 نسخ"; }, 2500);
      });
    };
  }

  renderDigestAccounts();
  renderDigestPreview();
  renderDigestRules();
  renderCampaignEstimate();
  renderCampaignList();
  renderIntegrationSettings();
  renderReceipts();
  const setKpi = (name, value) => {
    const element = document.querySelector(`[data-communications-kpi="${name}"]`);
    if (element) element.textContent = value;
  };
  setKpi("digests", (state.digestRules || []).filter(rule => rule.active).length);
  setKpi("queued", (state.outboundMessages || []).filter(message => message.status === "queued").length);
  setKpi("campaigns", (state.campaigns || []).filter(campaign => campaign.createdAt?.startsWith(state.settings.activeDate.slice(0, 7))).length);
  setKpi("receipts", (state.receipts || []).filter(receipt => ["draft", "ready", "queued"].includes(receipt.status)).length);
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

  const assignmentSummary = assignmentSummaryText(entries);
  if (assignmentSummary) {
    const isEnglish = currentLanguage() === "en";
    alerts.push({
      type: "",
      title: isEnglish ? "Specialist-linked operations" : "عمليات مرتبطة بالأخصائيين",
      body: isEnglish
        ? `${assignmentSummary} for this date.`
        : `تم تسجيل ${assignmentSummary} لهذا التاريخ.`
    });
  }

  const pendingAssignment = unassignedEntries(entries);
  if (pendingAssignment.length > 0) {
    const isEnglish = currentLanguage() === "en";
    alerts.push({
      type: "warning",
      title: isEnglish ? "Operations pending assignment" : "عمليات بانتظار التعيين",
      body: isEnglish
        ? `${pendingAssignment.length} operations are saved without a doctor or specialist. You can assign the team later.`
        : `${pendingAssignment.length} عملية محفوظة بدون طبيب أو أخصائي. يمكن تسجيلها الآن وتعيين الفريق لاحقاً.`
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

  const leadsCount = JSON.parse(storageGet(LEADS_KEY) || "[]").length;
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
    els.healthNote.textContent = "الإغلاق المالي متطابق ولا توجد فروقات.";
  } else if (diffs) {
    els.healthLabel.textContent = "يحتاج مراجعة";
    els.healthNote.textContent = `فرق الإغلاق الحالي ${money(diffs.totalDiff)}.`;
  } else {
    els.healthLabel.textContent = "بانتظار الإغلاق";
    els.healthNote.textContent = "احفظ مطابقة الإغلاق لاعتماد اليوم.";
  }
}

// ── Growth engine ──────────────────────────────────────────────────────────
// Turns the clinic's own data into a daily money to-do list: who is due for a
// session, whose package is ending, who lapsed, and who owes a balance — each
// with a ready-to-send WhatsApp message. Respects a per-segment cooldown so the
// same patient isn't pestered, and the marketing-consent flag.
const GROWTH_COOLDOWN_DAYS = 14;
const GROWTH_DUE_DAYS = 21;
const GROWTH_LAPSED_DAYS = 90;
const GROWTH_TEMPLATES = {
  dueForSession: "مرحباً {name} 🌟 حان وقت جلستك القادمة في {clinic}. متبقٍ لديك {n} جلسة — يسعدنا حجز موعدك، متى يناسبك؟",
  packageRenewal: "مرحباً {name} 💚 باقتك في {clinic} شارفت على الانتهاء (متبقٍ {n}). جدّدها الآن واستفد من عرض خاص.",
  lapsed: "اشتقنا لك {name}! 🌿 مرّ {days} يوماً منذ آخر زيارة لك في {clinic}. لديك عرض ترحيبي عند عودتك — احجز الآن.",
  outstanding: "مرحباً {name}، تذكير ودّي بوجود مبلغ مستحق بقيمة {amount} في {clinic}. نقدّر تسويته في زيارتك القادمة 🙏"
};
const GROWTH_SEGMENT_LABELS = {
  dueForSession: "حان وقت الجلسة", packageRenewal: "تجديد باقة", lapsed: "استعادة مريض", outstanding: "تحصيل مستحق"
};
function growthTemplate(key) {
  return (state.settings && state.settings.growthTemplates && state.settings.growthTemplates[key]) || GROWTH_TEMPLATES[key];
}
function fillTemplate(tpl, vars) {
  return String(tpl || "").replace(/\{(\w+)\}/g, (_, k) => (vars[k] != null ? vars[k] : ""));
}
function daysBetweenDates(dateStr, ref) {
  if (!dateStr) return Infinity;
  const d = new Date(`${dateStr}T12:00:00`).getTime();
  const r = new Date(`${ref}T12:00:00`).getTime();
  if (Number.isNaN(d) || Number.isNaN(r)) return Infinity;
  return Math.round((r - d) / 86400000);
}
function patientLastVisitDate(patientId, name) {
  let last = "";
  (state.entries || []).forEach(entry => {
    const mine = (patientId && entry.patientId === patientId) || (!patientId && name && entry.patient === name);
    if (mine && entry.date && (!last || entry.date > last)) last = entry.date;
  });
  return last;
}
function patientHasUpcoming(patientId) {
  const today = state.settings.activeDate;
  return (state.bookings || []).some(booking =>
    booking.patientId === patientId && booking.date >= today && !["cancelled", "no_show"].includes(booking.status));
}
function growthContactedRecently(patientId, segment) {
  const today = state.settings.activeDate;
  return (state.growthLog || []).some(log =>
    log.patientId === patientId && log.segment === segment && daysBetweenDates((log.at || "").slice(0, 10), today) < GROWTH_COOLDOWN_DAYS);
}
function recordGrowthContact(patientId, segment) {
  state.growthLog = state.growthLog || [];
  state.growthLog.push({ patientId, segment, at: new Date().toISOString() });
  if (state.growthLog.length > 2000) state.growthLog = state.growthLog.slice(-2000);
  logEdit("تواصل تسويقي", `${patientById(patientId)?.name || ""} · ${GROWTH_SEGMENT_LABELS[segment] || segment}`);
  saveState();
  renderGrowthCenter();
}
function growthSegments() {
  const today = state.settings.activeDate;
  const dueDays = Math.max(1, Number(state.settings.growthDueDays) || GROWTH_DUE_DAYS);
  const lapsedDays = Math.max(1, Number(state.settings.growthLapsedDays) || GROWTH_LAPSED_DAYS);
  const patientsById = new Map((state.patients || []).map(patient => [patient.id, patient]));
  const activePkgByPatient = new Map();
  (state.patientPackages || []).forEach(pkg => {
    if (pkg.status !== "active") return;
    const remaining = Math.max(0, (pkg.totalSessions || 0) - (pkg.usedSessions || 0));
    const cur = activePkgByPatient.get(pkg.patientId);
    activePkgByPatient.set(pkg.patientId, {
      minRemaining: cur ? Math.min(cur.minRemaining, remaining) : remaining,
      totalRemaining: (cur ? cur.totalRemaining : 0) + remaining
    });
  });

  const due = [], renewal = [], lapsed = [], outstanding = [];
  (state.patients || []).forEach(patient => {
    if (patient.active === false || !patient.phone) return;
    const sinceVisit = daysBetweenDates(patientLastVisitDate(patient.id, patient.name), today);
    const upcoming = patientHasUpcoming(patient.id);
    const pkg = activePkgByPatient.get(patient.id);
    const base = { id: patient.id, name: patient.name, phone: patient.phone, gender: patient.gender, consent: patient.marketingConsent };

    if (pkg && pkg.totalRemaining >= 1 && !upcoming && sinceVisit >= dueDays && sinceVisit !== Infinity
        && !growthContactedRecently(patient.id, "dueForSession")) {
      due.push({ ...base, n: pkg.totalRemaining, days: sinceVisit, meta: `آخر زيارة قبل ${sinceVisit} يوم · متبقٍ ${pkg.totalRemaining} جلسة` });
    }
    if (pkg && pkg.minRemaining <= 1 && !growthContactedRecently(patient.id, "packageRenewal")) {
      renewal.push({ ...base, n: pkg.minRemaining, meta: `متبقٍ ${pkg.minRemaining} جلسة في الباقة` });
    }
    if (!pkg && !upcoming && sinceVisit !== Infinity && sinceVisit > lapsedDays
        && !growthContactedRecently(patient.id, "lapsed")) {
      lapsed.push({ ...base, days: sinceVisit, meta: `لم يزر منذ ${sinceVisit} يوم` });
    }
  });
  outstandingByPatient().forEach(row => {
    const patient = patientsById.get(row.patientId);
    if (!patient || !patient.phone) return;
    const amount = (row.operations || 0) + (row.packages || 0);
    if (amount <= 0.5 || growthContactedRecently(row.patientId, "outstanding")) return;
    outstanding.push({ id: row.patientId, name: row.name || patient.name, phone: patient.phone, gender: patient.gender, consent: patient.marketingConsent, amount: money(amount), meta: `مستحق ${money(amount)}` });
  });

  return [
    { key: "dueForSession", title: "حان وقت الجلسة القادمة", icon: "ic-calendar", tone: "teal", desc: "مرضى لديهم جلسات متبقية ولم يزوروا مؤخراً — ادعهم للحجز.", patients: due },
    { key: "packageRenewal", title: "باقات شارفت على الانتهاء", icon: "ic-package", tone: "purple", desc: "جدّد الباقة قبل أن تنتهي وحافظ على الإيراد المتكرر.", patients: renewal },
    { key: "lapsed", title: `مرضى منقطعون (${lapsedDays}+ يوم)`, icon: "ic-user", tone: "amber", desc: "استعدهم برسالة ترحيبية وعرض خاص.", patients: lapsed },
    { key: "outstanding", title: "مبالغ مستحقة للتحصيل", icon: "ic-cash", tone: "red", desc: "تذكير ودّي بالسداد في الزيارة القادمة.", patients: outstanding }
  ];
}
function renderGrowthCenter() {
  if (!els.growthCenter) return;
  const clinic = state.settings.clinicName || "عيادتنا";
  const segments = growthSegments();
  const total = segments.reduce((sum, seg) => sum + seg.patients.length, 0);
  const kpis = `<div class="growth-kpis">
      <div class="growth-kpi total"><span>إجمالي الفرص اليوم</span><strong>${total}</strong></div>
      ${segments.map(seg => `<div class="growth-kpi"><span>${seg.title}</span><strong>${seg.patients.length}</strong></div>`).join("")}
    </div>`;
  const cards = segments.map(seg => {
    const rows = seg.patients.length ? seg.patients.map(person => {
      const message = fillTemplate(growthTemplate(seg.key), { name: person.name, clinic, n: person.n, days: person.days, amount: person.amount });
      const wa = phoneDigits(person.phone);
      const waLink = wa ? `https://wa.me/${wa}?text=${encodeURIComponent(message)}` : "";
      return `<li class="growth-row">
          ${genderAvatar(person, 34)}
          <div class="growth-row-main">
            <strong>${person.name}${person.consent ? "" : ` <span class="growth-optout" title="لم يسجّل موافقة تسويق">بدون موافقة</span>`}</strong>
            <small>${person.meta}</small>
          </div>
          <div class="growth-row-actions">
            ${waLink ? `<a class="growth-wa" href="${waLink}" target="_blank" rel="noreferrer" data-growth-sent="${person.id}" data-growth-seg="${seg.key}"><svg class="nav-ic" aria-hidden="true"><use href="#ic-chat"/></svg> واتساب</a>` : `<span class="growth-nophone">لا يوجد رقم</span>`}
            <button class="growth-done" type="button" data-growth-done="${person.id}" data-growth-seg="${seg.key}" title="إخفاء من القائمة لمدة ${GROWTH_COOLDOWN_DAYS} يوم">تم</button>
          </div>
        </li>`;
    }).join("") : `<li class="growth-empty">لا توجد فرص ضمن هذه الفئة حالياً 🎉</li>`;
    return `<article class="growth-card ${seg.tone}">
        <div class="growth-card-head">
          <span class="growth-bubble ${seg.tone}"><svg class="nav-ic" aria-hidden="true"><use href="#${seg.icon}"/></svg></span>
          <div><h3>${seg.title}<span class="growth-count">${seg.patients.length}</span></h3><p>${seg.desc}</p></div>
        </div>
        <ul class="growth-list">${rows}</ul>
      </article>`;
  }).join("");
  const dueDays = Math.max(1, Number(state.settings.growthDueDays) || GROWTH_DUE_DAYS);
  const lapsedDays = Math.max(1, Number(state.settings.growthLapsedDays) || GROWTH_LAPSED_DAYS);
  const settingsBar = `<div class="growth-settings">
      <span class="growth-settings-label">إعدادات الفرص</span>
      <label>ذكّر بالجلسة القادمة بعد <input type="number" min="1" max="365" value="${dueDays}" data-growth-setting="growthDueDays"> يوم</label>
      <label>اعتبر المريض منقطعاً بعد <input type="number" min="1" max="999" value="${lapsedDays}" data-growth-setting="growthLapsedDays"> يوم</label>
    </div>`;
  els.growthCenter.innerHTML = settingsBar + kpis + `<div class="growth-grid">${cards}</div>`;
}

document.addEventListener("change", event => {
  const input = event.target.closest("[data-growth-setting]");
  if (!input) return;
  const value = Math.max(1, Math.round(Number(input.value) || 0));
  state.settings[input.dataset.growthSetting] = value;
  saveState();
  renderGrowthCenter();
});

function ratingStars(patientId, rating) {
  const value = Math.min(5, Math.max(0, Math.round(rating || 0)));
  let stars = "";
  for (let i = 1; i <= 5; i++) {
    stars += `<button type="button" class="rating-star${i <= value ? " filled" : ""}" data-set-rating="${i}" data-rating-patient="${patientId}" aria-label="${i} من 5" title="${i} نجوم">★</button>`;
  }
  return `<div class="rating-stars" title="تقييم المريض — اضغط لتغييره">${stars}</div>`;
}

function ratingStarsStatic(rating) {
  const value = Math.min(5, Math.max(0, Math.round(rating || 0)));
  if (!value) return `<span class="rating-static empty">—</span>`;
  return `<span class="rating-static">${"★".repeat(value)}${"☆".repeat(5 - value)}</span>`;
}

document.addEventListener("click", event => {
  const star = event.target.closest("[data-set-rating]");
  if (!star) return;
  const patient = getPatient(star.dataset.ratingPatient);
  if (!patient || !canUseFeature("edit_patient_information")) return;
  const value = Number(star.dataset.setRating);
  patient.rating = patient.rating === value ? 0 : value;
  logEdit("تقييم مريض", `${patient.name} · ${patient.rating || 0}★`);
  saveState();
  render();
});

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
  populateConsumeSelects();
  renderProducts();
  renderPhysicalCount();
  renderCountHistory();
  renderKpis(entries, totals, diffs);
  renderDashboardSummary(entries, totals, diffs, weekEntries, weekTotals);
  renderDashboardCommandCenter(entries);
  renderDailyCommandCenter(entries, totals, diffs);
  renderWeekChart(weekSeries);
  renderRevenueTrend(weeklySeries(14));
  renderCapacityHeatmap();
  renderPaymentBreakdown(totals);
  renderSalaryBreakdown(entries);
  renderCloseSummary(totals, reconciliation, diffs);
  renderInsights(entries, weekEntries, totals);
  renderRecentEntries(entries);
  renderOperationLines();
  renderEntryTable(entries);
  renderPatients();
  renderStaffList();
  renderStaffRuleServiceSelect();
  renderServiceList();
  renderServiceBrowse();
  renderPackages();
  renderDashboardZones();
  renderDayHighway();
  renderReferralSummary();
  renderGrowthCenter();
  renderCollections();
  renderRuleList();
  renderInventoryKpis();
  renderSupplierList();
  renderInventoryList();
  renderLowStockList();
  renderPurchaseOrders();
  renderExpenses();
  renderBookingCalendar();
  renderBookingDayCalendar();
  renderBookingKpis();
  renderBookingList();
  renderSalaries(entries);
  renderReconciliation(totals, reconciliation, diffs);
  renderReportDateControls();
  renderReports();
  renderImportHistory();
  renderCommunications();
  renderLeads();
  renderStorageSafety();
  renderAlerts(entries, totals, diffs);
  renderAccountList();
  renderPermissionSelects();
  renderPermissionTable();
  updateEntryPreview();
  renderPaymentQuickButtons();
  applyLanguage();
}

els.viewButtons.forEach(button => {
  button.addEventListener("click", () => setView(button.dataset.viewButton));
});

// ── Grouped sidebar collapse + command palette (⌘K) ─────────────────────
// Purely additive: reuses setView()/canView() and the existing nav buttons.
(function initNavShell() {
  const appShell = document.querySelector(".app-shell");
  const COLLAPSE_KEY = "riaaya-nav-collapsed";
  const applyCollapsed = state => appShell?.classList.toggle("nav-collapsed", !!state);
  try { applyCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1"); } catch {}
  document.querySelector("[data-nav-collapse]")?.addEventListener("click", () => {
    const next = !appShell.classList.contains("nav-collapsed");
    applyCollapsed(next);
    try { localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0"); } catch {}
  });

  // Accordion groups: each group header expands/collapses its items (persisted).
  const GROUPS_KEY = "riaaya-nav-groups";
  const navGroups = [...document.querySelectorAll(".side-nav .nav-group")];
  const groupKey = group => group.querySelector("[data-nav-group]")?.dataset.navGroup || "";
  const openActiveGroup = () => {
    document.querySelector(".side-nav .nav-item.active")?.closest(".nav-group")?.classList.add("open");
  };
  let savedGroups = {};
  try { savedGroups = JSON.parse(localStorage.getItem(GROUPS_KEY) || "{}") || {}; } catch {}
  navGroups.forEach(group => {
    const key = groupKey(group);
    if (key in savedGroups) group.classList.toggle("open", !!savedGroups[key]);
  });
  openActiveGroup();
  const persistGroups = () => {
    const map = {};
    navGroups.forEach(group => { map[groupKey(group)] = group.classList.contains("open"); });
    try { localStorage.setItem(GROUPS_KEY, JSON.stringify(map)); } catch {}
  };
  document.querySelectorAll(".side-nav [data-nav-group]").forEach(button => {
    button.addEventListener("click", () => {
      button.closest(".nav-group")?.classList.toggle("open");
      persistGroups();
    });
  });
  document.querySelectorAll(".side-nav .nav-item").forEach(item => {
    item.addEventListener("click", () => item.closest(".nav-group")?.classList.add("open"));
  });

  const overlay = document.querySelector("[data-cmdk]");
  const input = overlay?.querySelector("[data-cmdk-input]");
  const list = overlay?.querySelector("[data-cmdk-list]");
  let activeIndex = 0;
  const navItems = () => [...document.querySelectorAll(".side-nav [data-view-button]")]
    .filter(btn => !btn.hidden)
    .map(btn => ({ view: btn.dataset.viewButton, label: (btn.querySelector(".nav-label")?.textContent || btn.textContent).trim() }));
  function render(filter) {
    if (!list) return;
    const q = (filter || "").trim();
    const matched = navItems().filter(it => !q || it.label.includes(q));
    list.innerHTML = "";
    activeIndex = 0;
    if (!matched.length) {
      const empty = document.createElement("div");
      empty.className = "cmdk-empty";
      empty.textContent = "لا توجد نتائج";
      list.appendChild(empty);
      return;
    }
    matched.forEach((it, i) => {
      const el = document.createElement("button");
      el.type = "button";
      el.className = "cmdk-item" + (i === 0 ? " cmdk-active" : "");
      el.textContent = it.label;
      el.addEventListener("click", () => { setView(it.view); openActiveGroup(); closeCmdk(); });
      list.appendChild(el);
    });
  }
  function openCmdk() {
    if (!overlay) return;
    overlay.hidden = false;
    render("");
    if (input) { input.value = ""; setTimeout(() => input.focus(), 20); }
  }
  function closeCmdk() { if (overlay) overlay.hidden = true; }
  function moveActive(delta) {
    const els = [...list.querySelectorAll(".cmdk-item")];
    if (!els.length) return;
    els[activeIndex]?.classList.remove("cmdk-active");
    activeIndex = (activeIndex + delta + els.length) % els.length;
    els[activeIndex]?.classList.add("cmdk-active");
    els[activeIndex]?.scrollIntoView({ block: "nearest" });
  }
  input?.addEventListener("input", () => render(input.value));
  input?.addEventListener("keydown", event => {
    if (event.key === "ArrowDown") { event.preventDefault(); moveActive(1); }
    else if (event.key === "ArrowUp") { event.preventDefault(); moveActive(-1); }
    else if (event.key === "Enter") { event.preventDefault(); list.querySelectorAll(".cmdk-item")[activeIndex]?.click(); }
  });
  overlay?.addEventListener("click", event => { if (event.target === overlay) closeCmdk(); });
  document.querySelector("[data-cmdk-open]")?.addEventListener("click", openCmdk);
  document.addEventListener("keydown", event => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      overlay && overlay.hidden ? openCmdk() : closeCmdk();
    } else if (event.key === "Escape" && overlay && !overlay.hidden) {
      closeCmdk();
    }
  });
})();

if (els.languageSelect) {
  els.languageSelect.addEventListener("change", event => {
    state.settings.language = event.target.value;
    storageSet("riaayaLanguage", event.target.value);
    saveState();
    render();
  });
}

if (els.accountSwitcher) {
  els.accountSwitcher.addEventListener("change", event => {
    if (runtime.mode === "live") return;
    state.currentAccountId = event.target.value;
    setCalendarFocus(false);
    saveState();
    render();
    applyAccountViewMode();
  });
}

els.logoutButton?.addEventListener("click", async () => {
  await fetch("/api/auth/logout", {
    method: "POST",
    headers: { "X-CSRF-Token": runtime.csrfToken }
  }).catch(() => null);
  location.href = "/login";
});

// ── Two-factor authentication management ────────────────────────────────────
function securityPart(name) {
  return els.securityModal?.querySelector(`[data-security-${name}]`);
}

function renderSecurityModal() {
  const enabled = Boolean(runtime.session?.user?.twoFactorEnabled);
  const statusEl = securityPart("status");
  if (statusEl) {
    statusEl.textContent = enabled ? "✅ المصادقة الثنائية مفعّلة على حسابك." : "المصادقة الثنائية غير مفعّلة.";
    statusEl.classList.toggle("on", enabled);
  }
  // hide all step sections, then show the idle action for the current state
  ["enable", "backup", "disable"].forEach(s => { const el = securityPart(s); if (el) el.hidden = true; });
  const enabledActions = securityPart("enabled-actions");
  const disabledActions = securityPart("disabled-actions");
  if (enabledActions) enabledActions.hidden = !enabled;
  if (disabledActions) disabledActions.hidden = enabled;
}

function openSecurityModal() {
  if (!els.securityModal) return;
  els.securityModal.hidden = false;
  renderSecurityModal();
}

function closeSecurityModal() {
  if (els.securityModal) els.securityModal.hidden = true;
}

async function securityRequest(path, body) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-CSRF-Token": runtime.csrfToken },
    body: JSON.stringify(body || {})
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "request_failed");
  return result;
}

// When the owner has flagged this clinic as 2FA-required, block the app until
// the logged-in user enrolls. Only applies to live clinic sessions (not the
// public trial) and never to the platform owner.
function enforce2faRequirement() {
  if (!els.twofaGate) return;
  const required = runtime.mode === "live" && Boolean(runtime.session?.clinic?.require2fa);
  const enrolled = Boolean(runtime.session?.user?.twoFactorEnabled);
  const mustEnroll = required && !enrolled;
  els.twofaGate.hidden = !mustEnroll;
  document.body.classList.toggle("twofa-gated", mustEnroll);
}

els.securityButton?.addEventListener("click", openSecurityModal);
securityPart("close")?.addEventListener("click", closeSecurityModal);
els.twofaGate?.querySelector("[data-twofa-gate-enable]")?.addEventListener("click", () => {
  // Open the existing 2FA setup and jump straight into enrollment.
  openSecurityModal();
  securityPart("start-enable")?.click();
});
els.twofaGate?.querySelector("[data-twofa-gate-logout]")?.addEventListener("click", () => {
  els.logoutButton?.click();
});
els.securityModal?.addEventListener("click", event => {
  if (event.target === els.securityModal) closeSecurityModal();
});

// Begin enrollment
securityPart("start-enable")?.addEventListener("click", async () => {
  try {
    const result = await securityRequest("/api/auth/2fa/setup");
    const secretEl = securityPart("secret");
    const otpEl = securityPart("otpauth");
    if (secretEl) secretEl.textContent = result.secret;
    if (otpEl) otpEl.textContent = result.otpauthUrl;
    renderSecurityModal();
    const enableSection = securityPart("enable");
    if (enableSection) enableSection.hidden = false;
    const disabledActions = securityPart("disabled-actions");
    if (disabledActions) disabledActions.hidden = true;
  } catch {
    alert("تعذّر بدء إعداد المصادقة الثنائية.");
  }
});

// Confirm enrollment with a code
securityPart("enable-confirm")?.addEventListener("click", async () => {
  const status = securityPart("enable-status");
  const code = securityPart("enable-code")?.value.trim();
  try {
    const result = await securityRequest("/api/auth/2fa/enable", { code });
    if (runtime.session?.user) runtime.session.user.twoFactorEnabled = true;
    // show backup codes once
    const codesEl = securityPart("backup-codes");
    if (codesEl) codesEl.innerHTML = (result.backupCodes || []).map(c => `<code>${c}</code>`).join("");
    ["enable", "disabled-actions", "enabled-actions"].forEach(s => { const el = securityPart(s); if (el) el.hidden = true; });
    const backupSection = securityPart("backup");
    if (backupSection) backupSection.hidden = false;
    const statusEl = securityPart("status");
    if (statusEl) { statusEl.textContent = "✅ المصادقة الثنائية مفعّلة على حسابك."; statusEl.classList.add("on"); }
    // Requirement satisfied — drop the gate (user still sees backup codes in the modal).
    enforce2faRequirement();
  } catch (error) {
    if (status) status.textContent = error.message === "invalid_2fa_code" ? "الرمز غير صحيح. حاول مرة أخرى." : "تعذّر التفعيل.";
  }
});

securityPart("backup-done")?.addEventListener("click", () => {
  renderSecurityModal();
});

// Begin disable
securityPart("start-disable")?.addEventListener("click", () => {
  ["enabled-actions", "disabled-actions"].forEach(s => { const el = securityPart(s); if (el) el.hidden = true; });
  const disableSection = securityPart("disable");
  if (disableSection) disableSection.hidden = false;
});

// Confirm disable
securityPart("disable-confirm")?.addEventListener("click", async () => {
  const status = securityPart("disable-status");
  const password = securityPart("disable-password")?.value;
  const code = securityPart("disable-code")?.value.trim();
  try {
    await securityRequest("/api/auth/2fa/disable", { password, code });
    if (runtime.session?.user) runtime.session.user.twoFactorEnabled = false;
    renderSecurityModal();
  } catch (error) {
    const messages = { invalid_password: "كلمة المرور غير صحيحة.", invalid_2fa_code: "الرمز غير صحيح." };
    if (status) status.textContent = messages[error.message] || "تعذّر الإيقاف.";
  }
});

els.submitOpenReceipt?.addEventListener("click", () => {
  if (!runtime.openReceiptId) return;
  document.querySelector(`[data-submit-receipt="${runtime.openReceiptId}"]`)?.click();
});

function resetAccountForm() {
  if (!els.accountForm) return;
  els.accountForm.reset();
  els.accountForm.elements.accountId.value = "";
  els.accountForm.elements.calendarDaysBack.value = 0;
  els.accountForm.elements.calendarDaysAhead.value = 30;
  [...els.accountForm.querySelectorAll('[name="workingDays"]')].forEach(input => {
    input.checked = input.value !== "5";
  });
  renderAccountColumnsSelect([]);
  if (els.accountSubmit) els.accountSubmit.textContent = "حساب جديد";
}

function fillAccountForm(accountId) {
  if (!els.accountForm) return;
  const account = state.accounts.find(item => item.id === accountId);
  if (!account) return;
  els.accountForm.elements.accountId.value = account.id;
  els.accountForm.elements.email.value = account.email || account.userName || "";
  els.accountForm.elements.password.value = "";
  els.accountForm.elements.userName.value = account.userName || "";
  els.accountForm.elements.arabicFirstName.value = account.arabicFirstName || "";
  els.accountForm.elements.arabicLastName.value = account.arabicLastName || "";
  els.accountForm.elements.firstName.value = account.firstName || "";
  els.accountForm.elements.lastName.value = account.lastName || "";
  els.accountForm.elements.mobile.value = account.mobile || "";
  els.accountForm.elements.telNo.value = account.telNo || "";
  els.accountForm.elements.role.value = account.role;
  els.accountForm.elements.staffId.value = account.staffId || "";
  if (els.accountForm.elements.viewMode) els.accountForm.elements.viewMode.value = account.viewMode || "normal";
  els.accountForm.elements.active.value = String(account.active !== false);
  els.accountForm.elements.ownEntriesOnly.checked = account.ownEntriesOnly === true;
  els.accountForm.elements.canViewSensitive.checked = account.canViewSensitive === true;
  els.accountForm.elements.calendarScope.value = account.calendarScope || "today";
  els.accountForm.elements.calendarDaysBack.value = account.calendarDaysBack || 0;
  els.accountForm.elements.calendarDaysAhead.value = account.calendarDaysAhead || 0;
  [...els.accountForm.querySelectorAll('[name="workingDays"]')].forEach(input => {
    input.checked = (account.workingDays || []).includes(Number(input.value));
  });
  renderAccountColumnsSelect(account.allowedColumnIds || []);
  if (els.accountSubmit) els.accountSubmit.textContent = "تعديل الحساب";
  els.accountForm.scrollIntoView({ behavior: "smooth", block: "center" });
}

async function persistClinicUser(account, password = "") {
  const creating = !state.accounts.some(item => item.id === account.id);
  const endpoint = creating ? "/api/clinic-users" : `/api/clinic-users/${encodeURIComponent(account.id)}`;
  const response = await fetch(endpoint, {
    method: creating ? "POST" : "PUT",
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-Token": runtime.csrfToken
    },
    body: JSON.stringify({ ...account, password })
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "user_save_failed");
  return normalizeAccount(result.user);
}

if (els.accountForm) {
  els.accountForm.addEventListener("submit", async event => {
    event.preventDefault();
    if (!canManagePermissions()) return;
    const formData = new FormData(els.accountForm);
    const data = Object.fromEntries(formData.entries());
    const existing = state.accounts.find(account => account.id === data.accountId);
    let permissionFeatures = existing?.permissionFeatures || defaultFeaturesForRole(data.role);
    permissionFeatures = data.canViewSensitive === "on"
      ? uniqueValues([...permissionFeatures, "access_financial"])
      : permissionFeatures.filter(feature => feature !== "access_financial");
    const account = normalizeAccount({
      ...existing,
      id: data.accountId || nextId("account"),
      email: data.email.trim(),
      userName: (data.email || data.userName).trim(),
      arabicFirstName: data.arabicFirstName.trim(),
      arabicLastName: data.arabicLastName.trim(),
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      mobile: data.mobile.trim(),
      telNo: data.telNo.trim(),
      role: data.role,
      staffId: data.staffId,
      viewMode: data.viewMode || "normal",
      permissionFeatures,
      ownEntriesOnly: data.ownEntriesOnly === "on",
      canViewSensitive: data.canViewSensitive === "on",
      calendarScope: data.calendarScope,
      calendarDaysBack: data.calendarDaysBack,
      calendarDaysAhead: data.calendarDaysAhead,
      workingDays: formData.getAll("workingDays").map(Number),
      allowedColumnIds: formData.getAll("allowedColumnIds"),
      active: data.active === "true"
    });
    try {
      const savedAccount = runtime.mode === "live"
        ? await persistClinicUser(account, data.password)
        : account;
      if (existing) {
        state.accounts = state.accounts.map(item => item.id === savedAccount.id ? savedAccount : item);
      } else {
        state.accounts.push(savedAccount);
      }
      resetAccountForm();
      saveState();
      render();
    } catch (error) {
      const messages = {
        weak_password: "كلمة المرور يجب أن تكون 12 حرفاً على الأقل وتحتوي أحرفاً كبيرة وصغيرة ورقماً ورمزاً.",
        invalid_email: "أدخل بريدًا إلكترونيًا صحيحًا.",
        email_already_registered: "هذا البريد الإلكتروني مسجل مسبقاً.",
        missing_user_fields: "أدخل البريد الإلكتروني واسم المستخدم."
      };
      alert(messages[error.message] || "تعذر حفظ المستخدم. تحقق من البريد وكلمة المرور ثم حاول مرة أخرى.");
    }
  });
}

document.querySelector("[data-reset-account-form]")?.addEventListener("click", resetAccountForm);

if (els.accountFilterForm) {
  els.accountFilterForm.addEventListener("input", renderAccountList);
  els.accountFilterForm.addEventListener("change", renderAccountList);
}

if (els.permissionForm) {
  els.permissionForm.addEventListener("submit", async event => {
    event.preventDefault();
    if (!canManagePermissions()) return;
    const formData = new FormData(els.permissionForm);
    const accountIds = formData.getAll("accountIds");
    const feature = formData.get("feature");
    if (!feature || !accountIds.length) return;
    const updatedAccounts = state.accounts.map(account => {
      if (!accountIds.includes(account.id) || account.role === "admin") return account;
      return normalizeAccount({
        ...account,
        permissionFeatures: uniqueValues([...(account.permissionFeatures || []), feature])
      });
    });
    if (runtime.mode === "live") {
      try {
        const saved = await Promise.all(updatedAccounts
          .filter(account => accountIds.includes(account.id) && account.role !== "admin")
          .map(account => persistClinicUser(account)));
        const savedById = new Map(saved.map(account => [account.id, account]));
        state.accounts = updatedAccounts.map(account => savedById.get(account.id) || account);
      } catch {
        alert("تعذر تحديث الصلاحيات. لم يتم تطبيق التغيير.");
        return;
      }
    } else {
      state.accounts = updatedAccounts;
    }
    els.permissionForm.reset();
    saveState();
    render();
  });
}

function resetPatientForm() {
  if (!els.patientForm) return;
  els.patientForm.reset();
  els.patientForm.elements.patientId.value = "";
  if (els.patientSubmit) els.patientSubmit.textContent = "حفظ الملف";
}

function fillPatientForm(patientId) {
  if (!els.patientForm) return;
  const patient = getPatient(patientId);
  if (!patient) return;
  els.patientForm.elements.patientId.value = patient.id;
  els.patientForm.elements.profileType.value = patient.profileType;
  els.patientForm.elements.name.value = patient.name;
  els.patientForm.elements.phone.value = patient.phone || "";
  els.patientForm.elements.email.value = patient.email || "";
  els.patientForm.elements.gender.value = patient.gender || "";
  els.patientForm.elements.nationality.value = patient.nationality || "";
  els.patientForm.elements.city.value = patient.city || "";
  els.patientForm.elements.category.value = patient.category || "";
  if (els.patientForm.elements.referralSource) els.patientForm.elements.referralSource.value = patient.referralSource || "";
  els.patientForm.elements.notes.value = patient.notes || "";
  els.patientForm.elements.marketingConsent.checked = patient.marketingConsent === true;
  if (els.patientSubmit) els.patientSubmit.textContent = "تحديث الملف";
  els.patientForm.scrollIntoView({ behavior: "smooth", block: "center" });
}

if (els.patientForm) {
  els.patientForm.addEventListener("submit", event => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(els.patientForm).entries());
    const existing = getPatient(data.patientId);
    if (existing && !canUseFeature("edit_patient_information")) return;
    if (!existing && !canUseFeature("add_patient")) return;
    const patient = normalizePatient({
      ...existing,
      id: existing?.id || nextId("patient"),
      patientNumber: existing?.patientNumber || nextPatientNumber(),
      profileType: data.profileType,
      name: data.name.trim(),
      phone: data.phone.trim(),
      email: data.email.trim(),
      gender: data.gender,
      nationality: data.nationality.trim(),
      city: data.city.trim(),
      category: data.category.trim(),
      referralSource: data.referralSource || "",
      notes: data.notes.trim(),
      marketingConsent: data.marketingConsent === "on",
      consentUpdatedAt: data.marketingConsent === "on" ? new Date().toISOString() : existing?.consentUpdatedAt || "",
      createdAt: existing?.createdAt || today
    });
    if (existing) {
      state.patients = state.patients.map(item => item.id === patient.id ? patient : item);
      state.entries = state.entries.map(entry => entry.patientId === patient.id ? { ...entry, patient: patient.name } : entry);
      state.bookings = state.bookings.map(booking => booking.patientId === patient.id ? { ...booking, patient: patient.name, phone: patient.phone || booking.phone } : booking);
      logEdit("تعديل ملف مريض", patient.name);
    } else {
      state.patients.push(patient);
      logEdit("إضافة ملف مريض", patient.name);
    }
    selectedPatientId = patient.id;
    resetPatientForm();
    saveState();
    render();
  });
}

document.querySelector("[data-reset-patient-form]")?.addEventListener("click", resetPatientForm);

if (els.patientFilterForm) {
  els.patientFilterForm.addEventListener("input", () => {
    patientPage = 1;
    renderPatients();
  });
  els.patientFilterForm.addEventListener("change", () => {
    patientPage = 1;
    renderPatients();
  });
}

if (els.entryFilterForm) {
  els.entryFilterForm.addEventListener("input", () => {
    operationPage = 1;
    renderEntryTable(activeEntries());
  });
  els.entryFilterForm.addEventListener("change", () => {
    operationPage = 1;
    renderEntryTable(activeEntries());
  });
}

if (els.permissionCategorySelect) {
  els.permissionCategorySelect.addEventListener("change", renderPermissionSelects);
}

if (els.permissionSearch) {
  els.permissionSearch.addEventListener("input", renderPermissionSelects);
}

if (els.globalSearch) {
  els.globalSearch.addEventListener("submit", event => {
    event.preventDefault();
    const query = new FormData(els.globalSearch).get("query")?.trim() || "";
    if (!query) return;
    const dates = [
      ...state.entries.map(entry => entry.date),
      ...state.bookings.map(booking => booking.date),
      ...state.patients.map(patient => patient.createdAt)
    ].filter(Boolean).sort();
    state.settings.reportDateFrom = dates[0] || state.settings.activeDate;
    state.settings.reportDateTo = dates.at(-1) || state.settings.activeDate;
    setView("reports");
    if (els.reportSelect) els.reportSelect.value = "universal";
    renderReportDateControls();
    if (els.reportSearch) els.reportSearch.value = query;
    reportPage = 1;
    renderReports();
  });
}

if (els.notificationToggle) {
  els.notificationToggle.addEventListener("click", () => {
    const willOpen = els.notificationPanel?.hidden !== false;
    if (els.notificationPanel) els.notificationPanel.hidden = !willOpen;
    els.notificationToggle.setAttribute("aria-expanded", String(willOpen));
  });
}

document.querySelectorAll("[data-mark-notifications-read]").forEach(button => {
  button.addEventListener("click", () => {
    state.notificationReads = state.notificationReads || {};
    operationalNotifications().forEach(notification => {
      state.notificationReads[notification.id] = true;
    });
    saveState();
    renderNotificationCenters();
  });
});

if (els.digestForm) {
  els.digestForm.addEventListener("change", renderDigestPreview);
  els.digestForm.addEventListener("submit", event => {
    event.preventDefault();
    if (!canUseFeature("send_role_digests")) return;
    const data = Object.fromEntries(new FormData(els.digestForm).entries());
    state.digestRules = state.digestRules || [];
    state.digestRules.push(normalizeDigestRule({
      id: nextId("digest"),
      accountId: data.accountId,
      channel: data.channel,
      sendTime: data.sendTime,
      template: data.template,
      active: true
    }));
    saveState();
    renderCommunications();
  });
}

if (els.campaignForm) {
  els.campaignForm.addEventListener("input", renderCampaignEstimate);
  els.campaignForm.addEventListener("change", renderCampaignEstimate);
  els.campaignForm.addEventListener("submit", event => {
    event.preventDefault();
    if (!canUseFeature("send_sms_campaigns")) return;
    const data = Object.fromEntries(new FormData(els.campaignForm).entries());
    const recipients = campaignRecipients(data.audience, data.category);
    const segments = Math.max(Math.ceil([...String(data.message || "")].length / 70), 1);
    state.campaigns = state.campaigns || [];
    const campaignId = nextId("campaign");
    state.campaigns.unshift(normalizeCampaign({
      id: campaignId,
      audience: data.audience,
      category: data.category.trim(),
      message: data.message.trim(),
      scheduledAt: data.scheduledAt,
      recipientCount: recipients.length,
      segments,
      status: data.scheduledAt ? "scheduled" : "queued",
      createdAt: new Date().toISOString()
    }));
    state.outboundMessages = state.outboundMessages || [];
    recipients.forEach(patient => {
      state.outboundMessages.push(normalizeOutboundMessage({
        id: nextId("message"),
        channel: "sms",
        recipient: patient.phone,
        patientId: patient.id,
        campaignId,
        body: data.message.trim().replaceAll("{{name}}", patient.name),
        status: data.scheduledAt ? "scheduled" : "queued",
        createdAt: new Date().toISOString()
      }));
    });
    els.campaignForm.reset();
    saveState();
    renderCommunications();
  });
}

if (els.whatsappSettings) {
  els.whatsappSettings.addEventListener("submit", async event => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(els.whatsappSettings).entries());
    const config = {
      businessPhone: data.businessPhone.trim(),
      phoneNumberId: data.phoneNumberId.trim(),
      templateName: data.templateName.trim() || "clinic_daily_role_report",
      graphApiVersion: data.graphApiVersion.trim() || "v23.0"
    };
    try {
      const saved = await saveClinicIntegration("whatsapp", config, data.secret);
      state.integrations.whatsapp = { ...config, configured: saved.configured };
    } catch {
      alert("تعذر حفظ إعداد WhatsApp بشكل آمن.");
      return;
    }
    saveState();
    await loadCommunicationBackendStatus();
    renderCommunications();
  });
}

if (els.smsSettings) {
  els.smsSettings.addEventListener("submit", async event => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(els.smsSettings).entries());
    const config = {
      provider: data.provider,
      senderId: data.senderId.trim(),
      endpoint: data.endpoint.trim()
    };
    try {
      const saved = await saveClinicIntegration("sms", config, data.secret);
      state.integrations.sms = { ...config, configured: saved.configured };
    } catch {
      alert("تعذر حفظ إعداد SMS بشكل آمن.");
      return;
    }
    saveState();
    await loadCommunicationBackendStatus();
    renderCommunications();
  });
}

if (els.jofotaraSettings) {
  els.jofotaraSettings.addEventListener("submit", async event => {
    event.preventDefault();
    if (!canUseFeature("manage_jofotara")) return;
    const data = Object.fromEntries(new FormData(els.jofotaraSettings).entries());
    const config = {
      taxNumber: data.taxNumber.trim(),
      clientId: data.clientId.trim(),
      incomeSourceSequence: data.incomeSourceSequence.trim(),
      submissionEnabled: data.submissionEnabled === "on"
    };
    try {
      const saved = await saveClinicIntegration("jofotara", config, data.secret);
      state.integrations.jofotara = { ...config, configured: saved.configured };
    } catch {
      alert("تعذر حفظ إعداد JoFotara بشكل آمن.");
      return;
    }
    state.receipts = (state.receipts || []).map(receipt => (
      receipt.status === "draft" && state.integrations.jofotara.configured
        ? { ...receipt, status: "ready" }
        : receipt
    ));
    saveState();
    await loadCommunicationBackendStatus();
    renderCommunications();
    renderNotificationCenters();
  });
}

if (els.salarySlipSelect) {
  els.salarySlipSelect.addEventListener("change", event => {
    selectedSalaryMemberId = event.target.value;
    render();
  });
}

if (els.printSalarySlip) {
  els.printSalarySlip.addEventListener("click", () => {
    if (!canViewSensitive()) return;
    document.body.classList.add("printing-salary-slip");
    document.body.classList.remove("printing-report");
    setView("salaries");
    window.print();
  });
}

window.addEventListener("afterprint", () => {
  document.body.classList.remove("printing-salary-slip");
  document.body.classList.remove("printing-payroll");
  document.body.classList.remove("printing-report");
  document.body.classList.remove("printing-receipt");
});

function setPatientFocusMode(mode) {
  patientFocusMode = mode === "file" ? "file" : "list";
  if (document.body.dataset.focusView === "patients") {
    document.body.dataset.patientFocusMode = patientFocusMode;
  }
}

function enterFocusMode(viewName, options = {}) {
  if (!viewName || !canView(viewName)) return;
  setView(viewName);
  document.querySelectorAll(".view.expanded-view").forEach(view => {
    view.classList.remove("expanded-view");
  });
  const view = document.querySelector(`[data-view="${viewName}"]`);
  if (!view) return;
  view.classList.add("expanded-view");
  document.body.classList.add("focus-mode");
  document.body.dataset.focusView = viewName;
  if (viewName === "patients") {
    setPatientFocusMode(options.patientFocus || patientFocusMode || "list");
  } else {
    delete document.body.dataset.patientFocusMode;
  }
  if (els.focusExit) {
    els.focusExit.hidden = false;
    els.focusExit.textContent = currentLanguage() === "en" ? "Exit Full Screen" : "تصغير الشاشة";
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function exitFocusMode() {
  document.body.classList.remove("focus-mode");
  delete document.body.dataset.focusView;
  delete document.body.dataset.patientFocusMode;
  document.querySelectorAll(".view.expanded-view").forEach(view => {
    view.classList.remove("expanded-view");
  });
  if (els.focusExit) {
    els.focusExit.hidden = true;
  }
}

function updateReportRangeFromControls() {
  const range = normalizeDateRange(els.reportDateFrom?.value, els.reportDateTo?.value);
  state.settings.reportDateFrom = range.from;
  state.settings.reportDateTo = range.to;
  reportPage = 1;
  saveState();
  renderReportDateControls();
  renderReports();
}

function reportRangeLabel() {
  const { from, to } = reportDateRange();
  return from === to ? displayDate(from) : `${displayDate(from)} - ${displayDate(to)}`;
}

function selectedReportLabel() {
  return els.reportSelect?.options[els.reportSelect.selectedIndex]?.textContent?.trim() || "التقرير";
}

function renderEntriesFocusTable() {
  const isEnglish = currentLanguage() === "en";
  const label = isEnglish
    ? {
      empty: "No operations for this date.",
      date: "Date",
      patient: "Patient",
      service: "Service",
      doctor: "Doctor",
      specialist: "Specialist",
      status: "Status",
      quantity: "Quantity",
      payment: "Payment",
      price: "Price",
      discount: "Discount",
      net: "Paid",
      cost: "Cost",
      profit: "Profit",
      payouts: "Payouts",
      notes: "Notes"
    }
    : {
      empty: "لا توجد عمليات لهذا التاريخ.",
      date: "التاريخ",
      patient: "المريض",
      service: "الخدمة",
      doctor: "الطبيب",
      specialist: "الأخصائي",
      status: "الحالة",
      quantity: "الكمية",
      payment: "الدفع",
      price: "السعر",
      discount: "الخصم",
      net: "المدفوع",
      cost: "التكلفة",
      profit: "الربح",
      payouts: "المستحقات",
      notes: "ملاحظات"
    };
  const entries = activeEntries().slice().reverse();
  const showSensitive = canViewSensitive();
  const rows = entries.length ? entries.map(entry => {
    const doctor = getStaffMember(entry.doctorId);
    const specialist = getStaffMember(entry.specialistId);
    const payouts = entryPayouts(entry);
    const payoutText = payouts.length
      ? payouts.map(row => `${row.member.name}: ${money(row.payout)}`).join("<br>")
      : "-";
    return `
      <tr>
        <td>${displayDate(entry.date)}</td>
        <td>${entry.patient}</td>
        <td>${serviceLabel(entry)}</td>
        <td>${doctor?.name || "-"}</td>
        <td>${specialist?.name || "-"}</td>
        <td><span class="status-pill ${statusClass(entry.status)}">${entryStatusLabel(entry.status)}</span></td>
        <td>${entry.quantity || 1}</td>
        <td>${entryPaymentLabel(entry)}</td>
        ${showSensitive ? `<td>${money(numberValue(entry.amount))}</td>` : ""}
        ${showSensitive ? `<td>${money(numberValue(entry.discount))}</td>` : ""}
        ${showSensitive ? `<td><strong>${money(paidAmount(entry))}</strong></td>` : ""}
        ${showSensitive ? `<td>${money(entryCost(entry))}</td>` : ""}
        ${showSensitive ? `<td>${money(profitAmount(entry))}</td>` : ""}
        ${showSensitive ? `<td>${payoutText}</td>` : ""}
        <td>${entry.notes || "-"}</td>
      </tr>
    `;
  }).join("") : `<tr><td colspan="${showSensitive ? 15 : 9}">${label.empty}</td></tr>`;

  return `
    <div class="table-wrap focus-table-wrap">
      <table>
        <thead>
          <tr>
            <th>${label.date}</th>
            <th>${label.patient}</th>
            <th>${label.service}</th>
            <th>${label.doctor}</th>
            <th>${label.specialist}</th>
            <th>${label.status}</th>
            <th>${label.quantity}</th>
            <th>${label.payment}</th>
            ${showSensitive ? `<th>${label.price}</th>` : ""}
            ${showSensitive ? `<th>${label.discount}</th>` : ""}
            ${showSensitive ? `<th>${label.net}</th>` : ""}
            ${showSensitive ? `<th>${label.cost}</th>` : ""}
            ${showSensitive ? `<th>${label.profit}</th>` : ""}
            ${showSensitive ? `<th>${label.payouts}</th>` : ""}
            <th>${label.notes}</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function renderInventoryFocusTable() {
  const isEnglish = currentLanguage() === "en";
  const label = isEnglish
    ? {
      empty: "No inventory items yet.",
      item: "Item",
      sku: "SKU",
      unit: "Unit",
      available: "Available",
      threshold: "Low limit",
      status: "Status",
      supplier: "Supplier",
      contact: "Contact",
      unitCost: "Unit cost",
      value: "Value",
      lastOrder: "Last order",
      disabled: "Disabled"
    }
    : {
      empty: "لا توجد أصناف مخزون بعد.",
      item: "الصنف",
      sku: "الرمز",
      unit: "الوحدة",
      available: "المتوفر",
      threshold: "حد الطلب",
      status: "الحالة",
      supplier: "المورد",
      contact: "التواصل",
      unitCost: "تكلفة الوحدة",
      value: "القيمة",
      lastOrder: "آخر طلب",
      disabled: "معطل"
    };
  const showSensitive = canViewSensitive();
  const rows = activeInventoryItems().length ? activeInventoryItems().map(item => {
    const supplier = getSupplier(item.supplierId);
    const status = stockStatus(item);
    return `
      <tr>
        <td>${item.name}</td>
        <td>${item.sku || "-"}</td>
        <td>${item.unit}</td>
        <td><strong>${item.quantity}</strong></td>
        <td>${item.lowThreshold || label.disabled}</td>
        <td><span class="status-pill ${status.className}">${status.label}</span></td>
        <td>${supplier?.name || "-"}</td>
        <td>${supplier?.contact || "-"}</td>
        ${showSensitive ? `<td>${money(item.unitCost)}</td>` : ""}
        ${showSensitive ? `<td>${money(numberValue(item.quantity) * numberValue(item.unitCost))}</td>` : ""}
        <td>${item.lastOrderedAt ? displayDate(item.lastOrderedAt) : "-"}</td>
      </tr>
    `;
  }).join("") : `<tr><td colspan="${showSensitive ? 11 : 9}">${label.empty}</td></tr>`;

  return `
    <div class="table-wrap focus-table-wrap">
      <table>
        <thead>
          <tr>
            <th>${label.item}</th>
            <th>${label.sku}</th>
            <th>${label.unit}</th>
            <th>${label.available}</th>
            <th>${label.threshold}</th>
            <th>${label.status}</th>
            <th>${label.supplier}</th>
            <th>${label.contact}</th>
            ${showSensitive ? `<th>${label.unitCost}</th>` : ""}
            ${showSensitive ? `<th>${label.value}</th>` : ""}
            <th>${label.lastOrder}</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function openTableFocus(type) {
  if (!els.tableFocus || !els.tableFocusContent) return;
  let title = "الجدول";
  let subtitle = "عرض كامل";
  let content = "";

  if (type === "entries") {
    title = currentLanguage() === "en" ? "Today Operations Table" : "جدول عمليات اليوم";
    subtitle = `${state.settings.clinicName} | ${displayDate(state.settings.activeDate)}`;
    content = renderEntriesFocusTable();
  } else if (type === "inventory") {
    title = currentLanguage() === "en" ? "Inventory Table" : "جدول المخزون";
    subtitle = currentLanguage() === "en" ? "All active inventory items" : "كل الأصناف الفعالة في المخزون";
    content = renderInventoryFocusTable();
  } else if (type === "report") {
    renderReports();
    title = selectedReportLabel();
    subtitle = reportRangeLabel();
    content = `<div class="table-focus-report"><div class="report-page">${els.reportPage?.innerHTML || ""}</div></div>`;
  } else if (type === "services") {
    const category = els.serviceBrowseCategory?.value || "";
    const query = els.serviceBrowseSearch?.value || "";
    title = currentLanguage() === "en" ? "Services available for operations" : "الخدمات المتاحة للعمليات";
    subtitle = `${(state.services || []).length} ${currentLanguage() === "en" ? "services" : "خدمة"}`;
    content = serviceBrowseTableHtml(serviceBrowseRows(category, query));
  }

  els.tableFocusTitle.textContent = title;
  els.tableFocusSubtitle.textContent = subtitle;
  els.tableFocusContent.innerHTML = content;
  els.tableFocus.hidden = false;
  document.body.classList.add("table-focus-open");
  document.querySelector("[data-close-table-focus]")?.focus();
}

function closeTableFocus() {
  if (!els.tableFocus) return;
  els.tableFocus.hidden = true;
  if (els.tableFocusContent) els.tableFocusContent.innerHTML = "";
  document.body.classList.remove("table-focus-open");
}

// ── Doctor rate row helpers ───────────────────────────────────────────────
function updateDoctorRateRow() {
  if (!els.doctorRateRow || !els.doctorSelect) return;
  const doctorId = els.doctorSelect.value;
  const doctor = getStaffMember(doctorId);
  if (!doctor) {
    els.doctorRateRow.hidden = true;
    return;
  }
  els.doctorRateRow.hidden = false;
  const rateDisplay = doctor.model === "fixed"
    ? `${money(doctor.rate)} ثابت لكل عملية`
    : `${doctor.rate}% · ${ruleModelLabel(doctor.model || "pct_net")}`;
  if (els.doctorRateValue) els.doctorRateValue.textContent = rateDisplay;
  if (els.doctorRateHint) els.doctorRateHint.textContent = MODEL_HINTS[doctor.model || "pct_net"] || "";
  // Sync model override select to doctor's default model
  if (els.doctorModelOverride) els.doctorModelOverride.value = doctor.model || "pct_net";
}

document.querySelector("[data-toggle-doctor-rate]")?.addEventListener("click", () => {
  if (!els.doctorRateOverride) return;
  const isHidden = els.doctorRateOverride.hidden;
  els.doctorRateOverride.hidden = !isHidden;
  // When showing, pre-fill with doctor's default rate
  if (isHidden && els.doctorRateOverrideInput) {
    const doctor = getStaffMember(els.doctorSelect?.value);
    if (doctor && !els.doctorRateOverrideInput.value) {
      els.doctorRateOverrideInput.value = doctor.rate;
    }
  }
});

// ── Payment status toggle ─────────────────────────────────────────────────
function initPaymentStatusToggle() {
  if (!els.paymentStatusToggle) return;
  els.paymentStatusToggle.addEventListener("click", event => {
    const btn = event.target.closest("[data-pstatus]");
    if (!btn) return;
    const status = btn.dataset.pstatus;
    // Update hidden status input
    if (els.entryForm?.elements.status) els.entryForm.elements.status.value = status;
    // Update button states
    els.paymentStatusToggle.querySelectorAll("[data-pstatus]").forEach(b => {
      b.classList.toggle("active", b === btn);
    });
    updatePaymentFieldsForStatus();
    updateEntryPreview();
  });
}
initPaymentStatusToggle();

if (els.entryForm) {
  els.entryForm.addEventListener("input", event => {
    // Once the user types their own remaining, stop auto-filling it from price − paid.
    if (event.target === els.remainingInput) els.remainingInput.dataset.touched = "1";
    updateEntryPreview();
  });
  els.entryForm.addEventListener("change", event => {
    if (event.target.name === "statusExtra") {
      const scheduled = event.target.value === "scheduled";
      if (els.operationSchedulePanel) els.operationSchedulePanel.hidden = !scheduled;
      if (scheduled) {
        const dateInput = els.entryForm.elements.scheduleDate;
        if (dateInput && !dateInput.value) dateInput.value = state.settings.activeDate;
      }
      return;
    }
    if (event.target === els.operationCategorySelect) {
      const activeCategory = els.operationCategorySelect.value || "";
      const services = activeServices();
      const filtered = activeCategory ? services.filter(service => (service.category || "") === activeCategory) : services;
      els.serviceSelect.innerHTML = filtered.length
        ? filtered.map(service => `<option value="${service.id}">${service.name}</option>`).join("")
        : `<option value="">${activeCategory ? "لا خدمات في هذه الفئة" : "أضف خدمة أولاً"}</option>`;
      els.serviceSelect.dispatchEvent(new Event("change", { bubbles: true }));
      return;
    }
    if (event.target === els.serviceSelect) {
      const service = getService(els.serviceSelect.value);
      if (service) {
        // Only managers see/set a price — non-managers record what was paid, no catalog price
        if (canViewSensitive()) {
          els.entryForm.elements.amount.value = service.defaultPrice || "";
        } else {
          els.entryForm.elements.amount.value = "";
        }
        const costInput = els.entryForm.querySelector("[data-cost-input]");
        if (costInput) costInput.value = service.defaultCost || 0;
        // New service → let the remaining auto-recompute from the new price.
        if (els.remainingInput) delete els.remainingInput.dataset.touched;
      }
    }
    if (event.target === els.doctorSelect) {
      updateDoctorRateRow();
      // Reset override when doctor changes
      if (els.doctorRateOverride) els.doctorRateOverride.hidden = true;
      if (els.doctorRateOverrideInput) els.doctorRateOverrideInput.value = "";
    }
    updateEntryPreview();
    renderPaymentQuickButtons();
  });
}

document.querySelector("[data-add-operation-line]")?.addEventListener("click", addCurrentOperationLine);

if (els.bookingForm) {
  els.bookingForm.elements.date.value = state.settings.activeDate;
  els.bookingForm.addEventListener("change", event => {
    if (event.target === els.bookingServiceSelect) {
      const service = getService(els.bookingServiceSelect.value);
      if (service) {
        els.bookingForm.elements.expectedAmount.value = service.defaultPrice || "";
        const allowedColumns = scheduleColumnsForAccount();
        const suggestedColumn = bookingScheduleColumnId({
          serviceId: service.id,
          service: service.name,
          patient: els.bookingForm.elements.patient.value,
          notes: ""
        }, allowedColumns);
        if (suggestedColumn) els.bookingForm.elements.scheduleColumnId.value = suggestedColumn;
      }
    }
  });

  els.bookingForm.addEventListener("submit", event => {
    event.preventDefault();
    if (!canView("bookings") || !canUseFeature("add_appointment")) return;
    const data = Object.fromEntries(new FormData(els.bookingForm).entries());
    const service = getService(data.serviceId);
    const account = currentAccount();
    if (!scheduleColumnAllowedForAccount(data.scheduleColumnId, account)) {
      alert("هذا الحساب لا يملك صلاحية الحجز في عمود التقويم المختار.");
      renderScheduleColumnControls();
      return;
    }
    if (!calendarDateAllowed(currentAccount(), data.date)) {
      alert("هذا التاريخ خارج نطاق التقويم المسموح لهذا الحساب.");
      return;
    }
    const stepMinutes = scheduleSlotMinutes();
    if (!isTimeOnScheduleSlot(data.time, stepMinutes)) {
      const nearestSlot = scheduleSlotForTime(data.time, stepMinutes);
      alert(`اختر وقتاً على بداية خانة ${stepMinutes} دقيقة. مثال: ${displayTime(nearestSlot)} ثم ${displayTime(timeFromMinutes(minutesFromTime(nearestSlot) + stepMinutes))}.`);
      return;
    }
    const scopedMember = accountStaffScoped(account) ? getStaffMember(account.staffId) : null;
    const patient = ensurePatientFile(data.patient.trim(), data.phone.trim());
    const pendingBooking = normalizeBooking({
      id: "__pending_booking__",
      date: data.date,
      time: data.time,
      patientId: patient.id,
      patient: data.patient.trim(),
      phone: data.phone.trim(),
      serviceId: data.serviceId,
      service: service?.name || "خدمة",
      scheduleColumnId: data.scheduleColumnId,
      doctorId: scopedMember?.role === "doctor" ? scopedMember.id : data.doctorId,
      specialistId: scopedMember?.role === "specialist" ? scopedMember.id : data.specialistId,
      expectedAmount: data.expectedAmount || service?.defaultPrice,
      status: data.status,
      notes: data.notes.trim()
    }, state.services);
    const conflict = ["cancelled", "no_show"].includes(pendingBooking.status)
      ? null
      : bookingSlotConflict(pendingBooking, pendingBooking.id);
    if (conflict) {
      const columnId = bookingScheduleColumnId(pendingBooking, bookingScheduleColumns());
      alert(scheduleConflictMessage({ first: conflict, second: pendingBooking, columnId, slot: scheduleSlotForBooking(conflict) }));
      return;
    }
    state.bookings.push(normalizeBooking({
      id: nextId("booking"),
      date: data.date,
      time: data.time,
      patientId: patient.id,
      patient: data.patient.trim(),
      phone: data.phone.trim(),
      serviceId: data.serviceId,
      service: service?.name || "خدمة",
      scheduleColumnId: data.scheduleColumnId,
      doctorId: scopedMember?.role === "doctor" ? scopedMember.id : data.doctorId,
      specialistId: scopedMember?.role === "specialist" ? scopedMember.id : data.specialistId,
      expectedAmount: data.expectedAmount || service?.defaultPrice,
      status: data.status,
      notes: data.notes.trim(),
      createdAt: new Date().toISOString()
    }, state.services));
    logEdit("حجز موعد", `${data.patient.trim()} · ${service?.name || "خدمة"} · ${data.date} ${data.time}`);
    els.bookingForm.reset();
    els.bookingForm.elements.date.value = state.settings.activeDate;
    const selectedService = getService(els.bookingServiceSelect.value) || activeServices()[0];
    if (selectedService) els.bookingForm.elements.expectedAmount.value = selectedService.defaultPrice || "";
    const firstColumn = scheduleColumnsForAccount()[0];
    if (firstColumn) els.bookingForm.elements.scheduleColumnId.value = firstColumn.id;
    saveState();
    render();
  });
}

if (els.scheduleColumnForm) {
  els.scheduleColumnForm.addEventListener("submit", event => {
    event.preventDefault();
    if (!canViewSensitive()) return;
    const data = Object.fromEntries(new FormData(els.scheduleColumnForm).entries());
    const category = String(data.category || "").trim();
    const label = String(data.label || "").trim() || category;
    if (!label) return;
    state.scheduleColumns = [
      ...activeScheduleColumns(),
      normalizeScheduleColumn({ id: scheduleColumnIdFromLabel(label), label, categories: category ? [category] : [] })
    ];
    els.scheduleColumnForm.reset();
    saveState();
    renderScheduleColumnControls();
    renderBookingDayCalendar();
  });
}

// ── New-category → calendar row prompt ─────────────────────────────────────
let pendingCategoryForRow = "";
function columnHostsCategory(category) {
  return (state.scheduleColumns || []).some(column => (column.categories || []).includes(category));
}
function openCategoryRowPrompt(category) {
  const modal = document.querySelector("[data-category-row-modal]");
  if (!modal || !category) return;
  pendingCategoryForRow = category;
  const nameEl = modal.querySelector("[data-category-row-name]");
  if (nameEl) nameEl.textContent = category;
  const select = modal.querySelector("[data-category-row-select]");
  const columns = activeScheduleColumns();
  if (select) select.innerHTML = columns.length
    ? columns.map(column => `<option value="${column.id}">${column.label}</option>`).join("")
    : `<option value="">لا توجد أعمدة</option>`;
  modal.hidden = false;
}
(function initCategoryRowPrompt() {
  const modal = document.querySelector("[data-category-row-modal]");
  if (!modal) return;
  const close = () => { modal.hidden = true; pendingCategoryForRow = ""; };
  modal.querySelector("[data-category-row-new]")?.addEventListener("click", () => {
    if (!pendingCategoryForRow) return close();
    state.scheduleColumns = [
      ...activeScheduleColumns(),
      normalizeScheduleColumn({ id: scheduleColumnIdFromLabel(pendingCategoryForRow), label: pendingCategoryForRow, categories: [pendingCategoryForRow] })
    ];
    close();
    saveState();
    render();
  });
  modal.querySelector("[data-category-row-existing]")?.addEventListener("click", () => {
    const select = modal.querySelector("[data-category-row-select]");
    const column = (state.scheduleColumns || []).find(item => item.id === select?.value);
    if (column && pendingCategoryForRow) {
      column.categories = [...new Set([...(column.categories || []), pendingCategoryForRow])];
      column.category = column.categories[0] || "";
    }
    close();
    saveState();
    render();
  });
  modal.querySelector("[data-category-row-skip]")?.addEventListener("click", close);
  modal.addEventListener("click", event => { if (event.target === modal) close(); });
})();

// ── Quick booking popup from a free calendar slot ──────────────────────────
// Clicking an empty cell in a column opens a popup scoped to that column's
// category, listing only that category's services to book.
(function initSlotBooking() {
  const modal = document.querySelector("[data-slot-booking-modal]");
  if (!modal) return;
  const form = modal.querySelector("[data-slot-booking-form]");
  const titleEl = modal.querySelector("[data-slot-booking-title]");
  const serviceSel = modal.querySelector("[data-slot-booking-service]");
  const catSel = modal.querySelector("[data-slot-booking-category]");
  const doctorSel = modal.querySelector("[data-slot-booking-doctor]");
  const statusEl = modal.querySelector("[data-slot-booking-status]");

  function close() { modal.hidden = true; form.reset(); if (statusEl) statusEl.textContent = ""; }

  let columnCategories = [];
  function fillServices(category) {
    let services = activeServices();
    // When the column is tied to one or two categories, never show anything else.
    if (columnCategories.length) services = services.filter(service => columnCategories.includes(service.category || ""));
    if (category) services = services.filter(service => (service.category || "") === category);
    serviceSel.innerHTML = services.length
      ? services.map(service => `<option value="${service.id}">${service.name}</option>`).join("")
      : `<option value="">لا توجد خدمات في هذه الفئة</option>`;
  }
  if (catSel) catSel.addEventListener("change", () => fillServices(catSel.value));

  function open(date, time, columnId) {
    const column = bookingScheduleColumns().find(item => item.id === columnId);
    columnCategories = column?.categories || [];
    if (catSel) {
      if (columnCategories.length) {
        catSel.innerHTML = columnCategories.map(category => `<option value="${category}">${category}</option>`).join("");
        catSel.value = columnCategories[0];
      } else {
        catSel.innerHTML = `<option value="">كل الخدمات</option>`
          + serviceCategories().map(category => `<option value="${category}">${category}</option>`).join("");
        catSel.value = "";
      }
    }
    fillServices(catSel ? catSel.value : "");
    doctorSel.innerHTML = `<option value="">—</option>`
      + (state.staff || []).filter(member => member.role === "doctor").map(member => `<option value="${member.id}">${member.name}</option>`).join("");
    form.elements.date.value = date;
    form.elements.scheduleColumnId.value = columnId;
    form.elements.time.value = time;
    titleEl.textContent = `${displayDate(date)} · ${displayTime(time)} · ${column?.label || ""}`;
    modal.hidden = false;
    setTimeout(() => form.elements.patient.focus(), 30);
  }

  document.addEventListener("click", event => {
    if (event.target.closest("[data-slot-booking-close]") || event.target === modal) { close(); return; }
    if (event.target.closest(".day-schedule-booking")) return;
    const slot = event.target.closest(".day-schedule-slot");
    if (slot && slot.dataset.dropSlot && slot.dataset.dropColumn) {
      if (!canUseFeature("add_appointment")) return;
      open(state.settings.activeDate, slot.dataset.dropSlot, slot.dataset.dropColumn);
    }
  });

  form.addEventListener("submit", event => {
    event.preventDefault();
    if (!canUseFeature("add_appointment")) return;
    const data = Object.fromEntries(new FormData(form).entries());
    if (!data.patient?.trim() || !data.serviceId) {
      if (statusEl) statusEl.textContent = "أدخل اسم المريض واختر الخدمة.";
      return;
    }
    const patient = findOrCreatePatientByName(data.patient.trim());
    const service = getService(data.serviceId);
    state.bookings = state.bookings || [];
    state.bookings.push(normalizeBooking({
      date: data.date || state.settings.activeDate,
      time: data.time || "09:00",
      patientId: patient.id,
      patient: patient.name,
      phone: patient.phone || "",
      serviceId: data.serviceId,
      service: service ? service.name : "خدمة",
      scheduleColumnId: data.scheduleColumnId,
      doctorId: data.doctorId || "",
      expectedAmount: service ? service.defaultPrice : 0,
      status: "scheduled"
    }, state.services));
    logEdit("حجز موعد", `${patient.name} · ${service ? service.name : "خدمة"} · ${data.date || state.settings.activeDate} ${data.time || "09:00"}`);
    close();
    saveState();
    render();
  });

  document.addEventListener("keydown", event => { if (event.key === "Escape" && !modal.hidden) close(); });
})();

if (els.scheduleSlotMinutes) {
  els.scheduleSlotMinutes.addEventListener("change", event => {
    if (!canViewSensitive()) return;
    const previous = scheduleSlotMinutes();
    const next = Number(event.target.value) || 15;
    const conflict = scheduleConflictForBookings(next);
    if (conflict) {
      event.target.value = String(previous);
      alert(scheduleConflictMessage(conflict, next));
      return;
    }
    state.settings.scheduleSlotMinutes = next;
    saveState();
    renderScheduleColumnControls();
    renderBookingDayCalendar();
  });
}

if (els.reportSelect) {
  els.reportSelect.addEventListener("change", () => {
    reportPage = 1;
    renderReports();
  });
}

if (els.reportFilterForm) {
  els.reportFilterForm.addEventListener("input", () => {
    reportPage = 1;
    renderReports();
  });
  els.reportFilterForm.addEventListener("change", () => {
    reportPage = 1;
    renderReports();
  });
}

if (els.reportDateFrom) {
  els.reportDateFrom.addEventListener("change", updateReportRangeFromControls);
}

if (els.reportDateTo) {
  els.reportDateTo.addEventListener("change", updateReportRangeFromControls);
}

if (els.reportToday) {
  els.reportToday.addEventListener("click", () => {
    state.settings.reportDateFrom = state.settings.activeDate;
    state.settings.reportDateTo = state.settings.activeDate;
    reportPage = 1;
    saveState();
    renderReportDateControls();
    renderReports();
  });
}

document.querySelectorAll("[data-report-preset]").forEach(button => {
  button.addEventListener("click", () => {
    const base = state.settings.activeDate || today;
    let from = base;
    const to = base;
    if (button.dataset.reportPreset === "week") {
      const start = new Date(base + "T00:00:00");
      start.setDate(start.getDate() - 6);
      from = start.toISOString().slice(0, 10);
    } else if (button.dataset.reportPreset === "month") {
      from = base.slice(0, 7) + "-01";
    } else if (button.dataset.reportPreset === "year") {
      from = base.slice(0, 4) + "-01-01";
    }
    state.settings.reportDateFrom = from;
    state.settings.reportDateTo = to;
    reportPage = 1;
    saveState();
    renderReportDateControls();
    renderReports();
  });
});

if (els.printSelectedReport) {
  els.printSelectedReport.addEventListener("click", () => {
    if (!canUseFeature("print_reports")) return;
    renderReports();
    // Populate print document header
    const pClinic   = document.querySelector("[data-print-clinic-name]");
    const pTitle    = document.querySelector("[data-print-report-title]");
    const pPeriod   = document.querySelector("[data-print-report-period]");
    const pFClinic  = document.querySelector("[data-print-footer-clinic]");
    const pFDate    = document.querySelector("[data-print-footer-date]");
    const clinicName = state.settings?.clinicName || "رعاية";
    if (pClinic)  pClinic.textContent  = clinicName;
    if (pTitle)   pTitle.textContent   = selectedReportLabel();
    if (pPeriod)  pPeriod.textContent  = reportDateRangeLabel();
    if (pFClinic) pFClinic.textContent = clinicName;
    if (pFDate)   pFDate.textContent   = `طُبع في: ${displayDate(new Date().toISOString().slice(0, 10))}`;
    document.body.classList.add("printing-report");
    document.body.classList.remove("printing-salary-slip");
    setView("reports");
    window.requestAnimationFrame(() => window.print());
  });
}

// ─── Report tab navigation ─────────────────────────────────────────────────
document.querySelectorAll("[data-report-tab]").forEach(btn => {
  btn.addEventListener("click", () => {
    const val = btn.dataset.reportTab;
    if (!val || !els.reportSelect) return;
    reportCenterMode = false;
    els.reportSelect.value = val;
    // Update active tab style
    document.querySelectorAll("[data-report-tab]").forEach(b =>
      b.classList.toggle("active", b.dataset.reportTab === val)
    );
    renderReports();
  });
});

// ── Physical inventory count + discrepancy report ─────────────────────────
function consumedSinceCount(itemId, since) {
  return -(state.inventoryMovements || [])
    .filter(move => move.itemId === itemId && ["consumption", "sale"].includes(move.reason) && (!since || move.at >= since))
    .reduce((sum, move) => sum + move.qty, 0);
}

function renderPhysicalCount() {
  const host = document.querySelector("[data-physical-count]");
  if (!host) return;
  const items = (state.inventory || []).filter(item => item.active !== false);
  if (!items.length) { host.innerHTML = `<div class="empty-state">أضف أصنافاً للمخزون أولاً.</div>`; return; }
  const since = (state.inventoryCounts || []).slice(-1)[0]?.at || "";
  host.innerHTML = `
    <form data-physical-count-form>
      <div class="table-wrap"><table class="practical-table">
        <thead><tr><th>الصنف</th><th>المسجّل في النظام</th><th>استُهلك منذ آخر جرد</th><th>العدد الفعلي</th></tr></thead>
        <tbody>${items.map(item => `
          <tr>
            <td><strong>${item.name}</strong></td>
            <td>${numberValue(item.quantity)} ${item.unit}</td>
            <td>${consumedSinceCount(item.id, since)} ${item.unit}</td>
            <td><input type="number" min="0" step="0.01" data-count-item="${item.id}" value="${numberValue(item.quantity)}" style="width:110px"></td>
          </tr>`).join("")}</tbody>
      </table></div>
      <button class="primary-button" type="submit" style="margin-top:14px">حفظ الجرد ومطابقته</button>
    </form>`;
}

function renderCountHistory() {
  const host = document.querySelector("[data-count-history]");
  if (!host) return;
  const counts = (state.inventoryCounts || []).slice().reverse();
  if (!counts.length) { host.innerHTML = `<div class="empty-state">لا توجد عمليات جرد بعد.</div>`; return; }
  host.innerHTML = counts.map(record => {
    const disc = record.lines.filter(line => Math.abs(line.variance) > 0.009);
    return `<div class="staff-card${disc.length ? " editing" : ""}">
      <div>
        <strong>جرد ${displayDate(record.date)} — ${record.who}</strong>
        <p>${record.lines.length} صنف · ${disc.length ? `<span class="stock-low">${disc.length} فرق غير مُفسَّر</span>` : "كل الأصناف مطابقة ✓"}</p>
        ${disc.length ? `<small>${disc.map(line => `${line.name}: ${line.variance > 0 ? "+" : ""}${line.variance} ${line.unit || ""}`).join("، ")}</small>` : ""}
      </div>
    </div>`;
  }).join("");
}

document.addEventListener("submit", event => {
  const form = event.target.closest("[data-physical-count-form]");
  if (!form) return;
  event.preventDefault();
  if (!canViewSensitive()) return;
  const since = (state.inventoryCounts || []).slice(-1)[0]?.at || "";
  const lines = [];
  form.querySelectorAll("[data-count-item]").forEach(input => {
    const item = getInventoryItem(input.dataset.countItem);
    if (!item) return;
    const system = asNumber(item.quantity);
    const counted = asNumber(input.value);
    const variance = Math.round((counted - system) * 100) / 100;
    lines.push({ itemId: item.id, name: item.name, unit: item.unit, system, counted, variance, consumed: consumedSinceCount(item.id, since) });
    if (Math.abs(variance) > 0.009) {
      item.quantity = counted;
      state.inventoryMovements = state.inventoryMovements || [];
      state.inventoryMovements.push({ id: nextId("invmove"), itemId: item.id, qty: variance, reason: "count_adjust", date: state.settings.activeDate, at: new Date().toISOString() });
    }
  });
  const record = { id: nextId("count"), date: state.settings.activeDate, at: new Date().toISOString(), who: currentAccount()?.name || currentAccount()?.email || "—", lines };
  state.inventoryCounts = [...(state.inventoryCounts || []), record];
  const disc = lines.filter(line => Math.abs(line.variance) > 0.009);
  logEdit("جرد مخزون", `${lines.length} صنف · ${disc.length} فرق${disc.length ? ": " + disc.map(l => `${l.name} ${l.variance > 0 ? "+" : ""}${l.variance}`).join("، ") : ""}`);
  saveState();
  render();
  showToast(disc.length ? `تم الجرد — ${disc.length} صنف به فرق غير مُفسَّر ⚠️` : "تم الجرد — كل الأصناف مطابقة ✓", disc.length ? "warn" : "success");
});

// Test-data seeder — fills the clinic with realistic bookings, operations and
// patients (Clinica-style) so the whole app can be exercised end to end.
function generateTestData() {
  const names = ["سارة عبدالله","محمد العتيبي","لطيفة خالد","فهد السالم","رنا علي","ماهر خليل","ريم خالد","سيف محمود","نور الهدى","عادل ناصر","بيان أحمد","جود عمر","ليان سمير","يزن قاسم","دانة فؤاد","تالا وليد","كرم سعيد","هلا منصور","زيد ربيع","مايا حسن","عبير سامي","وسام لؤي","رهف عماد","طارق فيصل"];
  const genders = ["female","male","female","male","female","male"];
  const patients = names.map((name, i) => normalizePatient({
    id: nextId("patient"), name, phone: `079${String(1000000 + i * 41111).slice(0, 7)}`,
    gender: genders[i % genders.length], rating: (i % 5) + 1,
    referralSource: ["instagram","friend","google","walkin","tiktok","returning"][i % 6]
  }));
  state.patients.push(...patients);

  // Categorized services (with subcategories) so the tree, the operation
  // drill-down, and the row→category restriction all have realistic data.
  const seedServices = [
    ["ليزر كامل الجسم","ليزر","نساء",120,20],["ليزر الوجه","ليزر","نساء",40,8],
    ["ليزر الساقين","ليزر","نساء",60,12],["ليزر الظهر","ليزر","رجال",70,14],
    ["فيلر شفايف","فيلر","ستايلج",150,60],["فيلر خدود","فيلر","ستايلج",180,70],
    ["فيلر ذقن","فيلر","كيسينس",160,65],["بوتوكس جبهة","بوتوكس","",120,45],
    ["تنظيف بشرة عميق","فيشل","",45,10],["هيدرافيشل","فيشل","",70,18],
    ["تبييض أسنان","أسنان","",90,25],["حشوة تجميلية","أسنان","",50,15]
  ];
  seedServices.forEach(([name, category, subcategory, price, cost]) => {
    if (!(state.services || []).some(svc => svc.name === name)) {
      state.services.push(normalizeService({ id: nextId("service"), name, category, subcategory, defaultPrice: price, defaultCost: cost, active: true }));
    }
  });
  const categoryForLabel = label => {
    const lower = String(label || "").toLowerCase();
    if (lower.includes("laser") || lower.includes("ليزر")) return "ليزر";
    if (lower.includes("facial") || lower.includes("فيشل") || lower.includes("فيشيال")) return "فيشل";
    if (lower.includes("doctor") || lower.includes("طبيب") || lower.includes("أسنان")) return "أسنان";
    return "";
  };
  (state.scheduleColumns || []).forEach(col => {
    const cat = categoryForLabel(col.label);
    if (cat && !(col.categories || []).length) col.categories = [cat];
  });
  // Two sellable products + a sale, so the Products page has data.
  (state.inventory || []).slice(0, 2).forEach((item, i) => {
    item.isProduct = true;
    if (!item.salePrice) item.salePrice = (asNumber(item.unitCost) || 5) * 2 + i * 5;
  });

  const cols = (state.scheduleColumns || []).filter(col => col.active !== false);
  const services = (state.services || []).filter(svc => svc.active !== false);
  const serviceForColumn = col => {
    const cat = (col.categories || [])[0] || "";
    const pool = cat ? services.filter(svc => svc.category === cat) : services;
    return pool.length ? pool : services;
  };
  const staff = state.staff || [];
  const doctors = staff.filter(member => member.role === "doctor");
  const specialists = staff.filter(member => member.role === "specialist");
  const times = ["08:00","08:30","09:00","09:30","10:00","10:30","11:00","11:30","12:00","13:00","13:30","14:00","14:30","15:00","16:00","16:30","17:00"];
  const statuses = ["scheduled","confirmed","arrived","completed","scheduled","confirmed","cancelled"];
  let bookingN = 0;

  for (let d = 0; d <= 2; d++) {
    const date = dateOffset(d, state.settings.activeDate);
    cols.forEach((col, ci) => {
      const pool = serviceForColumn(col);
      for (let n = 0; n < 3; n++) {
        const patient = patients[bookingN % patients.length];
        const service = pool[bookingN % pool.length];
        state.bookings.push(normalizeBooking({
          id: nextId("booking"), date, time: times[(ci * 3 + n) % times.length],
          patientId: patient.id, patient: patient.name, phone: patient.phone,
          serviceId: service?.id || "", service: service?.name || "خدمة",
          scheduleColumnId: col.id, status: statuses[bookingN % statuses.length],
          expectedAmount: service?.defaultPrice || 50, createdAt: new Date().toISOString()
        }, state.services));
        bookingN++;
      }
    });
  }

  let opN = 0;
  for (let d = 1; d <= 7; d++) {
    const date = dateOffset(-d, state.settings.activeDate);
    for (let n = 0; n < 5; n++) {
      const patient = patients[opN % patients.length];
      const service = services[opN % services.length];
      const entry = normalizeEntry({
        id: nextId("entry"), date, patientId: patient.id, patient: patient.name,
        serviceId: service?.id || "", service: service?.name,
        amount: service?.defaultPrice || 60, quantity: 1, cost: service?.defaultCost || 0,
        doctorId: opN % 2 === 0 ? (doctors[opN % Math.max(doctors.length, 1)]?.id || "") : "",
        specialistId: specialists[opN % Math.max(specialists.length, 1)]?.id || "",
        paymentMethod: ["cash","card","transfer"][opN % 3], status: "completed"
      }, state.services);
      state.entries.push(entry);
      opN++;
    }
  }

  logEdit("تعبئة بيانات اختبار", `${patients.length} مريض · ${bookingN} حجز · ${opN} عملية`);
  saveState();
  render();
  showToast(`تمت إضافة ${patients.length} مريض و ${bookingN} حجز و ${opN} عملية للاختبار`, "success");
}

document.addEventListener("click", async event => {
  if (!event.target.closest("[data-seed-test-data]")) return;
  if (await showConfirm("سيتم إضافة مرضى وحجوزات وعمليات تجريبية لتعبئة العيادة للاختبار. متابعة؟")) generateTestData();
});

// Owner impersonation banner — shown while an owner is browsing a clinic.
function renderImpersonationBanner() {
  const imp = runtime.session?.impersonating;
  let banner = document.querySelector("[data-impersonation-banner]");
  if (!imp?.active) { banner?.remove(); return; }
  if (!banner) {
    banner = document.createElement("div");
    banner.setAttribute("data-impersonation-banner", "");
    banner.className = "impersonation-banner";
    document.body.prepend(banner);
    document.body.classList.add("has-impersonation-banner");
  }
  banner.innerHTML = `<span>↪ أنت تتصفّح عيادة <strong>${imp.clinicName || ""}</strong> كمالك المنصّة — كل إجراء يُسجَّل.</span><button type="button" data-exit-impersonation>خروج والعودة للمالك</button>`;
}
document.addEventListener("click", async event => {
  if (!event.target.closest("[data-exit-impersonation]")) return;
  try { await fetch("/api/auth/exit-impersonation", { method: "POST", headers: { "X-CSRF-Token": runtime.csrfToken } }); } catch {}
  window.location.href = "/owner";
});

// Calendar maximize: slide the sidebar off-screen so the calendar goes full width.
// The sidebar reveals when the mouse reaches the right edge, and hides on leave.
function setCalendarFocus(on) {
  const shell = document.querySelector(".app-shell");
  if (!shell) return;
  shell.classList.toggle("calendar-focus", on);
  if (!on) shell.classList.remove("sidebar-peek");
  document.querySelectorAll("[data-calendar-maximize]").forEach(btn => btn.classList.toggle("active", on));
}
document.addEventListener("click", event => {
  if (!event.target.closest("[data-calendar-maximize]")) return;
  setCalendarFocus(!document.querySelector(".app-shell")?.classList.contains("calendar-focus"));
});
// Reveal the hidden sidebar only when the mouse hits the very right edge…
document.addEventListener("mousemove", event => {
  const shell = document.querySelector(".app-shell");
  if (!shell || (!shell.classList.contains("calendar-focus") && !shell.classList.contains("nav-autohide"))) return;
  if (document.body.classList.contains("kiosk-locked")) return; // locked staff can't reveal the nav
  if (event.clientX > window.innerWidth - 14) shell.classList.add("sidebar-peek");
});
// …and hide it the instant the pointer leaves the sidebar (no dead zone).
document.querySelector(".sidebar")?.addEventListener("mouseleave", () => {
  const shell = document.querySelector(".app-shell");
  if (shell && (shell.classList.contains("calendar-focus") || shell.classList.contains("nav-autohide"))) {
    shell.classList.remove("sidebar-peek");
  }
});

// Per-account view mode: normal / rows-only with nav / kiosk (rows only, locked).
function applyAccountViewMode() {
  const mode = currentAccount()?.viewMode || "normal";
  document.body.classList.toggle("kiosk-locked", mode === "kiosk");
  if (mode === "kiosk" || mode === "rows_nav") {
    if (canView("bookings") && document.querySelector(".view.active")?.dataset.view !== "bookings") setView("bookings");
    setCalendarFocus(true);
  }
}

// The sidebar auto-hides by default on every page (reveals when the mouse hits
// the right edge, hides when the pointer leaves it). The topbar toggle PINS it
// open so it stays visible; clicking again returns to auto-hide. Persisted.
// Two independent sidebar controls, each remembered per user:
//   • the ☰ inside the sidebar collapses it to icons (nav-collapsed) — "minimize"
//   • this topbar toggle makes the sidebar auto-hide (reveal on mouse-to-edge)
// Default: the sidebar is visible (auto-hide off) so both controls are reachable.
function setNavAutohide(on) {
  const shell = document.querySelector(".app-shell");
  if (!shell) return;
  shell.classList.toggle("nav-autohide", on);
  if (!on) shell.classList.remove("sidebar-peek");
  document.querySelectorAll("[data-nav-autohide-toggle]").forEach(btn => btn.classList.toggle("active", on));
  try { localStorage.setItem("riaaya-nav-autohide", on ? "1" : "0"); } catch {}
}
document.addEventListener("click", event => {
  if (!event.target.closest("[data-nav-autohide-toggle]")) return;
  setNavAutohide(!document.querySelector(".app-shell")?.classList.contains("nav-autohide"));
});
try { setNavAutohide(localStorage.getItem("riaaya-nav-autohide") === "1"); } catch {}

// Calendar: show/hide the management area (KPIs, legend, column controls). Hidden
// by default; the toggle is data-sensitive so restricted staff only ever see the rows.
document.addEventListener("click", event => {
  const toggle = event.target.closest("[data-calendar-manage-toggle]");
  if (!toggle) return;
  const view = toggle.closest('[data-view="bookings"]');
  if (!view) return;
  const open = view.classList.toggle("calendar-manage-open");
  toggle.classList.toggle("active", open);
});

// Calendar: compact date picker replaces the month grid — pick a day or step ±1.
els.bookingDateInput?.addEventListener("change", event => {
  const value = event.target.value;
  if (!value || !calendarDateAllowed(currentAccount(), value)) { renderBookingCalendar(); return; }
  setActiveDate(value);
});
document.addEventListener("click", event => {
  const nav = event.target.closest("[data-booking-day-nav]");
  if (!nav) return;
  const next = dateOffset(nav.dataset.bookingDayNav === "next" ? 1 : -1, state.settings.activeDate || today);
  if (!calendarDateAllowed(currentAccount(), next)) return;
  setActiveDate(next);
});

// Operations breakdown: switch the aggregation dimension (delegated — the buttons
// are re-rendered with the report each time).
document.addEventListener("click", event => {
  const dimBtn = event.target.closest("[data-breakdown-dim]");
  if (!dimBtn) return;
  operationsBreakdownDim = dimBtn.dataset.breakdownDim;
  renderReports();
});

// Per-specialist report: filter to one employee (or all).
document.addEventListener("change", event => {
  const sel = event.target.closest("[data-specialist-filter]");
  if (!sel) return;
  specialistReportFilter = sel.value;
  renderReports();
});

// Audit log filters: by user (who) and by action type.
document.addEventListener("change", event => {
  const who = event.target.closest("[data-audit-who]");
  const action = event.target.closest("[data-audit-action]");
  if (who) { auditWhoFilter = who.value; renderReports(); }
  else if (action) { auditActionFilter = action.value; renderReports(); }
});
document.addEventListener("click", event => {
  if (!event.target.closest("[data-audit-clear]")) return;
  auditWhoFilter = "";
  auditActionFilter = "";
  renderReports();
});

// Commission rules: edit an existing القاعدة (load it back into the form).
document.addEventListener("click", event => {
  const editBtn = event.target.closest("[data-edit-rule]");
  if (editBtn) startEditRule(editBtn.dataset.editRule);
});

// Rule services tree: a category/subcategory "select all" toggles its services;
// each service shows +/✓. Handles 100s of services without a flat checkbox wall.
function updateRuleSvcRow(cb) {
  const label = cb.closest(".rule-tree-service");
  if (!label) return;
  label.classList.toggle("on", cb.checked);
  const plus = label.querySelector(".rule-tree-plus");
  if (plus) plus.textContent = cb.checked ? "✓" : "+";
}
document.addEventListener("change", event => {
  const cb = event.target;
  if (cb.tagName !== "INPUT" || !els.ruleServiceSelect || !els.ruleServiceSelect.contains(cb)) return;
  if (cb.dataset.ruleCatAll !== undefined || cb.dataset.ruleSubAll !== undefined) {
    const cat = cb.dataset.ruleCatAll, subKey = cb.dataset.ruleSubAll;
    els.ruleServiceSelect.querySelectorAll('[name="serviceId"]').forEach(svc => {
      if ((cat !== undefined && svc.dataset.svcCat === cat) || (subKey !== undefined && svc.dataset.svcSubkey === subKey)) {
        svc.checked = cb.checked;
        updateRuleSvcRow(svc);
      }
    });
  } else if (cb.name === "serviceId") {
    updateRuleSvcRow(cb);
  }
});

// Growth center: sending WhatsApp or pressing "تم" records the contact (so the
// patient drops off the list for the cooldown window). The WhatsApp link opens
// normally — we don't preventDefault.
document.addEventListener("click", event => {
  const waBtn = event.target.closest("[data-growth-sent]");
  if (waBtn) { recordGrowthContact(waBtn.dataset.growthSent, waBtn.dataset.growthSeg); return; }
  const doneBtn = event.target.closest("[data-growth-done]");
  if (doneBtn) { recordGrowthContact(doneBtn.dataset.growthDone, doneBtn.dataset.growthSeg); return; }
});

// Report center (table-first): open a report row, switch category, or go back.
document.addEventListener("click", event => {
  const openBtn = event.target.closest("[data-open-report]");
  if (openBtn) {
    if (!canView("reports")) return;
    const type = openBtn.dataset.openReport;
    reportCenterMode = false;
    setView("reports");
    if (els.reportSelect) els.reportSelect.value = type;
    document.querySelectorAll("[data-report-tab]").forEach(tab => tab.classList.toggle("active", tab.dataset.reportTab === type));
    renderReports();
    const exp = openBtn.dataset.thenExport;
    if (exp === "xls") document.querySelector("[data-export-report-xls]")?.click();
    else if (exp === "print") document.querySelector("[data-print-selected-report]")?.click();
    return;
  }
  const catBtn = event.target.closest("[data-catalog-cat]");
  if (catBtn) { catalogCategory = catBtn.dataset.catalogCat; renderReports(); return; }
  const backBtn = event.target.closest("[data-report-back]");
  if (backBtn) { reportCenterMode = true; renderReports(); return; }
  const centerBtn = event.target.closest("[data-report-center]");
  if (centerBtn) { if (!canView("reports")) return; reportCenterMode = true; setView("reports"); renderReports(); }
});

// Catalog search — re-render then restore focus/caret so typing isn't interrupted.
document.addEventListener("input", event => {
  const search = event.target.closest("[data-catalog-search]");
  if (!search) return;
  catalogQuery = search.value;
  renderReports();
  const fresh = document.querySelector("[data-catalog-search]");
  if (fresh) { fresh.focus(); fresh.setSelectionRange(fresh.value.length, fresh.value.length); }
});

// Reports nav group: each item opens the reports view with that report selected.
document.querySelectorAll("[data-report-jump]").forEach(button => {
  button.addEventListener("click", () => {
    if (!canView("reports")) return;
    const type = button.dataset.reportJump;
    reportCenterMode = false;
    setView("reports");
    if (els.reportSelect) els.reportSelect.value = type;
    document.querySelectorAll("[data-report-tab]").forEach(tab => tab.classList.toggle("active", tab.dataset.reportTab === type));
    document.querySelectorAll("[data-report-jump]").forEach(other => other.classList.toggle("active", other === button));
    renderReports();
  });
});

// Services browse: category + search filter the treatments table.
els.serviceBrowseCategory?.addEventListener("change", renderServiceBrowse);
els.operationCategorySelect?.addEventListener("change", renderStaffSelects);
els.operationSubcategorySelect?.addEventListener("change", renderStaffSelects);
els.bookingCategorySelect?.addEventListener("change", renderStaffSelects);
els.bookingSubcategorySelect?.addEventListener("change", renderStaffSelects);
els.bookingColumnSelect?.addEventListener("change", renderStaffSelects);
els.serviceBrowseSearch?.addEventListener("input", renderServiceBrowse);

// Edit a package sale directly from the report (price, cost, paid, category, status).
(function initEditEntry() {
  const modal = document.querySelector("[data-edit-entry-modal]");
  if (!modal) return;
  const form = modal.querySelector("[data-edit-entry-form]");
  const titleEl = modal.querySelector("[data-edit-entry-title]");
  const close = () => { modal.hidden = true; };

  function open(entryId) {
    const entry = (state.entries || []).find(item => item.id === entryId);
    if (!entry) return;
    form.elements.entryId.value = entry.id;
    form.elements.amount.value = netAmount(entry);
    if (form.elements.cost) form.elements.cost.value = numberValue(entry.cost);
    form.elements.paid.value = paidAmount(entry);
    form.elements.category.value = entryCategory(entry);
    form.elements.status.value = ["completed", "partial_payment", "pending_payment", "cancelled"].includes(entry.status) ? entry.status : "completed";
    titleEl.textContent = `تعديل: ${entry.service}`;
    modal.hidden = false;
  }

  form.addEventListener("submit", event => {
    event.preventDefault();
    if (!canViewSensitive()) return;
    const data = Object.fromEntries(new FormData(form).entries());
    const entry = (state.entries || []).find(item => item.id === data.entryId);
    if (!entry) { close(); return; }
    entry.amount = numberValue(data.amount);
    entry.discount = 0;
    if (data.cost !== undefined) entry.cost = numberValue(data.cost);
    const paid = Math.min(Math.max(numberValue(data.paid), 0), numberValue(data.amount));
    entry.paymentBreakdown = { cash: paid, card: 0, transfer: 0 };
    entry.paymentMethod = "cash";
    entry.status = data.status || entry.status;
    const category = (data.category || "").trim();
    if (entry.packageId) {
      const pkg = (state.patientPackages || []).find(item => item.id === entry.packageId);
      if (pkg) {
        pkg.category = category;
        const template = (state.packageTemplates || []).find(item => item.id === pkg.templateId);
        if (template) template.category = category;
      }
    } else {
      entry.category = category;
    }
    logEdit("تعديل عملية", `${entry.visitNumber ? "#" + entry.visitNumber + " " : ""}${entry.patient || ""} · ${money(netAmount(entry))}`);
    close();
    saveState();
    render();
  });

  modal.querySelectorAll("[data-edit-entry-close]").forEach(button => button.addEventListener("click", close));
  modal.addEventListener("click", event => { if (event.target === modal) close(); });
  document.addEventListener("keydown", event => { if (event.key === "Escape" && !modal.hidden) close(); });
  document.addEventListener("click", event => {
    const row = event.target.closest("[data-edit-entry]");
    if (row) open(row.dataset.editEntry);
  });
})();

// ─── Inventory sub-nav tabs ────────────────────────────────────────────────
(function initInventoryTabs() {
  const tabs = document.querySelectorAll("[data-inventory-tab]");
  if (!tabs.length) return;
  function showInventoryTab(activeVal) {
    tabs.forEach(t => t.classList.toggle("active", t.dataset.inventoryTab === activeVal));
    // Show/hide sections: suppliers split, items split, orders article
    document.querySelectorAll("[data-inventory-section]").forEach(el => {
      el.style.display = el.dataset.inventorySection === activeVal ? "" : "none";
    });
  }
  // Default: show items
  showInventoryTab("items");
  tabs.forEach(tab => {
    tab.addEventListener("click", () => showInventoryTab(tab.dataset.inventoryTab));
  });
})();

els.clinicForm.addEventListener("submit", event => {
  event.preventDefault();
  if (!canViewSensitive()) return;
  const data = Object.fromEntries(new FormData(els.clinicForm).entries());
  state.settings = {
    ...state.settings,
    clinicName: data.clinicName.trim(),
    activeDate: data.activeDate,
    branch: data.branch.trim(),
    workStart: /^\d{2}:\d{2}$/.test(data.workStart) ? data.workStart : (state.settings.workStart || "08:00"),
    workEnd: /^\d{2}:\d{2}$/.test(data.workEnd) ? data.workEnd : (state.settings.workEnd || "18:00"),
    language: currentLanguage()
  };
  if (els.bookingForm) {
    els.bookingForm.elements.date.value = data.activeDate;
  }
  saveState();
  render();
});

els.entryForm.addEventListener("submit", event => {
  event.preventDefault();
  if (!canView("entries")) return;
  const data = Object.fromEntries(new FormData(els.entryForm).entries());
  const lines = pendingOperationLines.length
    ? pendingOperationLines.slice()
    : [operationLineFromForm()].filter(Boolean);
  if (!lines.length) return;
  const account = currentAccount();
  const scopedMember = accountStaffScoped(account) ? getStaffMember(account.staffId) : null;
  const doctorId = scopedMember?.role === "doctor" ? scopedMember.id : data.doctorId;
  const specialistId = scopedMember?.role === "specialist" ? scopedMember.id : data.specialistId;
  const patient = ensurePatientFile(data.patient.trim());
  // statusExtra overrides the toggle status (for cancelled / pending_assignment / scheduled)
  const statusExtra = data.statusExtra;
  const baseStatus = data.status || "completed";
  const status = statusExtra && statusExtra !== ""
    ? statusExtra
    : (!doctorId && !specialistId && baseStatus === "completed" ? "pending_assignment" : baseStatus);
  // Booked (محجوزة): place it on the calendar as a booking instead of recording
  // a completed operation. Respects the user's permitted calendar columns + add
  // appointment permission.
  if (statusExtra === "scheduled") {
    if (!canUseFeature("add_appointment")) {
      showToast("لا تملك صلاحية إضافة الحجوزات.", "error");
      return;
    }
    const firstLine = lines[0];
    const requestedColumn = data.scheduleColumnId || "";
    const scheduleColumnId = scheduleColumnAllowedForAccount(requestedColumn) ? requestedColumn : "";
    state.bookings = state.bookings || [];
    state.bookings.push(normalizeBooking({
      date: data.scheduleDate || state.settings.activeDate,
      time: data.scheduleTime || "09:00",
      patientId: patient.id,
      patient: data.patient.trim(),
      phone: patient.phone || "",
      serviceId: firstLine.serviceId,
      service: firstLine.service,
      scheduleColumnId,
      doctorId,
      specialistId,
      expectedAmount: visitNetForLines(lines),
      status: "scheduled",
      notes: data.notes.trim()
    }, state.services));
    logEdit("حجز موعد", `${data.patient.trim()} · ${firstLine.service} · ${data.scheduleDate || state.settings.activeDate} ${data.scheduleTime || "09:00"}`);
    const scheduledReturnView = runtime.operationReturnView || "bookings";
    resetEntryFormDefaults();
    saveState();
    render();
    closeOperationModal({ restoreView: scheduledReturnView });
    showToast("تمت إضافة الحجز إلى التقويم.", "success");
    return;
  }

  // Doctor rate override for this visit
  const doctorRateOverride = numberValue(data.doctorRateOverride);
  const doctorModelOverride = data.doctorModelOverride || "";
  const visitId = nextId("visit");
  const visitNumber = nextVisitNumber();
  const createdAt = new Date().toISOString();
  const visitPayments = paymentBreakdownFromForm(lines);
  const totals = visitTotalsFromForm(lines);
  const totalPaid = totals.paid;
  const effectiveVisitTotal = totals.total;
  // Use the explicit paid+remaining total when the user gave a remaining (the simple
  // model the user asked for), or for non-managers. Managers without a remaining keep
  // per-line catalog pricing so multi-service receipts stay itemised.
  const useExplicitTotal = totals.hasRemaining || !canViewSensitive();
  const newEntries = lines.map(line => {
    const linePrice = Math.max(numberValue(line.amount) - numberValue(line.discount), 0);
    const weight = totals.priceTotal > 0 ? (linePrice / totals.priceTotal) : (1 / lines.length);
    const lineAmount = useExplicitTotal ? effectiveVisitTotal * weight : line.amount;
    const lineDiscount = useExplicitTotal ? 0 : line.discount;
    const linePayments = Object.fromEntries(
      PAYMENT_METHODS.map(method => [method, numberValue(visitPayments[method]) * weight])
    );
    return normalizeEntry({
    ...line,
    id: nextId("entry"),
    visitId,
    visitNumber,
    date: state.settings.activeDate,
    patientId: patient.id,
    patient: data.patient.trim(),
    serviceId: line.serviceId,
    service: line.service,
    doctorId,
    specialistId,
    doctorRate: doctorRateOverride || 0,
    doctorModel: doctorRateOverride > 0 ? doctorModelOverride : "",
    quantity: line.quantity,
    unitPrice: lineAmount / (line.quantity || 1),
    amount: lineAmount,
    cost: line.cost,
    discount: lineDiscount,
    paymentBreakdown: linePayments,
    paymentMethod: paymentMethodFromBreakdown(visitPayments, data.paymentMethod),
    status,
    bookingId: data.bookingId || "",
    createdAt,
    notes: data.notes.trim()
  }, state.services); });
  state.entries.push(...newEntries);
  newEntries.forEach(deductInventoryForEntry);
  logEdit("تسجيل عملية", `#${visitNumber} · ${data.patient.trim()} · ${newEntries.map(line => line.service).join("، ")}`);
  const receipt = data.createReceipt === "on" && canUseFeature("issue_receipts")
    ? createReceiptForVisit(newEntries, patient, {
        buyerType: data.buyerType,
        buyerTaxNumber: data.buyerTaxNumber?.trim(),
        taxRate: data.taxRate,
        paymentBreakdown: visitPayments,
        paymentMethod: paymentMethodFromBreakdown(visitPayments, data.paymentMethod),
        reference: data.receiptReference?.trim(),
        notes: data.notes?.trim()
      })
    : null;
  if (data.bookingId) {
    const booking = state.bookings.find(item => item.id === data.bookingId);
    if (booking) booking.status = "completed";
  }
  const returnView = runtime.operationReturnView || "dashboard";
  resetEntryFormDefaults();
  saveState();
  render();
  closeOperationModal({ restoreView: returnView });
  if (receipt) openReceipt(receipt.id);
});

// ── Staff commission model hint ────────────────────────────────────────────
const MODEL_HINTS = {
  none:      "هذا الموظف على راتب فقط — لا تُحتسب له عمولة افتراضية (يمكن إضافة قاعدة لخدمة بعينها لاحقاً)",
  pct_net:   "تُحتسب النسبة من صافي الربح = المقبوض − التكلفة",
  pct_gross: "تُحتسب النسبة من كامل المبلغ المقبوض قبل خصم التكلفة",
  fixed:     "مبلغ ثابت بالدينار لكل عملية بصرف النظر عن السعر"
};
function updateStaffModelHint() {
  const model = els.staffModelSelect?.value;
  if (els.staffModelHint) els.staffModelHint.textContent = MODEL_HINTS[model] || "";
  if (els.staffRateLabel) {
    const salaryOnly = model === "none";
    els.staffRateLabel.style.display = salaryOnly ? "none" : "";
    const rateEl = els.staffRateLabel.querySelector("input");
    els.staffRateLabel.firstChild.textContent = model === "fixed" ? "المبلغ الثابت (د.أ)" : "النسبة %";
    if (rateEl) {
      rateEl.max = model === "fixed" ? "" : "100";
      rateEl.placeholder = model === "fixed" ? "25" : "50";
      if (salaryOnly) rateEl.value = "";
    }
  }
}
els.staffModelSelect?.addEventListener("change", updateStaffModelHint);
updateStaffModelHint();

// ── Per-service rule inline builder ───────────────────────────────────────
let _staffPendingRules = [];

function renderStaffPendingRules() {
  if (!els.staffPendingRules) return;
  if (!_staffPendingRules.length) {
    els.staffPendingRules.innerHTML = "";
    return;
  }
  els.staffPendingRules.innerHTML = _staffPendingRules.map((r, i) => `
    <div class="pending-rule-row">
      <span>${r.category ? "فئة: " + r.category : (getService(r.serviceId)?.name || r.serviceId)}</span>
      <span>${ruleModelLabel(r.model)}</span>
      <span>${r.model === "fixed" ? money(r.value) : r.value + "%"}</span>
      <button type="button" class="icon-button danger" data-remove-pending-rule="${i}">×</button>
    </div>
  `).join("");
}

// Populate the staff rule service select from state.services
function renderStaffRuleServiceSelect() {
  if (!els.staffRuleServiceSelect) return;
  const current = els.staffRuleServiceSelect.value;
  els.staffRuleServiceSelect.innerHTML = ruleTargetOptionsHtml("— اختر الخدمة أو الفئة —");
  if (current) els.staffRuleServiceSelect.value = current;
}

document.querySelector("[data-add-staff-service-rule]")?.addEventListener("click", () => {
  const target = parseRuleTarget(els.staffRuleServiceSelect?.value);
  const model = els.staffRuleModelSelect?.value || "pct_net";
  const value = numberValue(els.staffRuleValueInput?.value);
  if ((!target.serviceId && !target.category) || value <= 0) { showToast("اختر الخدمة أو الفئة وأدخل القيمة أولاً", "warn"); return; }
  _staffPendingRules.push({ serviceId: target.serviceId, category: target.category, model, value });
  if (els.staffRuleValueInput) els.staffRuleValueInput.value = "";
  if (els.staffRuleServiceSelect) els.staffRuleServiceSelect.value = "";
  renderStaffPendingRules();
});

els.staffPendingRules?.addEventListener("click", event => {
  const btn = event.target.closest("[data-remove-pending-rule]");
  if (!btn) return;
  const idx = parseInt(btn.dataset.removePendingRule, 10);
  _staffPendingRules.splice(idx, 1);
  renderStaffPendingRules();
});

els.staffForm.addEventListener("submit", event => {
  event.preventDefault();
  if (!canViewSensitive()) return;
  const data = Object.fromEntries(new FormData(els.staffForm).entries());
  const memberId = nextId("staff");
  const role = data.role || "specialist";
  state.staff.push(normalizeStaffMember({
    id: memberId,
    name: data.name.trim(),
    role,
    model: data.model || (role === "doctor" ? "pct_net" : "pct_gross"),
    rate: numberValue(data.rate),
    phone: data.phone?.trim() || ""
  }));
  logEdit("إضافة موظف", `${data.name.trim()} · ${roleLabel(role)}`);
  // Save any inline per-service rules
  const appliesTo = role === "doctor" ? "doctor" : "specialist";
  for (const rule of _staffPendingRules) {
    const targetLabel = rule.category ? `فئة: ${rule.category}` : (getService(rule.serviceId)?.name || rule.serviceId);
    state.rules.push(normalizeRule({
      id: nextId("rule"),
      name: `${data.name.trim()} — ${targetLabel}`,
      appliesTo,
      personId: memberId,
      serviceId: rule.serviceId || "",
      category: rule.category || "",
      model: rule.model,
      value: rule.value,
      active: true
    }));
  }
  _staffPendingRules = [];
  renderStaffPendingRules();
  els.staffForm.reset();
  updateStaffModelHint();
  saveState();
  render();
});

if (els.serviceForm) {
  els.serviceForm.querySelector("[data-service-category-select]")?.addEventListener("change", event => {
    const wrap = els.serviceForm.querySelector("[data-service-new-category-wrap]");
    if (wrap) wrap.hidden = event.target.value !== "__new__";
    const newInput = wrap?.querySelector("[name='categoryNew']");
    if (event.target.value === "__new__" && newInput) setTimeout(() => newInput.focus(), 20);
  });
  els.serviceForm.addEventListener("submit", event => {
    event.preventDefault();
    if (!canViewSensitive()) return;
    const data = Object.fromEntries(new FormData(els.serviceForm).entries());
    const newCategory = (data.category === "__new__" ? (data.categoryNew || "") : (data.category || "")).trim();
    const isFreshCategory = newCategory && !serviceCategories().includes(newCategory) && !columnHostsCategory(newCategory);
    state.services.push(normalizeService({
      id: nextId("service"),
      name: data.name.trim(),
      category: newCategory,
      subcategory: (data.subcategory || "").trim(),
      defaultPrice: data.defaultPrice,
      defaultCost: data.defaultCost,
      consumes: _servicePendingConsumes,
      active: data.active === "true"
    }));
    logEdit("إضافة خدمة", `${data.name.trim()}${newCategory ? " · " + newCategory : ""}`);
    _servicePendingConsumes = [];
    renderConsumeList(els.serviceForm.querySelector("[data-consume-list]"), _servicePendingConsumes, "remove-consume");
    els.serviceForm.reset();
    const newWrap = els.serviceForm.querySelector("[data-service-new-category-wrap]");
    if (newWrap) newWrap.hidden = true;
    saveState();
    render();
    if (isFreshCategory) openCategoryRowPrompt(newCategory);
  });
}

// ── Product quick-sell modal ───────────────────────────────────────────────
(function initProductSale() {
  const modal = document.querySelector("[data-product-sale-modal]");
  if (!modal) return;
  const form = modal.querySelector("[data-product-sale-form]");
  const nameEl = modal.querySelector("[data-product-sale-name]");
  const totalEl = modal.querySelector("[data-product-sale-total]");
  const close = () => { modal.hidden = true; };
  const updateTotal = () => {
    const item = getInventoryItem(form.elements.productId.value);
    const qty = Math.max(1, Number(form.elements.qty.value) || 1);
    if (totalEl) totalEl.textContent = money(asNumber(item?.salePrice) * qty);
  };

  function open(itemId) {
    const item = getInventoryItem(itemId);
    if (!item) return;
    form.elements.productId.value = item.id;
    form.elements.qty.value = "1";
    form.elements.patient.value = "";
    if (nameEl) nameEl.textContent = item.name;
    updateTotal();
    modal.hidden = false;
  }

  form.elements.qty.addEventListener("input", updateTotal);
  form.addEventListener("submit", event => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    const ok = sellProduct(data.productId, Math.max(1, Number(data.qty) || 1), data.paymentMethod, data.patient);
    if (ok) close();
  });
  modal.querySelectorAll("[data-product-sale-close]").forEach(button => button.addEventListener("click", close));
  modal.addEventListener("click", event => { if (event.target === modal) close(); });
  document.addEventListener("keydown", event => { if (event.key === "Escape" && !modal.hidden) close(); });
  document.addEventListener("click", event => {
    const trigger = event.target.closest("[data-sell-product]");
    if (trigger) open(trigger.dataset.sellProduct);
  });
})();

// ── Bulk add services: a full-screen table, one row per new service ─────────
(function initBulkServices() {
  const modal = document.querySelector("[data-bulk-services-modal]");
  if (!modal) return;
  const bodyEl = modal.querySelector("[data-bulk-services-body]");
  const summaryEl = modal.querySelector("[data-bulk-services-summary]");
  const close = () => { modal.hidden = true; };

  const rowHtml = () => `<tr class="bulk-row">
    <td><input type="text" data-bulk-name placeholder="اسم الخدمة"></td>
    <td><input type="text" data-bulk-category list="service-categories" placeholder="الفئة"></td>
    <td><input type="text" data-bulk-subcategory list="service-subcategories" placeholder="الفئة الفرعية"></td>
    <td><input type="number" min="0" step="0.01" data-bulk-price placeholder="السعر"></td>
    <td><input type="number" min="0" step="0.01" data-bulk-cost placeholder="التكلفة"></td>
  </tr>`;

  function updateSummary() {
    const filled = [...bodyEl.querySelectorAll("[data-bulk-name]")].filter(input => input.value.trim()).length;
    summaryEl.textContent = filled ? `${filled} خدمة جاهزة للحفظ` : "لم تُدخل أي خدمة بعد";
  }

  function render(rowCount = 8) {
    bodyEl.innerHTML = `<table class="ct-table"><thead><tr><th>اسم الخدمة</th><th>الفئة</th><th>الفئة الفرعية</th><th>السعر</th><th>التكلفة</th></tr></thead><tbody>${rowHtml().repeat(rowCount)}</tbody></table>`;
    updateSummary();
  }

  modal.querySelector("[data-bulk-add-row]").addEventListener("click", () => {
    bodyEl.querySelector("tbody").insertAdjacentHTML("beforeend", rowHtml());
  });
  bodyEl.addEventListener("input", updateSummary);

  modal.querySelector("[data-bulk-services-save]").addEventListener("click", () => {
    if (!canViewSensitive()) return;
    const rows = [...bodyEl.querySelectorAll(".bulk-row")];
    const created = [];
    rows.forEach(row => {
      const name = row.querySelector("[data-bulk-name]").value.trim();
      if (!name) return;
      state.services.push(normalizeService({
        id: nextId("service"),
        name,
        category: row.querySelector("[data-bulk-category]").value.trim(),
        subcategory: row.querySelector("[data-bulk-subcategory]").value.trim(),
        defaultPrice: row.querySelector("[data-bulk-price]").value,
        defaultCost: row.querySelector("[data-bulk-cost]").value,
        active: true
      }));
      created.push(name);
    });
    if (!created.length) { showToast("أدخل اسم خدمة واحدة على الأقل", "warn"); return; }
    logEdit("إضافة خدمات بالجملة", `${created.length} خدمة: ${created.slice(0, 5).join("، ")}${created.length > 5 ? "…" : ""}`);
    close();
    saveState();
    render();
    showToast(`تمت إضافة ${created.length} خدمة`, "success");
  });

  modal.querySelector("[data-bulk-services-close]").addEventListener("click", close);
  modal.addEventListener("click", event => { if (event.target === modal) close(); });
  document.addEventListener("keydown", event => { if (event.key === "Escape" && !modal.hidden) close(); });
  document.addEventListener("click", event => { if (event.target.closest("[data-open-bulk-services]") && canViewSensitive()) { render(); modal.hidden = false; } });
})();

// ── Commission matrix: one full-screen table, a value per service, applied to
// chosen employees — creates many rules at once. ───────────────────────────
(function initCommissionTable() {
  const modal = document.querySelector("[data-commission-table-modal]");
  if (!modal) return;
  const peopleEl = modal.querySelector("[data-ct-people]");
  const bodyEl = modal.querySelector("[data-ct-body]");
  const appliesSel = modal.querySelector("[data-ct-applies]");
  const modelSel = modal.querySelector("[data-ct-model]");
  const nameEl = modal.querySelector("[data-ct-name]");
  const summaryEl = modal.querySelector("[data-ct-summary]");
  const close = () => { modal.hidden = true; };

  function renderPeople() {
    const role = appliesSel.value;
    const people = (state.staff || []).filter(member => member.role === role);
    peopleEl.innerHTML = people.length
      ? people.map(member => `<label class="rule-person-check"><input type="checkbox" data-ct-person value="${member.id}"><span>${member.name}</span></label>`).join("")
      : `<div class="empty-state">لا يوجد ${role === "doctor" ? "أطباء" : "أخصائيون"} بعد.</div>`;
  }

  function updateSummary() {
    const filled = [...bodyEl.querySelectorAll("[data-ct-value]")].filter(input => Number(input.value) > 0).length;
    summaryEl.textContent = filled ? `${filled} خدمة بعمولة` : "لم تُدخل أي عمولة بعد";
  }

  function renderBody() {
    const services = (state.services || []).filter(service => service.active !== false);
    if (!services.length) { bodyEl.innerHTML = `<div class="empty-state">أضف خدمات أولاً.</div>`; return; }
    const byCat = new Map();
    services.forEach(svc => {
      const cat = svc.category || "بدون فئة";
      const sub = svc.subcategory || "";
      if (!byCat.has(cat)) byCat.set(cat, new Map());
      const subMap = byCat.get(cat);
      if (!subMap.has(sub)) subMap.set(sub, []);
      subMap.get(sub).push(svc);
    });
    const svcRow = svc => `<tr><td class="ct-svc-name">${svc.name}</td><td><input type="number" min="0" step="0.01" data-ct-value="${svc.id}" data-svc-cat="${svc.category || "بدون فئة"}" data-svc-sub="${(svc.category || "بدون فئة")}__${svc.subcategory || ""}" placeholder="—"></td></tr>`;
    bodyEl.innerHTML = `<table class="ct-table"><thead><tr><th>الخدمة / الفئة</th><th>العمولة</th></tr></thead><tbody>`
      + [...byCat.entries()].map(([cat, subMap]) => {
        const noSub = subMap.get("") || [];
        const subs = [...subMap.entries()].filter(([sub]) => sub).sort((a, b) => a[0].localeCompare(b[0], "ar"));
        return `<tr class="ct-cat-row"><td class="ct-cat-name">${cat}</td><td><input type="number" min="0" step="0.01" data-ct-fill="${cat}" placeholder="تعبئة كل الفئة" class="ct-fill"></td></tr>`
          + noSub.map(svcRow).join("")
          + subs.map(([sub, list]) => `<tr class="ct-sub-row"><td class="ct-sub-name">↳ ${sub}</td><td><input type="number" min="0" step="0.01" data-ct-fill-sub="${cat}__${sub}" placeholder="تعبئة كل القسم" class="ct-fill"></td></tr>` + list.map(svcRow).join("")).join("");
      }).join("")
      + `</tbody></table>`;
    updateSummary();
  }

  function open() {
    if (!canViewSensitive()) return;
    nameEl.value = "";
    appliesSel.value = "specialist";
    renderPeople();
    renderBody();
    modal.hidden = false;
  }

  appliesSel.addEventListener("change", renderPeople);
  bodyEl.addEventListener("input", event => {
    const fill = event.target.closest("[data-ct-fill]");
    const fillSub = event.target.closest("[data-ct-fill-sub]");
    if (fill) bodyEl.querySelectorAll("[data-ct-value]").forEach(input => { if (input.dataset.svcCat === fill.dataset.ctFill) input.value = fill.value; });
    else if (fillSub) bodyEl.querySelectorAll("[data-ct-value]").forEach(input => { if (input.dataset.svcSub === fillSub.dataset.ctFillSub) input.value = fillSub.value; });
    updateSummary();
  });

  modal.querySelector("[data-ct-save]").addEventListener("click", () => {
    if (!canViewSensitive()) return;
    const model = modelSel.value;
    const appliesTo = appliesSel.value;
    const personIds = [...peopleEl.querySelectorAll("[data-ct-person]:checked")].map(cb => cb.value);
    const name = nameEl.value.trim() || "جدول عمولات";
    const entries = [...bodyEl.querySelectorAll("[data-ct-value]")]
      .map(input => ({ serviceId: input.dataset.ctValue, value: Number(input.value) }))
      .filter(entry => entry.value > 0);
    if (!entries.length) { showToast("أدخل عمولة لخدمة واحدة على الأقل", "warn"); return; }
    const byValue = new Map();
    entries.forEach(entry => { const key = String(entry.value); if (!byValue.has(key)) byValue.set(key, []); byValue.get(key).push(entry.serviceId); });
    let ruleCount = 0;
    byValue.forEach((serviceIds, valueStr) => {
      state.rules.push(normalizeRule({
        id: nextId("rule"),
        name: `${name} (${valueStr}${model === "fixed" ? " د.أ" : "%"})`,
        appliesTo, personIds, serviceIds, model, value: Number(valueStr), active: true
      }));
      ruleCount++;
    });
    logEdit("جدول عمولات", `${name} — ${entries.length} خدمة · ${ruleCount} قاعدة · ${personIds.length || "كل"} موظف`);
    close();
    saveState();
    render();
    showToast(`تم إنشاء ${ruleCount} قاعدة تغطي ${entries.length} خدمة`, "success");
  });

  modal.querySelector("[data-commission-table-close]").addEventListener("click", close);
  modal.addEventListener("click", event => { if (event.target === modal) close(); });
  document.addEventListener("keydown", event => { if (event.key === "Escape" && !modal.hidden) close(); });
  document.addEventListener("click", event => { if (event.target.closest("[data-open-commission-table]")) open(); });
})();

// ── Edit a treatment from the all-treatments browse table ──────────────────
(function initEditService() {
  const modal = document.querySelector("[data-edit-service-modal]");
  if (!modal) return;
  const form = modal.querySelector("[data-edit-service-form]");
  const close = () => { modal.hidden = true; };

  function open(serviceId) {
    const service = (state.services || []).find(item => item.id === serviceId);
    if (!service) return;
    form.elements.serviceId.value = service.id;
    form.elements.name.value = service.name || "";
    form.elements.category.value = service.category || "";
    if (form.elements.subcategory) form.elements.subcategory.value = service.subcategory || "";
    form.elements.defaultPrice.value = numberValue(service.defaultPrice);
    if (form.elements.defaultCost) form.elements.defaultCost.value = numberValue(service.defaultCost);
    form.elements.active.value = service.active === false ? "false" : "true";
    _editServicePendingConsumes = (service.consumes || []).map(part => ({ itemId: part.itemId, qty: part.qty }));
    populateConsumeSelects();
    renderConsumeList(modal.querySelector("[data-edit-consume-list]"), _editServicePendingConsumes, "edit-remove-consume");
    modal.hidden = false;
    setTimeout(() => form.elements.name.focus(), 30);
  }

  form.addEventListener("submit", event => {
    event.preventDefault();
    if (!canViewSensitive()) return;
    const data = Object.fromEntries(new FormData(form).entries());
    const service = (state.services || []).find(item => item.id === data.serviceId);
    if (!service) { close(); return; }
    service.name = (data.name || "").trim() || service.name;
    service.category = (data.category || "").trim();
    service.subcategory = (data.subcategory || "").trim();
    service.defaultPrice = numberValue(data.defaultPrice);
    if (data.defaultCost !== undefined) service.defaultCost = numberValue(data.defaultCost);
    service.active = data.active !== "false";
    service.consumes = _editServicePendingConsumes.map(part => ({ itemId: part.itemId, qty: part.qty }));
    logEdit("تعديل خدمة", `${service.name}${service.category ? " · " + service.category : ""}`);
    close();
    saveState();
    render();
  });

  modal.querySelectorAll("[data-edit-service-close]").forEach(button => button.addEventListener("click", close));
  modal.addEventListener("click", event => { if (event.target === modal) close(); });
  document.addEventListener("keydown", event => { if (event.key === "Escape" && !modal.hidden) close(); });
  document.addEventListener("click", event => {
    if (event.target.closest("[data-delete-service]")) return; // delete has its own handler
    const row = event.target.closest("[data-edit-service]");
    if (row) open(row.dataset.editService);
  });
})();

// ── Packages & sessions ─────────────────────────────────────────────────
if (els.packageTemplateForm) {
  els.packageTemplateForm.addEventListener("submit", event => {
    event.preventDefault();
    if (!canViewSensitive()) return;
    const data = Object.fromEntries(new FormData(els.packageTemplateForm).entries());
    if (!data.name || !data.name.trim()) return;
    state.packageTemplates = state.packageTemplates || [];
    state.packageTemplates.push(normalizePackageTemplate({
      name: data.name.trim(),
      category: (data.category || "").trim(),
      serviceId: data.serviceId || "",
      sessions: data.sessions,
      price: data.price,
      validityDays: data.validityDays,
      active: data.active !== "false"
    }));
    logEdit("إضافة قالب باقة", `${data.name.trim()}${data.sessions ? " · " + numberValue(data.sessions) + " جلسة" : ""}`);
    els.packageTemplateForm.reset();
    saveState();
    render();
  });
}

if (els.packageSellForm) {
  const templateSelect = els.packageSellForm.querySelector("[name='templateId']");
  templateSelect?.addEventListener("change", event => {
    const option = event.target.selectedOptions[0];
    if (!option) return;
    const sessionsInput = els.packageSellForm.querySelector("[name='sessions']");
    const priceInput = els.packageSellForm.querySelector("[name='price']");
    if (sessionsInput && option.dataset.sessions) sessionsInput.value = option.dataset.sessions;
    if (priceInput && option.dataset.price) priceInput.value = option.dataset.price;
  });

  els.packageSellForm.addEventListener("submit", event => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(els.packageSellForm).entries());
    const template = packageTemplateById(data.templateId);
    if (!data.patientId || !template) return;
    sellPackage({
      patientId: data.patientId,
      template,
      sessions: data.sessions,
      price: data.price,
      paid: data.paid,
      soldByStaffId: data.soldByStaffId || ""
    });
    els.packageSellForm.reset();
    saveState();
    render();
  });
}

if (els.packageSessionForm) {
  els.packageSessionForm.addEventListener("submit", event => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(els.packageSessionForm).entries());
    const pkg = patientPackageById(data.packageId);
    if (!pkg || !data.date) return;
    const patient = patientById(pkg.patientId);
    const service = (state.services || []).find(item => item.id === pkg.serviceId);
    state.bookings = state.bookings || [];
    state.bookings.push(normalizeBooking({
      date: data.date,
      time: data.time || "09:00",
      patientId: pkg.patientId,
      patient: patient ? patient.name : "مريض",
      phone: patient ? (patient.mobile || patient.phone || "") : "",
      serviceId: pkg.serviceId || (service ? service.id : ""),
      service: service ? service.name : pkg.name,
      scheduleColumnId: data.scheduleColumnId || "",
      packageId: pkg.id,
      status: "scheduled",
      notes: `جلسة باقة: ${pkg.name}`
    }, state.services));
    logEdit("حجز جلسة باقة", `${patient ? patient.name : "مريض"} · ${pkg.name} · ${data.date} ${data.time || "09:00"}`);
    els.packageSessionForm.reset();
    saveState();
    render();
  });
}

document.addEventListener("click", event => {
  const restoreAudit = event.target.closest("[data-restore-audit]");
  if (restoreAudit) {
    if (canViewSensitive()) restoreAuditEntry(restoreAudit.dataset.restoreAudit);
    return;
  }
  const opToggle = event.target.closest("[data-toggle-operation]");
  if (opToggle) {
    const detail = document.querySelector(`[data-operation-detail="${opToggle.dataset.toggleOperation}"]`);
    if (detail) {
      detail.hidden = !detail.hidden;
      opToggle.classList.toggle("expanded", !detail.hidden);
    }
    return;
  }
  const sellInOperation = event.target.closest("[data-operation-sell-package]");
  if (sellInOperation) {
    const status = els.operationPackageStatus;
    const setStatus = msg => { if (status) status.textContent = msg; };
    const template = packageTemplateById(els.operationPackageTemplate?.value);
    const patientName = els.entryForm?.elements?.patient?.value?.trim();
    if (!patientName) { setStatus("اكتب اسم المريض في الأعلى أولاً."); return; }
    if (!template) { setStatus("اختر الباقة."); return; }
    const patient = findOrCreatePatientByName(patientName);
    const paidInput = document.querySelector("[data-operation-package-paid]");
    const soldBy = els.entryForm?.elements?.doctorId?.value || els.entryForm?.elements?.specialistId?.value || "";
    sellPackage({
      patientId: patient.id,
      template,
      paid: numberValue(paidInput?.value),
      soldByStaffId: soldBy
    });
    saveState();
    render();
    if (paidInput) paidInput.value = "";
    setStatus(`✅ تم بيع «${template.name}» للمريض ${patient.name}.`);
    return;
  }
  const deleteTemplate = event.target.closest("[data-delete-package-template]");
  if (deleteTemplate) {
    if (!canViewSensitive()) return;
    const id = deleteTemplate.dataset.deletePackageTemplate;
    const removedTpl = (state.packageTemplates || []).find(template => template.id === id);
    if (removedTpl) logEdit("حذف قالب باقة", removedTpl.name, { type: "packageTemplate", record: removedTpl });
    state.packageTemplates = (state.packageTemplates || []).filter(template => template.id !== id);
    saveState();
    render();
    return;
  }
  const deletePackage = event.target.closest("[data-delete-package]");
  if (deletePackage) {
    if (!canViewSensitive()) return;
    const id = deletePackage.dataset.deletePackage;
    const removedPkg = (state.patientPackages || []).find(pkg => pkg.id === id);
    if (removedPkg) logEdit("حذف باقة", `${patientById(removedPkg.patientId)?.name || ""} · ${removedPkg.name}`, { type: "patientPackage", record: removedPkg });
    state.patientPackages = (state.patientPackages || []).filter(pkg => pkg.id !== id);
    saveState();
    render();
    return;
  }
  const usePackage = event.target.closest("[data-package-use]");
  if (usePackage) {
    const pkg = (state.patientPackages || []).find(item => item.id === usePackage.dataset.packageUse);
    if (pkg && packageRemaining(pkg) > 0) {
      pkg.usedSessions = Math.min(pkg.totalSessions, (pkg.usedSessions || 0) + 1);
      if (packageRemaining(pkg) <= 0) pkg.status = "completed";
      saveState();
      render();
    }
    return;
  }
  const unusePackage = event.target.closest("[data-package-unuse]");
  if (unusePackage) {
    const pkg = (state.patientPackages || []).find(item => item.id === unusePackage.dataset.packageUnuse);
    if (pkg && (pkg.usedSessions || 0) > 0) {
      pkg.usedSessions = Math.max(0, pkg.usedSessions - 1);
      if (pkg.status === "completed" && packageRemaining(pkg) > 0) pkg.status = "active";
      logEdit("تراجع جلسة", `${patientById(pkg.patientId)?.name || ""} · ${pkg.name} (${pkg.usedSessions}/${pkg.totalSessions})`);
      saveState();
      render();
    }
    return;
  }
  const sessionDone = event.target.closest("[data-package-session-done]");
  if (sessionDone) {
    const booking = (state.bookings || []).find(item => item.id === sessionDone.dataset.packageSessionDone);
    if (booking) {
      booking.status = "completed";
      const pkg = patientPackageById(booking.packageId);
      if (pkg && packageRemaining(pkg) > 0) {
        pkg.usedSessions = Math.min(pkg.totalSessions, (pkg.usedSessions || 0) + 1);
        if (packageRemaining(pkg) <= 0) pkg.status = "completed";
      }
      saveState();
      render();
    }
    return;
  }
  const sessionCancel = event.target.closest("[data-package-session-cancel]");
  if (sessionCancel) {
    const id = sessionCancel.dataset.packageSessionCancel;
    state.bookings = (state.bookings || []).filter(item => item.id !== id);
    saveState();
    render();
  }
});

if (els.ruleForm) {
  els.ruleForm.addEventListener("submit", event => {
    event.preventDefault();
    if (!canViewSensitive()) return;
    const formData = new FormData(els.ruleForm);
    const data = Object.fromEntries(formData.entries());
    // One named rule (القاعدة) can cover several employees AND several services
    // at once; empty = the whole role / all services. Editable afterwards.
    const personIds = formData.getAll("personId").filter(Boolean);
    const serviceIds = formData.getAll("serviceId").filter(Boolean);
    const ruleData = {
      name: data.name.trim(),
      appliesTo: data.appliesTo,
      personIds,
      serviceIds,
      category: "",
      model: data.model,
      value: data.model === "member_rate" ? 0 : data.value,
      active: true
    };
    const summary = `${ruleData.name} — ${personIds.length || "كل"} موظف · ${serviceIds.length || "كل"} خدمة`;
    if (_editingRuleId) {
      const idx = state.rules.findIndex(rule => rule.id === _editingRuleId);
      if (idx >= 0) state.rules[idx] = normalizeRule({ ...ruleData, id: _editingRuleId });
      logEdit("تعديل قاعدة", summary);
    } else {
      state.rules.push(normalizeRule({ id: nextId("rule"), ...ruleData }));
      logEdit("إضافة قاعدة", summary);
    }
    _editingRuleId = "";
    els.ruleForm.reset();
    const submitBtn = els.ruleForm.querySelector(".form-submit");
    if (submitBtn) submitBtn.textContent = "حفظ القاعدة";
    saveState();
    render();
  });

  els.ruleForm.elements.appliesTo.addEventListener("change", renderRulePersonSelect);
}

function startEditRule(ruleId) {
  const rule = (state.rules || []).find(item => item.id === ruleId);
  if (!rule || !els.ruleForm) return;
  _editingRuleId = ruleId;
  els.ruleForm.elements.name.value = rule.name || "";
  els.ruleForm.elements.appliesTo.value = rule.appliesTo || "doctor";
  els.ruleForm.elements.model.value = rule.model || "pct_net";
  els.ruleForm.elements.value.value = rule.model === "member_rate" ? "" : numberValue(rule.value);
  renderRulePersonSelect();
  const submitBtn = els.ruleForm.querySelector(".form-submit");
  if (submitBtn) submitBtn.textContent = "تحديث القاعدة";
  els.ruleForm.scrollIntoView({ behavior: "smooth", block: "center" });
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

function fillEntryFromBooking(bookingId) {
  if (!els.entryForm) return;
  const booking = state.bookings.find(item => item.id === bookingId);
  if (!booking) return;
  const service = getService(booking.serviceId);
  const returnView = document.querySelector(".view.active")?.dataset.view || "bookings";
  setView("entries");
  pendingOperationLines = [];
  els.entryForm.elements.bookingId.value = booking.id;
  els.entryForm.elements.patient.value = booking.patient;
  els.entryForm.elements.serviceId.value = booking.serviceId;
  els.entryForm.elements.doctorId.value = booking.doctorId || "";
  els.entryForm.elements.specialistId.value = booking.specialistId || "";
  els.entryForm.elements.quantity.value = 1;
  els.entryForm.elements.amount.value = booking.expectedAmount || service?.defaultPrice || 0;
  els.entryForm.elements.cost.value = service?.defaultCost || 0;
  els.entryForm.elements.discount.value = 0;
  els.entryForm.elements.paymentMethod.value = "cash";
  if (els.entryForm.elements.paidAmount) els.entryForm.elements.paidAmount.value = "";
  if (els.entryForm.elements.remainingAmount) els.entryForm.elements.remainingAmount.value = "";
  if (els.remainingInput) delete els.remainingInput.dataset.touched;
  els.entryForm.elements.paidCash.value = "";
  els.entryForm.elements.paidCard.value = "";
  els.entryForm.elements.paidTransfer.value = "";
  els.entryForm.elements.status.value = booking.doctorId || booking.specialistId ? "completed" : "pending_assignment";
  els.entryForm.elements.notes.value = booking.notes ? `من حجز ${booking.time}: ${booking.notes}` : `من حجز ${booking.time}`;
  pendingOperationLines.push({
    id: nextId("operation-line"),
    serviceId: booking.serviceId,
    service: service?.name || booking.service,
    quantity: 1,
    unitPrice: numberValue(booking.expectedAmount || service?.defaultPrice),
    amount: numberValue(booking.expectedAmount || service?.defaultPrice),
    cost: numberValue(service?.defaultCost),
    discount: 0
  });
  renderOperationLines();
  updatePaymentFieldsForStatus();
  updateEntryPreview();
  openOperationModal({ returnView });
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
    logEdit("إضافة مورد", data.name.trim());
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
      isProduct: data.isProduct === "on",
      salePrice: data.salePrice,
      supplierId: data.supplierId,
      active: true
    }));
    logEdit("إضافة صنف مخزون", `${data.name.trim()} · ${numberValue(data.quantity)} ${data.unit.trim()}`);
    els.inventoryForm.reset();
    const salePriceWrap = els.inventoryForm.querySelector("[data-inventory-saleprice-wrap]");
    if (salePriceWrap) salePriceWrap.hidden = true;
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

if (els.expenseForm) {
  resetExpenseForm();
  els.expenseGroup?.addEventListener("change", () => {
    fillExpenseSubgroups(els.expenseGroup, els.expenseSubgroup);
    els.expenseSubgroup.value = expenseGroupById(els.expenseGroup.value)?.subgroups[0]?.id || "";
  });
  els.expenseForm.addEventListener("submit", event => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(els.expenseForm).entries());
    const existing = (state.expenses || []).find(expense => expense.id === data.expenseId);
    if (existing && !canUseFeature("edit_expense")) return;
    if (!existing && !canUseFeature("add_expense")) return;
    if (!data.groupId || !data.subgroupId) {
      alert("أضف مجموعة وفئة فرعية قبل حفظ المصروف.");
      return;
    }
    const group = expenseGroupById(data.groupId);
    const subgroup = expenseSubgroupById(data.groupId, data.subgroupId);
    const expense = normalizeExpense({
      ...existing,
      id: existing?.id || nextId("expense"),
      groupId: data.groupId,
      subgroupId: data.subgroupId,
      groupName: group?.name,
      subgroupName: subgroup?.name,
      amount: data.amount,
      date: data.date,
      paymentMethod: data.paymentMethod,
      vendor: data.vendor.trim(),
      reference: data.reference.trim(),
      notes: data.notes.trim(),
      branch: state.settings.branch || "الفرع الرئيسي",
      recurring: data.recurring === "on",
      createdAt: existing?.createdAt || new Date().toISOString()
    });
    if (existing) {
      state.expenses = state.expenses.map(item => item.id === expense.id ? expense : item);
      logEdit("تعديل مصروف", `${group?.name || ""}${subgroup?.name ? " / " + subgroup.name : ""} · ${money(expense.amount)}`);
    } else {
      state.expenses = [...(state.expenses || []), expense];
      logEdit("إضافة مصروف", `${group?.name || ""}${subgroup?.name ? " / " + subgroup.name : ""} · ${money(expense.amount)}`);
    }
    resetExpenseForm();
    saveState();
    render();
  });
}

document.querySelector("[data-reset-expense-form]")?.addEventListener("click", resetExpenseForm);

if (els.expenseCategoryForm) {
  els.expenseCategoryForm.addEventListener("submit", event => {
    event.preventDefault();
    if (!canUseFeature("manage_expense_categories")) return;
    const data = Object.fromEntries(new FormData(els.expenseCategoryForm).entries());
    const groupName = data.groupName.trim();
    const subgroupName = data.subgroupName.trim();
    if (!groupName || !subgroupName) return;
    let group = (state.expenseGroups || []).find(item => normalizeSearchText(item.name) === normalizeSearchText(groupName));
    if (!group) {
      group = normalizeExpenseGroup({ id: nextId("expense-group"), name: groupName, subgroups: [] });
      state.expenseGroups.push(group);
    }
    if (!group.subgroups.some(subgroup => normalizeSearchText(subgroup.name) === normalizeSearchText(subgroupName))) {
      group.subgroups.push({ id: nextId("expense-subgroup"), name: subgroupName });
    }
    els.expenseCategoryForm.reset();
    saveState();
    renderExpenses();
  });
}

if (els.expenseFilterForm) {
  els.expenseFilterGroup?.addEventListener("change", () => {
    fillExpenseSubgroups(els.expenseFilterGroup, els.expenseFilterSubgroup);
  });
  els.expenseFilterForm.addEventListener("input", () => {
    expensePage = 1;
    renderExpenseTable();
  });
  els.expenseFilterForm.addEventListener("change", () => {
    expensePage = 1;
    renderExpenseTable();
  });
}

document.querySelector("[data-export-expenses]")?.addEventListener("click", () => {
  if (!canUseFeature("expenses_report") && !canUseFeature("access_expenses")) return;
  const rows = filteredExpenses().map(expense => ({
    date: expense.date,
    group: expenseGroupName(expense),
    subgroup: expenseSubgroupName(expense),
    vendor: expense.vendor,
    payment: paymentLabel(expense.paymentMethod),
    reference: expense.reference,
    amount: expense.amount,
    recurring: expense.recurring ? "yes" : "no",
    notes: expense.notes
  }));
  downloadCSV(rows, `riaaya-expenses-${state.settings.activeDate}.csv`);
});

if (els.importSourceForm) {
  els.importSourceForm.addEventListener("change", async event => {
    if (!canUseFeature("import_data") || !els.importFile?.files?.length) return;
    try {
      const file = els.importFile.files[0];
      const entity = els.importEntity?.value || "patients";
      const parsed = await parseImportFile(file);
      importSession = {
        fileName: file.name,
        sourceSystem: new FormData(els.importSourceForm).get("sourceSystem")?.trim() || "",
        entity,
        headers: parsed.headers,
        rawRows: parsed.rawRows,
        mapping: autoImportMapping(parsed.headers, entity),
        rows: []
      };
      renderImportWorkspace();
    } catch {
      alert("تعذر قراءة الملف. استخدم CSV بصف عنوان واضح أو JSON يحتوي على قائمة سجلات.");
      resetImportWorkspace();
    }
  });
}

if (els.importMapping) {
  els.importMapping.addEventListener("change", event => {
    const field = event.target.dataset.importField;
    if (!field || !importSession) return;
    importSession.mapping[field] = event.target.value;
    renderImportPreview();
  });
}

document.querySelector("[data-reset-import]")?.addEventListener("click", resetImportWorkspace);
els.commitImport?.addEventListener("click", commitImportRecords);

els.reconcileForm.addEventListener("submit", event => {
  event.preventDefault();
  if (!canViewSensitive()) return;
  const data = Object.fromEntries(new FormData(els.reconcileForm).entries());
  const totals = totalsFor(activeEntries());
  const record = createReconciliationRecordFromForm(data, totals);
  state.reconciliationHistory = [...(state.reconciliationHistory || []), record];
  state.reconciliations[state.settings.activeDate] = record;
  saveState();
  render();
});

document.addEventListener("click", async event => {
  const jumpView = event.target.closest("[data-jump]")?.dataset.jump;
  const notificationAction = event.target.closest("[data-notification-view]");
  const queueDigestId = event.target.closest("[data-queue-digest]")?.dataset.queueDigest;
  const deleteDigestId = event.target.closest("[data-delete-digest]")?.dataset.deleteDigest;
  const submitReceiptId = event.target.closest("[data-submit-receipt]")?.dataset.submitReceipt;
  const openReceiptId = event.target.closest("[data-open-receipt]")?.dataset.openReceipt;
  const closeReceiptAction = event.target.closest("[data-close-receipt]");
  const printReceiptAction = event.target.closest("[data-print-receipt]");
  const tableFocusTrigger = event.target.closest("[data-open-table-focus]");
  const tableFocusClose = event.target.closest("[data-close-table-focus]");
  const patientFocusListAction = event.target.closest("[data-patient-focus-list]");
  const sendSmsId      = event.target.closest("[data-send-sms]")?.dataset.sendSms;
  const copyReminderId = event.target.closest("[data-copy-reminder]")?.dataset.copyReminder;
  const followupEntryId = event.target.closest("[data-followup-entry]")?.dataset.followupEntry;
  const closeFollowupAction = event.target.closest("[data-close-followup]");
  const submitFollowupAction = event.target.closest("[data-submit-followup]");
  const followupMethodAction = event.target.closest("[data-followup-method]");
  const printBalanceAction = event.target.closest("[data-print-balance-report]");
  const deleteEntryId = event.target.dataset.deleteEntry;
  const deleteStaffId = event.target.dataset.deleteStaff;
  const deleteServiceId = event.target.dataset.deleteService;
  const deleteRuleId = event.target.dataset.deleteRule;
  const deleteSupplierId = event.target.dataset.deleteSupplier;
  const deleteInventoryId = event.target.dataset.deleteInventory;
  const deleteOrderId = event.target.dataset.deleteOrder;
  const deleteScheduleColumnId = event.target.dataset.deleteScheduleColumn;
  const editExpenseId = event.target.dataset.editExpense;
  const deleteExpenseId = event.target.dataset.deleteExpense;
  const deleteExpenseSubgroupId = event.target.dataset.deleteExpenseSubgroup;
  const deleteExpenseGroupId = event.target.dataset.expenseGroupId;
  const deleteBookingId = event.target.dataset.deleteBooking;
  const deleteAccountId = event.target.dataset.deleteAccount;
  const editAccountId = event.target.dataset.editAccount;
  const editPermissionId = event.target.dataset.editPermission;
  const deletePermissionId = event.target.dataset.deletePermission;
  const selectSalarySlipId = event.target.dataset.selectSalarySlip;
  const receiveOrderId = event.target.dataset.receiveOrder;
  const fillOrderId = event.target.dataset.fillOrder;
  const bookingStatusId = event.target.dataset.bookingStatusId;
  const bookingToEntryId = event.target.dataset.bookingToEntry;
  const openPatientId = event.target.closest("[data-open-patient]")?.dataset.openPatient;
  const editPatientId = event.target.dataset.editPatient;
  const deletePatientId = event.target.dataset.deletePatient;
  const removeOperationLineId = event.target.dataset.removeOperationLine;
  const paginationScope = event.target.dataset.paginationScope;
  const paginationPage = Number(event.target.dataset.paginationPage);
  const approveSalaryId = event.target.dataset.approveSalary;
  const paySalaryId = event.target.dataset.paySalary;
  const expandViewTrigger = event.target.closest("[data-expand-view]");
  const expandViewName = expandViewTrigger?.dataset.expandView;
  const calendarDate = event.target.closest("[data-calendar-date]")?.dataset.calendarDate;
  const calendarNav = event.target.closest("[data-calendar-nav]")?.dataset.calendarNav;
  const openOperationAction = event.target.closest("[data-open-operation-modal]");
  const closeOperationAction = event.target.closest("[data-close-operation-modal]");
  const paymentOptionAction = event.target.closest("[data-payment-option]");
  const downloadClinicJsonAction = event.target.closest("[data-download-clinic-json]");
  const exportClinicCsvAction = event.target.closest("[data-export-clinic-csv]");
  const restoreClinicJsonAction = event.target.closest("[data-restore-clinic-json-action]");
  const exportReportXlsAction = event.target.closest("[data-export-report-xls]");

  // ─ SMS send ────────────────────────────────────────────────────────────
  if (sendSmsId) {
    const booking = (state.bookings || []).find(b => b.id === sendSmsId);
    if (booking) {
      const patient  = getPatient(booking.patientId) || findPatientByName(booking.patient);
      const phone    = booking.phone || patient?.phone || "";
      const clinic   = state.settings?.clinicName || "العيادة";
      const dateStr  = displayDate(booking.date);
      const timeStr  = displayTime(booking.time);
      const service  = serviceLabel(booking);
      const message  = `مرحباً ${booking.patient}، نذكّركم بموعدكم في ${clinic} يوم ${dateStr} الساعة ${timeStr}. الخدمة: ${service}. نتطلع لرؤيتكم.`;
      const btn = event.target.closest("[data-send-sms]");
      if (btn) { btn.disabled = true; btn.textContent = "⏳ جاري الإرسال..."; }
      sendCommunication({ channel: "sms", to: phone, message })
        .then(result => {
          const label = result.mode === "preview" ? "📱 SMS (معاينة)" : "📱 SMS";
          showToast(`✓ تم إرسال SMS إلى ${booking.patient}`, "success");
          if (btn) { btn.textContent = "✓ أُرسل"; setTimeout(() => { btn.textContent = label; btn.disabled = false; }, 3000); }
        })
        .catch(err => {
          showToast("تعذّر إرسال SMS — تحقق من إعدادات المزوّد", "error");
          if (btn) { btn.textContent = "📱 SMS"; btn.disabled = false; }
        });
    }
    return;
  }

  // ─ WhatsApp reminder copy ──────────────────────────────────────────────
  if (copyReminderId) {
    const booking = (state.bookings || []).find(b => b.id === copyReminderId);
    if (booking) {
      const patient = getPatient(booking.patientId) || findPatientByName(booking.patient);
      const phone = booking.phone || patient?.phone || "";
      const clinicName = state.settings?.clinicName || "العيادة";
      const dateStr = displayDate(booking.date);
      const timeStr = displayTime(booking.time);
      const service = serviceLabel(booking);
      const msg = `السلام عليكم ${booking.patient}،\n\nنذكّركم بموعدكم في ${clinicName}\nالتاريخ: ${dateStr}\nالوقت: ${timeStr}\nالخدمة: ${service}\n\nنتمنى لكم دوام الصحة والعافية 🌿\n\nللاستفسار أو التعديل على الموعد يُرجى التواصل معنا.`;
      navigator.clipboard.writeText(msg).then(() => {
        showToast("✓ تم نسخ رسالة التذكير — الصقها في واتساب", "success");
        const btn = event.target.closest("[data-copy-reminder]");
        if (btn) { btn.textContent = "✓ تم النسخ"; setTimeout(() => { btn.innerHTML = "📋 تذكير"; }, 2500); }
      }).catch(() => {
        showToast("تعذّر النسخ — انسخ الرسالة يدوياً", "error");
      });
    }
    return;
  }

  // ─ Print patient balance report ────────────────────────────────────────
  if (printBalanceAction) {
    document.body.classList.add("printing-report");
    document.body.classList.remove("printing-salary-slip");
    window.requestAnimationFrame(() => window.print());
    return;
  }

  if (openOperationAction) {
    openOperationModal();
    return;
  }

  const addOpFromPatient = event.target.closest("[data-add-operation-patient]");
  if (addOpFromPatient) {
    const patient = (state.patients || []).find(item => item.id === addOpFromPatient.dataset.addOperationPatient);
    openOperationModal({ patientName: patient?.name || "" });
    return;
  }

  // Click a booked appointment on the day calendar → open the operation entry
  // window pre-filled with that booking's patient, category, and service.
  const bookingCard = event.target.closest("[data-drag-booking]");
  if (bookingCard && canView("entries")) {
    const booking = (state.bookings || []).find(item => item.id === bookingCard.dataset.dragBooking);
    if (booking && booking.status !== "completed" && booking.status !== "cancelled") {
      const service = getService(booking.serviceId);
      const column = bookingScheduleColumns().find(col => col.id === booking.scheduleColumnId);
      openOperationModal({
        patientName: booking.patient,
        serviceId: booking.serviceId,
        category: service?.category || column?.categories?.[0] || "",
        bookingId: booking.id
      });
    }
    return;
  }

  if (closeOperationAction || event.target === els.operationModal) {
    closeOperationModal();
    return;
  }

  // تكملة الدفع — follow-up payment handlers
  if (followupEntryId) {
    openFollowupModal(followupEntryId);
    return;
  }

  if (closeFollowupAction || event.target === els.followupModal) {
    closeFollowupModal();
    return;
  }

  if (submitFollowupAction) {
    submitFollowup();
    return;
  }

  if (followupMethodAction) {
    selectedFollowupMethod = followupMethodAction.dataset.followupMethod;
    document.querySelectorAll("[data-followup-method]").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.followupMethod === selectedFollowupMethod);
    });
    return;
  }

  if (paymentOptionAction && els.entryForm) {
    els.entryForm.elements.paymentMethod.value = paymentOptionAction.dataset.paymentOption;
    renderPaymentQuickButtons();
    updateEntryPreview();
    return;
  }

  if (downloadClinicJsonAction) {
    await downloadClinicJson();
    return;
  }

  if (exportClinicCsvAction) {
    exportClinicCsvBundle();
    return;
  }

  if (restoreClinicJsonAction) {
    document.querySelector("[data-restore-clinic-json]")?.click();
    return;
  }

  if (exportReportXlsAction) {
    exportCurrentReportXls();
    return;
  }

  if (openReceiptId) {
    openReceipt(openReceiptId);
    return;
  }

  if (closeReceiptAction) {
    closeReceipt();
    return;
  }

  if (printReceiptAction) {
    document.body.classList.add("printing-receipt");
    window.print();
    return;
  }

  if (jumpView) {
    setView(jumpView);
    return;
  }

  if (notificationAction) {
    const notificationId = notificationAction.dataset.notificationId;
    state.notificationReads = state.notificationReads || {};
    if (notificationId) state.notificationReads[notificationId] = true;
    saveState();
    setView(notificationAction.dataset.notificationView);
    if (els.notificationPanel) els.notificationPanel.hidden = true;
    if (els.notificationToggle) els.notificationToggle.setAttribute("aria-expanded", "false");
    renderNotificationCenters();
    return;
  }

  if (queueDigestId) {
    const rule = (state.digestRules || []).find(item => item.id === queueDigestId);
    const account = state.accounts.find(item => item.id === rule?.accountId);
    if (!rule || !account?.mobile) return;
    state.outboundMessages = state.outboundMessages || [];
    const message = normalizeOutboundMessage({
      id: nextId("message"),
      channel: rule.channel,
      recipient: account.mobile,
      accountId: account.id,
      body: roleDigestText(account, rule.template),
      status: "sending",
      createdAt: new Date().toISOString()
    });
    state.outboundMessages.unshift(message);
    rule.lastQueuedAt = new Date().toISOString();
    saveState();
    renderCommunications();
    try {
      const integration = state.integrations?.whatsapp || {};
      const result = await sendCommunication(rule.channel === "whatsapp"
        ? {
            channel: "whatsapp",
            to: account.mobile,
            templateName: integration.templateName || "clinic_daily_role_report",
            languageCode: "ar",
            components: [{
              type: "body",
              parameters: [{ type: "text", text: message.body }]
            }]
          }
        : { channel: "sms", to: account.mobile, message: message.body });
      message.deliveryMode = result.mode;
      message.status = result.mode === "live" ? "sent" : "preview";
      message.providerReference = result.provider?.messages?.[0]?.id || "";
    } catch (error) {
      message.status = "failed";
      message.error = error.message;
    }
    saveState();
    renderCommunications();
    renderNotificationCenters();
    return;
  }

  if (deleteDigestId) {
    state.digestRules = (state.digestRules || []).filter(rule => rule.id !== deleteDigestId);
    saveState();
    renderCommunications();
    return;
  }

  if (submitReceiptId) {
    const receipt = (state.receipts || []).find(item => item.id === submitReceiptId);
    if (!receipt) return;
    if (!state.integrations?.jofotara?.configured) {
      setView("communications");
      els.jofotaraSettings?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    receipt.status = "queued";
    saveState();
    renderCommunications();
    renderNotificationCenters();
    try {
      const result = await sendCommunication({
        channel: "jofotara",
        invoiceXml: receiptInvoiceXml(receipt)
      });
      receipt.deliveryMode = result.mode;
      receipt.status = result.mode === "live" ? "submitted" : "ready";
      receipt.providerReference = result.provider?.invoiceId || result.provider?.uuid || "";
    } catch (error) {
      receipt.status = "failed";
      receipt.error = error.message;
    }
    saveState();
    renderCommunications();
    renderNotificationCenters();
    if (runtime.openReceiptId === receipt.id) renderReceiptDocument(receipt);
    return;
  }

  if (deleteScheduleColumnId) {
    if (!canViewSensitive()) return;
    const remaining = activeScheduleColumns().filter(column => column.id !== deleteScheduleColumnId);
    if (!remaining.length) return;
    const fallbackId = remaining.find(column => column.id === "waiting")?.id || remaining[0].id;
    state.scheduleColumns = remaining;
    state.bookings = state.bookings.map(booking => (
      booking.scheduleColumnId === deleteScheduleColumnId
        ? { ...booking, scheduleColumnId: fallbackId }
        : booking
    ));
    saveState();
    render();
    return;
  }

  if (removeOperationLineId) {
    pendingOperationLines = pendingOperationLines.filter(line => line.id !== removeOperationLineId);
    renderOperationLines();
    updateEntryPreview();
    return;
  }

  if (editExpenseId) {
    if (!canUseFeature("edit_expense")) return;
    setView("expenses");
    fillExpenseForm(editExpenseId);
    return;
  }

  if (deleteExpenseId) {
    if (!canUseFeature("delete_expense")) return;
    if (!await showConfirm("هل تريد حذف هذا المصروف؟")) return;
    const removedExpense = (state.expenses || []).find(expense => expense.id === deleteExpenseId);
    if (removedExpense) logEdit("حذف مصروف", `${expenseGroupName(removedExpense) || ""} · ${money(removedExpense.amount)}`, { type: "expense", record: removedExpense });
    state.expenses = (state.expenses || []).filter(expense => expense.id !== deleteExpenseId);
    saveState();
    render();
    return;
  }

  if (deleteExpenseSubgroupId && deleteExpenseGroupId) {
    if (!canUseFeature("manage_expense_categories")) return;
    const used = (state.expenses || []).some(expense => expense.subgroupId === deleteExpenseSubgroupId);
    if (used && !await showConfirm("هذه الفئة مستخدمة في مصروفات سابقة. هل تريد إخفاء الفئة من القائمة؟ لن تحذف المصروفات.", { title: "إخفاء الفئة", icon: "📁", okLabel: "إخفاء", okClass: "danger-button" })) return;
    state.expenseGroups = (state.expenseGroups || []).map(group => {
      if (group.id !== deleteExpenseGroupId) return group;
      return { ...group, subgroups: group.subgroups.filter(subgroup => subgroup.id !== deleteExpenseSubgroupId) };
    }).filter(group => group.subgroups.length);
    saveState();
    render();
    return;
  }

  if (paginationScope && paginationPage) {
    if (paginationScope === "operations") {
      operationPage = paginationPage;
      renderEntryTable(activeEntries());
    } else if (paginationScope === "patients") {
      patientPage = paginationPage;
      renderPatients();
    } else if (paginationScope === "reports") {
      reportPage = paginationPage;
      renderReports();
    } else if (paginationScope === "expenses") {
      expensePage = paginationPage;
      renderExpenseTable();
    }
    return;
  }

  if (openPatientId) {
    selectedPatientId = openPatientId;
    setView("patients");
    if (document.body.classList.contains("focus-mode") && document.body.dataset.focusView === "patients") {
      setPatientFocusMode("file");
    }
    renderPatients();
    if (document.body.dataset.focusView !== "patients") {
      els.patientFile?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    return;
  }

  if (patientFocusListAction) {
    setPatientFocusMode("list");
    return;
  }

  if (editPatientId) {
    if (!canUseFeature("edit_patient_information")) return;
    fillPatientForm(editPatientId);
    return;
  }

  if (deletePatientId) {
    if (!canUseFeature("delete_patient")) return;
    if (!await showConfirm("هل تريد حذف ملف المريض أو الزائر؟ ستبقى العمليات والحجوزات محفوظة بدون رابط الملف.")) return;
    const removedPatient = state.patients.find(patient => patient.id === deletePatientId);
    if (removedPatient) logEdit("حذف ملف مريض", `${removedPatient.name}${removedPatient.patientNumber ? " · #" + removedPatient.patientNumber : ""}`, { type: "patient", record: removedPatient });
    state.patients = state.patients.filter(patient => patient.id !== deletePatientId);
    state.entries = state.entries.map(entry => entry.patientId === deletePatientId ? { ...entry, patientId: "" } : entry);
    state.bookings = state.bookings.map(booking => booking.patientId === deletePatientId ? { ...booking, patientId: "" } : booking);
    selectedPatientId = state.patients[0]?.id || "";
    saveState();
    render();
    return;
  }

  if (tableFocusTrigger) {
    openTableFocus(tableFocusTrigger.dataset.openTableFocus);
    return;
  }

  if (tableFocusClose) {
    closeTableFocus();
    return;
  }

  if (expandViewName) {
    enterFocusMode(expandViewName, { patientFocus: expandViewTrigger?.dataset.patientFocus });
    return;
  }

  if (calendarNav) {
    const nextDate = calendarNav === "today"
      ? today
      : monthOffset(state.settings.activeDate, calendarNav === "next" ? 1 : -1);
    if (!calendarDateAllowed(currentAccount(), nextDate)) return;
    setActiveDate(nextDate);
    setView("bookings");
    return;
  }

  if (calendarDate) {
    if (!calendarDateAllowed(currentAccount(), calendarDate)) return;
    setActiveDate(calendarDate);
    setView("bookings");
    return;
  }

  if (event.target.dataset.exitFocus !== undefined) {
    exitFocusMode();
    return;
  }

  if (deleteEntryId) {
    if (!canUseFeature("delete_treatments_medical")) return;
    const removed = state.entries.find(entry => entry.id === deleteEntryId);
    if (removed) {
      logEdit("حذف عملية", `${removed.visitNumber ? "#" + removed.visitNumber + " " : ""}${removed.patient || ""} · ${removed.service || ""} · ${money(netAmount(removed))}`, { type: "entry", record: removed });
      restoreInventoryForEntry(removed);
    }
    state.entries = state.entries.filter(entry => entry.id !== deleteEntryId);
    saveState();
    render();
  }

  if (deleteStaffId) {
    if (!canViewSensitive()) return;
    const isUsed = state.entries.some(entry => (
      entry.doctorId === deleteStaffId || entry.specialistId === deleteStaffId
    ));
    if (isUsed && !await showConfirm("هذا الموظف مرتبط بعمليات سابقة. هل تريد حذفه؟")) return;
    const removedStaff = state.staff.find(member => member.id === deleteStaffId);
    if (removedStaff) logEdit("حذف موظف", `${removedStaff.name} · ${roleLabel(removedStaff.role)}`, { type: "staff", record: removedStaff });
    state.staff = state.staff.filter(member => member.id !== deleteStaffId);
    saveState();
    render();
  }

  if (deleteServiceId) {
    if (!canViewSensitive()) return;
    const isUsed = state.entries.some(entry => entry.serviceId === deleteServiceId);
    if (isUsed && !await showConfirm("هذه الخدمة مرتبطة بعمليات سابقة. هل تريد حذفها؟")) return;
    const removedService = state.services.find(service => service.id === deleteServiceId);
    if (removedService) logEdit("حذف خدمة", `${removedService.name}${removedService.category ? " · " + removedService.category : ""}`, { type: "service", record: removedService });
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
    if (isUsed && !await showConfirm("هذا المورد مرتبط بأصناف أو طلبات. هل تريد حذفه؟")) return;
    const removedSupplier = state.suppliers.find(supplier => supplier.id === deleteSupplierId);
    if (removedSupplier) logEdit("حذف مورد", removedSupplier.name, { type: "supplier", record: removedSupplier });
    state.suppliers = state.suppliers.filter(supplier => supplier.id !== deleteSupplierId);
    state.inventory = state.inventory.map(item => (
      item.supplierId === deleteSupplierId ? { ...item, supplierId: "" } : item
    ));
    saveState();
    render();
  }

  if (deleteInventoryId) {
    const isUsed = state.purchaseOrders.some(order => order.itemId === deleteInventoryId);
    if (isUsed && !await showConfirm("هذا الصنف مرتبط بسجل طلبات. هل تريد حذفه من قائمة المخزون؟")) return;
    const removedItem = state.inventory.find(item => item.id === deleteInventoryId);
    if (removedItem) logEdit("حذف صنف مخزون", `${removedItem.name} · ${numberValue(removedItem.quantity)} ${removedItem.unit}`, { type: "inventory", record: removedItem });
    state.inventory = state.inventory.filter(item => item.id !== deleteInventoryId);
    saveState();
    render();
  }

  if (deleteOrderId) {
    if (!await showConfirm("هل تريد حذف سجل الطلب؟ لن يتم تعديل كمية المخزون تلقائياً.")) return;
    state.purchaseOrders = state.purchaseOrders.filter(order => order.id !== deleteOrderId);
    saveState();
    render();
  }

  if (deleteBookingId) {
    if (!canUseFeature("delete_appointment")) return;
    if (!await showConfirm("هل تريد حذف هذا الحجز؟")) return;
    const removedBooking = state.bookings.find(booking => booking.id === deleteBookingId);
    if (removedBooking) logEdit("حذف حجز", `${removedBooking.patient || ""} · ${displayDate(removedBooking.date)} ${removedBooking.time ? displayTime(removedBooking.time) : ""}`, { type: "booking", record: removedBooking });
    state.bookings = state.bookings.filter(booking => booking.id !== deleteBookingId);
    saveState();
    render();
  }

  if (bookingStatusId) {
    if (!canUseFeature("change_appointment_status")) return;
    const booking = state.bookings.find(item => item.id === bookingStatusId);
    if (!booking) return;
    const newStatus = event.target.dataset.bookingStatus || booking.status;
    if (newStatus !== booking.status) logEdit("تغيير حالة حجز", `${booking.patient || ""} · ${bookingStatusLabel(booking.status)} ← ${bookingStatusLabel(newStatus)}`);
    booking.status = newStatus;
    saveState();
    render();
  }

  if (bookingToEntryId) {
    fillEntryFromBooking(bookingToEntryId);
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

  if (selectSalarySlipId) {
    selectedSalaryMemberId = selectSalarySlipId;
    setView("salaries");
    render();
    els.salarySlipPanel?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (approveSalaryId) {
    if (!canViewSensitive()) return;
    setSalaryStatus(approveSalaryId, "approved");
    saveState();
    render();
  }

  if (paySalaryId) {
    if (!canViewSensitive()) return;
    setSalaryStatus(paySalaryId, "paid");
    saveState();
    render();
  }

  if (deleteAccountId) {
    if (!canManagePermissions() || deleteAccountId === "account-admin" || deleteAccountId === state.currentAccountId) return;
    if (!await showConfirm("هل تريد حذف هذا المستخدم نهائياً؟", { title: "حذف المستخدم", okLabel: "حذف نهائي" })) return;
    if (runtime.mode === "live") {
      const response = await fetch(`/api/clinic-users/${encodeURIComponent(deleteAccountId)}`, {
        method: "DELETE",
        headers: { "X-CSRF-Token": runtime.csrfToken }
      });
      if (!response.ok) {
        alert("تعذر حذف المستخدم.");
        return;
      }
    }
    state.accounts = state.accounts.filter(account => account.id !== deleteAccountId);
    saveState();
    render();
  }

  if (editAccountId) {
    if (!canManagePermissions()) return;
    fillAccountForm(editAccountId);
  }

  if (editPermissionId) {
    if (!canManagePermissions() || !els.permissionForm) return;
    const accounts = state.accounts.filter(account => account.permissionFeatures?.includes(editPermissionId));
    const feature = featureById(editPermissionId);
    if (els.permissionSearch) els.permissionSearch.value = "";
    if (els.permissionCategorySelect) els.permissionCategorySelect.value = feature?.category || "";
    renderPermissionSelects();
    [...els.permissionAccountSelect.options].forEach(option => {
      option.selected = accounts.some(account => account.id === option.value);
    });
    els.permissionFeatureSelect.value = editPermissionId;
    els.permissionForm.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  if (deletePermissionId) {
    if (!canManagePermissions()) return;
    if (!await showConfirm("هل تريد حذف هذه الصلاحية من المستخدمين المرتبطين بها؟", { title: "حذف الصلاحية" })) return;
    const updatedAccounts = state.accounts.map(account => {
      if (account.role === "admin") return account;
      return normalizeAccount({
        ...account,
        permissionFeatures: (account.permissionFeatures || []).filter(feature => feature !== deletePermissionId)
      });
    });
    if (runtime.mode === "live") {
      try {
        const changed = updatedAccounts.filter((account, index) => (
          account.role !== "admin"
          && state.accounts[index]?.permissionFeatures?.includes(deletePermissionId)
        ));
        const saved = await Promise.all(changed.map(account => persistClinicUser(account)));
        const savedById = new Map(saved.map(account => [account.id, account]));
        state.accounts = updatedAccounts.map(account => savedById.get(account.id) || account);
      } catch {
        alert("تعذر حذف الصلاحية من المستخدمين.");
        return;
      }
    } else {
      state.accounts = updatedAccounts;
    }
    saveState();
    render();
  }
});

document.addEventListener("change", async event => {
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
  if (runtime.mode === "live") {
    try {
      const savedAccount = await persistClinicUser(state.accounts.find(item => item.id === accountId));
      state.accounts = state.accounts.map(item => item.id === savedAccount.id ? savedAccount : item);
    } catch {
      alert("تعذر تحديث المستخدم.");
      return;
    }
  }
  saveState();
  render();
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape" && els.operationModal && !els.operationModal.hidden) {
    closeOperationModal();
    return;
  }
  if (event.key === "Escape" && !els.tableFocus?.hidden) {
    closeTableFocus();
    return;
  }
  if (event.key === "Escape" && document.body.classList.contains("focus-mode")) {
    exitFocusMode();
  }
});

document.querySelector("[data-clear-entries]").addEventListener("click", async () => {
  if (!canViewSensitive()) return;
  if (!await showConfirm("سيتم مسح سجل التاريخ المحدد فقط. هل أنت متأكد؟", { title: "مسح سجل اليوم", okLabel: "مسح السجل" })) return;
  state.entries = state.entries.filter(entry => entry.date !== state.settings.activeDate);
  delete state.reconciliations[state.settings.activeDate];
  state.reconciliationHistory = (state.reconciliationHistory || []).filter(record => record.date !== state.settings.activeDate);
  saveState();
  render();
});

function downloadBlob(blob, filename) {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

// Export the treatments log in the Clinica column format (round-trips through the
// importer), honouring the current report date range + filters.
function exportTreatmentsLog() {
  if (!canViewSensitive()) return;
  const { from, to } = reportDateRange();
  const filters = reportFilterValues();
  const entries = entriesForDateRange(from, to)
    .filter(entry => isBillableEntry(entry) && entryMatchesReportFilters(entry, filters))
    .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
  const header = ["Date", "Complete Date", "Treatment", "Price", "Patient", "Mobile No", "Doctor", "Assistant", "Status"];
  const rows = entries.map(entry => {
    const patient = getPatient(entry.patientId);
    return [
      entry.date || "", entry.date || "",
      serviceLabel(entry) || entry.service || "",
      Number(netAmount(entry) || 0).toFixed(2),
      entry.patient || patient?.name || "",
      patient?.phone || "",
      getStaffMember(entry.doctorId)?.name || "",
      getStaffMember(entry.specialistId)?.name || "",
      "Completed"
    ];
  });
  const csv = [header, ...rows].map(cols => cols.map(cell => {
    const value = String(cell == null ? "" : cell);
    return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
  }).join(",")).join("\r\n");
  downloadBlob(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }), `treatments-log-${from}_${to}.csv`);
  showToast(`تم تصدير ${rows.length} علاجاً (صيغة سجل العلاجات)`, "success");
}
document.addEventListener("click", event => {
  if (event.target.closest("[data-export-treatments-log]")) exportTreatmentsLog();
});

function downloadJSON(value, filename) {
  downloadBlob(new Blob([JSON.stringify(value, null, 2)], { type: "application/json;charset=utf-8" }), filename);
}

function downloadFilenameFromHeader(header, fallback) {
  const match = String(header || "").match(/filename="?([^"]+)"?/i);
  return match?.[1] || fallback;
}

function exportStamp() {
  return new Date().toISOString().slice(0, 10).replaceAll("-", "");
}

async function downloadClinicJson() {
  if (!canManagePermissions()) return;
  const filename = `riaaya-clinic-export-${exportStamp()}.json`;
  if (runtime.mode !== "live") {
    downloadJSON({
      exportedAt: new Date().toISOString(),
      formatVersion: 1,
      mode: "trial-browser",
      state
    }, filename);
    return;
  }
  try {
    const response = await fetch("/api/clinic-export", { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error("export_failed");
    const blob = await response.blob();
    downloadBlob(blob, downloadFilenameFromHeader(response.headers.get("Content-Disposition"), filename));
  } catch {
    alert("تعذر تنزيل نسخة العيادة الآن.");
  }
}

function extractClinicStateFromBackup(payload) {
  if (!payload || typeof payload !== "object") return null;
  const candidate = payload.state && typeof payload.state === "object" ? payload.state : payload;
  const hasCoreCollections = ["patients", "entries", "bookings", "services", "staff"]
    .some(key => Array.isArray(candidate[key]));
  if (!candidate.settings || typeof candidate.settings !== "object" || !hasCoreCollections) return null;
  return candidate;
}

function backupRestoreSummary(restoredState) {
  return [
    `المرضى والزوار: ${restoredState.patients?.length || 0}`,
    `العمليات: ${restoredState.entries?.length || 0}`,
    `الحجوزات: ${restoredState.bookings?.length || 0}`,
    `الخدمات: ${restoredState.services?.length || 0}`,
    `المصروفات: ${restoredState.expenses?.length || 0}`,
    `المخزون: ${restoredState.inventory?.length || 0}`,
    `سجل المطابقة اليومية: ${restoredState.reconciliationHistory?.length || 0}`
  ].join("\n");
}

async function restoreClinicJson(file) {
  if (!canManagePermissions() || !file) return;
  if (file.size > 5 * 1024 * 1024) {
    alert("ملف النسخة كبير جداً. الحد الحالي 5MB.");
    return;
  }

  let payload;
  try {
    payload = JSON.parse(await file.text());
  } catch {
    alert("ملف JSON غير صالح.");
    return;
  }

  const importedState = extractClinicStateFromBackup(payload);
  if (!importedState) {
    alert("هذا الملف لا يبدو كنسخة رعاية صالحة.");
    return;
  }

  const accountSource = runtime.mode === "live" ? state.accounts : importedState.accounts;
  const clinicSource = runtime.session?.clinic || { name: importedState.settings?.clinicName || state.settings?.clinicName };
  const nextState = hydrateClinicState(importedState, clinicSource, accountSource || []);
  const summary = backupRestoreSummary(nextState);
  const confirmed = await showConfirm(
    `سيتم استبدال بيانات العيادة الحالية ببيانات هذه النسخة.\n${summary}\nقبل المتابعة، تأكد أنك نزلت نسخة JSON من الوضع الحالي.`,
    { title: "استرجاع نسخة احتياطية", icon: "♻️", okLabel: "استرجاع الآن" }
  );
  if (!confirmed) return;

  const previousState = state;
  const previousPatientId = selectedPatientId;
  state = nextState;
  selectedPatientId = state.patients?.[0]?.id || "";
  operationPage = 1;
  patientPage = 1;
  reportPage = 1;
  expensePage = 1;

  try {
    await saveStateImmediately();
    render();
    showToast("✓ تم استرجاع نسخة JSON وحفظها", "success");
  } catch {
    state = previousState;
    selectedPatientId = previousPatientId;
    render();
    alert("تعذر حفظ النسخة المسترجعة. لم يتم تغيير البيانات.");
  }
}

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

function safeFilename(value) {
  return String(value || "report").replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, "-").slice(0, 80);
}

function exportCurrentReportXls() {
  if (!canUseFeature("export_reports")) return;
  renderReports();
  const title = selectedReportLabel();
  const html = `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; direction: ${currentLanguage() === "ar" ? "rtl" : "ltr"}; }
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #b7c8c1; padding: 8px; text-align: inherit; }
          th { background: #e8f7f2; color: #065c43; }
          h1, h2, h3 { color: #0f1923; }
        </style>
      </head>
      <body>
        <h1>${state.settings.clinicName}</h1>
        <h2>${title}</h2>
        <p>${reportRangeLabel()}</p>
        ${els.reportPage?.innerHTML || ""}
      </body>
    </html>
  `;
  downloadBlob(new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8" }), `riaaya-${safeFilename(title)}-${exportStamp()}.xls`);
}

function exportClinicCsvBundle() {
  if (!canManagePermissions()) return;
  const stamp = exportStamp();
  const datasets = [
    {
      name: "patients",
      rows: (state.patients || []).map(patient => ({
        id: patient.id,
        profileType: patient.profileType,
        name: patient.name,
        phone: patient.phone,
        email: patient.email,
        gender: patient.gender,
        nationality: patient.nationality,
        city: patient.city,
        category: patient.category,
        marketingConsent: patient.marketingConsent,
        notes: patient.notes
      }))
    },
    {
      name: "bookings",
      rows: (state.bookings || []).map(booking => ({
        id: booking.id,
        date: booking.date,
        time: booking.time,
        patient: booking.patient,
        phone: booking.phone,
        service: serviceLabel(booking),
        doctor: getStaffMember(booking.doctorId)?.name || "",
        specialist: getStaffMember(booking.specialistId)?.name || "",
        expectedAmount: booking.expectedAmount,
        status: booking.status,
        notes: booking.notes
      }))
    },
    {
      name: "operations",
      rows: (state.entries || []).map(entry => ({
        id: entry.id,
        visitId: entry.visitId,
        date: entry.date,
        patient: entry.patient,
        service: serviceLabel(entry),
        doctor: getStaffMember(entry.doctorId)?.name || "",
        specialist: getStaffMember(entry.specialistId)?.name || "",
        quantity: entry.quantity || 1,
        charged: netAmount(entry),
        paid: paidAmount(entry),
        unpaid: Math.max(netAmount(entry) - paidAmount(entry), 0),
        discount: entry.discount,
        payment: entryPaymentLabel(entry),
        cash: entryPaymentBreakdown(entry).cash,
        card: entryPaymentBreakdown(entry).card,
        transfer: entryPaymentBreakdown(entry).transfer,
        status: entry.status,
        notes: entry.notes
      }))
    },
    {
      name: "daily-reconciliations",
      rows: (state.reconciliationHistory || []).map(record => normalizeReconciliationRecord(record, state.entries || [], record.date)).map(record => ({
        id: record.id,
        date: record.date,
        createdAt: record.createdAt,
        createdBy: record.createdBy,
        status: reconciliationStatusLabel(record.status),
        expectedCash: record.expectedCash,
        countedCash: record.countedCash,
        cashDiff: record.diffCash,
        expectedCard: record.expectedCard,
        countedCard: record.countedCard,
        cardDiff: record.diffCard,
        expectedTransfer: record.expectedTransfer,
        countedTransfer: record.countedTransfer,
        transferDiff: record.diffTransfer,
        totalExpected: record.totalExpected,
        totalCounted: record.totalCounted,
        totalDiff: record.totalDiff,
        note: record.note
      }))
    },
    {
      name: "expenses",
      rows: (state.expenses || []).map(expense => ({
        id: expense.id,
        date: expense.date,
        group: expenseGroupName(expense),
        subgroup: expenseSubgroupName(expense),
        amount: expense.amount,
        paymentMethod: paymentLabel(expense.paymentMethod),
        vendor: expense.vendor,
        reference: expense.reference,
        notes: expense.notes
      }))
    },
    {
      name: "receipts",
      rows: (state.receipts || []).map(receipt => ({
        id: receipt.id,
        invoiceNumber: receipt.invoiceNumber,
        date: receipt.date,
        patient: receipt.patient,
        itemCount: receipt.itemCount,
        subtotal: receipt.subtotal,
        taxAmount: receipt.taxAmount,
        total: receipt.total,
        payment: receiptPaymentLabel(receipt),
        status: receipt.status,
        reference: receipt.reference
      }))
    },
    {
      name: "inventory",
      rows: (state.inventory || []).map(item => ({
        id: item.id,
        name: item.name,
        sku: item.sku,
        category: item.category,
        quantity: item.quantity,
        unit: item.unit,
        lowThreshold: item.lowThreshold,
        supplier: (state.suppliers || []).find(supplier => supplier.id === item.supplierId)?.name || "",
        unitCost: item.unitCost,
        active: item.active
      }))
    },
    {
      name: "services",
      rows: (state.services || []).map(service => ({
        id: service.id,
        name: service.name,
        defaultPrice: service.defaultPrice,
        defaultCost: service.defaultCost,
        active: service.active
      }))
    },
    {
      name: "staff",
      rows: (state.staff || []).map(member => ({
        id: member.id,
        name: member.name,
        role: roleLabel(member.role),
        rate: member.rate,
        active: member.active !== false
      }))
    }
  ];
  const available = datasets.filter(dataset => dataset.rows.length);
  if (!available.length) {
    alert("لا توجد بيانات لتصديرها.");
    return;
  }
  available.forEach((dataset, index) => {
    window.setTimeout(() => downloadCSV(dataset.rows, `riaaya-${dataset.name}-${stamp}.csv`), index * 120);
  });
}

function exportEntries() {
  if (!canViewSensitive()) return;
  const rows = filteredActiveEntries(activeEntries()).map(entry => ({
    date: entry.date,
    patient: entry.patient,
    service: serviceLabel(entry),
    doctor: getStaffMember(entry.doctorId)?.name || "",
    specialist: getStaffMember(entry.specialistId)?.name || "",
    quantity: entry.quantity || 1,
    charged: netAmount(entry),
    paid: paidAmount(entry),
    unpaid: Math.max(netAmount(entry) - paidAmount(entry), 0),
    cost: entryCost(entry),
    payment: entryPaymentLabel(entry),
    cash: entryPaymentBreakdown(entry).cash,
    card: entryPaymentBreakdown(entry).card,
    transfer: entryPaymentBreakdown(entry).transfer,
    status: entryStatusLabel(entry.status),
    bookingId: entry.bookingId || "",
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
    payout: row.amount,
    status: salaryStatusLabel(salaryStatusFor(row.member.id))
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
document.querySelector("[data-restore-clinic-json]")?.addEventListener("change", async event => {
  const file = event.target.files?.[0];
  event.target.value = "";
  if (file) await restoreClinicJson(file);
});

document.querySelector("[data-clear-leads]").addEventListener("click", async () => {
  if (!await showConfirm("هل تريد مسح طلبات التجربة المحفوظة على هذا الجهاز؟", { title: "مسح طلبات التجربة", okLabel: "مسح الطلبات" })) return;
  storageRemove(LEADS_KEY);
  render();
});

document.querySelector("[data-print-payroll-report]")?.addEventListener("click", () => {
  if (!canViewSensitive()) return;
  document.body.classList.remove("printing-salary-slip");
  document.body.classList.add("printing-payroll");
  setView("salaries");
  window.print();
});

/* ─── Drag-drop day calendar ──────────────────────────────────────────────
   Event delegation on the persistent container — survives re-renders.
   ─────────────────────────────────────────────────────────────────────── */
(function initDragDropCalendar() {
  const container = els.bookingDayCalendar;
  if (!container) return;

  let draggingId  = null;
  let lastOverSlot = null;

  container.addEventListener("dragstart", e => {
    const card = e.target.closest("[data-drag-booking]");
    if (!card) return;
    draggingId = card.dataset.dragBooking;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", draggingId);
    // brief delay so the ghost image renders before opacity change
    requestAnimationFrame(() => card.classList.add("dragging"));
  });

  container.addEventListener("dragend", e => {
    const card = e.target.closest("[data-drag-booking]");
    if (card) card.classList.remove("dragging");
    if (lastOverSlot) { lastOverSlot.classList.remove("drag-over"); lastOverSlot = null; }
    draggingId = null;
  });

  container.addEventListener("dragover", e => {
    const slot = e.target.closest("[data-drop-slot]");
    if (!slot) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (lastOverSlot && lastOverSlot !== slot) lastOverSlot.classList.remove("drag-over");
    slot.classList.add("drag-over");
    lastOverSlot = slot;
  });

  container.addEventListener("dragleave", e => {
    const slot = e.target.closest("[data-drop-slot]");
    if (slot && !slot.contains(e.relatedTarget)) {
      slot.classList.remove("drag-over");
      if (lastOverSlot === slot) lastOverSlot = null;
    }
  });

  container.addEventListener("drop", e => {
    e.preventDefault();
    const slotEl = e.target.closest("[data-drop-slot]");
    if (!slotEl) return;
    slotEl.classList.remove("drag-over");
    lastOverSlot = null;

    const id        = draggingId || e.dataTransfer.getData("text/plain");
    const newTime   = slotEl.dataset.dropSlot;
    const newColumn = slotEl.dataset.dropColumn;
    draggingId = null;

    if (!id || !newTime) return;
    if (!scheduleColumnAllowedForAccount(newColumn)) {
      showToast("لا تملك صلاحية نقل الحجز إلى هذا العمود.", "error");
      return;
    }
    const booking = (state.bookings || []).find(b => b.id === id);
    if (!booking) return;

    /* Check for conflict after the hypothetical move */
    const columns = bookingScheduleColumns();
    const step    = scheduleSlotMinutes();
    const snap    = scheduleSlotForTime(newTime, step);
    const key     = `${booking.date}|${newColumn}|${snap}`;
    const clash   = (state.bookings || []).find(b =>
      b.id !== id &&
      !["cancelled","no_show"].includes(b.status) &&
      b.date === booking.date &&
      bookingScheduleColumnId(b, columns) === newColumn &&
      scheduleSlotForTime(b.time, step) === snap
    );
    if (clash) {
      showToast(`تعارض: ${clash.patient} محجوز في ${displayTime(snap)} — اختر وقتاً آخر`, "error");
      return;
    }

    booking.time = newTime;
    booking.scheduleColumnId = newColumn;
    saveState();
    renderBookingDayCalendar();
    showToast(`✓ نُقل موعد ${booking.patient} إلى ${displayTime(newTime)}`, "success");
  });
})();

initializeApp();
