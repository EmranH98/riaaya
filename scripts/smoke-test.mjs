const baseUrl = (process.env.SMOKE_BASE_URL || `http://localhost:${process.env.PORT || 4174}`).replace(/\/$/, "");

const requiredAppMarkers = [
  ["booking navigation", 'data-view-button="bookings"'],
  ["reconciliation form", "data-reconcile-form"],
  ["daily reconciliation report tab", 'data-report-tab="reconciliation"'],
  ["storage safety panel", "data-storage-safety-panel"],
  ["restore checklist", "storage-restore-checklist"],
  ["owner-safe source option", 'value="reconciliation"']
];

const requiredJsMarkers = [
  ["reconciliation ledger state", "reconciliationHistory"],
  ["cash reconciliation report", "renderCashReconciliationReport"],
  ["fresh close record creation", "createReconciliationRecordFromForm"],
  ["booking slot controls", "scheduleSlotMinutes"],
  ["booking conflict guard", "bookingSlotConflict"],
  ["export bundle", "daily-reconciliations"]
];

const requiredOwnerHtmlMarkers = [
  ["production readiness panel", "Production Readiness"],
  ["readiness panel hook", "data-readiness-panel"]
];

const requiredOwnerJsMarkers = [
  ["readiness endpoint binding", "/api/owner/readiness"],
  ["clinic export action", "/export"],
  ["2FA owner control", "disable-user-2fa"]
];

async function fetchText(path) {
  const response = await fetch(`${baseUrl}${path}`);
  const text = await response.text();
  return { response, text };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function expectStatus(path, expected) {
  const { response } = await fetchText(path);
  assert(response.status === expected, `${path} expected ${expected}, got ${response.status}`);
}

function expectMarkers(text, markers, fileLabel) {
  markers.forEach(([label, marker]) => {
    assert(text.includes(marker), `${fileLabel} missing ${label}: ${marker}`);
  });
}

async function main() {
  console.log(`Running Riaaya smoke test against ${baseUrl}`);

  await expectStatus("/healthz", 200);
  await expectStatus("/readyz", 200);
  await expectStatus("/", 200);
  await expectStatus("/login", 200);
  await expectStatus("/owner", 200);
  await expectStatus("/app.html?trial=1&v=smoke", 200);

  const { text: appHtml } = await fetchText("/app.html?trial=1&v=smoke");
  expectMarkers(appHtml, requiredAppMarkers, "app.html");
  const scriptMatch = appHtml.match(/<script src="([^"]*app\.js[^"]*)"/);
  assert(scriptMatch, "app.html missing app.js script tag");

  const { text: appJs } = await fetchText(scriptMatch[1].startsWith("/") ? scriptMatch[1] : `/${scriptMatch[1]}`);
  expectMarkers(appJs, requiredJsMarkers, "app.js");

  const { text: ownerHtml } = await fetchText("/owner");
  expectMarkers(ownerHtml, requiredOwnerHtmlMarkers, "owner.html");
  const ownerScriptMatch = ownerHtml.match(/<script src="([^"]*owner\.js[^"]*)"/);
  assert(ownerScriptMatch, "owner.html missing owner.js script tag");
  const { text: ownerJs } = await fetchText(ownerScriptMatch[1].startsWith("/") ? ownerScriptMatch[1] : `/${ownerScriptMatch[1]}`);
  expectMarkers(ownerJs, requiredOwnerJsMarkers, "owner.js");

  const protectedChecks = [
    "/api/clinic-storage-status",
    "/api/clinic-export",
    "/api/owner/readiness"
  ];
  for (const path of protectedChecks) {
    const { response } = await fetchText(path);
    assert([401, 403].includes(response.status), `${path} should be protected, got ${response.status}`);
  }

  console.log("Smoke test passed.");
}

main().catch(error => {
  console.error(`Smoke test failed: ${error.message}`);
  process.exit(1);
});
