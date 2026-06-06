# رعاية

Deployable first version of the Riaaya website and demo dashboard.

## What is included

- Arabic landing page for `رعاية`
- Demo dashboard at `/app.html` and `/dashboard`
- Server-side lead capture endpoint at `/api/leads`
- Safe backend config endpoint at `/api/config`
- Secure provider adapter endpoint at `/api/communications`
- Supabase backend schema in `supabase/schema.sql`
- Optional demo seed data in `supabase/seed-demo.sql`
- Vercel-ready configuration in `vercel.json`
- Local development server with `npm run dev`

## Local run

```bash
npm run dev
```

Open:

```text
http://localhost:4174
```

Without Supabase env vars, the lead API runs in preview mode and returns `mode: "preview"`.

## Supabase setup

1. Create a Supabase project.
2. Open the SQL editor.
3. Run `supabase/schema.sql`.
4. Optional: run `supabase/seed-demo.sql` for sample clinic data.
5. Copy your project URL, anon key, and service role key.
6. Add these environment variables locally or in Vercel:

```bash
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-public-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-server-only-service-role-key
ALLOWED_ORIGIN=https://your-domain.com

WHATSAPP_ACCESS_TOKEN=server-only-token
WHATSAPP_PHONE_NUMBER_ID=meta-phone-number-id
WHATSAPP_GRAPH_API_VERSION=approved-version

SMS_PROVIDER=custom
SMS_API_URL=https://provider.example/api/send
SMS_API_KEY=server-only-key
SMS_SENDER_ID=RIAAYA

JOFOTARA_CLIENT_ID=server-only-client-id
JOFOTARA_SECRET_KEY=server-only-secret
JOFOTARA_ENABLE_SUBMISSION=false
```

Never expose `SUPABASE_SERVICE_ROLE_KEY` in frontend code.
Never expose provider secrets in frontend code. WhatsApp, SMS, and JoFotara requests remain in preview mode until their server credentials are configured. Keep JoFotara submission disabled until the clinic's invoice XML is validated for production.

## Deploy on Vercel

1. Push this folder to a GitHub repository.
2. Import the repository in Vercel.
3. Add the Supabase environment variables.
4. Use these build settings:

```text
Framework Preset: Other
Root Directory: riaaya-web
Build Command: npm run build
Output Directory: dist
```

5. Deploy.
6. Add your custom domain.

## Backend status

The backend schema is now ready for a real Supabase project. The dashboard UI is still using browser storage until the next integration step connects login and live database reads/writes.

Recommended next step:

1. Create the Supabase project.
2. Run `schema.sql`.
3. Run `seed-demo.sql`.
4. Add environment variables.
5. Connect the dashboard forms to Supabase Auth and tables.
