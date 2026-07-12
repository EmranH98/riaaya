import { connect as tlsConnect } from "node:tls";

const EMAIL_PROVIDER = (process.env.RIAAYA_EMAIL_PROVIDER || "").toLowerCase();
const RESEND_API_KEY = process.env.RIAAYA_RESEND_API_KEY || "";
const FROM_EMAIL = process.env.RIAAYA_EMAIL_FROM || "noreply@riaaya.clinic";
const SMTP_HOST = process.env.RIAAYA_SMTP_HOST || "";
const SMTP_PORT = Number(process.env.RIAAYA_SMTP_PORT || 465);
const SMTP_USER = process.env.RIAAYA_SMTP_USER || "";
const SMTP_PASS = process.env.RIAAYA_SMTP_PASS || "";

function selectedProvider() {
  if (EMAIL_PROVIDER) return EMAIL_PROVIDER;
  if (SMTP_HOST && SMTP_USER && SMTP_PASS) return "smtp";
  if (RESEND_API_KEY) return "resend";
  return "mock";
}

function emailAddress(value) {
  const clean = String(value || "").trim();
  return clean.match(/<([^>]+)>/)?.[1] || clean;
}

function encodeHeader(value) {
  const text = String(value || "");
  return /^[\x00-\x7F]*$/.test(text)
    ? text
    : `=?UTF-8?B?${Buffer.from(text, "utf8").toString("base64")}?=`;
}

function normalizeRecipients(to) {
  return (Array.isArray(to) ? to : [to]).map(emailAddress).filter(Boolean);
}

function dotStuff(value) {
  return String(value || "").replace(/\r?\n/g, "\r\n").replace(/^\./gm, "..");
}

function buildMessage({ to, subject, html, text }) {
  const recipients = normalizeRecipients(to);
  const headers = [
    `From: ${FROM_EMAIL}`,
    `To: ${recipients.join(", ")}`,
    `Subject: ${encodeHeader(subject)}`,
    "MIME-Version: 1.0",
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${Date.now()}.${Math.random().toString(16).slice(2)}@riaaya.local>`
  ];

  if (html && text) {
    const boundary = `riaaya-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    return [
      ...headers,
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      "",
      `--${boundary}`,
      'Content-Type: text/plain; charset="UTF-8"',
      "Content-Transfer-Encoding: 8bit",
      "",
      dotStuff(text),
      `--${boundary}`,
      'Content-Type: text/html; charset="UTF-8"',
      "Content-Transfer-Encoding: 8bit",
      "",
      dotStuff(html),
      `--${boundary}--`,
      ""
    ].join("\r\n");
  }

  return [
    ...headers,
    `Content-Type: ${html ? "text/html" : "text/plain"}; charset="UTF-8"`,
    "Content-Transfer-Encoding: 8bit",
    "",
    dotStuff(html || text),
    ""
  ].join("\r\n");
}

function readSmtpResponse(socket) {
  return new Promise((resolve, reject) => {
    let buffer = "";
    const cleanup = () => {
      socket.off("data", onData);
      socket.off("error", onError);
      socket.off("end", onEnd);
    };
    const onError = error => {
      cleanup();
      reject(error);
    };
    const onEnd = () => {
      cleanup();
      reject(new Error("smtp: connection closed"));
    };
    const onData = data => {
      buffer += data.toString("utf8");
      const lines = buffer.split(/\r?\n/).filter(Boolean);
      const last = lines.at(-1) || "";
      if (/^\d{3} /.test(last)) {
        cleanup();
        resolve({ code: Number(last.slice(0, 3)), text: lines.join("\n") });
      }
    };
    socket.on("data", onData);
    socket.on("error", onError);
    socket.on("end", onEnd);
  });
}

async function smtpCommand(socket, command, expectedCodes) {
  if (command) socket.write(`${command}\r\n`);
  const response = await readSmtpResponse(socket);
  const expected = Array.isArray(expectedCodes) ? expectedCodes : [expectedCodes];
  if (!expected.includes(response.code)) {
    throw new Error(`smtp: ${response.code} ${response.text.slice(0, 300)}`);
  }
  return response;
}

async function sendSmtpEmail(message) {
  const recipients = normalizeRecipients(message.to);
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    throw new Error("smtp: RIAAYA_SMTP_HOST, RIAAYA_SMTP_USER, and RIAAYA_SMTP_PASS are required");
  }

  const socket = tlsConnect({
    host: SMTP_HOST,
    port: SMTP_PORT,
    servername: SMTP_HOST,
    timeout: 15000
  });

  await new Promise((resolve, reject) => {
    socket.once("secureConnect", resolve);
    socket.once("error", reject);
    socket.once("timeout", () => reject(new Error("smtp: connection timeout")));
  });

  try {
    await smtpCommand(socket, null, 220);
    await smtpCommand(socket, "EHLO riaaya.onrender.com", 250);
    await smtpCommand(socket, "AUTH LOGIN", 334);
    await smtpCommand(socket, Buffer.from(SMTP_USER).toString("base64"), 334);
    await smtpCommand(socket, Buffer.from(SMTP_PASS).toString("base64"), 235);
    await smtpCommand(socket, `MAIL FROM:<${emailAddress(FROM_EMAIL)}>`, 250);
    for (const recipient of recipients) {
      await smtpCommand(socket, `RCPT TO:<${recipient}>`, [250, 251]);
    }
    await smtpCommand(socket, "DATA", 354);
    socket.write(`${buildMessage(message)}\r\n.\r\n`);
    await smtpCommand(socket, null, 250);
    socket.write("QUIT\r\n");
  } finally {
    socket.end();
  }

  return { ok: true, provider: "smtp" };
}

export async function sendEmail({ to, subject, html, text }) {
  if (!to || !subject) throw new Error("email: missing to or subject");
  if (!html && !text) throw new Error("email: missing html or text");

  const provider = selectedProvider();
  if (provider === "mock") {
    // In production a reset link is a credentials-equivalent secret — NEVER
    // print it to logs. Fail loudly so the operator configures a real provider
    // instead of silently minting links nobody receives.
    if (process.env.NODE_ENV === "production") {
      console.error(`[email] no provider configured — cannot send "${subject}". Set RESEND_API_KEY / SMTP.`);
      throw new Error("email_provider_not_configured");
    }
    // Dev/test only: surface the link so flows are testable.
    console.log(`[email-mock] to=${to} subject="${subject}"`);
    const link = (html || "").match(/href="([^"]+)"/)?.[1];
    if (link) console.log(`[email-mock]   link: ${link}`);
    else if (text) console.log(`[email-mock]   text: ${text}`);
    return { ok: true, mock: true };
  }

  if (provider === "smtp") {
    return sendSmtpEmail({ to, subject, html, text });
  }

  if (provider !== "resend") {
    throw new Error(`email: unsupported provider ${provider}`);
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to,
      subject,
      ...(html && { html }),
      ...(text && { text })
    })
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`resend: ${res.status} ${err}`);
  }

  return { ok: true, ...(await res.json()) };
}
