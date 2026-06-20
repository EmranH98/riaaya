// Email transport via Resend. Pluggable: if API key is missing, logs to console
// instead (useful for dev/test where you can't actually send).
//
// Requires RIAAYA_EMAIL_PROVIDER (currently only 'resend' supported) and
// RIAAYA_RESEND_API_KEY in the environment.

const API_KEY = process.env.RIAAYA_RESEND_API_KEY || "";
const FROM_EMAIL = process.env.RIAAYA_EMAIL_FROM || "noreply@riaaya.clinic";
const MOCK = !API_KEY;

export async function sendEmail({ to, subject, html, text }) {
  if (!to || !subject) throw new Error("email: missing to or subject");
  if (!html && !text) throw new Error("email: missing html or text");

  if (MOCK) {
    console.log(`[email-mock] to=${to} subject="${subject}"`);
    if (html) console.log(`[email-mock]   html: ${html.slice(0, 120)}...`);
    return { ok: true, mock: true };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${API_KEY}`,
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
