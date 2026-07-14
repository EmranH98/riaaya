const baseUrl = (process.env.SMOKE_BASE_URL || `http://localhost:${process.env.PORT || 4174}`).replace(/\/$/, "");

const requiredAppMarkers = [
  ["workflow component styles", "styles/workflow-components.css"],
  ["language domain module", "modules/language-domain.js"],
  ["booking domain module", "modules/booking-domain.js"],
  ["visit domain module", "modules/visit-domain.js"],
  ["daily workflow module", "modules/daily-workflows.js"],
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
  ["readiness panel hook", "data-readiness-panel"],
  ["observability summary", "data-readiness-observability-title"]
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
  const { response: readyResponse, text: readyText } = await fetchText("/readyz");
  assert(readyResponse.status === 200, `/readyz expected 200, got ${readyResponse.status}`);
  const readyBody = JSON.parse(readyText);
  assert(readyBody.database?.ok === true, "/readyz database checks must pass");
  assert(readyBody.database?.appliedSchemaVersion === readyBody.database?.expectedSchemaVersion, "/readyz schema version must be current");
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

  const workflowScriptMatch = appHtml.match(/<script src="([^"]*daily-workflows\.js[^"]*)"/);
  assert(workflowScriptMatch, "app.html missing daily-workflows.js script tag");
  const { text: workflowJs } = await fetchText(workflowScriptMatch[1].startsWith("/") ? workflowScriptMatch[1] : `/${workflowScriptMatch[1]}`);
  expectMarkers(workflowJs, [["reconciliation shortcut", "data-copy-all-expected"]], "daily-workflows.js");
  for (const modulePath of ["/modules/language-domain.js", "/modules/booking-domain.js", "/modules/visit-domain.js"]) {
    const { response } = await fetchText(modulePath);
    assert(response.status === 200, `${modulePath} must be served`);
  }

  const { text: ownerHtml } = await fetchText("/owner");
  expectMarkers(ownerHtml, requiredOwnerHtmlMarkers, "owner.html");
  const ownerScriptMatch = ownerHtml.match(/<script src="([^"]*owner\.js[^"]*)"/);
  assert(ownerScriptMatch, "owner.html missing owner.js script tag");
  const { text: ownerJs } = await fetchText(ownerScriptMatch[1].startsWith("/") ? ownerScriptMatch[1] : `/${ownerScriptMatch[1]}`);
  expectMarkers(ownerJs, requiredOwnerJsMarkers, "owner.js");

  const protectedChecks = [
    "/api/clinic-storage-status",
    "/api/clinic-export",
    "/api/owner/readiness",
    "/api/owner/observability"
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
