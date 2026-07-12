#!/usr/bin/env node
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import { chromium } from "playwright";

const root = fileURLToPath(new URL("../", import.meta.url));
const baselineDir = join(root, "tests", "visual-baselines");
const resultDir = join(root, "tests", "visual-results");
const databasePath = join(tmpdir(), `riaaya-visual-${process.pid}.sqlite`);
const port = 5200 + (process.pid % 300);
const baseUrl = `http://127.0.0.1:${port}`;
const update = process.env.UPDATE_VISUALS === "1";
const maxDiffRatio = 0.08;

await mkdir(baselineDir, { recursive: true });
await rm(resultDir, { recursive: true, force: true });
await mkdir(resultDir, { recursive: true });

const server = spawn(process.execPath, ["server.mjs"], {
  cwd: root,
  env: {
    ...process.env,
    NODE_ENV: "development",
    PORT: String(port),
    RIAAYA_DB_PATH: databasePath,
    RIAAYA_DISABLE_RATE_LIMIT: "1",
    RIAAYA_OWNER_EMAIL: "visual-owner@test.local",
    RIAAYA_OWNER_PASSWORD: "VisualOwner!2026X",
    RIAAYA_OWNER_SYNC: "true"
  },
  stdio: ["ignore", "pipe", "pipe"]
});

let serverLog = "";
server.stdout.on("data", chunk => { serverLog += chunk; });
server.stderr.on("data", chunk => { serverLog += chunk; });

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function waitForServer(timeoutMs = 30000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      if ((await fetch(`${baseUrl}/healthz`)).ok) return;
    } catch { /* server is still starting */ }
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  throw new Error("visual test server did not become healthy");
}

async function compareScreenshot(name, actualBuffer) {
  const baselinePath = join(baselineDir, name);
  const actualPath = join(resultDir, name);
  await writeFile(actualPath, actualBuffer);
  if (update || !existsSync(baselinePath)) {
    await writeFile(baselinePath, actualBuffer);
    console.log(`  updated ${name}`);
    return;
  }

  const baseline = PNG.sync.read(await readFile(baselinePath));
  const actual = PNG.sync.read(actualBuffer);
  assert(
    baseline.width === actual.width && baseline.height === actual.height,
    `${name} dimensions changed from ${baseline.width}x${baseline.height} to ${actual.width}x${actual.height}`
  );
  const diff = new PNG({ width: actual.width, height: actual.height });
  const pixels = pixelmatch(
    baseline.data,
    actual.data,
    diff.data,
    actual.width,
    actual.height,
    { threshold: 0.2, includeAA: false }
  );
  const ratio = pixels / (actual.width * actual.height);
  if (ratio > maxDiffRatio) {
    const diffPath = join(resultDir, name.replace(/\.png$/, ".diff.png"));
    await writeFile(diffPath, PNG.sync.write(diff));
    throw new Error(`${name} changed by ${(ratio * 100).toFixed(2)}% (limit ${(maxDiffRatio * 100).toFixed(0)}%)`);
  }
  console.log(`  passed ${name} (${(ratio * 100).toFixed(2)}% diff)`);
}

async function preparePage(browser, viewport) {
  const context = await browser.newContext({ viewport, locale: "ar-JO", timezoneId: "Asia/Amman" });
  await context.addInitScript(() => {
    const fixedNow = new Date("2026-07-12T09:00:00+03:00").valueOf();
    const NativeDate = Date;
    globalThis.Date = class FixedDate extends NativeDate {
      constructor(...args) { super(...(args.length ? args : [fixedNow])); }
      static now() { return fixedNow; }
    };
  });
  const page = await context.newPage();
  await page.goto(`${baseUrl}/app.html?trial=1&v=visual`, { waitUntil: "networkidle" });
  await page.addStyleTag({ content: "*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}" });
  await page.evaluate(() => document.fonts?.ready);
  await page.locator("[data-daily-command-center]").waitFor({ state: "visible" });
  return { context, page };
}

async function runVisualChecks() {
  await waitForServer();
  const browser = await chromium.launch({ headless: true });
  try {
    const desktop = await preparePage(browser, { width: 1440, height: 900 });
    const dashboardMetrics = await desktop.page.evaluate(() => {
      const dashboard = document.querySelector('.view[data-view="dashboard"]');
      const hero = document.querySelector(".command-hero");
      const rect = hero?.getBoundingClientRect();
      return {
        detailsOpen: dashboard?.classList.contains("dashboard-details-open"),
        heroBottom: rect?.bottom || 0,
        viewportHeight: innerHeight
      };
    });
    assert(!dashboardMetrics.detailsOpen, "dashboard secondary details must start collapsed");
    assert(dashboardMetrics.heroBottom <= dashboardMetrics.viewportHeight + 180, "daily command center is too far below the first desktop screen");
    await compareScreenshot("dashboard-desktop.png", await desktop.page.screenshot());

    await desktop.page.locator('.daily-command-actions [data-new-booking]').click();
    assert(await desktop.page.locator("[data-slot-booking-modal]").isVisible(), "dashboard booking action must open the compact booking modal directly");
    assert(await desktop.page.locator('.view[data-view="dashboard"]').evaluate(element => element.classList.contains("active")), "quick booking must keep the dashboard context");
    const bookingFastPath = await desktop.page.locator("[data-slot-booking-form]").evaluate(form => {
      const submit = form.querySelector('[type="submit"]');
      const rect = submit?.getBoundingClientRect();
      return {
        required: form.querySelectorAll("[required]").length,
        submitVisible: Boolean(rect && rect.top >= 0 && rect.bottom <= innerHeight)
      };
    });
    assert(bookingFastPath.required <= 4, `booking fast path has ${bookingFastPath.required} required controls; expected at most 4`);
    assert(bookingFastPath.submitVisible, "booking save action must be visible without scrolling on desktop");
    await compareScreenshot("booking-desktop.png", await desktop.page.screenshot());
    await desktop.page.locator('[data-slot-booking-modal] [data-slot-booking-close]').first().click();

    await desktop.page.locator('.daily-command-actions [data-open-operation-modal]').click();
    assert(await desktop.page.locator('[data-cost-input]').getAttribute("type") === "hidden", "operation cost must not be visible during entry");
    const visibleOperationControls = await desktop.page.evaluate(() => (
      [...document.querySelectorAll('[data-entry-form] input:not([type="hidden"]), [data-entry-form] select, [data-entry-form] textarea')]
        .filter(element => {
          const rect = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
        }).length
    ));
    assert(visibleOperationControls <= 12, `operation fast path exposes ${visibleOperationControls} controls; expected at most 12`);
    await compareScreenshot("operation-desktop.png", await desktop.page.screenshot());
    await desktop.context.close();

    const mobile = await preparePage(browser, { width: 390, height: 844 });
    const mobileMetrics = await mobile.page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      pageHeight: document.documentElement.scrollHeight,
      viewportHeight: innerHeight
    }));
    assert(mobileMetrics.scrollWidth <= mobileMetrics.clientWidth, "mobile dashboard has horizontal overflow");
    assert(mobileMetrics.pageHeight <= mobileMetrics.viewportHeight * 1.75, "collapsed mobile dashboard is still longer than 1.75 screens");
    await compareScreenshot("dashboard-mobile.png", await mobile.page.screenshot());

    await mobile.page.locator('.daily-command-actions [data-new-booking]').click();
    const mobileBookingAction = await mobile.page.locator("[data-slot-booking-form] [type=submit]").evaluate(element => {
      const rect = element.getBoundingClientRect();
      return { top: rect.top, bottom: rect.bottom, viewport: innerHeight };
    });
    assert(mobileBookingAction.top >= 0 && mobileBookingAction.bottom <= mobileBookingAction.viewport, "mobile booking save action must stay visible");
    await compareScreenshot("booking-mobile.png", await mobile.page.screenshot());
    await mobile.page.locator('[data-slot-booking-modal] [data-slot-booking-close]').first().click();

    await mobile.page.locator('.daily-command-actions [data-open-operation-modal]').click();
    const mobileModal = await mobile.page.locator(".operation-entry-dialog").evaluate(element => {
      const rect = element.getBoundingClientRect();
      return { left: rect.left, right: rect.right, width: rect.width, viewport: innerWidth };
    });
    assert(mobileModal.left >= 0 && mobileModal.right <= mobileModal.viewport, "mobile operation modal is clipped horizontally");
    await compareScreenshot("operation-mobile.png", await mobile.page.screenshot());
    await mobile.page.locator("[data-close-operation-modal]").click();

    await mobile.page.locator('.daily-command-actions [data-jump="reconcile"]').click();
    assert(await mobile.page.evaluate(() => window.scrollY) < 20, "changing views must reset stale scroll position");
    await mobile.page.locator("[data-copy-all-expected]").click();
    const reconciliationFilled = await mobile.page.locator("[data-reconcile-form]").evaluate(form => (
      ["countedCash", "countedCard", "countedTransfer"].every(name => String(form.elements[name].value).trim() !== "")
    ));
    assert(reconciliationFilled, "reviewed reconciliation fill must populate all three methods");
    await compareScreenshot("reconciliation-mobile.png", await mobile.page.screenshot());
    await mobile.context.close();
  } finally {
    await browser.close();
  }
}

try {
  await runVisualChecks();
  console.log("Visual regression and workflow checks passed.");
} catch (error) {
  console.error(error.message);
  if (serverLog) console.error(serverLog.split("\n").slice(-15).join("\n"));
  process.exitCode = 1;
} finally {
  server.kill();
  await Promise.all([
    rm(databasePath, { force: true }),
    rm(`${databasePath}-wal`, { force: true }),
    rm(`${databasePath}-shm`, { force: true })
  ]);
}
