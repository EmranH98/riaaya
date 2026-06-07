import { requireSession } from "./auth.js";
import { db, parseJson } from "../lib/database.js";
import { decryptSecret } from "../lib/security.js";

const JOFOTARA_ENDPOINT = "https://backend.jofotara.gov.jo/core/invoices/";

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

function setCors(req, res) {
  const configuredOrigin = process.env.ALLOWED_ORIGIN;
  if (configuredOrigin && req.headers.origin === configuredOrigin) {
    res.setHeader("Access-Control-Allow-Origin", configuredOrigin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-CSRF-Token");
}

function normalizeBody(body) {
  if (!body) return {};
  if (typeof body === "string") {
    try {
      return JSON.parse(body);
    } catch {
      return {};
    }
  }
  return body;
}

function cleanPhone(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.startsWith("962")) return digits;
  if (digits.startsWith("0")) return `962${digits.slice(1)}`;
  return digits;
}

function storedIntegration(clinicId, provider) {
  const row = db.prepare("select * from clinic_integrations where clinic_id = ? and provider = ?")
    .get(clinicId, provider);
  if (!row) return null;
  return {
    ...parseJson(row.config_json, {}),
    secret: row.secret_cipher ? decryptSecret(row.secret_cipher) : ""
  };
}

function integrationConfig(clinicId) {
  const whatsapp = storedIntegration(clinicId, "whatsapp") || {
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || "",
    graphApiVersion: process.env.WHATSAPP_GRAPH_API_VERSION || "",
    secret: process.env.WHATSAPP_ACCESS_TOKEN || ""
  };
  const sms = storedIntegration(clinicId, "sms") || {
    endpoint: process.env.SMS_API_URL || "",
    senderId: process.env.SMS_SENDER_ID || "RIAAYA",
    provider: process.env.SMS_PROVIDER || "custom",
    secret: process.env.SMS_API_KEY || ""
  };
  const jofotara = storedIntegration(clinicId, "jofotara") || {
    clientId: process.env.JOFOTARA_CLIENT_ID || "",
    submissionEnabled: process.env.JOFOTARA_ENABLE_SUBMISSION === "true",
    secret: process.env.JOFOTARA_SECRET_KEY || ""
  };
  return { whatsapp, sms, jofotara };
}

function integrationStatus(clinicId) {
  const integrations = integrationConfig(clinicId);
  return {
    whatsapp: {
      configured: Boolean(integrations.whatsapp.secret && integrations.whatsapp.phoneNumberId && integrations.whatsapp.graphApiVersion)
    },
    sms: {
      configured: Boolean(integrations.sms.endpoint && integrations.sms.secret),
      provider: integrations.sms.provider || "custom"
    },
    jofotara: {
      configured: Boolean(integrations.jofotara.clientId && integrations.jofotara.secret),
      submissionEnabled: integrations.jofotara.submissionEnabled === true
    }
  };
}

async function sendWhatsApp(input, integration) {
  const status = {
    configured: Boolean(integration.secret && integration.phoneNumberId && integration.graphApiVersion)
  };
  const to = cleanPhone(input.to);
  const templateName = String(input.templateName || "").trim();

  if (!to || !templateName) {
    return { ok: false, statusCode: 400, error: "missing_whatsapp_fields" };
  }

  if (!status.configured) {
    return {
      ok: true,
      statusCode: 202,
      mode: "preview",
      channel: "whatsapp",
      recipient: to
    };
  }

  const languageCode = String(input.languageCode || "ar").trim();
  const components = Array.isArray(input.components) ? input.components : [];
  const url = `https://graph.facebook.com/${integration.graphApiVersion}/${integration.phoneNumberId}/messages`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${integration.secret}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "template",
      template: {
        name: templateName,
        language: { code: languageCode },
        components
      }
    })
  });
  const text = await response.text();
  let payload = text;
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    // Preserve plain-text provider errors without leaking server credentials.
  }

  if (!response.ok) {
    return {
      ok: false,
      statusCode: response.status,
      error: "whatsapp_send_failed",
      provider: payload
    };
  }

  return { ok: true, statusCode: 200, mode: "live", channel: "whatsapp", provider: payload };
}

async function sendSms(input, integration) {
  const status = { configured: Boolean(integration.endpoint && integration.secret) };
  const to = cleanPhone(input.to);
  const message = String(input.message || "").trim();

  if (!to || !message) {
    return { ok: false, statusCode: 400, error: "missing_sms_fields" };
  }

  if (!status.configured) {
    return {
      ok: true,
      statusCode: 202,
      mode: "preview",
      channel: "sms",
      recipient: to
    };
  }

  const response = await fetch(integration.endpoint, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${integration.secret}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      to,
      message,
      senderId: integration.senderId || "RIAAYA"
    })
  });
  const text = await response.text();
  let payload = text;
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    // Some local SMS providers return a plain-text delivery identifier.
  }

  if (!response.ok) {
    return {
      ok: false,
      statusCode: response.status,
      error: "sms_send_failed",
      provider: payload
    };
  }

  return { ok: true, statusCode: 200, mode: "live", channel: "sms", provider: payload };
}

async function submitJoFotara(input, integration) {
  const status = {
    configured: Boolean(integration.clientId && integration.secret),
    submissionEnabled: integration.submissionEnabled === true
  };
  const invoiceXml = String(input.invoiceXml || "").trim();

  if (!invoiceXml) {
    return { ok: false, statusCode: 400, error: "missing_invoice_xml" };
  }

  if (!status.configured || !status.submissionEnabled) {
    return {
      ok: true,
      statusCode: 202,
      mode: "preview",
      channel: "jofotara",
      validationRequired: true
    };
  }

  const response = await fetch(JOFOTARA_ENDPOINT, {
    method: "POST",
    headers: {
      "Client-Id": integration.clientId,
      "Secret-Key": integration.secret,
      "Content-Type": "application/json",
      "Accept": "application/json"
    },
    body: JSON.stringify({
      invoice: Buffer.from(invoiceXml, "utf8").toString("base64")
    })
  });
  const text = await response.text();
  let payload = text;
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    // Keep provider text for diagnostics without exposing credentials.
  }

  if (!response.ok) {
    return {
      ok: false,
      statusCode: response.status,
      error: "jofotara_submission_failed",
      provider: payload
    };
  }

  return { ok: true, statusCode: 200, mode: "live", channel: "jofotara", provider: payload };
}

export default async function handler(req, res) {
  setCors(req, res);

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method === "GET") {
    const auth = requireSession(req, res);
    if (!auth) return;
    sendJson(res, 200, { ok: true, integrations: integrationStatus(auth.user.clinicId) });
    return;
  }

  if (req.method !== "POST") {
    sendJson(res, 405, { error: "method_not_allowed" });
    return;
  }

  const input = normalizeBody(req.body);
  const channel = String(input.channel || "").toLowerCase();
  const auth = requireSession(req, res, { csrf: true });
  if (!auth) return;
  const permissions = new Set(auth.user.permissionFeatures || []);
  const isAdmin = auth.user.role === "admin";
  const allowed = isAdmin
    || (channel === "whatsapp" && permissions.has("send_role_digests"))
    || (channel === "sms" && permissions.has("send_sms_campaigns"))
    || (channel === "jofotara" && permissions.has("manage_jofotara"));
  if (!allowed) {
    sendJson(res, 403, { error: "permission_denied" });
    return;
  }

  try {
    const integrations = integrationConfig(auth.user.clinicId);
    let result;
    if (channel === "whatsapp") result = await sendWhatsApp(input, integrations.whatsapp);
    else if (channel === "sms") result = await sendSms(input, integrations.sms);
    else if (channel === "jofotara") result = await submitJoFotara(input, integrations.jofotara);
    else result = { ok: false, statusCode: 400, error: "unsupported_channel" };

    sendJson(res, result.statusCode, result);
  } catch (error) {
    console.error("Communication provider error", error);
    sendJson(res, 502, { ok: false, error: "provider_request_failed" });
  }
}
