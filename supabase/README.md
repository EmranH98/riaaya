# Riaaya Supabase Backend

This folder contains the backend foundation for the real Riaaya app.

## Files

- `schema.sql`: production database tables, enums, indexes, triggers, audit logs, and RLS policies.
- `seed-demo.sql`: optional demo clinic data for testing the dashboard workflow.

## Setup

1. Create a Supabase project.
2. Open Supabase SQL Editor.
3. Run `schema.sql`.
4. Optional: run `seed-demo.sql`.
5. Create Auth users for your real testers.
6. Link Auth users to seeded clinic members:

```sql
update public.clinic_members
set user_id = (
  select id from auth.users where email = 'admin@example.com'
)
where clinic_id = '00000000-0000-4000-8000-000000000001'
  and email = 'admin@example.com';
```

Repeat that update for every user email.

## Current Model

Clinic data is split into real tables:

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
- `patients`
- `automation_rules`
- `message_campaigns`
- `outbound_messages`
- `electronic_invoices`

## Security

Row Level Security is enabled on all app tables.

The policy model is:

- Admin can manage clinic setup, staff, permissions, sensitive data, and reports.
- Data entry can add operations, bookings, inventory, suppliers, and purchase orders without broad financial permission.
- Doctor/specialist accounts can be scoped to their own operations.
- Salary, reconciliation, payout rules, and audit logs are protected.
- Patient consent, campaigns, outbound messages, and electronic invoices have clinic-scoped RLS policies.

The frontend should use the Supabase anon key and user sessions. Never expose `SUPABASE_SERVICE_ROLE_KEY` to the browser.
