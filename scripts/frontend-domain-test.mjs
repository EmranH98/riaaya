#!/usr/bin/env node
await import(`../modules/booking-domain.js?test=${Date.now()}`);
await import(`../modules/visit-domain.js?test=${Date.now()}`);

let passed = 0;
function ok(condition, message) {
  if (!condition) throw new Error(`ASSERT FAILED: ${message}`);
  passed += 1;
}

const booking = globalThis.RiaayaBookingDomain;
const visit = globalThis.RiaayaVisitDomain;
ok(Boolean(booking && visit), "booking and visit domains load independently");

const bookings = [
  { id: "one", date: "2026-07-12", time: "09:00", column: "laser", status: "confirmed" },
  { id: "cancelled", date: "2026-07-12", time: "09:15", column: "laser", status: "cancelled" },
  { id: "other-room", date: "2026-07-12", time: "09:00", column: "doctor", status: "scheduled" }
];
const resolveColumn = item => item.column;
ok(booking.findConflict({
  bookings,
  candidate: { id: "new", date: "2026-07-12", time: "09:14", column: "laser", status: "scheduled" },
  ignoreId: "new",
  stepMinutes: 15,
  resolveColumn
})?.id === "one", "booking conflict is detected within the configured slot");
ok(!booking.findConflict({
  bookings,
  candidate: { id: "new", date: "2026-07-12", time: "09:15", column: "laser", status: "scheduled" },
  ignoreId: "new",
  stepMinutes: 15,
  resolveColumn
}), "cancelled booking does not block capacity");
ok(booking.findAnyConflict({
  bookings: [...bookings, { id: "duplicate", date: "2026-07-12", time: "09:01", column: "laser", status: "confirmed" }],
  stepMinutes: 15,
  resolveColumn
})?.second?.id === "duplicate", "calendar-wide duplicate detection uses the same slot rule");
const availability = booking.buildAvailability({
  start: "09:00", end: "10:00", stepMinutes: 20, requestedTime: "", isTaken: time => time === "09:00"
});
ok(availability.length === 3 && availability[1].selected && availability[1].time === "09:20", "availability preselects the first free configurable slot");

const explicitZero = visit.cleanPaymentBreakdown({ cash: 0, card: 0, transfer: 0 }, "cash", 80);
ok(visit.paymentTotal(explicitZero) === 0, "explicit unpaid breakdown is preserved");
const legacy = visit.cleanPaymentBreakdown(null, "card", 80);
ok(legacy.card === 80 && visit.paymentMethodFromBreakdown(legacy, "cash") === "card", "legacy payment fallback remains paid in full");
const split = visit.cleanPaymentBreakdown([{ method: "cash", amount: 30 }, { method: "card", amount: 50 }]);
ok(visit.paymentTotal(split) === 80 && visit.paymentMethodFromBreakdown(split, "cash") === "mixed", "split payments normalize and report as mixed");
const allocated = visit.allocateBreakdown(split, 0.25);
ok(allocated.cash === 7.5 && allocated.card === 12.5, "visit payment allocation preserves method proportions");

console.log(`✓ frontend domains passed — ${passed} assertions`);
