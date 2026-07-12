const MIGRATIONS = [
  {
    version: 1,
    name: "account-security-and-clinic-controls",
    up(db) {
      ensureColumn(db, "users", "mobile", "text");
      ensureColumn(db, "users", "tel_no", "text");
      ensureColumn(db, "users", "allowed_column_ids_json", "text not null default '[]'");
      ensureColumn(db, "users", "totp_enabled", "integer not null default 0");
      ensureColumn(db, "users", "totp_secret_cipher", "text");
      ensureColumn(db, "users", "totp_pending_cipher", "text");
      ensureColumn(db, "users", "totp_backup_codes_json", "text not null default '[]'");
      ensureColumn(db, "users", "totp_last_counter", "integer not null default 0");
      ensureColumn(db, "sessions", "impersonated_by_user_id", "text");
      ensureColumn(db, "clinics", "state_version", "integer not null default 0");
      ensureColumn(db, "clinics", "enabled_modules_json", "text not null default '[]'");
      ensureColumn(db, "clinics", "limits_json", "text not null default '{}'");
      ensureColumn(db, "clinics", "branding_json", "text not null default '{}'");
      ensureColumn(db, "clinics", "support_tier", "text not null default 'standard'");
      ensureColumn(db, "clinics", "owner_notes", "text not null default ''");
      ensureColumn(db, "clinics", "account_deadline", "text");
      ensureColumn(db, "clinics", "require_2fa", "integer not null default 0");
    }
  },
  {
    version: 2,
    name: "encrypted-relational-clinic-records",
    up(db) {
      ensureColumn(db, "clinics", "record_storage_version", "integer not null default 0");
      ensureColumn(db, "clinics", "record_storage_synced_version", "integer not null default 0");
      db.exec(`
        create table if not exists clinic_patients (
          clinic_id text not null references clinics(id) on delete cascade,
          id text not null,
          sequence integer not null default 0,
          payload_cipher text not null,
          payload_hash text not null,
          created_at text not null,
          updated_at text not null,
          primary key (clinic_id, id)
        );

        create table if not exists clinic_bookings (
          clinic_id text not null references clinics(id) on delete cascade,
          id text not null,
          sequence integer not null default 0,
          patient_id text,
          booking_date text,
          booking_time text,
          status text,
          schedule_column_id text,
          payload_cipher text not null,
          payload_hash text not null,
          created_at text not null,
          updated_at text not null,
          primary key (clinic_id, id)
        );

        create table if not exists clinic_operations (
          clinic_id text not null references clinics(id) on delete cascade,
          id text not null,
          sequence integer not null default 0,
          patient_id text,
          operation_date text,
          service_id text,
          booking_id text,
          visit_id text,
          kind text,
          status text,
          payload_cipher text not null,
          payload_hash text not null,
          created_at text not null,
          updated_at text not null,
          primary key (clinic_id, id)
        );

        create table if not exists clinic_operation_payments (
          clinic_id text not null,
          id text not null,
          operation_id text not null,
          payment_kind text not null,
          paid_on text,
          sequence integer not null default 0,
          payload_cipher text not null,
          payload_hash text not null,
          created_at text not null,
          updated_at text not null,
          primary key (clinic_id, id),
          foreign key (clinic_id, operation_id)
            references clinic_operations(clinic_id, id) on delete cascade
        );

        create table if not exists clinic_record_manifests (
          clinic_id text primary key references clinics(id) on delete cascade,
          state_version integer not null,
          patient_count integer not null default 0,
          booking_count integer not null default 0,
          operation_count integer not null default 0,
          payment_count integer not null default 0,
          updated_at text not null
        );

        create index if not exists clinic_bookings_date_idx
          on clinic_bookings(clinic_id, booking_date, booking_time, schedule_column_id);
        create index if not exists clinic_bookings_patient_idx
          on clinic_bookings(clinic_id, patient_id);
        create index if not exists clinic_operations_date_idx
          on clinic_operations(clinic_id, operation_date, service_id);
        create index if not exists clinic_operations_patient_idx
          on clinic_operations(clinic_id, patient_id);
        create index if not exists clinic_operation_payments_operation_idx
          on clinic_operation_payments(clinic_id, operation_id, sequence);
      `);
    }
  }
];

function tableColumns(db, table) {
  return new Set(db.prepare(`pragma table_info(${table})`).all().map(column => column.name));
}

function ensureColumn(db, table, column, definition) {
  if (tableColumns(db, table).has(column)) return;
  db.exec(`alter table ${table} add column ${column} ${definition}`);
}

export function runSchemaMigrations(db) {
  db.exec(`
    create table if not exists schema_migrations (
      version integer primary key,
      name text not null,
      applied_at text not null
    )
  `);
  const applied = new Set(
    db.prepare("select version from schema_migrations").all().map(row => Number(row.version))
  );

  for (const migration of MIGRATIONS) {
    if (applied.has(migration.version)) continue;
    db.exec("begin immediate");
    try {
      migration.up(db);
      db.prepare("insert into schema_migrations (version, name, applied_at) values (?, ?, ?)")
        .run(migration.version, migration.name, new Date().toISOString());
      db.exec("commit");
    } catch (error) {
      try { db.exec("rollback"); } catch { /* preserve the migration error */ }
      throw new Error(`schema_migration_${migration.version}_failed: ${error.message}`);
    }
  }
}

export function latestSchemaVersion() {
  return MIGRATIONS.at(-1)?.version || 0;
}
