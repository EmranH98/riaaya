import { basename } from "node:path";
import { createHash, createHmac } from "node:crypto";
import { readFileSync, statSync } from "node:fs";

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

  const configured = Boolean(bucket && accessKeyId && secretAccessKey && endpoint);
  return { configured, bucket, accessKeyId, secretAccessKey, endpoint, region, prefix };
}

export function offsiteBackupStatus() {
  const config = offsiteConfig();
  return {
    configured: config.configured,
    provider: config.configured ? "s3_compatible" : "not_configured",
    bucket: config.configured ? config.bucket : "",
    endpoint: config.configured ? config.endpoint : "",
    prefix: config.configured ? config.prefix : "",
    warning: config.configured
      ? ""
      : "Off-site backup bucket is not configured. Local /data backups work, but a disk/account loss would still need an external copy."
  };
}

async function putObject({ key, body, contentType }) {
  const config = offsiteConfig();
  if (!config.configured) return { configured: false };

  const endpoint = new URL(config.endpoint);
  const canonicalUri = `/${[config.bucket, ...key.split("/")].map(encodePathPart).join("/")}`;
  const url = `${config.endpoint}${canonicalUri}`;
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = sha256Hex(body);
  const headers = {
    host: endpoint.host,
    "content-type": contentType,
    "x-amz-content-sha256": payloadHash,
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
    payloadHash
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

  const response = await fetch(url, {
    method: "PUT",
    headers: {
      "Content-Type": contentType,
      "X-Amz-Content-Sha256": payloadHash,
      "X-Amz-Date": amzDate,
      "Authorization": authorization
    },
    body
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`offsite_upload_failed: ${response.status} ${text.slice(0, 300)}`);
  }
  return { configured: true, bucket: config.bucket, key };
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
