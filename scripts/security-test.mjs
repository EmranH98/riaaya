#!/usr/bin/env node
import { randomBytes, scryptSync } from "node:crypto";

process.env.NODE_ENV = "development";
process.env.RIAAYA_ENCRYPTION_KEY = "security-test-primary-key-at-least-32-characters";

const security = await import(`../lib/security.js?security-test=${Date.now()}`);

let passed = 0;
function ok(condition, message) {
  if (!condition) throw new Error(`ASSERT FAILED: ${message}`);
  passed += 1;
}

const password = "StrongPassword!2026";
const currentHash = security.hashPassword(password);
ok(security.verifyPassword(password, currentHash), "current password hash verifies");
ok(!security.verifyPassword("wrong", currentHash), "wrong password is rejected");

const legacySalt = randomBytes(16);
const legacyDerived = scryptSync(password, legacySalt, 64);
const legacyHash = `scrypt$${legacySalt.toString("hex")}$${legacyDerived.toString("hex")}`;
ok(security.verifyPassword(password, legacyHash), "legacy password hash remains compatible");
ok(!security.verifyPassword(password, "scrypt$999999999$8$1$00$00"), "hostile password parameters are rejected without throwing");

const secretCipher = security.encryptSecret("provider-secret");
const blobCipher = security.encryptBlob(JSON.stringify({ patient: "protected" }));
const binaryPlaintext = Buffer.from("private-photo-bytes");
const binaryCipher = security.encryptBinary(binaryPlaintext);
ok(security.decryptSecret(secretCipher) === "provider-secret", "secret encryption round-trips");
ok(JSON.parse(security.decryptBlob(blobCipher)).patient === "protected", "state encryption round-trips");
ok(security.decryptBinary(binaryCipher).equals(binaryPlaintext), "binary encryption round-trips");
ok(!binaryCipher.includes(binaryPlaintext), "binary ciphertext does not contain the plaintext");

process.env.RIAAYA_ENCRYPTION_KEY = "security-test-new-key-at-least-32-characters";
process.env.RIAAYA_ENCRYPTION_KEY_OLD = "security-test-primary-key-at-least-32-characters";
ok(security.decryptSecret(secretCipher) === "provider-secret", "old key fallback decrypts secrets during rotation");
ok(security.decryptBlob(blobCipher).includes("protected"), "old key fallback decrypts state during rotation");
ok(security.decryptBinary(binaryCipher).equals(binaryPlaintext), "old key fallback decrypts photos during rotation");

delete process.env.RIAAYA_ENCRYPTION_KEY_OLD;
let wrongKeyRejected = false;
try { security.decryptBlob(blobCipher); } catch { wrongKeyRejected = true; }
ok(wrongKeyRejected, "wrong state-encryption key fails closed");
let wrongPhotoKeyRejected = false;
try { security.decryptBinary(binaryCipher); } catch { wrongPhotoKeyRejected = true; }
ok(wrongPhotoKeyRejected, "wrong photo-encryption key fails closed");

const cookies = security.parseCookies("good=value; malformed=%E0%A4%A");
ok(cookies.good === "value" && cookies.malformed === "%E0%A4%A", "malformed cookies cannot crash request parsing");
ok(security.clientIp({ headers: { "x-forwarded-for": "forged, 203.0.113.8" }, socket: {} }) === "203.0.113.8", "trusted proxy parsing ignores the spoofable leftmost address");

console.log(`✓ security regression tests passed — ${passed} assertions`);
