export const CLINIC_STATE_SCHEMA_VERSION = 1;

const ARRAY_FIELDS = [
  "accounts", "staff", "services", "entries", "bookings", "patients",
  "expenses", "expenseGroups", "suppliers", "inventory", "orders", "purchaseOrders",
  "receipts", "campaigns", "outboundMessages", "digestRules",
  "reconciliationHistory", "patientPackages", "packageTemplates", "importHistory",
  "scheduleColumns", "rules", "patientPhotos", "auditTrail", "growthLog"
];

const OBJECT_FIELDS = [
  "settings", "integrations", "notificationReads", "salaryApprovals"
];

function plainObject(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function finiteNumberLike(value) {
  return value == null || value === "" || Number.isFinite(Number(value));
}

function validDate(value) {
  return value == null || value === "" || /^\d{4}-\d{2}-\d{2}$/.test(String(value));
}

function validTime(value) {
  return value == null || value === "" || /^\d{2}:\d{2}$/.test(String(value));
}

function validateRecords(records, field, validate, errors) {
  if (!Array.isArray(records)) return;
  records.slice(0, 10000).forEach((record, index) => {
    if (!plainObject(record)) {
      errors.push(`${field}[${index}] must be an object`);
      return;
    }
    validate(record, index, errors);
  });
}

export function validateClinicState(state) {
  const errors = [];
  if (!plainObject(state)) return { ok: false, version: CLINIC_STATE_SCHEMA_VERSION, errors: ["state must be an object"] };
  if (Object.keys(state).length > 250) errors.push("state has too many top-level fields");

  for (const field of ARRAY_FIELDS) {
    if (state[field] != null && !Array.isArray(state[field])) errors.push(`${field} must be an array`);
  }
  for (const field of OBJECT_FIELDS) {
    if (state[field] != null && !plainObject(state[field])) errors.push(`${field} must be an object`);
  }
  if (state.reconciliations != null && !plainObject(state.reconciliations) && !Array.isArray(state.reconciliations)) {
    errors.push("reconciliations must be an object or array");
  }

  validateRecords(state.patients, "patients", (record, index, list) => {
    if (record.name != null && typeof record.name !== "string") list.push(`patients[${index}].name must be a string`);
  }, errors);
  validateRecords(state.bookings, "bookings", (record, index, list) => {
    if (record.patient != null && typeof record.patient !== "string") list.push(`bookings[${index}].patient must be a string`);
    if (!validDate(record.date)) list.push(`bookings[${index}].date is invalid`);
    if (!validTime(record.time)) list.push(`bookings[${index}].time is invalid`);
    if (!finiteNumberLike(record.expectedAmount)) list.push(`bookings[${index}].expectedAmount is invalid`);
  }, errors);
  validateRecords(state.entries, "entries", (record, index, list) => {
    if (record.patient != null && typeof record.patient !== "string") list.push(`entries[${index}].patient must be a string`);
    if (record.service != null && typeof record.service !== "string") list.push(`entries[${index}].service must be a string`);
    if (!validDate(record.date)) list.push(`entries[${index}].date is invalid`);
    for (const field of ["quantity", "unitPrice", "amount", "cost", "discount", "paidAmount"]) {
      if (!finiteNumberLike(record[field])) list.push(`entries[${index}].${field} is invalid`);
    }
  }, errors);
  validateRecords(state.expenses, "expenses", (record, index, list) => {
    if (!validDate(record.date)) list.push(`expenses[${index}].date is invalid`);
    if (!finiteNumberLike(record.amount)) list.push(`expenses[${index}].amount is invalid`);
  }, errors);
  validateRecords(state.services, "services", (record, index, list) => {
    if (record.name != null && typeof record.name !== "string") list.push(`services[${index}].name must be a string`);
    for (const field of ["defaultPrice", "defaultCost"]) {
      if (!finiteNumberLike(record[field])) list.push(`services[${index}].${field} is invalid`);
    }
  }, errors);

  return {
    ok: errors.length === 0,
    version: CLINIC_STATE_SCHEMA_VERSION,
    errors: errors.slice(0, 25)
  };
}
