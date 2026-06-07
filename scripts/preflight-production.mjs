import { access, mkdir, unlink, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { dirname } from "node:path";
import { validatePassword } from "../lib/security.js";

const required = [
  "RIAAYA_DB_PATH",
  "RIAAYA_OWNER_EMAIL",
  "RIAAYA_OWNER_PASSWORD",
  "RIAAYA_ENCRYPTION_KEY"
];

const errors = [];
const warnings = [];

const majorVersion = Number(process.versions.node.split(".")[0]);
if (majorVersion < 24) {
  errors.push(`Node.js 24 or newer is required. Current version: ${process.version}`);
}

if (process.env.NODE_ENV !== "production") {
  warnings.push("NODE_ENV is not set to production.");
}

required.forEach(name => {
  if (!String(process.env[name] || "").trim()) {
    errors.push(`${name} is required.`);
  }
});

const ownerEmail = String(process.env.RIAAYA_OWNER_EMAIL || "").trim();
if (ownerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerEmail)) {
  errors.push("RIAAYA_OWNER_EMAIL must be a valid email address.");
}

const ownerPassword = String(process.env.RIAAYA_OWNER_PASSWORD || "");
if (ownerPassword && !validatePassword(ownerPassword)) {
  errors.push("RIAAYA_OWNER_PASSWORD must be at least 12 characters and include uppercase, lowercase, number, and symbol.");
}

const encryptionKey = String(process.env.RIAAYA_ENCRYPTION_KEY || "");
if (encryptionKey && encryptionKey.length < 32) {
  errors.push("RIAAYA_ENCRYPTION_KEY must be at least 32 characters.");
}

const allowedOrigin = String(process.env.ALLOWED_ORIGIN || "").trim();
if (allowedOrigin && !allowedOrigin.startsWith("https://")) {
  warnings.push("ALLOWED_ORIGIN should be the final HTTPS app URL.");
}

const databasePath = String(process.env.RIAAYA_DB_PATH || "");
if (databasePath) {
  const databaseDirectory = dirname(databasePath);
  const testPath = `${databaseDirectory}/.riaaya-write-test-${Date.now()}`;
  try {
    await mkdir(databaseDirectory, { recursive: true });
    await writeFile(testPath, "ok");
    await access(testPath, constants.R_OK | constants.W_OK);
    await unlink(testPath);
  } catch (error) {
    errors.push(`RIAAYA_DB_PATH directory is not writable: ${databaseDirectory}`);
  }
}

warnings.forEach(message => console.warn(`Warning: ${message}`));

if (errors.length) {
  console.error("Production preflight failed:");
  errors.forEach(error => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Production preflight passed.");
