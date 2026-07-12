import { createHash } from "node:crypto";
import { decryptBlob, encryptBlob } from "./security.js";

export const CORE_RECORD_STORAGE_VERSION = 1;
export const CORE_RECORD_STORAGE_SETTING = "core_record_storage";

const CORE_COLLECTIONS = ["patients", "bookings", "entries"];
const PAYMENT_FIELDS = [
  "paymentBreakdown",
  "payment_breakdown",
  "payments",
  "paymentMethod",
  "payment_method"
];

function plainObject(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function payloadHash(serialized) {
  return createHash("sha256").update(serialized).digest("hex");
}

function stableLegacyId(prefix, record, index) {
  const digest = payloadHash(JSON.stringify(record)).slice(0, 16);
  return `${prefix}-legacy-${digest}-${index + 1}`;
}

function normalizeRecords(records, prefix) {
  if (!Array.isArray(records)) return [];
  return records.filter(plainObject).map((record, index) => (
    record.id ? record : { ...record, id: stableLegacyId(prefix, record, index) }
  ));
}

function encryptedDescriptor(record, indexFields = {}, id = record.id) {
  const serialized = JSON.stringify(record);
  return {
    id: String(id),
    payloadCipher: encryptBlob(serialized),
    payloadHash: payloadHash(serialized),
    createdAt: String(record.createdAt || record.created_at || new Date().toISOString()),
    indexFields
  };
}

function operationStorageParts(operation) {
  const payload = { ...operation };
  const fields = {};
  for (const field of PAYMENT_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(payload, field)) fields[field] = payload[field];
    delete payload[field];
  }
  const hasPaymentLog = Object.prototype.hasOwnProperty.call(payload, "paymentLog");
  const nonArrayPaymentLog = hasPaymentLog && !Array.isArray(payload.paymentLog)
    ? payload.paymentLog
    : undefined;
  const paymentLog = Array.isArray(payload.paymentLog) ? payload.paymentLog : [];
  delete payload.paymentLog;

  const payments = [{
    id: `${operation.id}:payment-summary`,
    operationId: String(operation.id),
    paymentKind: "summary",
    paidOn: String(operation.date || ""),
    sequence: 0,
    payload: { fields, hasPaymentLog, ...(nonArrayPaymentLog === undefined ? {} : { nonArrayPaymentLog }) }
  }];
  paymentLog.forEach((line, index) => {
    payments.push({
      id: `${operation.id}:payment-log:${index + 1}`,
      operationId: String(operation.id),
      paymentKind: "log",
      paidOn: String(line?.date || operation.date || ""),
      sequence: index + 1,
      payload: plainObject(line) ? line : { value: line }
    });
  });
  return { payload, payments };
}

function syncTable(database, { table, indexColumns = [], records, now }) {
  const indexNames = indexColumns.map(column => column.name);
  const existing = new Map(
    database.prepare(`select id, payload_hash${indexNames.length ? `, ${indexNames.join(", ")}` : ""} from ${table} where clinic_id = ?`)
      .all(records.clinicId)
      .map(row => [String(row.id), row])
  );
  const incomingIds = new Set(records.items.map(item => item.id));
  let deleted = 0;
  for (const id of existing.keys()) {
    if (incomingIds.has(id)) continue;
    database.prepare(`delete from ${table} where clinic_id = ? and id = ?`).run(records.clinicId, id);
    deleted += 1;
  }

  const columnNames = indexColumns.map(column => column.name);
  const columns = ["clinic_id", "id", ...columnNames, "payload_cipher", "payload_hash", "created_at", "updated_at"];
  const placeholders = columns.map(() => "?").join(", ");
  const updates = [...columnNames, "payload_cipher", "payload_hash", "updated_at"]
    .map(column => `${column} = excluded.${column}`)
    .join(", ");
  const upsert = database.prepare(`
    insert into ${table} (${columns.join(", ")})
    values (${placeholders})
    on conflict(clinic_id, id) do update set ${updates}
  `);
  let changed = 0;
  for (const item of records.items) {
    const stored = existing.get(item.id);
    const indexesMatch = stored && indexColumns.every(column => (
      (stored[column.name] ?? null) === (item.indexFields[column.key] ?? null)
    ));
    if (stored && String(stored.payload_hash || "") === item.payloadHash && indexesMatch) continue;
    upsert.run(
      records.clinicId,
      item.id,
      ...indexColumns.map(column => item.indexFields[column.key] ?? null),
      item.payloadCipher,
      item.payloadHash,
      item.createdAt || now,
      now
    );
    changed += 1;
  }
  return { changed, deleted, total: records.items.length };
}

function readEncryptedRows(database, table, clinicId, orderBy = "created_at asc, id asc") {
  return database.prepare(`
    select *
    from ${table}
    where clinic_id = ?
    order by ${orderBy}
  `).all(clinicId).map(row => {
    const serialized = decryptBlob(row.payload_cipher);
    if (payloadHash(serialized) !== row.payload_hash) {
      throw new Error(`clinic_record_hash_mismatch:${table}:${row.id}`);
    }
    const payload = JSON.parse(serialized);
    if (!plainObject(payload)) throw new Error(`clinic_record_payload_invalid:${table}:${row.id}`);
    return { ...row, id: String(row.id), payload };
  });
}

function verifyManifest(row, manifest, counts) {
  if (!manifest) throw new Error(`clinic_record_manifest_missing:${row.id}`);
  const stateVersion = Number(row.state_version || 0);
  if (Number(row.record_storage_synced_version || 0) !== stateVersion || Number(manifest.state_version) !== stateVersion) {
    throw new Error(`clinic_record_version_mismatch:${row.id}`);
  }
  const expected = {
    patients: Number(manifest.patient_count || 0),
    bookings: Number(manifest.booking_count || 0),
    operations: Number(manifest.operation_count || 0),
    payments: Number(manifest.payment_count || 0)
  };
  for (const [key, value] of Object.entries(expected)) {
    if (counts[key] !== value) throw new Error(`clinic_record_count_mismatch:${row.id}:${key}`);
  }
}

export function readClinicState(database, row) {
  const shell = JSON.parse(decryptBlob(row?.state_json) || "{}");
  if (Number(row?.record_storage_version || 0) < CORE_RECORD_STORAGE_VERSION) return shell;

  const clinicId = String(row.id || row.clinic_id || "");
  if (!clinicId) throw new Error("clinic_record_clinic_id_missing");
  const patients = readEncryptedRows(database, "clinic_patients", clinicId, "sequence asc, id asc").map(row => row.payload);
  const bookings = readEncryptedRows(database, "clinic_bookings", clinicId, "sequence asc, id asc").map(row => row.payload);
  const operationRows = readEncryptedRows(database, "clinic_operations", clinicId, "sequence asc, id asc");
  const paymentRows = readEncryptedRows(database, "clinic_operation_payments", clinicId, "operation_id asc, sequence asc, id asc");
  const paymentsByOperation = new Map();
  for (const row of paymentRows) {
    const operationId = String(row.operation_id || "");
    const records = paymentsByOperation.get(operationId) || [];
    records.push(row);
    paymentsByOperation.set(operationId, records);
  }
  const entries = operationRows.map(row => {
    const operation = { ...row.payload };
    const payments = paymentsByOperation.get(row.id) || [];
    const summary = payments.find(payment => payment.id.endsWith(":payment-summary"))?.payload;
    if (!summary) throw new Error(`clinic_payment_summary_missing:${clinicId}:${row.id}`);
    Object.assign(operation, plainObject(summary.fields) ? summary.fields : {});
    if (summary.hasPaymentLog) {
      operation.paymentLog = Object.prototype.hasOwnProperty.call(summary, "nonArrayPaymentLog")
        ? summary.nonArrayPaymentLog
        : payments
          .filter(payment => payment.id.includes(":payment-log:"))
          .map(payment => payment.payload);
    }
    return operation;
  });
  const manifest = database.prepare("select * from clinic_record_manifests where clinic_id = ?").get(clinicId);
  verifyManifest(row, manifest, {
    patients: patients.length,
    bookings: bookings.length,
    operations: entries.length,
    payments: paymentRows.length
  });
  return { ...shell, patients, bookings, entries };
}

export function persistClinicState(database, { clinicId, state, stateVersion, updatedAt = new Date().toISOString() }) {
  const fullState = structuredClone(state || {});
  fullState.patients = normalizeRecords(fullState.patients, "patient");
  fullState.bookings = normalizeRecords(fullState.bookings, "booking");
  fullState.entries = normalizeRecords(fullState.entries, "operation");

  const patients = fullState.patients.map((record, sequence) => encryptedDescriptor(record, { sequence }));
  const bookings = fullState.bookings.map((record, sequence) => encryptedDescriptor(record, {
    sequence,
    patientId: record.patientId || record.patient_id || null,
    bookingDate: record.date || null,
    bookingTime: record.time || null,
    status: record.status || null,
    scheduleColumnId: record.scheduleColumnId || record.schedule_column_id || null
  }));
  const paymentRecords = [];
  const operations = fullState.entries.map((record, sequence) => {
    const storage = operationStorageParts(record);
    paymentRecords.push(...storage.payments);
    return encryptedDescriptor(storage.payload, {
      sequence,
      patientId: record.patientId || record.patient_id || null,
      operationDate: record.date || null,
      serviceId: record.serviceId || record.service_id || null,
      bookingId: record.bookingId || record.booking_id || null,
      visitId: record.visitId || record.visit_id || null,
      kind: record.kind || "operation",
      status: record.status || null
    });
  });
  const payments = paymentRecords.map(record => encryptedDescriptor(record.payload, {
    operationId: record.operationId,
    paymentKind: record.paymentKind,
    paidOn: record.paidOn || null,
    sequence: record.sequence
  }, record.id));

  const results = {
    patients: syncTable(database, {
      table: "clinic_patients",
      indexColumns: [{ name: "sequence", key: "sequence" }],
      records: { clinicId, items: patients },
      now: updatedAt
    }),
    bookings: syncTable(database, {
      table: "clinic_bookings",
      indexColumns: [
        { name: "sequence", key: "sequence" },
        { name: "patient_id", key: "patientId" },
        { name: "booking_date", key: "bookingDate" },
        { name: "booking_time", key: "bookingTime" },
        { name: "status", key: "status" },
        { name: "schedule_column_id", key: "scheduleColumnId" }
      ],
      records: { clinicId, items: bookings },
      now: updatedAt
    }),
    operations: syncTable(database, {
      table: "clinic_operations",
      indexColumns: [
        { name: "sequence", key: "sequence" },
        { name: "patient_id", key: "patientId" },
        { name: "operation_date", key: "operationDate" },
        { name: "service_id", key: "serviceId" },
        { name: "booking_id", key: "bookingId" },
        { name: "visit_id", key: "visitId" },
        { name: "kind", key: "kind" },
        { name: "status", key: "status" }
      ],
      records: { clinicId, items: operations },
      now: updatedAt
    }),
    payments: syncTable(database, {
      table: "clinic_operation_payments",
      indexColumns: [
        { name: "operation_id", key: "operationId" },
        { name: "payment_kind", key: "paymentKind" },
        { name: "paid_on", key: "paidOn" },
        { name: "sequence", key: "sequence" }
      ],
      records: { clinicId, items: payments },
      now: updatedAt
    })
  };

  database.prepare(`
    insert into clinic_record_manifests (
      clinic_id, state_version, patient_count, booking_count, operation_count, payment_count, updated_at
    ) values (?, ?, ?, ?, ?, ?, ?)
    on conflict(clinic_id) do update set
      state_version = excluded.state_version,
      patient_count = excluded.patient_count,
      booking_count = excluded.booking_count,
      operation_count = excluded.operation_count,
      payment_count = excluded.payment_count,
      updated_at = excluded.updated_at
  `).run(clinicId, stateVersion, patients.length, bookings.length, operations.length, payments.length, updatedAt);

  const shell = structuredClone(fullState);
  CORE_COLLECTIONS.forEach(collection => { delete shell[collection]; });
  const serialized = JSON.stringify(fullState);
  const shellSerialized = JSON.stringify(shell);
  database.prepare(`
    update clinics
    set state_json = ?, state_version = ?, record_storage_version = ?,
        record_storage_synced_version = ?, updated_at = ?
    where id = ?
  `).run(
    encryptBlob(shellSerialized),
    stateVersion,
    CORE_RECORD_STORAGE_VERSION,
    stateVersion,
    updatedAt,
    clinicId
  );
  return {
    fullState,
    serialized,
    shellSerialized,
    results,
    recordStorageVersion: CORE_RECORD_STORAGE_VERSION
  };
}

function relationalStorageActivated(database) {
  if (process.env.RIAAYA_AUTO_MIGRATE_RECORDS === "1") return true;
  const row = database.prepare("select value_json from platform_settings where key = ?")
    .get(CORE_RECORD_STORAGE_SETTING);
  try {
    return Boolean(row?.value_json && JSON.parse(row.value_json)?.enabled);
  } catch {
    return false;
  }
}

function persistLegacyClinicState(database, { clinicId, state, stateVersion, updatedAt }) {
  const fullState = structuredClone(state || {});
  const serialized = JSON.stringify(fullState);
  database.prepare(`
    update clinics
    set state_json = ?, state_version = ?, record_storage_version = 0,
        record_storage_synced_version = 0, updated_at = ?
    where id = ?
  `).run(encryptBlob(serialized), stateVersion, updatedAt, clinicId);
  return {
    fullState,
    serialized,
    shellSerialized: serialized,
    results: null,
    recordStorageVersion: 0
  };
}

// Existing production databases keep the legacy encrypted state intact until
// the explicit backup-first migration activates relational storage. This makes
// a rollback mean restoring the pre-migration DB backup, never silently showing
// empty patient/booking/operation collections on an older release.
export function persistClinicStateCompatible(database, {
  clinicRow,
  clinicId,
  state,
  stateVersion,
  updatedAt = new Date().toISOString()
}) {
  const storageVersion = Number(clinicRow?.record_storage_version || 0);
  if (storageVersion >= CORE_RECORD_STORAGE_VERSION || relationalStorageActivated(database)) {
    return persistClinicState(database, { clinicId, state, stateVersion, updatedAt });
  }
  return persistLegacyClinicState(database, { clinicId, state, stateVersion, updatedAt });
}

export function clinicRecordCounts(database, row) {
  if (Number(row?.record_storage_version || 0) >= CORE_RECORD_STORAGE_VERSION) {
    const manifest = database.prepare("select * from clinic_record_manifests where clinic_id = ?").get(row.id);
    if (!manifest) return { patients: 0, bookings: 0, operations: 0, payments: 0, ready: false };
    return {
      patients: Number(manifest.patient_count || 0),
      bookings: Number(manifest.booking_count || 0),
      operations: Number(manifest.operation_count || 0),
      payments: Number(manifest.payment_count || 0),
      ready: Number(manifest.state_version) === Number(row.state_version || 0)
    };
  }
  const state = JSON.parse(decryptBlob(row?.state_json) || "{}");
  return {
    patients: Array.isArray(state.patients) ? state.patients.length : 0,
    bookings: Array.isArray(state.bookings) ? state.bookings.length : 0,
    operations: Array.isArray(state.entries) ? state.entries.length : 0,
    payments: 0,
    ready: true
  };
}

export function withImmediateTransaction(database, work) {
  database.exec("begin immediate");
  try {
    const result = work();
    database.exec("commit");
    return result;
  } catch (error) {
    try { database.exec("rollback"); } catch { /* preserve the original error */ }
    throw error;
  }
}
