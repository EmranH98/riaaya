#!/usr/bin/env node
import { readFile } from "node:fs/promises";

await import(`../modules/language-domain.js?test=${Date.now()}`);
await import(`../modules/booking-domain.js?test=${Date.now()}`);
await import(`../modules/visit-domain.js?test=${Date.now()}`);

let passed = 0;
function ok(condition, message) {
  if (!condition) throw new Error(`ASSERT FAILED: ${message}`);
  passed += 1;
}

const language = globalThis.RiaayaLanguageDomain;
const booking = globalThis.RiaayaBookingDomain;
const visit = globalThis.RiaayaVisitDomain;
ok(Boolean(language && booking && visit), "language, booking, and visit domains load independently");

ok(language.resolveLanguage({ userLanguage: "en", clinicLanguage: "ar" }) === "en", "personal language keeps precedence over the clinic default");
ok(language.resolveLanguage({ clinicLanguage: "en" }) === "en", "clinic language remains the fallback for users without a preference");
ok(language.resolveLanguage({}) === "ar", "Arabic remains the default language");
ok(language.translateLiteral("حفظ", "en") === "Save", "known Arabic UI text translates to English");
ok(language.translateLiteral("Save", "ar") === "حفظ", "known English UI text translates back to Arabic");
ok(language.translateLiteral("Clinic-specific name", "en") === "Clinic-specific name", "unknown clinic text remains unchanged");
ok(language.directionFor("ar") === "rtl" && language.directionFor("en") === "ltr", "document direction follows the active language");
ok(language.localeFor("ar") === "ar-JO-u-nu-latn" && language.localeFor("en") === "en-US", "date and number locales preserve current formatting");
ok(language.titleFor("en").startsWith("Riaaya") && language.titleFor("ar").startsWith("رعاية"), "document titles remain bilingual");
ok(Object.isFrozen(language.englishText), "the extracted translation catalog is immutable");

const appHtml = await readFile(new URL("../app.html", import.meta.url), "utf8");
const arabicText = /[\u0600-\u06FF]/;
const normalizeMarkupText = value => value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const untranslatedShellText = new Set();
const appShell = appHtml
  .replace(/<script[\s\S]*?<\/script>/gi, "")
  .replace(/<svg[\s\S]*?<\/svg>/gi, "");
for (const match of appShell.matchAll(/>([^<>]+)</g)) {
  const value = normalizeMarkupText(match[1]);
  if (arabicText.test(value) && !language.englishText[value]) untranslatedShellText.add(value);
}
for (const match of appHtml.matchAll(/(?:placeholder|title|aria-label)="([^"]+)"/g)) {
  const value = normalizeMarkupText(match[1]);
  if (arabicText.test(value) && !language.englishText[value]) untranslatedShellText.add(value);
}
ok(untranslatedShellText.size === 0, `every static app label has an English translation: ${[...untranslatedShellText].join(" | ")}`);

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
