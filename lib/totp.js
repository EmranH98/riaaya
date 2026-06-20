// RFC 6238 TOTP (and RFC 4226 HOTP) using only node:crypto — no dependencies.
// Compatible with Google Authenticator / Authy / Microsoft Authenticator
// (SHA-1, 6 digits, 30-second period).
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function base32Encode(buffer) {
  let bits = 0;
  let value = 0;
  let output = "";
  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  return output;
}

export function base32Decode(input) {
  const clean = String(input || "").toUpperCase().replace(/=+$/, "").replace(/[^A-Z2-7]/g, "");
  let bits = 0;
  let value = 0;
  const bytes = [];
  for (const char of clean) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index === -1) continue;
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

// 160-bit secret, base32-encoded (the standard authenticator-app format).
export function generateTotpSecret() {
  return base32Encode(randomBytes(20));
}

function hotp(secretBuffer, counter) {
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));
  const digest = createHmac("sha1", secretBuffer).update(counterBuffer).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binary = ((digest[offset] & 0x7f) << 24)
    | ((digest[offset + 1] & 0xff) << 16)
    | ((digest[offset + 2] & 0xff) << 8)
    | (digest[offset + 3] & 0xff);
  return String(binary % 1_000_000).padStart(6, "0");
}

export function totpCode(secretBase32, atMs = Date.now(), stepSeconds = 30) {
  const counter = Math.floor(atMs / 1000 / stepSeconds);
  return hotp(base32Decode(secretBase32), counter);
}

// Accepts codes within ±`window` steps to tolerate clock drift.
export function verifyTotp(secretBase32, token, { window = 1, atMs = Date.now(), stepSeconds = 30 } = {}) {
  const clean = String(token || "").replace(/\D/g, "");
  if (clean.length !== 6) return false;
  const secretBuffer = base32Decode(secretBase32);
  if (!secretBuffer.length) return false;
  const counter = Math.floor(atMs / 1000 / stepSeconds);
  const candidate = Buffer.from(clean);
  for (let drift = -window; drift <= window; drift += 1) {
    const expected = Buffer.from(hotp(secretBuffer, counter + drift));
    if (expected.length === candidate.length && timingSafeEqual(expected, candidate)) return true;
  }
  return false;
}

export function otpauthUrl(secretBase32, accountLabel, issuer = "RIAAYA") {
  const label = encodeURIComponent(`${issuer}:${accountLabel}`);
  const params = new URLSearchParams({
    secret: secretBase32,
    issuer,
    algorithm: "SHA1",
    digits: "6",
    period: "30"
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}

// One-time backup codes (shown once, stored only as hashes).
export function generateBackupCodes(count = 8) {
  return Array.from({ length: count }, () => {
    const raw = randomBytes(5).toString("hex").slice(0, 10); // 10 hex chars
    return `${raw.slice(0, 5)}-${raw.slice(5)}`;
  });
}
