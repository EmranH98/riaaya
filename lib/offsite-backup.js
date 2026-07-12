import { basename } from "node:path";
import { createHash, createHmac } from "node:crypto";
import { createReadStream, readFileSync, statSync } from "node:fs";

function env(name) {
  return String(process.env[name] || "").trim();
}

function encodePathPart(value) {
  return encodeURIComponent(value).replace(/[!'()*]/g, char =>
    `%${char.charCodeAt(0).toString(16).toUpperCase()}`
  );
}

function sha256Hex(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function sha256FileHex(filePath) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(filePath)) hash.update(chunk);
  return hash.digest("hex");
}

function hmac(key, value, output) {
  return createHmac("sha256", key).update(value).digest(output);
}

function signingKey(secret, date, region) {
  const kDate = hmac(`AWS4${secret}`, date);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, "s3");
  return hmac(kService, "aws4_request");
}

function offsiteConfig() {
  const bucket = env("LITESTREAM_BUCKET") || env("RIAAYA_OFFSITE_BUCKET");
  const accessKeyId = env("LITESTREAM_ACCESS_KEY_ID") || env("RIAAYA_OFFSITE_ACCESS_KEY_ID");
  const secretAccessKey = env("LITESTREAM_SECRET_ACCESS_KEY") || env("RIAAYA_OFFSITE_SECRET_ACCESS_KEY");
  const endpoint = (env("LITESTREAM_ENDPOINT") || env("RIAAYA_OFFSITE_ENDPOINT")).replace(/\/+$/, "");
  const region = env("LITESTREAM_REGION") || env("RIAAYA_OFFSITE_REGION") || "auto";
  const prefix = (env("LITESTREAM_PREFIX") || env("RIAAYA_OFFSITE_PREFIX") || "riaaya/backups")
    .replace(/^\/+|\/+$/g, "");
  const cloudflareApiToken = env("RIAAYA_CLOUDFLARE_API_TOKEN") || env("CLOUDFLARE_API_TOKEN");
  const accountId = env("RIAAYA_CLOUDFLARE_ACCOUNT_ID") || env("CLOUDFLARE_ACCOUNT_ID") || parseCloudflareAccountId(endpoint);

  const s3Configured = Boolean(bucket && accessKeyId && secretAccessKey && endpoint);
  const cloudflareApiConfigured = Boolean(bucket && accountId && cloudflareApiToken);
  const configured = s3Configured || cloudflareApiConfigured;
  return {
    configured,
    s3Configured,
    cloudflareApiConfigured,
    bucket,
    accessKeyId,
    secretAccessKey,
    endpoint,
    region,
    prefix,
    accountId,
    cloudflareApiToken
  };
}

export function offsiteBackupStatus() {
  const config = offsiteConfig();
  const provider = config.cloudflareApiConfigured && config.s3Configured
    ? "s3_compatible_with_cloudflare_api_fallback"
    : config.cloudflareApiConfigured
      ? "cloudflare_api"
      : config.s3Configured
        ? "s3_compatible"
        : "not_configured";
  return {
    configured: config.configured,
    provider,
    bucket: config.configured ? config.bucket : "",
    endpoint: config.configured ? config.endpoint : "",
    prefix: config.configured ? config.prefix : "",
    warning: config.configured
      ? ""
      : "Off-site backup bucket is not configured. Local /data backups work, but a disk/account loss would still need an external copy."
  };
}

function parseCloudflareAccountId(endpoint) {
  try {
    const host = new URL(endpoint).host;
    const accountId = host.split(".")[0];
    return /^[a-f0-9]{32}$/i.test(accountId) ? accountId : "";
  } catch {
    return "";
  }
}

async function putObjectS3({ key, body, contentType, payloadHash = "", contentLength = 0 }) {
  const config = offsiteConfig();
  if (!config.s3Configured) return { configured: false };

  const endpoint = new URL(config.endpoint);
  const canonicalUri = `/${[config.bucket, ...key.split("/")].map(encodePathPart).join("/")}`;
  const url = `${config.endpoint}${canonicalUri}`;
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const resolvedPayloadHash = payloadHash || sha256Hex(body);
  const headers = {
    host: endpoint.host,
    "content-type": contentType,
    "x-amz-content-sha256": resolvedPayloadHash,
    "x-amz-date": amzDate
  };
  const signedHeaders = Object.keys(headers).sort().join(";");
  const canonicalHeaders = Object.keys(headers)
    .sort()
    .map(name => `${name}:${headers[name]}\n`)
    .join("");
  const canonicalRequest = [
    "PUT",
    canonicalUri,
    "",
    canonicalHeaders,
    signedHeaders,
    resolvedPayloadHash
  ].join("\n");
  const credentialScope = `${dateStamp}/${config.region}/s3/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest)
  ].join("\n");
  const signature = hmac(signingKey(config.secretAccessKey, dateStamp, config.region), stringToSign, "hex");
  const authorization = [
    `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${credentialScope}`,
    `SignedHeaders=${signedHeaders}`,
    `Signature=${signature}`
  ].join(", ");

  const request = {
    method: "PUT",
    headers: {
      "Content-Type": contentType,
      "X-Amz-Content-Sha256": resolvedPayloadHash,
      "X-Amz-Date": amzDate,
      "Authorization": authorization,
      ...(contentLength ? { "Content-Length": String(contentLength) } : {})
    },
    body
  };
  if (!Buffer.isBuffer(body)) request.duplex = "half";
  const response = await fetch(url, request);
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`offsite_upload_failed: ${response.status} ${text.slice(0, 300)}`);
  }
  return { configured: true, provider: "s3_compatible", bucket: config.bucket, key };
}

async function putObjectCloudflareApi({ key, body, contentType, contentLength = 0 }) {
  const config = offsiteConfig();
  if (!config.cloudflareApiConfigured) return { configured: false };

  const encodedKey = key.split("/").map(encodePathPart).join("/");
  const url = `https://api.cloudflare.com/client/v4/accounts/${encodePathPart(config.accountId)}/r2/buckets/${encodePathPart(config.bucket)}/objects/${encodedKey}`;
  const request = {
    method: "PUT",
    headers: {
      "Authorization": `Bearer ${config.cloudflareApiToken}`,
      "Content-Type": contentType,
      ...(contentLength ? { "Content-Length": String(contentLength) } : {})
    },
    body
  };
  if (!Buffer.isBuffer(body)) request.duplex = "half";
  const response = await fetch(url, request);
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`cloudflare_api_upload_failed: ${response.status} ${text.slice(0, 300)}`);
  }
  return { configured: true, provider: "cloudflare_api", bucket: config.bucket, key };
}

async function putFile({ key, filePath, contentType }) {
  const config = offsiteConfig();
  if (!config.configured) return { configured: false };
  const contentLength = statSync(filePath).size;
  const errors = [];
  if (config.s3Configured) {
    try {
      const payloadHash = await sha256FileHex(filePath);
      return await putObjectS3({ key, body: createReadStream(filePath), contentType, payloadHash, contentLength });
    } catch (error) {
      errors.push(`s3: ${String(error?.message || error)}`);
    }
  }
  if (config.cloudflareApiConfigured) {
    try {
      return await putObjectCloudflareApi({ key, body: createReadStream(filePath), contentType, contentLength });
    } catch (error) {
      errors.push(`cloudflare_api: ${String(error?.message || error)}`);
    }
  }
  throw new Error(`offsite_upload_failed: ${errors.join(" | ") || "no upload provider configured"}`);
}

async function putObject({ key, body, contentType }) {
  const config = offsiteConfig();
  if (!config.configured) return { configured: false };

  const errors = [];
  if (config.s3Configured) {
    try {
      return await putObjectS3({ key, body, contentType });
    } catch (error) {
      errors.push(`s3: ${String(error?.message || error)}`);
    }
  }

  if (config.cloudflareApiConfigured) {
    try {
      return await putObjectCloudflareApi({ key, body, contentType });
    } catch (error) {
      errors.push(`cloudflare_api: ${String(error?.message || error)}`);
    }
  }

  throw new Error(`offsite_upload_failed: ${errors.join(" | ") || "no upload provider configured"}`);
}

// Owner-triggered live check: uploads a tiny object to the configured bucket so
// the real credentials/endpoint/signing can be verified without a full backup.
export async function testOffsiteConnectivity() {
  const config = offsiteConfig();
  if (!config.configured) {
    return { configured: false, ok: false, error: "off-site bucket env vars are not set" };
  }
  try {
    const key = `${config.prefix}/_connectivity-check.txt`;
    await putObject({
      key,
      body: Buffer.from(`riaaya off-site connectivity check ${new Date().toISOString()}`),
      contentType: "text/plain; charset=utf-8"
    });
    return { configured: true, ok: true, bucket: config.bucket, endpoint: config.endpoint, key };
  } catch (error) {
    return { configured: true, ok: false, bucket: config.bucket, endpoint: config.endpoint, error: String(error?.message || error).slice(0, 400) };
  }
}

// Upload any file (e.g. the photo archive) to the same off-site bucket.
export async function uploadFileOffsite({ filePath, contentType = "application/octet-stream" } = {}) {
  const config = offsiteConfig();
  if (!config.configured) return { configured: false };
  if (!filePath) throw new Error("filePath is required for off-site upload.");
  const fileName = basename(filePath);
  const key = `${config.prefix}/${fileName}`;
  const uploaded = await putFile({ key, filePath, contentType });
  return { ...uploaded, key, configured: true };
}

export async function uploadBackupOffsite({ backupPath, stats = {} } = {}) {
  const config = offsiteConfig();
  if (!config.configured) return { configured: false };
  if (!backupPath) throw new Error("backupPath is required for off-site upload.");

  const fileName = basename(backupPath);
  const key = `${config.prefix}/${fileName}`;
  const body = readFileSync(backupPath);
  const uploaded = await putObject({
    key,
    body,
    contentType: "application/vnd.sqlite3"
  });

  const fileStats = statSync(backupPath);
  const manifest = {
    uploadedAt: new Date().toISOString(),
    fileName,
    key,
    sizeBytes: fileStats.size,
    clinicCount: stats.clinicCount,
    userCount: stats.userCount
  };
  const manifestKey = `${config.prefix}/latest.json`;
  await putObject({
    key: manifestKey,
    body: Buffer.from(JSON.stringify(manifest, null, 2)),
    contentType: "application/json; charset=utf-8"
  });

  return { ...uploaded, manifestKey };
}
