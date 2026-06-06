# PROJECT_CONTEXT

Last reviewed: 2026-06-06

## Scope Reviewed

I reviewed the repository snapshot at `/Users/emranhailat/Downloads/riaaya-main/riaaya-we`, including:

- `README.md`
- `package.json`
- `server.mjs`
- `api/config.js`
- `api/leads.js`
- `index.html`
- `app.html`
- `app.js`
- `app.css`
- `scripts/build-static.mjs`
- `vercel.json`
- `supabase/README.md`
- `supabase/schema.sql`
- `supabase/seed-demo.sql`
- generated `dist/`
- image/logo assets
- dated backup snapshots such as `app-before-inventory-20260604.*`, `app-before-permissions-20260604.*`, `app-before-bilingual-slips-20260604.*`, and `app-before-function-merge-20260604.*`

No `.git` directory exists in the provided folder or its parent snapshot, so actual Git commits, branches, and commit messages are not available in this copy. The "latest work" notes below are inferred from the dated backup filenames, file sizes, and diffs against the current files.

## What Riaaya Currently Does

Riaaya is a clinic-management SaaS prototype for Arabic-first clinics, currently built as a static/vanilla web app with a small Node server and a Supabase-ready backend schema.

The product currently has two primary surfaces:

- Landing website at `/` / `index.html`
- Demo dashboard at `/app.html` and `/dashboard`

The landing site includes:

- Arabic marketing page with English toggle.
- Product positioning for clinic operations, revenue review, payouts, inventory, reports, and trial signup.
- Pricing cards and plan selection.
- Lead capture form.
- Lead submission to `/api/leads`, with localStorage fallback.

The dashboard includes:

- Demo account switcher: admin, data entry, doctor.
- View/permission gating based on a 52-feature permission catalog grouped into patients, medical, calendar, financial, reports, inventory, communication, and administration.
- Clinic settings: clinic name, active work date, branch.
- Daily operations entry with service-derived cost kept out of the front-desk form.
- Searchable and filterable operations workspace with pagination and selectable page size.
- Patient and visitor directory with detailed files, demographics, notes, appointment history, and operation history.
- Services catalog and default pricing/costs.
- Staff setup with doctor/specialist roles and percentage rates.
- Payout rules by role/person/service with multiple calculation models.
- Booking creation, month calendar view, full-width selected-day resource schedule grid, and selected-day booking list.
- Booking status progression: scheduled, confirmed, arrived, completed, no-show, cancelled.
- Convert booking into an operation.
- Inventory suppliers, items, low-stock alerts, purchase orders, receive flow, and CSV export.
- Daily reconciliation for cash, card, and transfers.
- Salary/payout summaries.
- Individual printable salary slips.
- Universal report search across operations, bookings, patient files, inventory, services, suppliers, and staff.
- Report filters for source, status, payment method, and date range.
- Report pagination with 10/25/50/100 rows per page.
- Report KPI summaries and bar visualizations.
- Full-page reports: reconciliation, by patient, per procedure, bookings, patient directory, costs, and specialist assignments.
- Print flows and table focus/fullscreen overlays.
- CSV exports for entries, salaries, and inventory orders.
- Local saved lead display from the landing page.
- Arabic/English UI translation by literal text mapping.

The dashboard still stores operational data in browser localStorage under:

- `riaayaMvpState`
- `riaayaLeads`
- `riaayaLanguage`

## Architecture

### Frontend

This is not currently a React/Vue/Next app. It is a vanilla static app:

- `index.html`: landing page, CSS, markup, and landing-specific JS in one file.
- `app.html`: dashboard markup.
- `app.css`: dashboard styling.
- `app.js`: dashboard state, calculations, rendering, permissions, event handlers, exports, reports, print behavior, and demo seed data.

### Local Server

`server.mjs` serves static files and routes:

- `/` -> `index.html`
- `/dashboard` -> `app.html`
- `/api/leads` -> `api/leads.js`
- `/api/config` -> `api/config.js`

### APIs

`api/leads.js`:

- Accepts `POST`.
- Requires `name`, `clinic`, `phone`, `city`, and `plan`.
- If `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` exist, inserts into Supabase REST table `leads`.
- If not configured, returns preview mode with the submitted lead.

`api/config.js`:

- Accepts `GET`.
- Returns whether Supabase frontend config exists.
- Exposes `SUPABASE_URL` and `SUPABASE_ANON_KEY`, which is expected for browser-side Supabase clients.

### Build

`scripts/build-static.mjs` regenerates `dist/`:

- copies `index.html`
- rewrites `app.html` asset paths
- copies `app.css` as `dist/assets/riaaya-app.css`
- copies `app.js` as `dist/assets/riaaya-app.js`
- copies `assets/`

`vercel.json` is configured for a static Vercel deployment with `/dashboard` rewrite and CSP/security headers.

### Database

`supabase/schema.sql` defines a production-oriented Supabase schema:

- `clinics`
- `clinic_members`
- `staff`
- `services`
- `payout_rules`
- `bookings`
- `operations`
- `operation_payouts`
- `suppliers`
- `inventory_items`
- `purchase_orders`
- `reconciliations`
- `salary_slips`
- `salary_slip_items`
- `audit_logs`
- `leads`

The schema includes:

- enums for roles, payment methods, statuses, purchase orders, and salary status
- generated financial columns for operations and purchase orders
- indexes
- updated-at triggers
- audit triggers on operations, bookings, inventory, purchase orders, salary slips
- RLS enabled on all app tables
- helper functions for clinic membership, role, staff scope, sensitive access, and operation management
- policies for most clinic data tables

`supabase/seed-demo.sql` seeds one demo clinic, staff, members, services, payout rules, suppliers, inventory, bookings, operations, and a reconciliation record.

## Completed Work

Completed or functionally present in the current snapshot:

- Arabic landing page and demo dashboard.
- English language toggle on landing and app.
- Demo lead capture with Supabase insert support and local fallback.
- Demo localStorage state and seed data.
- Dashboard navigation and account/permission simulation.
- A categorized 52-feature permission catalog including every permission visible in the supplied Clinicame screenshots, plus practical patient, appointment, report, staff, service, supplier, and user-management actions.
- Permission assignment to multiple users, module filtering, permission search, assignment summary cards, edit prefill, and delete-by-feature.
- Operations, staff, services, payout rules, reconciliation, payroll, salary slip, reports.
- Full-width operation entry and operation log instead of a cramped side-by-side entry window.
- Operation entry hides internal service cost while still using the configured service cost in calculations.
- Operation filters by patient/text, service, team member, status, and payment method.
- Operation pagination with selectable page size.
- Inventory and supplier workflow.
- Booking workflow as a month calendar plus a practical 15-minute selected-day schedule grid with doctor/specialist/waiting columns and a daily list.
- The selected-day schedule now receives the full workspace width and keeps the existing Riaaya visual language.
- Practical Manage Users screen with add/edit form, active/name/mobile/tel/role filters, and a dense user table.
- Patient and visitor records with smart search, type/gender/category/city filters, sorting, pagination, create/edit/delete, and automatically linked booking/operation records.
- Patient file detail with overview KPIs, contact/demographic data, notes, complete operation history, and appointment history.
- Automatic visitor file creation when a new name is used in booking or operation entry.
- Universal report search across seven data sources, plus source/status/payment/date filters.
- Paginated reports with 10/25/50/100 row controls, result summaries, operational KPIs, and visual service/status breakdowns.
- Booking-to-operation conversion.
- CSV export and print flows.
- Supabase schema and seed data foundation.
- Vercel static build setup.

Verification performed:

- `npm run check` passed.
- `node --check app.js` passed.
- `npm run build` passed.
- Local browser smoke test at `http://localhost:4174` and `/app.html` loaded with no console errors.
- Booking view loaded with no console errors.

## Important Unfinished Work

### 1. Live Supabase Integration

The README is accurate: the database schema exists, but the dashboard still runs from browser localStorage. The next production step is to connect:

- Supabase Auth
- real clinic membership
- CRUD reads/writes for all dashboard tables
- RLS-aware frontend queries
- backend-only service role paths where needed

### 2. Real Authentication

The current account switcher is a demo permission simulator. It does not log in users or enforce server-side permissions.

Production needs:

- Supabase Auth session handling
- login/logout screen
- invite/create member flow
- mapping `auth.users` to `clinic_members`
- role-specific route/view access based on real database records

### 3. Booking Calendar Needs Deeper Scheduling Features

Current bookings now have a calendar-style month view. Selecting a day updates the active work date, booking form date, KPIs, a selected-day resource schedule grid, and the selected-day list.

The current day schedule is now a practical, full-width resource calendar. Recommended next calendar functionality:

- Week view and richer day controls.
- Date picker and next/previous controls.
- More explicit color-coded booking status legend and accessibility treatment.
- Quick create/edit appointment modal or side panel.
- Conflict detection for same provider/time.
- Drag or explicit reschedule flow.
- Convert arrived/completed appointment into an operation.
- Filters by doctor, specialist, service, status, and branch.
- Calendar permission rules against real authenticated accounts: admins see all, reception/data-entry can manage schedule, doctors/specialists can see their own schedule.

### 4. Clinicame Functional Reference

Public pages at `https://clinicame.net` expose high-level functions only. Authenticated pages require login and CAPTCHA, so internal workflow screens were not reviewed yet.

Publicly visible Clinicame functions to consider copying functionally, not visually:

- patient medical files
- appointment management
- internal clinic communication
- patient relationship management
- SMS reminders on booking/cancel/reminder events
- treatment/program planning per case
- medical record entries for exams, lab tests, radiology, operations, diagnosis, and doctor orders
- prescription support
- lab/radiology request support
- patient search and inquiry tools
- daily/monthly/yearly reports and statistics
- document scanning/attachments into patient files
- financial entry and clinic reports
- patient case transfer/referral between specialists
- specialty-specific customization
- printing prescriptions, referrals, reports, and sick-leave forms on clinic letterhead
- bilingual Arabic/English system

The supplied authenticated screenshots were reviewed. A complete parity audit is still pending because only the photographed screens and visible dropdown entries were available; any permission lower in the Clinicame list or on another screen cannot be verified without navigating the authenticated site.

User-provided Clinicame internal screenshots reviewed on 2026-06-05 showed:

- Manage Users: add user, active/name/mobile/tel filters, user table, edit/delete actions.
- Permissions: multi-user selection, feature permission dropdown, saved permission table, edit/delete actions.
- Calendar: time-grid schedule with clinic resources/columns and appointment blocks.
- Patients: add patient, sorting, detailed filters, patient result table, edit/delete actions.

### 5. Patient Files Need Clinical Depth

The dashboard now has practical patient and visitor files with contact details, demographics, notes, appointments, and operations. It is an operational directory, not yet a full electronic medical record.

Production patient files still need:

- attachments and scanned documents
- diagnoses, examinations, prescriptions, lab/radiology orders, and clinical notes
- treatment plans and package/session tracking
- allergies, consent, privacy, and document access controls
- payment ledger and insurance details
- reminders, follow-ups, SMS/WhatsApp history
- referrals and case transfer between clinicians
- immutable audit history for edits and deletions

### 6. Reports Are Still Demo-Local

Reports now have universal search, filters, pagination, page-size control, and visual summaries, but they are computed from localStorage. Production reports need:

- database-backed date ranges
- role-based data access
- pagination/export safety
- financial auditability
- persisted salary slip status
- persisted reconciliation status
- server-side universal search or indexed search for large datasets
- cursor/server pagination instead of loading the complete clinic dataset in the browser

### 7. Generated `dist/`

`dist/` is generated by `npm run build`. Decide whether it should stay committed or be ignored, depending on deployment workflow.

## Potential Issues / Risks

### Git History Missing

The user asked to review recent Git commits, but this downloaded folder has no `.git` directory. Actual recent commits cannot be reviewed until a real Git checkout is provided.

### RLS Policies Missing for Leads

`leads` has RLS enabled, but `schema.sql` does not define lead policies. The service-role API can insert because it bypasses RLS, but normal authenticated/anon clients will not be able to select or insert leads directly. If admins should view leads from the dashboard via Supabase client, add appropriate policies or create a backend endpoint.

### Audit Log Insert Policy Is Too Broad

`audit_logs_insert_system` currently allows insert when `public.can_manage_clinic(clinic_id) or auth.uid() is not null`. That means any authenticated user could potentially insert audit rows for arbitrary clinic IDs. This should be tightened before production.

### CSP Will Block Direct Supabase Browser Calls

`vercel.json` has `connect-src 'self'`. Once the frontend starts calling Supabase directly, add the Supabase project URL to `connect-src`.

### Demo Seed Records Can Reappear

Some saved collections merge seed records with saved localStorage records on load. For services, rules, suppliers, inventory, purchase orders, bookings, and accounts, deleted seed records may reappear after reload because `mergeById(seed, saved)` starts from seed data. This is acceptable for a demo reset pattern only if intentional; for production-like local behavior it is confusing.

### User Input Is Rendered Without Escaping

Many user-entered fields are interpolated directly into HTML strings. This can become an XSS risk once data is shared across users or stored in Supabase. Add escaping/sanitization before production.

### Permission Model Is Frontend-Only

The local app now derives visible views and actions from granular feature permissions, but a browser user can still modify local data. Real enforcement must come from Supabase Auth/RLS and backend checks. Matching Clinicame's permission names in the UI is not a security boundary.

### Data Entry Permissions Need Final Production Alignment

The frontend demo now derives dashboard views from feature permissions, while the Supabase seed still uses role/view arrays. Align those into one production permission model once Auth/RLS is connected.

### Edit Coverage Is Incomplete

Patient files and users support editing, while several other modules still rely mainly on add/delete/status transitions. Existing operations, bookings, services, rules, suppliers, and inventory need consistent edit flows.

### No Appointment Conflict Rules

Bookings can be created for the same time/provider without warning.

## What Was Most Recently Being Worked On

Because Git history is unavailable, this is inferred.

The most recent work appears to be a major feature/function merge after the dated backup snapshots from 2026-06-04.

Evidence:

- Current `app.js` has 5,946 lines.
- `app-before-function-merge-20260604.js` has 837 lines.
- `app-before-inventory-20260604.js` has 1,357 lines.
- `app-before-permissions-20260604.js` has 1,880 lines.
- `app-before-bilingual-slips-20260604.js` has 2,313 lines.
- Current code includes bookings with a month calendar, expanded reports, focus overlays, table focus mode, more bilingual strings, Supabase schema/API, inventory, permissions, salary slips, and booking-to-entry conversion.

Likely recent focus before the 2026-06-06 implementation:

1. Merging multiple feature branches/snapshots into one current app.
2. Adding or consolidating inventory/supplier workflows.
3. Adding permissions/account simulation.
4. Adding bilingual salary/report support.
5. Adding booking workflow and reports.
6. Preparing Supabase backend schema and deployment files.
7. Preparing for next step: real backend/auth integration, practical permissions, and fuller scheduling.

Work completed on 2026-06-06 then concentrated on:

1. Matching the visible Clinicame permission functions without copying its visual design.
2. Building a more practical full-width schedule and operations workspace.
3. Adding patient and visitor files with linked appointment and operation histories.
4. Adding universal report search, filters, pagination, page-size controls, and improved visualization.
5. Removing internal operation cost from the front-desk operation-entry UI.

## Recommended Next Steps

1. Restore or initialize Git.
   - If a real repo exists elsewhere, work from that checkout.
   - If not, initialize Git now before code changes so future work is traceable.

2. Decide whether `dist/` should be committed.
   - If Vercel builds from source, ignore `dist/`.
   - If static deploys use checked-in output, keep it and rebuild intentionally.

3. Connect Supabase Auth first.
   - Add login/logout.
   - Load current clinic/member from authenticated user.
   - Replace demo account switcher with real session identity.

4. Build a small Supabase data layer.
   - Start with services, staff, bookings, operations.
   - Add mapping between frontend camelCase and database snake_case.
   - Keep local demo fallback only if explicitly needed.

5. Expand the booking calendar into full scheduling.
   - Keep current booking statuses and booking-to-operation conversion.
   - Keep the current selected-day doctor/specialist/waiting grid.
   - Add week view, provider/resource filtering, conflict detection, and explicit reschedule flow.

6. Harden security before multi-user use.
   - Escape rendered user input.
   - Tighten audit log policy.
   - Add lead policies or backend lead list endpoint.
   - Update CSP for Supabase.

7. Extend the new patient records into clinical records.
   - Add attachments, prescriptions/orders, treatment plans, insurance, payments, and follow-ups.
   - Keep the design aligned with Riaaya, not Clinicame.

8. Complete edit/update flows.
   - Existing operations, bookings, staff, services, inventory, and suppliers need consistent edit support.

9. Re-test with real user roles.
   - Admin.
   - Reception/data entry.
   - Doctor.
   - Specialist.
   - Finance/sensitive-report access.

## Setup Instructions

Run locally:

```bash
npm run dev
```

Open:

```text
http://localhost:4174
http://localhost:4174/app.html
http://localhost:4174/dashboard
```

Check syntax/server files:

```bash
npm run check
node --check app.js
```

Build static output:

```bash
npm run build
```

Supabase setup:

1. Create a Supabase project.
2. Run `supabase/schema.sql`.
3. Optionally run `supabase/seed-demo.sql`.
4. Create Auth users.
5. Link Auth users to `clinic_members`.
6. Configure environment variables:

```bash
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-public-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-server-only-service-role-key
ALLOWED_ORIGIN=https://your-domain.com
```

Never expose `SUPABASE_SERVICE_ROLE_KEY` to frontend code.
