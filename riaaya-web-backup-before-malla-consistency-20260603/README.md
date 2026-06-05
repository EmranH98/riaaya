# رعاية

Deployable first version of the Riaaya website and demo dashboard.

## What is included

- Arabic landing page for `رعاية`
- Demo dashboard at `/app.html` and `/dashboard`
- Server-side lead capture endpoint at `/api/leads`
- Supabase table schema in `supabase/schema.sql`
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

Without Supabase env vars, the API runs in preview mode and returns `mode: "preview"`.

## Supabase setup

1. Create a Supabase project.
2. Open the SQL editor.
3. Run `supabase/schema.sql`.
4. Copy your project URL and service role key.
5. Add these environment variables locally or in Vercel:

```bash
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-server-only-service-role-key
ALLOWED_ORIGIN=https://your-domain.com
```

Never expose `SUPABASE_SERVICE_ROLE_KEY` in frontend code.

## Deploy on Vercel

1. Push this folder to a GitHub repository.
2. Import the repository in Vercel.
3. Add the Supabase environment variables.
4. Deploy.
5. Add your custom domain.

## Current launch scope

This is ready for a first website launch and lead capture. The dashboard is still a demo MVP using browser storage. The next production step is to connect the dashboard to Supabase auth and database tables.
