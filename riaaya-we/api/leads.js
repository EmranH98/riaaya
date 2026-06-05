const REQUIRED_FIELDS = ["name", "clinic", "phone", "city", "plan"];

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

function setCors(req, res) {
  const configuredOrigin = process.env.ALLOWED_ORIGIN;
  const origin = configuredOrigin || req.headers.origin || "*";
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
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

function cleanLead(input) {
  return {
    name: String(input.name || "").trim(),
    clinic: String(input.clinic || "").trim(),
    phone: String(input.phone || "").trim(),
    city: String(input.city || "").trim(),
    plan: String(input.plan || "").trim(),
    clinic_size: String(input.size || input.clinic_size || "").trim(),
    notes: String(input.notes || "").trim(),
    source: "landing"
  };
}

function missingFields(lead) {
  return REQUIRED_FIELDS.filter(field => !lead[field]);
}

async function insertLead(lead, userAgent) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return {
      configured: false,
      lead: { ...lead, user_agent: userAgent, created_at: new Date().toISOString() }
    };
  }

  const response = await fetch(`${supabaseUrl}/rest/v1/leads`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Prefer": "return=representation",
      "apikey": serviceRoleKey,
      "Authorization": `Bearer ${serviceRoleKey}`
    },
    body: JSON.stringify([{ ...lead, user_agent: userAgent }])
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(`Supabase insert failed: ${response.status} ${text}`);
  }

  const rows = text ? JSON.parse(text) : [];
  return { configured: true, lead: rows[0] || lead };
}

export default async function handler(req, res) {
  setCors(req, res);

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== "POST") {
    sendJson(res, 405, { error: "method_not_allowed" });
    return;
  }

  const lead = cleanLead(normalizeBody(req.body));
  const missing = missingFields(lead);

  if (missing.length) {
    sendJson(res, 400, { error: "missing_fields", fields: missing });
    return;
  }

  try {
    const result = await insertLead(lead, req.headers["user-agent"] || "");
    sendJson(res, result.configured ? 201 : 202, {
      ok: true,
      mode: result.configured ? "database" : "preview",
      lead: result.lead
    });
  } catch (error) {
    console.error(error);
    sendJson(res, 500, { error: "lead_insert_failed" });
  }
}
