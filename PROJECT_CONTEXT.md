# Riaaya Project Context

Updated: June 6, 2026

## Product

Riaaya is a multi-tenant clinic-management SaaS for Arabic-first clinics, with a Jordan-focused operating model. The product combines scheduling, patient and visitor files, multi-operation visits, permissions, clinic reporting, payments, receipts, communications, expenses, inventory, staff payouts, smart import, and operational dashboards.

The public trial remains available at `app.html?trial=1`. Trial data stays in that browser. Registered clinics use server sessions and isolated SQLite-backed clinic state.

## Architecture

### Frontend

- `index.html`: public product page and direct 14-day clinic registration.
- `auth.html`, `auth.css`, `auth.js`: login and registration.
- `app.html`, `app.css`, `app.js`: clinic workspace and public trial.
- `owner.html`, `owner.css`, `owner.js`: platform-owner control panel.
- Vanilla JavaScript rendering and event handling.

### Server

- `server.mjs`: HTTP server, security headers, API routing, and static assets.
- `lib/database.js`: SQLite schema, migrations, public serializers, audit logging, and owner bootstrap.
- `lib/security.js`: password hashing, sessions, rate limiting, encryption, cookies, and input cleaning.
- `api/auth.js`: registration, login, logout, sessions, trial expiry.
- `api/clinic.js`: tenant state, users, permissions, calendar scopes, integrations, and audit events.
- `api/owner.js`: clinic status/plan/trial administration, platform metrics, audit activity, and emergency password reset.
- `api/communications.js`: authenticated WhatsApp, SMS, and JoFotara provider relay.

### Persistence

SQLite tables:

- `clinics`
- `users`
- `sessions`
- `audit_logs`
- `clinic_integrations`

Clinic operational records are currently stored as versioned JSON in `clinics.state_json`. This preserves the existing frontend data model while adding real tenant isolation and server permission enforcement. `state_version` prevents silent concurrent overwrites.

The initial production shape is a single Node instance with one persistent SQLite disk. PostgreSQL is the recommended next database step for horizontal scaling.

## Completed Features

### Accounts and Tenancy

- Direct public clinic registration.
- Fourteen-day account trial.
- Public no-login demo.
- Separate account and data space for every clinic.
- Platform-owner dashboard.
- Clinic activation, suspension, cancellation, plan, and trial-date controls.
- Per-clinic owner customization for enabled modules, commercial limits, support tier, internal notes, and workspace branding.
- Emergency clinic-admin password reset with one-time temporary password.
- HttpOnly sessions, CSRF, login throttling, and audit logs.

### Permissions

- Large feature catalog modeled after the supplied Clinicame functions.
- Server-enforced patient, medical, financial, reports, inventory, communication, administration, and calendar permissions.
- Mobile-number visibility control.
- Sensitive financial visibility control.
- Own-record and staff-assigned scope.
- Calendar scopes:
  - all dates
  - today only
  - rolling days before/after today
  - selected working days
  - assigned appointments only
- Staff working-day checkboxes and date-window controls.
- Non-admin permission managers cannot promote themselves or create an admin.
- Last active clinic admin cannot be removed or disabled.

### Dashboard

- Today's booking, arrival, operation, attention, and revenue KPIs.
- Next visitor with patient link, phone, call, WhatsApp, service, team, and arrival action.
- Fourteen-day operations/revenue trend.
- Hourly booking-capacity heatmap.
- Booking-status funnel.
- Live day schedule.
- Smart operational alerts.
- Payment mix, closing status, staff obligations, and daily insights.

### Calendar and Booking

- Month calendar.
- Selected-day 15-minute operational schedule.
- Booking creation and statuses.
- Booking-to-operation conversion.
- Patient links and contact details.
- Permission-aware visible dates and disabled restricted dates.
- Server-side enforcement of date windows and assigned staff.

### Patients, Visitors, and Operations

- Patient and visitor directory.
- Smart filters and pagination.
- Patient file with demographics, notes, bookings, operations, and receipts.
- Multiple operations/services in one visit entry.
- Cost excluded from the normal operation-entry UI.
- Service, team, status, payment, and date filters.
- Configurable page size for long operation/report lists.

### Reports

- Universal clinic search.
- Patient, booking, operation, expense, payment, staff, inventory, and reconciliation reports.
- Date, source, status, payment, text, and page-size filters.
- Pagination, print, CSV export, and data visualizations.

### Expenses

- Dedicated expenses workspace.
- Expense groups and subgroups similar to Clinicame's expenses flow, kept in Riaaya's cleaner UI.
- Add, edit, delete, filter, paginate, and CSV-export expense rows.
- Search by group, subgroup, vendor, reference, note, payment method, branch, and date.
- Dashboard expense and daily net KPIs.
- Monthly expense KPIs and category/payment visualizations.
- Expense permissions enforced in the browser and in `/api/clinic.js`.

### Data Import

- CSV/JSON import workspace for patient files, bookings, operations, and expenses.
- File parsing happens locally in the browser before saving.
- Automatic column matching for Arabic/English headers.
- Required-field validation, date parsing, bad-email warnings, duplicate detection, preview table, and import history.
- Valid records can be committed into existing patient, booking, operation, service, and expense collections.
- Recommended migration path for real clinics:
  - Ask each clinic to export Excel/CSV from its old system.
  - Run one reviewed import per entity: patients first, then bookings/operations/expenses.
  - Save the mapping that worked for that clinic/system.
  - Build dedicated adapters only for high-volume systems after seeing their actual export formats.

### Receipts and JoFotara

- Optional receipt creation from an operation visit.
- Multiple visit lines on one receipt.
- Buyer type, buyer tax/national number, sales-tax rate, reference, and payment method.
- Receipt access from operation rows, patient files, and the billing center.
- Printable branded receipt modal.
- UBL 2.1 XML foundation with supplier, buyer, payment, tax total, and line details.
- Per-clinic encrypted JoFotara Client ID/Secret Key.
- Explicit live-submission switch.
- Preview mode until credentials and live submission are enabled.

### Communications

- Per-role daily report templates.
- WhatsApp report queue and authenticated provider relay.
- Consent-aware SMS campaign recipient selection.
- Jordan/custom SMS provider configuration.
- Per-clinic encrypted provider secrets.

### Backups

- Source snapshot before launch work:
  - `backups/pre-launch-security-20260606-165047`
  - `backups/pre-launch-security-20260606-165047.tar.gz`
- Source snapshot before expense/import work:
  - `backups/pre-expenses-import-20260606-173641`
  - `backups/pre-expenses-import-20260606-173641.tar.gz`
- Production database backup command: `npm run backup`.
- SQLite-consistent backup via `VACUUM INTO`.
- Configurable retention.

## Most Recent Work

There is no `.git` directory in the supplied repository, so Git history and recent commits cannot be inspected. The latest work is inferred from file timestamps, backup names, and current source:

1. Clinicame-style granular permissions.
2. Practical booking calendar and selected-day schedule.
3. Smart patient files, reports, pagination, and multi-operation visits.
4. Dashboard command center, next visitor, notifications, WhatsApp/SMS, and JoFotara foundation.
5. Current launch pass: real registration, multi-tenancy, owner control, SQLite sessions, server permission enforcement, encrypted per-clinic integrations, conflict-safe saves, receipts inside patient/operation workflows, and backup tooling.
6. Current product pass: practical expenses workspace and local smart import review flow for migrating clinic data from older systems.

## Setup

```bash
npm run check
npm run dev
```

Production requires:

```bash
NODE_ENV=production
RIAAYA_DB_PATH=/persistent/path/riaaya.sqlite
RIAAYA_OWNER_EMAIL=owner@example.com
RIAAYA_OWNER_PASSWORD=strong-owner-password
RIAAYA_ENCRYPTION_KEY=long-random-encryption-key
```

See `README.md` for deployment, provider, backup, and JoFotara instructions.

## Remaining Work Before Public Paid Launch

### Required

- Independent penetration/security review.
- Automated off-site backup scheduling and restore drills.
- Error monitoring and uptime alerts.
- Email ownership verification.
- Customer-facing forgotten-password recovery.
- Billing/subscription payment integration.
- Terms of service, privacy notice, data-processing terms, retention policy, and breach-response process reviewed for Jordan.
- JoFotara validation with the official clinic account and the clinic's accountant/tax specialist.
- Test cancellation, refund, and credit-note flows against the approved JoFotara format.

### Scale and Reliability

- Move clinic operational JSON into normalized database tables.
- Migrate SQLite to PostgreSQL before multi-instance scaling.
- Add background jobs for scheduled WhatsApp reports and SMS campaigns.
- Add delivery webhooks and retry/dead-letter handling.
- Add attachment/document storage for patient files.
- Save reusable import mappings per clinic and add system-specific import adapters after collecting real export samples.
- Add automated end-to-end tests and browser CI.

### Product

- Email/WhatsApp invitation flow for newly created staff accounts.
- Mandatory password-change screen after an owner reset.
- Multi-branch resource rooms and equipment constraints.
- Waitlist and automatic cancellation-slot filling.
- Online booking links and reminders.
- Insurance workflows and claim documents.
- Formal accounting exports and refund/credit-note UI.

## Known Constraints

- The public demo intentionally uses local browser storage and seeded sample data.
- Registered clinics use a real server database, but operational data remains one versioned JSON document per clinic.
- The Node SQLite API is marked experimental by Node 24.
- Static-only hosting does not run authentication or APIs.
- JoFotara live submission must not be enabled based only on UI readiness; official account testing and tax validation are still required.
- External WhatsApp and SMS sending requires approved provider accounts, templates, sender IDs, and credentials.
