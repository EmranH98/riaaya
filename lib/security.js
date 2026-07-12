import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  scryptSync,
  timingSafeEqual
} from "node:crypto";

const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 10;
const loginAttempts = new Map();

// Account-level lockout, independent of source IP — so a spoofed X-Forwarded-For
// can't buy unlimited guesses against one account (see clientIp below).
const ACCOUNT_WINDOW_MS = 60 * 60 * 1000;
const ACCOUNT_MAX_ATTEMPTS = 20;
const accountAttempts = new Map();
const RATE_LIMIT_MAP_MAX = 10_000;

// scrypt cost — encoded into new hashes so it can be raised without breaking
// verification of already-stored passwords. 2^16 balances strength against
// event-loop blocking on a small instance; bump SCRYPT_N to upgrade.
const SCRYPT_N = 1 << 16;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_MAXMEM = 256 * 1024 * 1024;

// Trusted reverse-proxy hops in front of the app (Render adds exactly one).
// The real client IP is that many entries from the RIGHT of X-Forwarded-For;
// everything to its left is attacker-controllable and must not be trusted.
const TRUSTED_PROXY_HOPS = Math.max(1, Number(process.env.RIAAYA_TRUSTED_PROXY_HOPS) || 1);

export function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

export function isValidEmail(value) {
  const email = normalizeEmail(value);
  if (email.length < 6 || email.length > 254) return false;
  if (email.includes("..")) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

export function hashPassword(password) {
  const salt = randomBytes(16);
  const derived = scryptSync(String(password), salt, 64, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P, maxmem: SCRYPT_MAXMEM });
  // New format encodes the cost so params are upgradeable; old 3-part hashes
  // (scrypt$salt$hash, default N=16384) still verify below.
  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt.toString("hex")}$${derived.toString("hex")}`;
}

export function verifyPassword(password, stored) {
  const parts = String(stored || "").split("$");
  if (parts[0] !== "scrypt") return false;
  let saltHex, hashHex, opts;
  if (parts.length === 6) {
    // scrypt$N$r$p$salt$hash
    const [, n, r, p, salt, hash] = parts;
    saltHex = salt; hashHex = hash;
    opts = { N: Number(n), r: Number(r), p: Number(p), maxmem: SCRYPT_MAXMEM };
  } else if (parts.length === 3) {
    // legacy scrypt$salt$hash (Node scrypt defaults)
    saltHex = parts[1]; hashHex = parts[2];
    opts = { maxmem: SCRYPT_MAXMEM };
  } else {
    return false;
  }
  if (!saltHex || !hashHex || !/^[0-9a-f]+$/i.test(saltHex) || !/^[0-9a-f]+$/i.test(hashHex)) return false;
  if (saltHex.length !== 32 || hashHex.length !== 128) return false;
  if (opts.N && (opts.N < 1 << 14 || opts.N > SCRYPT_N || (opts.N & (opts.N - 1)) !== 0)) return false;
  if (opts.r && (opts.r < 1 || opts.r > 16)) return false;
  if (opts.p && (opts.p < 1 || opts.p > 4)) return false;
  try {
    const actual = scryptSync(String(password), Buffer.from(saltHex, "hex"), 64, opts);
    const expected = Buffer.from(hashHex, "hex");
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

// A real (but useless) hash to run scrypt against when an email is unknown, so
// login timing for miss vs hit is equalized and there's no enumeration oracle.
export const DUMMY_PASSWORD_HASH = hashPassword(randomBytes(24).toString("hex"));

export function validatePassword(password) {
  const value = String(password || "");
  return value.length >= 12
    && /[a-z]/.test(value)
    && /[A-Z]/.test(value)
    && /\d/.test(value)
    && /[^A-Za-z0-9]/.test(value);
}

export function randomToken(bytes = 32) {
  return randomBytes(bytes).toString("base64url");
}

export function temporaryPassword() {
  return `Ra1!${randomBytes(12).toString("base64url")}`;
}

export function tokenHash(value) {
  return createHash("sha256").update(String(value || "")).digest("hex");
}

export function parseCookies(header = "") {
  return Object.fromEntries(
    String(header)
      .split(";")
      .map(part => part.trim())
      .filter(Boolean)
      .map(part => {
        const index = part.indexOf("=");
        const rawKey = index === -1 ? part : part.slice(0, index);
        const rawVal = index === -1 ? "" : part.slice(index + 1);
        // A malformed cookie (e.g. a stray %) must not throw and 500 every
        // request — fall back to the raw text when decoding fails.
        const safeDecode = value => { try { return decodeURIComponent(value); } catch { return value; } };
        return [safeDecode(rawKey), safeDecode(rawVal)];
      })
  );
}

export function sessionCookie(token, maxAgeSeconds) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `riaaya_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAgeSeconds}${secure}`;
}

export function clearSessionCookie() {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `riaaya_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure}`;
}

// The real client IP: the entry TRUSTED_PROXY_HOPS from the right of the
// X-Forwarded-For chain (what our own proxy appended), not the leftmost entry
// which the client can forge.
export function clientIp(req) {
  const chain = String(req.headers["x-forwarded-for"] || "")
    .split(",").map(part => part.trim()).filter(Boolean);
  if (chain.length) {
    const index = Math.max(0, chain.length - TRUSTED_PROXY_HOPS);
    return chain[index] || chain[chain.length - 1];
  }
  return req.socket?.remoteAddress || "";
}

export function loginRateLimitKey(req, email) {
  return `${clientIp(req)}:${normalizeEmail(email)}`;
}

export function isLoginRateLimited(key) {
  const now = Date.now();
  const current = loginAttempts.get(key);
  if (!current || now - current.startedAt > LOGIN_WINDOW_MS) {
    loginAttempts.set(key, { count: 0, startedAt: now });
    trimRateLimitMap(loginAttempts);
    return false;
  }
  return current.count >= LOGIN_MAX_ATTEMPTS;
}

export function recordLoginFailure(key) {
  const current = loginAttempts.get(key) || { count: 0, startedAt: Date.now() };
  current.count += 1;
  loginAttempts.set(key, current);
  trimRateLimitMap(loginAttempts);
}

export function clearLoginFailures(key) {
  loginAttempts.delete(key);
}

function trimRateLimitMap(map) {
  while (map.size > RATE_LIMIT_MAP_MAX) {
    const oldest = map.keys().next().value;
    if (oldest === undefined) break;
    map.delete(oldest);
  }
}

// Account-level lockout keyed only on the email — holds even if the attacker
// rotates source IPs (or forges X-Forwarded-For).
export function isAccountLocked(email) {
  const key = normalizeEmail(email);
  const now = Date.now();
  const current = accountAttempts.get(key);
  if (!current || now - current.startedAt > ACCOUNT_WINDOW_MS) {
    accountAttempts.set(key, { count: 0, startedAt: now });
    trimRateLimitMap(accountAttempts);
    return false;
  }
  return current.count >= ACCOUNT_MAX_ATTEMPTS;
}

export function recordAccountFailure(email) {
  const key = normalizeEmail(email);
  const now = Date.now();
  const current = accountAttempts.get(key);
  if (!current || now - current.startedAt > ACCOUNT_WINDOW_MS) {
    accountAttempts.set(key, { count: 1, startedAt: now });
    trimRateLimitMap(accountAttempts);
    return;
  }
  current.count += 1;
  trimRateLimitMap(accountAttempts);
}

export function clearAccountFailures(email) {
  accountAttempts.delete(normalizeEmail(email));
}

// Bound both maps so a flood of unique emails can't grow memory unbounded.
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of loginAttempts) {
    if (now - value.startedAt > LOGIN_WINDOW_MS) loginAttempts.delete(key);
  }
  for (const [key, value] of accountAttempts) {
    if (now - value.startedAt > ACCOUNT_WINDOW_MS) accountAttempts.delete(key);
  }
  trimRateLimitMap(loginAttempts);
  trimRateLimitMap(accountAttempts);
}, 5 * 60 * 1000).unref?.();

export function safeText(value, maxLength = 250) {
  return String(value || "")
    .replace(/[<>]/g, "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .trim()
    .slice(0, maxLength);
}

function deriveKey(raw) {
  return createHash("sha256").update(raw).digest();
}

// Primary key encrypts; primary + optional old key both DECRYPT, so a leaked
// key can be rotated: set RIAAYA_ENCRYPTION_KEY to the new value and
// RIAAYA_ENCRYPTION_KEY_OLD to the leaked one, run the re-encrypt script, then
// drop the old key. Returns the primary first for encryption.
function encryptionKeys() {
  const configured = process.env.RIAAYA_ENCRYPTION_KEY;
  if (!configured && process.env.NODE_ENV === "production") {
    throw new Error("RIAAYA_ENCRYPTION_KEY is required in production.");
  }
  const keys = [deriveKey(configured || "riaaya-development-encryption-key-change-me")];
  if (process.env.RIAAYA_ENCRYPTION_KEY_OLD) keys.push(deriveKey(process.env.RIAAYA_ENCRYPTION_KEY_OLD));
  return keys;
}

export function encryptSecret(value) {
  if (!value) return "";
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKeys()[0], iv);
  const encrypted = Buffer.concat([cipher.update(String(value), "utf8"), cipher.final()]);
  return `v1.${iv.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}.${encrypted.toString("base64url")}`;
}

export function decryptSecret(value) {
  if (!value) return "";
  const [version, iv, tag, encrypted] = String(value).split(".");
  if (version !== "v1") return "";
  if (!iv || !tag || !encrypted) throw new Error("secret_decrypt_failed");
  const ivBuf = Buffer.from(iv, "base64url");
  const tagBuf = Buffer.from(tag, "base64url");
  const dataBuf = Buffer.from(encrypted, "base64url");
  for (const key of encryptionKeys()) {
    try {
      const decipher = createDecipheriv("aes-256-gcm", key, ivBuf);
      decipher.setAuthTag(tagBuf);
      return Buffer.concat([decipher.update(dataBuf), decipher.final()]).toString("utf8");
    } catch { /* try the next (rotation) key */ }
  }
  throw new Error("secret_decrypt_failed");
}

// Encrypt a large blob (clinic state JSON) at rest. Same AES-256-GCM primitive
// with an "e1:" prefix so a reader can tell ciphertext from legacy plaintext.
const BLOB_PREFIX = "e1:";

export function encryptBlob(plaintext) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKeys()[0], iv);
  const encrypted = Buffer.concat([cipher.update(String(plaintext), "utf8"), cipher.final()]);
  return BLOB_PREFIX + [
    iv.toString("base64"),
    cipher.getAuthTag().toString("base64"),
    encrypted.toString("base64")
  ].join(".");
}

export function isEncryptedBlob(value) {
  return typeof value === "string" && value.startsWith(BLOB_PREFIX);
}

// Transparent read: decrypts an "e1:" blob (trying rotation keys); returns
// legacy plaintext unchanged so a not-yet-migrated DB still reads.
export function decryptBlob(value) {
  if (!isEncryptedBlob(value)) return value == null ? "" : String(value);
  const [iv, tag, data] = value.slice(BLOB_PREFIX.length).split(".");
  if (!iv || !tag || !data) throw new Error("blob_decrypt_failed");
  const ivBuf = Buffer.from(iv, "base64");
  const tagBuf = Buffer.from(tag, "base64");
  const dataBuf = Buffer.from(data, "base64");
  for (const key of encryptionKeys()) {
    try {
      const decipher = createDecipheriv("aes-256-gcm", key, ivBuf);
      decipher.setAuthTag(tagBuf);
      return Buffer.concat([decipher.update(dataBuf), decipher.final()]).toString("utf8");
    } catch { /* try the next (rotation) key */ }
  }
  throw new Error("blob_decrypt_failed");
}

const BINARY_PREFIX = Buffer.from("RIAAYA-BINARY-1\0", "ascii");

export function isEncryptedBinary(value) {
  const buffer = Buffer.isBuffer(value) ? value : Buffer.from(value || "");
  return buffer.length > BINARY_PREFIX.length && buffer.subarray(0, BINARY_PREFIX.length).equals(BINARY_PREFIX);
}

// Patient photos are encrypted as binary rather than base64 so large files do
// not expand on disk. Legacy plaintext files remain readable and are upgraded
// by the key-rotation script.
export function encryptBinary(value) {
  const input = Buffer.isBuffer(value) ? value : Buffer.from(value || "");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKeys()[0], iv);
  const encrypted = Buffer.concat([cipher.update(input), cipher.final()]);
  return Buffer.concat([BINARY_PREFIX, iv, cipher.getAuthTag(), encrypted]);
}

export function decryptBinary(value) {
  const input = Buffer.isBuffer(value) ? value : Buffer.from(value || "");
  if (!isEncryptedBinary(input)) return input;
  const offset = BINARY_PREFIX.length;
  const iv = input.subarray(offset, offset + 12);
  const tag = input.subarray(offset + 12, offset + 28);
  const encrypted = input.subarray(offset + 28);
  if (iv.length !== 12 || tag.length !== 16 || !encrypted.length) throw new Error("binary_decrypt_failed");
  for (const key of encryptionKeys()) {
    try {
      const decipher = createDecipheriv("aes-256-gcm", key, iv);
      decipher.setAuthTag(tag);
      return Buffer.concat([decipher.update(encrypted), decipher.final()]);
    } catch { /* try the next (rotation) key */ }
  }
  throw new Error("binary_decrypt_failed");
}
