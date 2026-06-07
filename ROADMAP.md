# Riaaya Product Roadmap

Updated: June 7, 2026

This roadmap turns `riaaya-vision.txt` into an execution plan. The goal is not to add every feature at once. The goal is to make Riaaya safe for one real clinic, then make the daily clinic workflow so practical that staff prefer it over paper, Excel, WhatsApp notes, and older clinic systems.

## Product North Star

Riaaya should feel like a calm clinic command center, not software that staff have to learn.

The product should:

- Let a receptionist start using it with almost no training.
- Keep the owner informed without forcing them to open reports all day.
- Protect patient and financial data before anything else.
- Make the daily close easy enough to do every day.
- Give doctors a real patient file, not only a billing record.
- Be Arabic-first and Jordan-ready from the start.

## Current Position

Riaaya already has a strong foundation:

- Public landing page and trial.
- Real registration and clinic accounts.
- Platform-owner dashboard.
- Clinic dashboard, bookings, patient/visitor files, operations, reports, receipts, expenses, inventory, salaries, permissions, imports, communications, and JoFotara foundation.
- Server-side sessions, CSRF, tenant isolation, encrypted integration secrets, audit logs, and backup command.
- Granular permissions modeled after the Clinicame reference.

The biggest gaps before real clinic use are not visual. They are reliability, data safety, clinical depth, and workflow focus.

## Execution Rule

Do not build advanced AI, WhatsApp automation, native apps, or live JoFotara submission until the trust layer is strong.

The correct sequence is:

1. Data safety
2. Daily workflow
3. Patient clinical file
4. Scheduling intelligence
5. Financial and operational intelligence
6. Patient-facing and AI automation

## Phase 0 - Safe One-Clinic Pilot

Priority: Critical

Goal: Make it safe to test Riaaya with one clinic without losing data.

### Must Ship

- Decide the pilot storage model:
  - Local Mac pilot with SQLite and cloud-folder backups, or
  - Paid persistent disk / managed database for real online use.
- Add visible backup status in settings:
  - Last successful backup time.
  - Backup location.
  - Backup retention count.
  - Restore-tested indicator.
- Add owner data export:
  - Export all clinic data as JSON.
  - Export patients, operations, bookings, expenses, salaries, inventory, and receipts as CSV.
- Add restore drill documentation:
  - How to restore from a SQLite backup.
  - How to verify restored patient count, operation count, and receipt count.
- Keep free Render preview clearly labeled as demo-only.

### Acceptance Criteria

- A clinic owner can download all data at any time.
- A backup can be restored on a second local copy.
- The UI clearly shows whether the app is demo/free-preview or real storage.
- No real patient data is entered into free ephemeral Render storage.

## Phase 1 - Locked Design System and Command Center

Priority: Critical

Goal: Make every page feel like one product and make the first screen the real daily workflow.

### Must Ship

- Define a locked design system:
  - Three text sizes for app surfaces.
  - One green, one sand, one near-black.
  - Consistent status colors everywhere.
  - Unified cards, tables, modals, forms, buttons, filters, and empty states.
- Replace long-scroll dashboard behavior with a single-screen daily command center:
  - Next visitor.
  - Today's bookings.
  - Today's operations.
  - Reconciliation state.
  - Urgent alerts.
  - Three primary actions: Register Operation, New Booking, Daily Close.
- Turn operation entry into a focused modal:
  - Patient autocomplete.
  - Multiple services in one visit.
  - Payment method.
  - Doctor/staff assignment.
  - Receipt option.
- Keep cost hidden from normal operation entry unless permission allows it.
- Add dark mode foundation for evening clinics.

### Acceptance Criteria

- A receptionist can register a normal visit in under 15 seconds.
- The dashboard does not require scrolling for the primary morning flow.
- Every major module uses the same filter/table/action pattern.
- Arabic labels fit on mobile and desktop without awkward wrapping.

## Phase 2 - Patient Clinical Record

Priority: High

Goal: Turn Riaaya from an operations/billing tool into a real patient file system.

### Must Ship

- Patient file tabs:
  - Overview.
  - Visits and operations.
  - Clinical notes.
  - Treatment plans.
  - Receipts and financials.
  - Documents and consent.
- SOAP notes per visit:
  - Subjective.
  - Objective.
  - Assessment.
  - Plan.
- Treatment plans:
  - Package/session count.
  - Current session.
  - Next planned session.
  - Completion state.
- Allergies and contraindications:
  - Always visible on new operation.
  - Requires permission to edit.
- Consent records:
  - Signed date.
  - Consent type.
  - Linked visit or treatment plan.
- Patient lifetime value:
  - Total visits.
  - Total paid.
  - Last visit.
  - Next planned visit.

### Later In This Phase

- Before/after photo storage.
- Secure file attachments.
- Prescription history.
- Doctor-only note visibility.

### Acceptance Criteria

- A doctor can open a patient and understand clinical history without asking reception.
- A receptionist can see operational history without seeing restricted clinical notes.
- Every receipt is reachable from the patient file.

## Phase 3 - Smart Scheduling

Priority: High

Goal: Make the calendar practical enough to replace the reference Clinicame workflow, but cleaner and smarter.

### Must Ship

- Better day/week calendar:
  - Rooms/resources.
  - Doctors/staff columns.
  - Color-coded appointment states.
  - Touch-friendly mobile layout.
- Drag-and-drop rescheduling.
- Double-booking prevention:
  - By doctor.
  - By room.
  - By equipment/resource.
- Calendar permission depth:
  - Today only.
  - Working days only.
  - Rolling day range.
  - Assigned appointments only.
  - Can change appointment dates.
  - Can view mobile in calendar print.
- Waitlist:
  - Add patient to waitlist.
  - See gaps.
  - Offer cancellation slot.
- Appointment reminders:
  - Manual first.
  - Automated after provider setup is stable.

### Acceptance Criteria

- Staff can manage a full day from the calendar without going to reports.
- Restricted users cannot view or edit dates beyond their allowed scope.
- Owner can see gap opportunities and no-show risk.

## Phase 4 - Daily Closure, Finance, Expenses, Inventory, and HR

Priority: High

Goal: Make Riaaya the system that tells the owner whether the clinic day was healthy.

### Must Ship

- One-swipe daily closure:
  - Confirm today's operations.
  - Enter actual cash, visa, transfer.
  - Review differences.
  - Approve close.
  - Prepare WhatsApp report.
- Expense intelligence:
  - Expense categories and subcategories.
  - Monthly trends.
  - Expense percentage of revenue.
  - Vendor/reference tracking.
- Inventory intelligence:
  - Usage rate.
  - Reorder estimate.
  - Preferred supplier.
  - Draft purchase order.
- Staff and HR layer:
  - Shift schedules.
  - Leave blocks calendar availability.
  - Staff self-view for own commissions.
  - Month-over-month performance.
- Financial intelligence:
  - Revenue forecast from bookings.
  - Service profitability.
  - Doctor revenue per hour.
  - Cash-flow calendar.

### Acceptance Criteria

- Owner can close a day in less than 2 minutes.
- Owner can explain where money came from, where it went, and what needs attention.
- Inventory alerts are based on actual usage, not only a static threshold.

## Phase 5 - Trust, Compliance, and Enterprise Readiness

Priority: High

Goal: Make clinic owners comfortable giving Riaaya real patient and financial data.

### Must Ship

- Audit log viewer:
  - Who changed what.
  - When.
  - Before/after for important actions.
- Two-factor authentication for admins.
- Strong password recovery flow.
- Email/phone ownership verification.
- Data export on demand.
- Backup transparency.
- Uptime/status page.
- Role-based privacy audit:
  - Reception.
  - Doctor.
  - Assistant.
  - Accountant.
  - Owner.
- Legal/compliance pack:
  - Terms.
  - Privacy notice.
  - Data processing terms.
  - Retention policy.
  - Breach response process.
- Jordan-specific data hosting decision.

### Acceptance Criteria

- Owner can see and export data without contacting support.
- Admin accounts require stronger authentication.
- The app has a documented backup and incident response process.

## Phase 6 - Communications, Patient-Facing Booking, and AI

Priority: Medium until trust layer is complete

Goal: Make Riaaya think alongside the clinic owner and communicate automatically.

### Must Ship

- Owner WhatsApp daily summary:
  - Morning brief.
  - End-of-day close.
  - Role-specific reports.
- WhatsApp templates and provider setup wizard.
- SMS campaigns for Jordan:
  - Consent-aware.
  - Recipient filters.
  - Delivery logs.
- Patient-facing booking link:
  - Service selection.
  - Available times.
  - Confirmation/cancel link.
- WhatsApp booking bot:
  - Start with guided/manual fallback.
  - Automate only after booking logic is stable.
- AI alert layer:
  - Revenue anomaly.
  - Follow-up gap.
  - Discount anomaly.
  - Inventory risk.
  - Empty slot opportunity.

### Acceptance Criteria

- Owner receives useful summaries without opening Riaaya.
- Patients can book or cancel without calling.
- AI suggestions are explainable and never change data without approval.

## Phase 7 - Mobile and Offline

Priority: Medium/Later

Goal: Build mobile as a separate experience, not only responsive desktop.

### App Views

- Owner:
  - Daily P&L.
  - Alerts.
  - WhatsApp report approval.
- Doctor:
  - Today's patients.
  - Clinical notes.
  - Complete session.
- Reception:
  - Check in.
  - Take payment.
  - Next appointment.

### Technical Requirements

- Offline-first queue.
- Sync when internet returns.
- Biometric login.
- Device/session management.

### Acceptance Criteria

- Reception can continue core work during an internet outage.
- Doctor can review today's patient list from phone.

## Priority Backlog

### Now

- Backup status and owner export.
- Daily command center refinement.
- Operation entry modal.
- Patient clinical file tabs.
- Calendar usability and permission polish.
- Daily closure wizard.

### Next

- Treatment plans and session tracking.
- Waitlist and gap alerts.
- Expense and inventory intelligence.
- Staff schedule and leave.
- Audit log viewer.
- Owner WhatsApp summaries.

### Later

- Patient booking link.
- WhatsApp booking bot.
- AI suggestions.
- Native mobile apps.
- Offline-first sync.
- Full normalized database migration.

## Do Not Prioritize Yet

- Native apps before the browser workflow is stable.
- AI before the data model is trustworthy.
- Live JoFotara auto-submission before accountant/tax validation.
- WhatsApp bot before manual booking and reminders are excellent.
- Multi-instance scaling while clinic state is still stored as one JSON blob.

## Data and Technical Roadmap

### Current

- SQLite.
- Single Node instance.
- Clinic state stored as versioned JSON.
- Good for a controlled first pilot if storage is persistent and backups are verified.

### Required For Real Scale

- Normalize operational data:
  - Patients.
  - Visits.
  - Operation lines.
  - Payments.
  - Receipts.
  - Bookings.
  - Expenses.
  - Inventory movements.
  - Clinical notes.
  - Files.
- Migrate from SQLite to PostgreSQL before horizontal scaling.
- Add background workers:
  - Scheduled backups.
  - WhatsApp reports.
  - SMS campaigns.
  - Reminder sending.
  - Import jobs.
- Add object storage for patient documents and photos.
- Add automated end-to-end tests.
- Add error monitoring and uptime alerts.

## 30-Day Plan

1. Add backup/export visibility and restore documentation.
2. Refine dashboard into a tighter command center.
3. Convert operation entry into a focused modal.
4. Add patient clinical file structure.
5. Improve calendar usability and permission controls.
6. Add first version of daily closure wizard.

## 60-Day Plan

1. Add treatment plans and session tracking.
2. Add waitlist and gap alerts.
3. Add audit log viewer and stronger admin security.
4. Add staff schedules and leave.
5. Add expense and inventory intelligence.
6. Add owner WhatsApp summary draft flow.

## 90-Day Plan

1. Pilot one real clinic with safe storage and backups.
2. Collect real workflow feedback from receptionist, owner, and doctor.
3. Add patient-facing booking link.
4. Add reminder flow.
5. Start normalized data migration planning.
6. Prepare commercial launch checklist.

## Pilot Success Metrics

- Operation entry time under 15 seconds.
- Daily close under 2 minutes.
- Zero lost records.
- Backup restored successfully at least once per week during pilot.
- Reception can use app without training after one walkthrough.
- Owner opens Riaaya or reads Riaaya summary daily.
- Doctor uses patient file at least once per clinic day.

## Launch Gates

Riaaya should not be sold as production-ready until these are true:

- Real persistent storage is configured.
- Backups run automatically and are stored off-host.
- Restore drill has succeeded.
- Owner data export works.
- Admin password recovery works.
- Terms/privacy/data retention documents exist.
- JoFotara is validated with a real clinic account and accountant.
- At least one clinic pilot has completed a full work week without data loss or workflow-blocking bugs.

## Product Positioning

Riaaya should not be positioned as "clinic accounting software" only.

The stronger position:

Riaaya is the Arabic-first clinic operating system for Jordanian clinics: daily workflow, patient files, booking, staff, inventory, receipts, owner reporting, and intelligent follow-up in one calm workspace.
