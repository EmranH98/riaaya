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
