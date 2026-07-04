// Ratchet guard for app.css color discipline: raw hex colors belong in :root
// (the token block) only. The count outside :root may only go DOWN — the
// build fails if a change introduces new raw hex instead of using tokens.
//
//   node scripts/css-guard.mjs            → check against the ratchet
//   node scripts/css-guard.mjs --update   → lower the ratchet after a cleanup
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const cssPath = fileURLToPath(new URL("../app.css", import.meta.url));
const ratchetPath = fileURLToPath(new URL("./css-guard.ratchet", import.meta.url));

const css = readFileSync(cssPath, "utf8");

// Everything after the closing brace of the first :root block.
const rootStart = css.indexOf(":root");
const rootEnd = css.indexOf("}", rootStart);
const body = css.slice(rootEnd + 1);

const matches = [...body.matchAll(/#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/g)].map(m => m[0].toLowerCase());
const count = matches.length;

let ratchet = Infinity;
try { ratchet = Number(readFileSync(ratchetPath, "utf8").trim()); } catch {}

if (process.argv.includes("--update")) {
  writeFileSync(ratchetPath, String(count) + "\n");
  console.log(`css-guard: ratchet set to ${count} raw hex colors outside :root`);
  process.exit(0);
}

const tally = {};
for (const hex of matches) tally[hex] = (tally[hex] || 0) + 1;
const top = Object.entries(tally).sort((a, b) => b[1] - a[1]).slice(0, 12)
  .map(([hex, n]) => `  ${hex} ×${n}`).join("\n");

if (count > ratchet) {
  console.error(`css-guard: FAIL — ${count} raw hex colors outside :root (ratchet is ${ratchet}).`);
  console.error(`Use the --status-* / --ink-* / --line tokens instead. Most common offenders:\n${top}`);
  process.exit(1);
}
console.log(`css-guard: OK — ${count} raw hex colors outside :root (ratchet ${ratchet === Infinity ? "unset" : ratchet}).`);
if (count) console.log(top);
