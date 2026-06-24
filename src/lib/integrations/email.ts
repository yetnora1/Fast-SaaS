/**
 * Email adapter — Resend.
 *
 * Sends transactional email via the Resend API (https://resend.com).
 * Set RESEND_API_KEY (and optionally EMAIL_FROM) to send real email; when the
 * key is absent the message is logged to the console so the app stays runnable
 * in dev without an email provider.
 */
export async function sendEmail(opts: { to: string; subject: string; html: string }) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "noreply@cafeflow.app";

  if (!key) {
    console.log(`[email:dev] (no RESEND_API_KEY) → ${opts.to} | ${opts.subject}`);
    return { ok: true, sent: false };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: opts.to, subject: opts.subject, html: opts.html }),
  });

  if (!res.ok) {
    console.error(`[email:resend] failed (${res.status}) → ${opts.to}`);
  }
  return { ok: res.ok, sent: res.ok };
}
