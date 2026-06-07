-- Optional demo data for a first Riaaya backend test.
-- Run this after schema.sql with the Supabase service role / SQL editor.

insert into public.clinics (
  id,
  name,
  legal_name,
  city,
  country,
  default_branch,
  timezone
)
values (
  '00000000-0000-4000-8000-000000000001',
  'عيادة رعاية التجريبية',
  'RIAAYA Demo Clinic',
  'Amman',
  'Jordan',
  'الفرع الرئيسي',
  'Asia/Amman'
)
on conflict (id) do update set
  name = excluded.name,
  legal_name = excluded.legal_name,
  updated_at = now();

insert into public.staff (id, clinic_id, name, role, rate, active)
values
  ('00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000001', 'د. ليلى منصور', 'doctor', 50, true),
  ('00000000-0000-4000-8000-000000000102', '00000000-0000-4000-8000-000000000001', 'د. سامي خالد', 'doctor', 50, true),
  ('00000000-0000-4000-8000-000000000201', '00000000-0000-4000-8000-000000000001', 'سارة خالد', 'specialist', 18, true),
  ('00000000-0000-4000-8000-000000000202', '00000000-0000-4000-8000-000000000001', 'نور عمر', 'specialist', 15, true)
on conflict (id) do update set
  name = excluded.name,
  role = excluded.role,
  rate = excluded.rate,
  active = excluded.active,
  updated_at = now();

insert into public.clinic_members (
  id,
  clinic_id,
  staff_id,
  email,
  name,
  role,
  allowed_views,
  can_view_sensitive,
  own_entries_only,
  can_manage_permissions,
  active
)
values
  (
    '00000000-0000-4000-8000-000000000301',
    '00000000-0000-4000-8000-000000000001',
    null,
    'admin@example.com',
    'مدير النظام',
    'admin',
    array['dashboard','entries','bookings','staff','services','inventory','reconcile','salaries','reports','accounts','leads']::text[],
    true,
    false,
    true,
    true
  ),
  (
    '00000000-0000-4000-8000-000000000302',
    '00000000-0000-4000-8000-000000000001',
    null,
    'data-entry@example.com',
    'موظف إدخال',
    'data_entry',
    array['entries','bookings','inventory']::text[],
    false,
    false,
    false,
    true
  ),
  (
    '00000000-0000-4000-8000-000000000303',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000101',
    'doctor@example.com',
    'د. ليلى',
    'doctor',
    array['dashboard','entries','bookings']::text[],
    false,
    true,
    false,
    true
  )
on conflict (id) do update set
  staff_id = excluded.staff_id,
  email = excluded.email,
  name = excluded.name,
  role = excluded.role,
  allowed_views = excluded.allowed_views,
  can_view_sensitive = excluded.can_view_sensitive,
  own_entries_only = excluded.own_entries_only,
  can_manage_permissions = excluded.can_manage_permissions,
  active = excluded.active,
  updated_at = now();

insert into public.services (id, clinic_id, name, default_price, default_cost, active)
values
  ('00000000-0000-4000-8000-000000000401', '00000000-0000-4000-8000-000000000001', 'جلسة ليزر', 80, 8, true),
  ('00000000-0000-4000-8000-000000000402', '00000000-0000-4000-8000-000000000001', 'إجراء تجميلي', 120, 18, true),
  ('00000000-0000-4000-8000-000000000403', '00000000-0000-4000-8000-000000000001', 'استشارة أسنان', 60, 0, true),
  ('00000000-0000-4000-8000-000000000404', '00000000-0000-4000-8000-000000000001', 'جلسة عناية', 45, 5, true),
  ('00000000-0000-4000-8000-000000000405', '00000000-0000-4000-8000-000000000001', 'متابعة علاج', 40, 0, true)
on conflict (id) do update set
  name = excluded.name,
  default_price = excluded.default_price,
  default_cost = excluded.default_cost,
  active = excluded.active,
  updated_at = now();

insert into public.payout_rules (id, clinic_id, name, applies_to, model, value, active)
values
  ('00000000-0000-4000-8000-000000000501', '00000000-0000-4000-8000-000000000001', 'الأطباء | نسبة العضو من الربح الصافي', 'doctor', 'member_rate', 0, true),
  ('00000000-0000-4000-8000-000000000502', '00000000-0000-4000-8000-000000000001', 'الأخصائيون | النسبة من المقبوض', 'specialist', 'member_rate', 0, true)
on conflict (id) do update set
  name = excluded.name,
  model = excluded.model,
  value = excluded.value,
  active = excluded.active,
  updated_at = now();

insert into public.suppliers (id, clinic_id, name, contact, city, category, notes, active)
values
  ('00000000-0000-4000-8000-000000000601', '00000000-0000-4000-8000-000000000001', 'MedCare Supplies', '079 555 2310', 'عمّان', 'مواد طبية', 'توريد سريع للمواد الاستهلاكية', true),
  ('00000000-0000-4000-8000-000000000602', '00000000-0000-4000-8000-000000000001', 'DermaPro Jordan', 'sales@dermapro.jo', 'عمّان', 'منتجات عناية', 'أسعار أفضل عند طلب كميات شهرية', true),
  ('00000000-0000-4000-8000-000000000603', '00000000-0000-4000-8000-000000000001', 'Dental House', '06 555 8844', 'إربد', 'أسنان', 'مورد بديل للعيادات الشمالية', true)
on conflict (id) do update set
  name = excluded.name,
  contact = excluded.contact,
  city = excluded.city,
  category = excluded.category,
  notes = excluded.notes,
  active = excluded.active,
  updated_at = now();

insert into public.inventory_items (
  id,
  clinic_id,
  supplier_id,
  name,
  sku,
  unit,
  quantity,
  low_threshold,
  unit_cost,
  last_ordered_at,
  active
)
values
  ('00000000-0000-4000-8000-000000000701', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000601', 'قفازات نيتريل', 'GLV-NIT-M', 'علبة', 7, 10, 4.50, '2026-05-27', true),
  ('00000000-0000-4000-8000-000000000702', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000602', 'جل ليزر', 'LAS-GEL', 'عبوة', 18, 8, 3.25, '2026-05-20', true),
  ('00000000-0000-4000-8000-000000000703', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000603', 'مخدر أسنان', 'DEN-ANE', 'كرتونة', 2, 3, 22.00, '2026-05-14', true)
on conflict (id) do update set
  supplier_id = excluded.supplier_id,
  name = excluded.name,
  sku = excluded.sku,
  unit = excluded.unit,
  quantity = excluded.quantity,
  low_threshold = excluded.low_threshold,
  unit_cost = excluded.unit_cost,
  last_ordered_at = excluded.last_ordered_at,
  active = excluded.active,
  updated_at = now();

insert into public.bookings (
  id,
  clinic_id,
  service_id,
  doctor_id,
  specialist_id,
  booking_date,
  booking_time,
  patient_name,
  patient_phone,
  expected_amount,
  status,
  notes
)
values
  ('00000000-0000-4000-8000-000000000801', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000401', null, '00000000-0000-4000-8000-000000000201', '2026-06-04', '10:30', 'لين خالد', '079 123 4455', 80, 'confirmed', 'تأكيد عبر واتساب'),
  ('00000000-0000-4000-8000-000000000802', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000402', '00000000-0000-4000-8000-000000000101', null, '2026-06-04', '12:00', 'سامي ناصر', '078 222 1000', 120, 'scheduled', 'يحتاج اتصال قبل الموعد')
on conflict (id) do update set
  service_id = excluded.service_id,
  doctor_id = excluded.doctor_id,
  specialist_id = excluded.specialist_id,
  booking_date = excluded.booking_date,
  booking_time = excluded.booking_time,
  patient_name = excluded.patient_name,
  patient_phone = excluded.patient_phone,
  expected_amount = excluded.expected_amount,
  status = excluded.status,
  notes = excluded.notes,
  updated_at = now();

insert into public.operations (
  id,
  clinic_id,
  service_id,
  doctor_id,
  specialist_id,
  operation_date,
  patient_name,
  quantity,
  unit_price,
  gross_amount,
  discount,
  direct_cost,
  payment_method,
  status,
  notes
)
values
  ('00000000-0000-4000-8000-000000000901', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000401', '00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000201', '2026-06-04', 'مريم أحمد', 1, 80, 80, 5, 8, 'cash', 'completed', 'خصم متابعة'),
  ('00000000-0000-4000-8000-000000000902', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000402', '00000000-0000-4000-8000-000000000101', null, '2026-06-04', 'عمر يوسف', 1, 120, 120, 0, 18, 'card', 'completed', null),
  ('00000000-0000-4000-8000-000000000903', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000403', '00000000-0000-4000-8000-000000000102', null, '2026-06-04', 'هبة محمود', 1, 60, 60, 0, 0, 'cash', 'completed', null),
  ('00000000-0000-4000-8000-000000000904', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000404', '00000000-0000-4000-8000-000000000102', '00000000-0000-4000-8000-000000000202', '2026-06-04', 'يزن حسن', 1, 45, 45, 0, 5, 'transfer', 'completed', 'تحويل بنكي')
on conflict (id) do update set
  service_id = excluded.service_id,
  doctor_id = excluded.doctor_id,
  specialist_id = excluded.specialist_id,
  operation_date = excluded.operation_date,
  patient_name = excluded.patient_name,
  quantity = excluded.quantity,
  unit_price = excluded.unit_price,
  gross_amount = excluded.gross_amount,
  discount = excluded.discount,
  direct_cost = excluded.direct_cost,
  payment_method = excluded.payment_method,
  status = excluded.status,
  notes = excluded.notes,
  updated_at = now();

insert into public.reconciliations (
  id,
  clinic_id,
  work_date,
  counted_cash,
  counted_card,
  counted_transfer,
  notes
)
values (
  '00000000-0000-4000-8000-000000001001',
  '00000000-0000-4000-8000-000000000001',
  '2026-06-04',
  135,
  120,
  45,
  'مطابقة تجريبية'
)
on conflict (clinic_id, work_date) do update set
  counted_cash = excluded.counted_cash,
  counted_card = excluded.counted_card,
  counted_transfer = excluded.counted_transfer,
  notes = excluded.notes,
  updated_at = now();
