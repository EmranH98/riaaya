import { randomUUID } from "node:crypto";
import { audit, databasePath, db, defaultClinicModules, listClinicNotifications, nowIso, parseJson, publicClinic, publicUser } from "../lib/database.js";
import { requireSession } from "./auth.js";
import { clientIp, encryptSecret, hashPassword, normalizeEmail, safeText, validatePassword } from "../lib/security.js";
import { storageReadiness } from "../lib/storage-policy.js";

const USER_ROLES = new Set(["admin", "data_entry", "doctor", "specialist"]);
const CALENDAR_SCOPES = new Set(["all", "today", "rolling", "working_days", "assigned"]);
const INTEGRATION_PERMISSIONS = {
  whatsapp: "send_role_digests",
  sms: "send_sms_campaigns",
  jofotara: "manage_jofotara"
};

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(payload));
}

function jsonAttachment(res, filename, payload) {
  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.end(JSON.stringify(payload, null, 2));
}

function can(user, permission) {
  return user.role === "admin" || user.permissionFeatures.includes(permission);
}

function clinicModuleEnabled(clinic, module) {
  if (!clinic) return true;
  const modules = Array.isArray(clinic.enabledModules) && clinic.enabledModules.length
    ? clinic.enabledModules
    : defaultClinicModules(clinic.plan);
  return modules.includes(module);
}

function canManageUsers(user) {
  return user.role === "admin" || can(user, "manage_users");
}

function jordanToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Amman",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

function dayDistance(from, to) {
  return Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86400000);
}

function dateAllowed(user, date) {
  if (!date || user.role === "admin" || user.calendarScope === "all") return true;
  const today = jordanToday();
  const difference = dayDistance(today, date);
  if (user.calendarScope === "today") return difference === 0;
  if (user.calendarScope === "rolling" || user.calendarScope === "assigned") {
    return difference >= -user.calendarDaysBack && difference <= user.calendarDaysAhead;
  }
  if (user.calendarScope === "working_days") {
    const day = new Date(`${date}T12:00:00Z`).getUTCDay();
    return user.workingDays.includes(day)
      && difference >= -user.calendarDaysBack
      && difference <= user.calendarDaysAhead;
  }
  return false;
}

function staffLinked(user, record) {
  if (!user.ownEntriesOnly && user.calendarScope !== "assigned") return true;
  if (!user.staffId) return false;
  return record.doctorId === user.staffId || record.specialistId === user.staffId;
}

function recordAllowed(user, record) {
  return dateAllowed(user, record.date || record.bookingDate || record.operationDate) && staffLinked(user, record);
}

function redactEntry(entry, user) {
  const output = { ...entry };
  if (!user.canViewSensitive) {
    delete output.cost;
    delete output.directCost;
    delete output.profit;
    delete output.payouts;
  }
  if (!can(user, "access_price_medical") && user.role !== "admin") {
    delete output.unitPrice;
  }
  return output;
}

function filterClinicState(rawState, user, accountRows, clinic) {
  const state = structuredClone(rawState || {});
  state.accounts = accountRows.map(publicUser).map(account => ({
    ...account,
    userName: account.email,
    allowedViews: [],
    canManagePermissions: account.role === "admin" || account.permissionFeatures.includes("manage_users")
  }));
  state.currentAccountId = user.id;

  state.entries = can(user, "access_medical") && clinicModuleEnabled(clinic, "operations")
    ? (state.entries || []).filter(record => recordAllowed(user, record)).map(entry => redactEntry(entry, user))
    : [];
  state.bookings = can(user, "calendar_page") && clinicModuleEnabled(clinic, "bookings")
    ? (state.bookings || []).filter(record => recordAllowed(user, record))
    : [];
  state.patients = can(user, "patients_page") && clinicModuleEnabled(clinic, "patients")
    ? (state.patients || []).map(patient => {
        if (can(user, "see_mobile")) return patient;
        const safe = { ...patient };
        delete safe.phone;
        delete safe.email;
        return safe;
      })
    : [];

  if (!user.canViewSensitive) {
    state.reconciliations = {};
    state.salaryStatuses = {};
  }
  if (!can(user, "inventory") || !clinicModuleEnabled(clinic, "inventory")) {
    state.inventory = [];
    state.suppliers = [];
    state.purchaseOrders = [];
  }
  const canReadExpenses = user.canViewSensitive
    && clinicModuleEnabled(clinic, "expenses")
    && (can(user, "access_expenses") || can(user, "expenses_report") || can(user, "expenses_settings"));
  if (!canReadExpenses) {
    state.expenses = [];
  }
  if (!canReadExpenses && !(user.canViewSensitive && can(user, "manage_expense_categories"))) {
    state.expenseGroups = [];
  }
  if (!can(user, "import_data") || !clinicModuleEnabled(clinic, "imports")) {
    state.importHistory = [];
  }
  if (!can(user, "communications_hub") || !clinicModuleEnabled(clinic, "communications")) {
    state.digestRules = [];
    state.campaigns = [];
    state.outboundMessages = [];
  }
  if (
    !clinicModuleEnabled(clinic, "receipts")
    || (!can(user, "manage_jofotara") && !can(user, "view_receipts") && !can(user, "issue_receipts"))
  ) state.receipts = [];

  return state;
}

function mergeScopedCollection(existing = [], incoming = [], isAllowed, { allowCreate = true, allowUpdate = true, allowDelete = true, preserveSensitive = false } = {}) {
  const incomingMap = new Map(incoming.filter(item => item?.id).map(item => [item.id, item]));
  const existingMap = new Map(existing.filter(item => item?.id).map(item => [item.id, item]));
  const result = [];

  existing.forEach(record => {
    if (!isAllowed(record)) {
      result.push(record);
      return;
    }
    const replacement = incomingMap.get(record.id);
    if (!replacement) {
      if (!allowDelete) result.push(record);
      return;
    }
    if (!allowUpdate) {
      result.push(record);
      return;
    }
    result.push(preserveSensitive
      ? {
          ...replacement,
          cost: record.cost,
          directCost: record.directCost,
          profit: record.profit,
          payouts: record.payouts
        }
      : replacement);
  });

  if (allowCreate) {
    incoming.forEach(record => {
      if (record?.id && !existingMap.has(record.id) && isAllowed(record)) result.push(record);
    });
  }
  return result;
}

function mergeClinicState(existing, incoming, user, clinic) {
  if (user.role === "admin") {
    const merged = structuredClone(incoming);
    delete merged.accounts;
    delete merged.currentAccountId;
    if (!clinicModuleEnabled(clinic, "operations")) merged.entries = existing.entries || [];
    if (!clinicModuleEnabled(clinic, "bookings")) merged.bookings = existing.bookings || [];
    if (!clinicModuleEnabled(clinic, "patients")) merged.patients = existing.patients || [];
    if (!clinicModuleEnabled(clinic, "inventory")) {
      merged.inventory = existing.inventory || [];
      merged.suppliers = existing.suppliers || [];
      merged.purchaseOrders = existing.purchaseOrders || [];
    }
    if (!clinicModuleEnabled(clinic, "expenses")) {
      merged.expenses = existing.expenses || [];
      merged.expenseGroups = existing.expenseGroups || [];
    }
    if (!clinicModuleEnabled(clinic, "communications")) {
      merged.digestRules = existing.digestRules || [];
      merged.campaigns = existing.campaigns || [];
      merged.outboundMessages = existing.outboundMessages || [];
    }
    if (!clinicModuleEnabled(clinic, "receipts")) merged.receipts = existing.receipts || [];
    if (!clinicModuleEnabled(clinic, "imports")) merged.importHistory = existing.importHistory || [];
    return merged;
  }

  const next = structuredClone(existing || {});
  if (can(user, "access_medical") && clinicModuleEnabled(clinic, "operations")) {
    next.entries = mergeScopedCollection(
      existing.entries,
      incoming.entries,
      record => recordAllowed(user, record),
      {
        allowCreate: true,
        allowUpdate: true,
        allowDelete: can(user, "delete_treatments_medical"),
        preserveSensitive: !user.canViewSensitive
      }
    );
  }
  if (can(user, "calendar_page") && clinicModuleEnabled(clinic, "bookings")) {
    next.bookings = mergeScopedCollection(
      existing.bookings,
      incoming.bookings,
      record => recordAllowed(user, record),
      {
        allowCreate: can(user, "add_appointment"),
        allowUpdate: can(user, "edit_appointment") || can(user, "change_appointment_status"),
        allowDelete: can(user, "delete_appointment")
      }
    );
  }
  if (can(user, "patients_page") && clinicModuleEnabled(clinic, "patients")) {
    next.patients = mergeScopedCollection(
      existing.patients,
      incoming.patients,
      () => true,
      {
        allowCreate: can(user, "add_patient"),
        allowUpdate: can(user, "edit_patient_information"),
        allowDelete: can(user, "delete_patient")
      }
    );
  }
  if (can(user, "inventory") && clinicModuleEnabled(clinic, "inventory")) {
    next.inventory = incoming.inventory || existing.inventory;
    if (can(user, "manage_suppliers")) {
      next.suppliers = incoming.suppliers || existing.suppliers;
      next.purchaseOrders = incoming.purchaseOrders || existing.purchaseOrders;
    }
  }
  if (
    user.canViewSensitive
    && clinicModuleEnabled(clinic, "expenses")
    && (can(user, "access_expenses") || can(user, "expenses_report") || can(user, "expenses_settings"))
  ) {
    next.expenses = mergeScopedCollection(
      existing.expenses || [],
      incoming.expenses || [],
      () => true,
      {
        allowCreate: can(user, "add_expense"),
        allowUpdate: can(user, "edit_expense"),
        allowDelete: can(user, "delete_expense")
      }
    );
  }
  if (user.canViewSensitive && clinicModuleEnabled(clinic, "expenses") && can(user, "manage_expense_categories")) {
    next.expenseGroups = incoming.expenseGroups || existing.expenseGroups;
  }
  if (can(user, "import_data") && clinicModuleEnabled(clinic, "imports")) next.importHistory = incoming.importHistory || existing.importHistory;
  if (user.canViewSensitive) {
    next.reconciliations = incoming.reconciliations || existing.reconciliations;
    next.salaryStatuses = incoming.salaryStatuses || existing.salaryStatuses;
  }
  if (can(user, "send_role_digests") && clinicModuleEnabled(clinic, "communications")) next.digestRules = incoming.digestRules || existing.digestRules;
  if (can(user, "send_sms_campaigns") && clinicModuleEnabled(clinic, "communications")) {
    next.campaigns = incoming.campaigns || existing.campaigns;
    next.outboundMessages = incoming.outboundMessages || existing.outboundMessages;
  }
  if (clinicModuleEnabled(clinic, "receipts") && (can(user, "manage_jofotara") || can(user, "issue_receipts"))) {
    next.receipts = incoming.receipts || existing.receipts;
  }
  return next;
}

function sanitizeStateValue(value, depth = 0) {
  if (depth > 12) return null;
  if (typeof value === "string") return safeText(value, 5000);
  if (Array.isArray(value)) return value.slice(0, 10000).map(item => sanitizeStateValue(item, depth + 1));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value)
      .slice(0, 5000)
      .map(([key, item]) => [safeText(key, 120), sanitizeStateValue(item, depth + 1)]));
  }
  return value;
}

function clinicUsers(clinicId) {
  return db.prepare("select * from users where clinic_id = ? order by created_at asc").all(clinicId);
}

function userPayload(row) {
  const user = publicUser(row);
  return {
    ...user,
    userName: user.email,
    allowedViews: [],
    canManagePermissions: user.role === "admin" || user.permissionFeatures.includes("manage_users")
  };
}

function getState(req, res) {
  const auth = requireSession(req, res);
  if (!auth) return;
  const clinicRow = db.prepare("select state_json, state_version from clinics where id = ?").get(auth.user.clinicId);
  const rawState = parseJson(clinicRow?.state_json, null);
  const users = clinicUsers(auth.user.clinicId);
  sendJson(res, 200, {
    ok: true,
    state: rawState ? filterClinicState(rawState, auth.user, users, auth.clinic) : null,
    stateVersion: Number(clinicRow?.state_version || 0),
    accounts: users.map(userPayload),
    user: auth.user,
    clinic: auth.clinic
  });
}

function getStorageStatus(req, res) {
  const auth = requireSession(req, res);
  if (!auth) return;
  const backupPath = process.env.RIAAYA_BACKUP_DIR || "";
  const readiness = storageReadiness({ databasePath, backupPath });
  const safeForPilot = readiness.safeForRealData;
  const admin = auth.user.role === "admin";

  sendJson(res, 200, {
    ok: true,
    storage: {
      engine: readiness.managedDatabase ? "managed_database" : "sqlite",
      provider: process.env.RIAAYA_STORAGE_PROVIDER || (readiness.managedDatabase ? "managed_cloud_database" : "server_sqlite"),
      deploymentMode: readiness.deploymentMode,
      mode: readiness.databaseMode,
      cloudBacked: readiness.cloudBacked,
      safeForPilot,
      safeForRealData: readiness.safeForRealData,
      demoOnly: readiness.demoOnly || readiness.deploymentMode === "preview",
      databaseLocation: admin ? databasePath : readiness.databaseMode,
      backupLocation: admin ? backupPath : readiness.backupMode,
      backupRetentionDays: Number(process.env.RIAAYA_BACKUP_RETENTION || process.env.RIAAYA_BACKUP_RETENTION_DAYS || 30),
      checkedAt: nowIso()
    },
    message: safeForPilot
      ? "Clinic data has durable storage and a backup route for a careful real-clinic pilot."
      : "Do not enter real patient data here. This environment is preview-only until durable storage and private production secrets are configured.",
    recommendations: safeForPilot
      ? ["Download a clinic export before major edits.", "Keep Render disk snapshots or managed database backups enabled during the pilot."]
      : ["Use Render persistent disk mounted at /data, or configure a managed cloud database before real patient data.", "Keep the public trial/demo separate from the real clinic account."]
  });
}

function exportClinic(req, res) {
  const auth = requireSession(req, res);
  if (!auth) return;
  if (auth.user.role !== "admin") {
    sendJson(res, 403, { error: "permission_denied" });
    return;
  }
  const clinicRow = db.prepare("select * from clinics where id = ?").get(auth.user.clinicId);
  if (!clinicRow) {
    sendJson(res, 404, { error: "clinic_not_found" });
    return;
  }
  const users = db.prepare("select * from users where clinic_id = ? order by created_at asc").all(auth.user.clinicId);
  const integrations = db.prepare(`
    select provider, config_json, secret_cipher, updated_at
    from clinic_integrations
    where clinic_id = ?
    order by provider asc
  `).all(auth.user.clinicId);
  const auditRows = db.prepare(`
    select action, entity, entity_id, metadata_json, ip_address, created_at
    from audit_logs
    where clinic_id = ?
    order by created_at desc
    limit 1000
  `).all(auth.user.clinicId);
  const state = parseJson(clinicRow.state_json, {});
  const readiness = storageReadiness({
    databasePath,
    backupPath: process.env.RIAAYA_BACKUP_DIR || ""
  });
  const payload = {
    exportedAt: nowIso(),
    formatVersion: 1,
    storage: {
      engine: readiness.managedDatabase ? "managed_database" : "sqlite",
      deploymentMode: readiness.deploymentMode,
      mode: readiness.databaseMode,
      safeForRealData: readiness.safeForRealData
    },
    clinic: publicClinic(clinicRow),
    stateVersion: Number(clinicRow.state_version || 0),
    state,
    users: users.map(publicUser),
    integrations: integrations.map(row => ({
      provider: row.provider,
      config: parseJson(row.config_json, {}),
      configured: Boolean(row.secret_cipher),
      updatedAt: row.updated_at
    })),
    recentAudit: auditRows.map(row => ({
      action: row.action,
      entity: row.entity,
      entityId: row.entity_id || "",
      metadata: parseJson(row.metadata_json, {}),
      ipAddress: row.ip_address || "",
      createdAt: row.created_at
    }))
  };
  audit({
    clinicId: auth.user.clinicId,
    userId: auth.user.id,
    action: "export",
    entity: "clinic_data",
    entityId: auth.user.clinicId,
    metadata: { bytes: JSON.stringify(payload).length },
    ipAddress: clientIp(req)
  });
  const slug = String(clinicRow.slug || "clinic").replace(/[^a-z0-9-]+/gi, "-").toLowerCase();
  const stamp = nowIso().slice(0, 10).replaceAll("-", "");
  jsonAttachment(res, `riaaya-${slug}-export-${stamp}.json`, payload);
}

function saveState(req, res) {
  const auth = requireSession(req, res, { csrf: true });
  if (!auth) return;
  const incoming = sanitizeStateValue(req.body?.state);
  if (!incoming || typeof incoming !== "object") {
    sendJson(res, 400, { error: "invalid_clinic_state" });
    return;
  }
  const clinicRow = db.prepare("select state_json, state_version from clinics where id = ?").get(auth.user.clinicId);
  const expectedVersion = Number(req.body?.stateVersion);
  const currentVersion = Number(clinicRow?.state_version || 0);
  if (!Number.isInteger(expectedVersion) || expectedVersion !== currentVersion) {
    sendJson(res, 409, { error: "clinic_state_conflict", stateVersion: currentVersion });
    return;
  }
  const existing = parseJson(clinicRow?.state_json, {});
  const merged = mergeClinicState(existing, incoming, auth.user, auth.clinic);
  const serialized = JSON.stringify(merged);
  if (serialized.length > 4 * 1024 * 1024) {
    sendJson(res, 413, { error: "clinic_state_too_large" });
    return;
  }
  const nextVersion = currentVersion + 1;
  db.prepare("update clinics set state_json = ?, state_version = ?, updated_at = ? where id = ?")
    .run(serialized, nextVersion, nowIso(), auth.user.clinicId);
  audit({
    clinicId: auth.user.clinicId,
    userId: auth.user.id,
    action: "update",
    entity: "clinic_state",
    entityId: auth.user.clinicId,
    metadata: { bytes: serialized.length },
    ipAddress: clientIp(req)
  });
  sendJson(res, 200, { ok: true, savedAt: nowIso(), stateVersion: nextVersion });
}

function listUsers(req, res) {
  const auth = requireSession(req, res);
  if (!auth) return;
  if (!canManageUsers(auth.user)) {
    sendJson(res, 403, { error: "permission_denied" });
    return;
  }
  sendJson(res, 200, { ok: true, users: clinicUsers(auth.user.clinicId).map(userPayload) });
}

function cleanUserInput(input, existing = null) {
  const role = USER_ROLES.has(input.role) ? input.role : "data_entry";
  const calendarScope = CALENDAR_SCOPES.has(input.calendarScope) ? input.calendarScope : "today";
  const workingDays = Array.isArray(input.workingDays)
    ? input.workingDays.map(Number).filter(day => day >= 0 && day <= 6)
    : [0, 1, 2, 3, 4];
  return {
    email: normalizeEmail(input.email || existing?.email),
    name: safeText(input.name || existing?.name, 120),
    mobile: safeText(input.mobile || existing?.mobile, 30),
    telNo: safeText(input.telNo || existing?.tel_no, 30),
    role,
    permissions: Array.isArray(input.permissionFeatures) ? [...new Set(input.permissionFeatures.map(String))] : [],
    staffId: safeText(input.staffId, 80),
    ownEntriesOnly: input.ownEntriesOnly === true,
    canViewSensitive: role === "admin" || input.canViewSensitive === true,
    calendarScope: role === "admin" ? "all" : calendarScope,
    calendarDaysBack: Math.max(0, Math.min(Number(input.calendarDaysBack || 0), 3650)),
    calendarDaysAhead: Math.max(0, Math.min(Number(input.calendarDaysAhead || 0), 3650)),
    workingDays: workingDays.length ? workingDays : [0, 1, 2, 3, 4],
    active: input.active !== false
  };
}

function saveUser(req, res, userId = "") {
  const auth = requireSession(req, res, { csrf: true });
  if (!auth) return;
  if (!canManageUsers(auth.user)) {
    sendJson(res, 403, { error: "permission_denied" });
    return;
  }
  const existing = userId
    ? db.prepare("select * from users where id = ? and clinic_id = ?").get(userId, auth.user.clinicId)
    : null;
  if (userId && !existing) {
    sendJson(res, 404, { error: "user_not_found" });
    return;
  }

  const input = cleanUserInput(req.body || {}, existing);
  if (auth.user.role !== "admin") {
    if (existing?.role === "admin" || existing?.id === auth.user.id || input.role === "admin") {
      sendJson(res, 403, { error: "permission_escalation_denied" });
      return;
    }
    const grantable = new Set(auth.user.permissionFeatures || []);
    input.permissions = input.permissions.filter(permission => grantable.has(permission));
    input.canViewSensitive = auth.user.canViewSensitive && input.canViewSensitive;
  }
  if (!input.email || !input.name) {
    sendJson(res, 400, { error: "missing_user_fields" });
    return;
  }
  const duplicate = db.prepare("select id from users where email = ? and id <> ?").get(input.email, userId || "");
  if (duplicate) {
    sendJson(res, 409, { error: "email_already_registered" });
    return;
  }

  const timestamp = nowIso();
  if (existing?.role === "admin" && (input.role !== "admin" || !input.active)) {
    const activeAdmins = db.prepare("select count(*) as total from users where clinic_id = ? and role = 'admin' and active = 1")
      .get(auth.user.clinicId)?.total || 0;
    if (activeAdmins <= 1) {
      sendJson(res, 400, { error: "last_admin_protected" });
      return;
    }
  }
  if (existing) {
    const password = String(req.body?.password || "");
    if (password && !validatePassword(password)) {
      sendJson(res, 400, { error: "weak_password" });
      return;
    }
    db.prepare(`
      update users set
        email = ?, name = ?, mobile = ?, tel_no = ?, role = ?, permissions_json = ?, staff_id = ?,
        own_entries_only = ?, can_view_sensitive = ?, calendar_scope = ?,
        calendar_days_back = ?, calendar_days_ahead = ?, working_days_json = ?,
        active = ?, password_hash = ?, must_change_password = ?, updated_at = ?
      where id = ? and clinic_id = ?
    `).run(
      input.email,
      input.name,
      input.mobile,
      input.telNo,
      input.role,
      JSON.stringify(input.permissions),
      input.staffId || null,
      Number(input.ownEntriesOnly),
      Number(input.canViewSensitive),
      input.calendarScope,
      input.calendarDaysBack,
      input.calendarDaysAhead,
      JSON.stringify(input.workingDays),
      Number(input.active),
      password ? hashPassword(password) : existing.password_hash,
      password ? 0 : existing.must_change_password,
      timestamp,
      existing.id,
      auth.user.clinicId
    );
  } else {
    const maxUsers = Number(auth.clinic?.limits?.maxUsers || 0);
    const activeUsers = db.prepare("select count(*) as total from users where clinic_id = ? and active = 1")
      .get(auth.user.clinicId)?.total || 0;
    if (maxUsers && activeUsers >= maxUsers) {
      sendJson(res, 402, { error: "clinic_user_limit_reached", limit: maxUsers });
      return;
    }
    const password = String(req.body?.password || "");
    if (!password) {
      sendJson(res, 400, { error: "missing_password" });
      return;
    }
    if (!validatePassword(password)) {
      sendJson(res, 400, { error: "weak_password" });
      return;
    }
    userId = randomUUID();
    db.prepare(`
      insert into users (
        id, clinic_id, email, password_hash, name, mobile, tel_no, role, permissions_json, staff_id,
        own_entries_only, can_view_sensitive, calendar_scope, calendar_days_back,
        calendar_days_ahead, working_days_json, active, must_change_password, created_at, updated_at
      ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
    `).run(
      userId,
      auth.user.clinicId,
      input.email,
      hashPassword(password),
      input.name,
      input.mobile,
      input.telNo,
      input.role,
      JSON.stringify(input.permissions),
      input.staffId || null,
      Number(input.ownEntriesOnly),
      Number(input.canViewSensitive),
      input.calendarScope,
      input.calendarDaysBack,
      input.calendarDaysAhead,
      JSON.stringify(input.workingDays),
      Number(input.active),
      timestamp,
      timestamp
    );
  }

  audit({
    clinicId: auth.user.clinicId,
    userId: auth.user.id,
    action: existing ? "update" : "create",
    entity: "user",
    entityId: userId,
    metadata: { role: input.role, calendarScope: input.calendarScope },
    ipAddress: clientIp(req)
  });
  const saved = db.prepare("select * from users where id = ?").get(userId);
  sendJson(res, existing ? 200 : 201, { ok: true, user: userPayload(saved) });
}

function deleteUser(req, res, userId) {
  const auth = requireSession(req, res, { csrf: true });
  if (!auth) return;
  if (!canManageUsers(auth.user) || userId === auth.user.id) {
    sendJson(res, 403, { error: "permission_denied" });
    return;
  }
  const target = db.prepare("select * from users where id = ? and clinic_id = ?").get(userId, auth.user.clinicId);
  if (!target || target.role === "admin") {
    sendJson(res, 400, { error: "protected_user" });
    return;
  }
  db.prepare("delete from users where id = ? and clinic_id = ?").run(userId, auth.user.clinicId);
  audit({
    clinicId: auth.user.clinicId,
    userId: auth.user.id,
    action: "delete",
    entity: "user",
    entityId: userId,
    ipAddress: clientIp(req)
  });
  sendJson(res, 200, { ok: true });
}

function integrationPayload(row) {
  if (!row) return null;
  return {
    provider: row.provider,
    config: parseJson(row.config_json, {}),
    configured: Boolean(row.secret_cipher),
    updatedAt: row.updated_at
  };
}

function listIntegrations(req, res) {
  const auth = requireSession(req, res);
  if (!auth) return;
  const rows = db.prepare("select * from clinic_integrations where clinic_id = ?").all(auth.user.clinicId);
  const visible = rows.filter(row => auth.user.role === "admin" || can(auth.user, INTEGRATION_PERMISSIONS[row.provider]));
  sendJson(res, 200, { ok: true, integrations: visible.map(integrationPayload) });
}

function saveIntegration(req, res) {
  const auth = requireSession(req, res, { csrf: true });
  if (!auth) return;
  const provider = safeText(req.body?.provider, 30);
  const permission = INTEGRATION_PERMISSIONS[provider];
  if (!permission || (auth.user.role !== "admin" && !can(auth.user, permission))) {
    sendJson(res, 403, { error: "permission_denied" });
    return;
  }
  const existing = db.prepare("select * from clinic_integrations where clinic_id = ? and provider = ?")
    .get(auth.user.clinicId, provider);
  const inputConfig = req.body?.config && typeof req.body.config === "object" ? req.body.config : {};
  let config;
  if (provider === "whatsapp") {
    config = {
      businessPhone: safeText(inputConfig.businessPhone, 40),
      phoneNumberId: safeText(inputConfig.phoneNumberId, 100),
      templateName: safeText(inputConfig.templateName || "clinic_daily_role_report", 120),
      graphApiVersion: safeText(inputConfig.graphApiVersion || "v23.0", 20)
    };
  } else if (provider === "sms") {
    config = {
      provider: safeText(inputConfig.provider || "custom", 40),
      senderId: safeText(inputConfig.senderId || "RIAAYA", 30),
      endpoint: safeText(inputConfig.endpoint, 500)
    };
  } else {
    config = {
      taxNumber: safeText(inputConfig.taxNumber, 80),
      clientId: safeText(inputConfig.clientId, 200),
      incomeSourceSequence: safeText(inputConfig.incomeSourceSequence, 100),
      submissionEnabled: inputConfig.submissionEnabled === true
    };
  }
  const secret = String(req.body?.secret || "");
  const secretCipher = secret ? encryptSecret(secret) : existing?.secret_cipher || "";
  const timestamp = nowIso();
  db.prepare(`
    insert into clinic_integrations (clinic_id, provider, config_json, secret_cipher, updated_at)
    values (?, ?, ?, ?, ?)
    on conflict(clinic_id, provider) do update set
      config_json = excluded.config_json,
      secret_cipher = excluded.secret_cipher,
      updated_at = excluded.updated_at
  `).run(auth.user.clinicId, provider, JSON.stringify(config), secretCipher || null, timestamp);
  if (provider === "jofotara") {
    db.prepare("update clinics set tax_number = ?, income_source_sequence = ?, updated_at = ? where id = ?")
      .run(config.taxNumber || null, config.incomeSourceSequence || null, timestamp, auth.user.clinicId);
  }
  audit({
    clinicId: auth.user.clinicId,
    userId: auth.user.id,
    action: "update",
    entity: "integration",
    entityId: provider,
    metadata: { configured: Boolean(secretCipher) },
    ipAddress: clientIp(req)
  });
  const saved = db.prepare("select * from clinic_integrations where clinic_id = ? and provider = ?")
    .get(auth.user.clinicId, provider);
  sendJson(res, 200, { ok: true, integration: integrationPayload(saved) });
}

function getClinicNotifications(req, res) {
  const auth = requireSession(req, res);
  if (!auth) return;
  const rows = listClinicNotifications(auth.user.clinicId);
  sendJson(res, 200, {
    ok: true,
    notifications: rows.map(n => ({
      id: n.id,
      title: n.title,
      body: n.body,
      severity: n.severity,
      view: n.view_target,
      createdAt: n.created_at
    }))
  });
}

export default async function clinicHandler(req, res, url) {
  if (url.pathname === "/api/clinic-state" && req.method === "GET") return getState(req, res);
  if (url.pathname === "/api/clinic-state" && req.method === "PUT") return saveState(req, res);
  if (url.pathname === "/api/clinic-storage-status" && req.method === "GET") return getStorageStatus(req, res);
  if (url.pathname === "/api/clinic-export" && req.method === "GET") return exportClinic(req, res);
  if (url.pathname === "/api/clinic-users" && req.method === "GET") return listUsers(req, res);
  if (url.pathname === "/api/clinic-users" && req.method === "POST") return saveUser(req, res);
  if (url.pathname === "/api/clinic-integrations" && req.method === "GET") return listIntegrations(req, res);
  if (url.pathname === "/api/clinic-integrations" && req.method === "PUT") return saveIntegration(req, res);
  if (url.pathname === "/api/clinic/notifications" && req.method === "GET") return getClinicNotifications(req, res);
  const match = url.pathname.match(/^\/api\/clinic-users\/([^/]+)$/);
  if (match && req.method === "PUT") return saveUser(req, res, match[1]);
  if (match && req.method === "DELETE") return deleteUser(req, res, match[1]);
  sendJson(res, 404, { error: "clinic_route_not_found" });
}
