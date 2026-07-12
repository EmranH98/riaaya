# Riaaya

Riaaya is an Arabic-first clinic operations SaaS. It includes a public demo, real clinic registration, isolated clinic accounts, staff permissions, scheduling, patient files, operations, reporting, expenses, smart data import, communications, inventory, payroll support, and Jordan-oriented electronic receipts.

## Runtime Architecture

- Vanilla HTML, CSS, and JavaScript frontend.
- Node.js HTTP server.
- Built-in Node SQLite database with WAL mode.
- HttpOnly session cookies and CSRF protection.
- Server-side tenant isolation and permission enforcement.
- Per-clinic encrypted WhatsApp, SMS, and JoFotara credentials.
- AES-256-GCM encryption for clinic settings, individual patient/booking/operation/payment rows, merge-history snapshots, and patient photos.
- Platform-owner dashboard for clinics, plans, trials, status, audit activity, and emergency admin-password reset.

No Supabase account is required. Do not deploy `dist/` by itself for production because authentication and clinic data require `server.mjs`.

## Requirements

- Node.js 24 or newer.
- A persistent disk for the SQLite database and backups.
- HTTPS in production.
- A single application instance while SQLite is used.

## Local Setup

```bash
npm run check
npm run dev
```

Open:

- Landing page: `http://localhost:4174/`
- Public trial: `http://localhost:4174/app.html?trial=1`
- Login and registration: `http://localhost:4174/login`
- Platform owner: `http://localhost:4174/owner`

The local-only default owner is `owner@riaaya.local` / `RiaayaOwner!2026`. The server never prints passwords to logs; set `RIAAYA_OWNER_EMAIL` and `RIAAYA_OWNER_PASSWORD` when testing a specific account.

## Production Environment

Copy `.env.example` and set real values on the host. Do not commit real secrets.

```bash
NODE_ENV=production
PORT=4174
RIAAYA_DB_PATH=/var/lib/riaaya/riaaya.sqlite
RIAAYA_BACKUP_DIR=/var/backups/riaaya
RIAAYA_BACKUP_RETENTION=30
RIAAYA_OWNER_EMAIL=owner@example.com
RIAAYA_OWNER_PASSWORD=replace-with-a-strong-password
RIAAYA_ENCRYPTION_KEY=replace-with-a-long-random-secret
ALLOWED_ORIGIN=https://app.example.com
```

`RIAAYA_ENCRYPTION_KEY` protects clinic integration secrets. Back it up securely. Changing or losing it prevents existing provider credentials from being decrypted.

Provider environment variables remain supported as a server-wide fallback, but production multi-tenant clinics should configure their own credentials inside Riaaya:

```bash
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_GRAPH_API_VERSION=v23.0
SMS_API_URL=
SMS_API_KEY=
SMS_SENDER_ID=RIAAYA
JOFOTARA_CLIENT_ID=
JOFOTARA_SECRET_KEY=
JOFOTARA_ENABLE_SUBMISSION=false
```

## Deployment

Use a Node host with persistent storage, such as Render persistent disk, Railway volume, Fly.io volume, or a VPS.

Do not use Vercel static hosting for the real SaaS backend. Vercel can serve the landing/demo pages, but registration, login, owner controls, clinic data, receipts, and reports require `server.mjs` plus the database.

### Render Free Preview

The default `render.yaml` deploys a free Render preview service with `RIAAYA_DEPLOYMENT_MODE=preview` and `RIAAYA_DB_PATH=/tmp/riaaya.sqlite`.

This avoids payment, but it is not production storage. Free Render services can restart, spin down, redeploy, and lose local filesystem data. Use this only to test the online backend, login, registration, owner dashboard, permissions, and demo flows. Do not enter real patient data.

The free preview intentionally uses public demo owner credentials:

```text
Email: preview-owner@riaaya.local
Password: PreviewOwner1!
```

Change to `render.production.yaml`, `RIAAYA_DEPLOYMENT_MODE=production`, persistent storage, and private Render environment variables before using Riaaya with real clinics.

### Render Production Launch

The repository includes `Dockerfile` and `render.production.yaml` for a practical first production launch with a persistent disk. Rename `render.production.yaml` to `render.yaml` when you are ready to add payment information and launch for real clinics.

1. Push the repository with the app files at the GitHub repository root.
2. In Render, create a new Blueprint or Web Service from the repo.
3. Use the Docker runtime.
4. For production, keep the persistent disk mounted at `/data`.
5. Set these secret environment variables in Render:
   - `RIAAYA_OWNER_EMAIL`
   - `RIAAYA_OWNER_PASSWORD`
   - `RIAAYA_ENCRYPTION_KEY`
   - `ALLOWED_ORIGIN`
6. Deploy and wait for `/healthz` to return `200`.
7. Open `/login` and sign in with the owner credentials you set.

Before deploying, test the production settings on a host/container where `/data` is mounted:

```bash
NODE_ENV=production \
RIAAYA_DEPLOYMENT_MODE=production \
RIAAYA_DB_PATH=/data/riaaya.sqlite \
RIAAYA_BACKUP_DIR=/data/backups \
RIAAYA_OWNER_EMAIL=owner@example.com \
RIAAYA_OWNER_PASSWORD='ReplaceWithAStrong1!' \
RIAAYA_ENCRYPTION_KEY='replace-with-a-long-random-secret-at-least-32' \
ALLOWED_ORIGIN=https://example.com \
npm run preflight:production
```

1. Set all production environment variables.
2. Mount persistent storage at the path used by `RIAAYA_DB_PATH`.
3. Run `npm run check`.
4. Start with `npm start`.
5. Put the server behind HTTPS.
6. Schedule `npm run backup` at least daily and copy backups off the application host.
7. Monitor disk space, backup success, HTTP errors, and provider failures.

SQLite is suitable for an initial single-instance launch. Migrate to PostgreSQL before horizontal scaling or sustained high write concurrency.

### Staging

`render.staging.yaml` defines a separate free staging service with synthetic data only. It intentionally uses preview mode and temporary storage, so never enter real patient data there. Point it at a `staging` branch, set private owner/encryption/origin values in Render, and promote a commit to `main` only after `npm test`, `npm run build`, `npm run visual`, and the staging smoke test pass.

```bash
SMOKE_BASE_URL=https://your-staging-service.onrender.com npm run smoke
```

Production remains the only environment allowed to use the persistent `/data` disk and real clinic accounts.

## GitHub Upload

Upload the source files, not runtime data. Do not upload:

- `data/`
- `backups/`
- `dist/`
- `.env` or any real secrets
- SQLite database files

This repository is ready to initialize as a Git repository with:

```bash
git init
git add .
git commit -m "Prepare Riaaya launch build"
```

Then create a GitHub repository and push the branch. The `.gitignore` already excludes local database, backups, build output, and secrets.

## Backup

```bash
RIAAYA_DB_PATH=/var/lib/riaaya/riaaya.sqlite \
RIAAYA_BACKUP_DIR=/var/backups/riaaya \
npm run backup
npm run migrate:records
```

The command uses SQLite `VACUUM INTO` and retains the newest 30 backups by default. The automatic scheduler also archives encrypted patient-photo files and streams that archive to the configured off-site bucket without loading the complete archive into server memory.

## Expenses and Data Import

The clinic workspace includes a dedicated expenses section with groups, subgroups, filters, pagination, CSV export, and dashboard net-income indicators. Expense visibility and save permissions are enforced on the server for registered clinics.

The import workspace accepts CSV or JSON exports for patients, bookings, operations, and expenses. Files are parsed locally in the browser, columns are auto-matched from Arabic or English headers, and the user reviews required-field errors and duplicates before committing valid rows.

For migrating clinics from other systems, export Excel sheets as CSV first, import patients before bookings/operations, then preserve the working column mapping for that clinic. Dedicated adapters should be added only after collecting real export samples from the old systems.

## Security

- Passwords use salted `scrypt` hashes.
- Sessions use random server-side tokens in HttpOnly, SameSite cookies.
- Mutations require a CSRF token.
- Clinic data is filtered and merged on the server according to the signed-in user.
- Clinic state writes use optimistic version checks to prevent silent overwrites.
- Clinic state writes pass a versioned compatibility schema before persistence.
- SQLite schema changes run as ordered transactions and are recorded in `schema_migrations`.
- Patients, bookings, operations, and payment events are stored in individually encrypted relational rows with a versioned manifest; partial or mismatched storage is rejected instead of silently returning incomplete data.
- Clinic state, merge history, integration secrets, 2FA secrets, and patient photos use AES-256-GCM encryption at rest.
- Audit logs record registration, login, user, clinic, integration, and owner actions.
- Stored state is size-limited and strips HTML angle brackets and control characters.
- Required password changes and required 2FA block reads and writes until completed.
- Patient-photo responses are authenticated, audited, and marked `no-store`.

### Encrypt Existing Data Or Rotate The Key

After first deploying state/photo encryption to an existing installation, run once from the host shell:

```bash
RIAAYA_DB_PATH=/data/riaaya.sqlite \
RIAAYA_ENCRYPTION_KEY="$RIAAYA_ENCRYPTION_KEY" \
node scripts/rotate-encryption-key.mjs
```

For a later key rotation, set the new key as `RIAAYA_ENCRYPTION_KEY`, keep the prior key temporarily as `RIAAYA_ENCRYPTION_KEY_OLD`, run the same script, verify clinic state, integration status, and one patient photo, then remove the old key. The script rotates clinic state, history, 2FA secrets, provider credentials, and patient photos.

Before a public commercial launch, complete an independent security review, production email-domain delivery monitoring, recurring operator restore drills, and legal review of privacy/retention terms.

## Jordan E-Invoicing

Riaaya creates patient-linked receipts and a UBL 2.1 XML foundation, then submits through the JoFotara API only when the clinic has configured its own credentials and explicitly enabled live submission.

Live submission must stay disabled until the clinic's accountant or tax implementation partner validates:

- Seller tax identity and income-source sequence.
- Invoice type and tax category.
- Buyer identification requirements.
- Tax rates and exemptions for the clinic's services.
- Credit notes, cancellations, refunds, and numbering rules.
- Acceptance in the clinic's JoFotara test/production account.

Official references:

- https://www.istd.gov.jo/EN/List/Electronic_billing_User_Manual
- https://istd.gov.jo/EN/Pages/Billing_system

## Commands

```bash
npm run dev
npm start
npm run check
npm test
npm run visual
npm run visual:update
npm run build
npm run backup
```

`npm run visual` boots an isolated temporary clinic server and compares eight desktop/mobile workflow screenshots against the committed baselines. Use `npm run visual:update` only after intentionally reviewing a UI change.

`npm run build` creates static assets for inspection or CDN use, but it is not a replacement for the Node server.

`npm run migrate:records` is a dry run. `npm run migrate:records -- --apply` first creates and verifies a SQLite backup, uploads it off-site when bucket credentials are configured, atomically moves legacy patients, bookings, operations, and payment events into individually encrypted relational rows without changing the clinic state version, verifies every round trip, and only then activates relational storage for future writes. Until that command succeeds, normal saves retain the complete encrypted legacy blob so the current production release remains a valid rollback target.
