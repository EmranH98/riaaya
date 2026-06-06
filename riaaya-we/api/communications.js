const JOFOTARA_ENDPOINT = "https://backend.jofotara.gov.jo/core/invoices/";

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

function setCors(req, res) {
  const configuredOrigin = process.env.ALLOWED_ORIGIN;
  const origin = configuredOrigin || req.headers.origin || "*";
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
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

function integrationStatus() {
  return {
    whatsapp: {
      configured: Boolean(
        process.env.WHATSAPP_ACCESS_TOKEN
        && process.env.WHATSAPP_PHONE_NUMBER_ID
        && process.env.WHATSAPP_GRAPH_API_VERSION
      )
    },
    sms: {
      configured: Boolean(process.env.SMS_API_URL && process.env.SMS_API_KEY),
      provider: process.env.SMS_PROVIDER || "custom"
    },
    jofotara: {
      configured: Boolean(process.env.JOFOTARA_CLIENT_ID && process.env.JOFOTARA_SECRET_KEY),
      submissionEnabled: process.env.JOFOTARA_ENABLE_SUBMISSION === "true"
    }
  };
}

async function sendWhatsApp(input) {
  const status = integrationStatus().whatsapp;
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
  const url = `https://graph.facebook.com/${process.env.WHATSAPP_GRAPH_API_VERSION}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
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

async function sendSms(input) {
  const status = integrationStatus().sms;
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

  const response = await fetch(process.env.SMS_API_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.SMS_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      to,
      message,
      senderId: process.env.SMS_SENDER_ID || "RIAAYA"
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

async function submitJoFotara(input) {
  const status = integrationStatus().jofotara;
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
      "Client-Id": process.env.JOFOTARA_CLIENT_ID,
      "Secret-Key": process.env.JOFOTARA_SECRET_KEY,
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
    sendJson(res, 200, { ok: true, integrations: integrationStatus() });
    return;
  }

  if (req.method !== "POST") {
    sendJson(res, 405, { error: "method_not_allowed" });
    return;
  }

  const input = normalizeBody(req.body);
  const channel = String(input.channel || "").toLowerCase();

  try {
    let result;
    if (channel === "whatsapp") result = await sendWhatsApp(input);
    else if (channel === "sms") result = await sendSms(input);
    else if (channel === "jofotara") result = await submitJoFotara(input);
    else result = { ok: false, statusCode: 400, error: "unsupported_channel" };

    sendJson(res, result.statusCode, result);
  } catch (error) {
    console.error("Communication provider error", error);
    sendJson(res, 502, { ok: false, error: "provider_request_failed" });
  }
}
