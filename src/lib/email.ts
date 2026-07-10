type SendArgs = {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
};

/**
 * Sends an email via Resend when RESEND_API_KEY is set; otherwise logs it to
 * the console so the notification flow is observable in local dev. Never throws
 * — a failed notification must not break the action that triggered it.
 */
export async function sendEmail({ to, subject, html, text }: SendArgs) {
  const recipients = (Array.isArray(to) ? to : [to])
    .map((r) => r.trim())
    .filter(Boolean);
  if (recipients.length === 0) return;

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "PB League <onboarding@resend.dev>";

  if (!apiKey) {
    console.log(
      `\n[email:dev] to=${recipients.join(", ")}\n  subject: ${subject}\n  ${text}\n`,
    );
    return;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to: recipients, subject, html, text }),
    });
    if (!res.ok) {
      console.error(`[email] Resend error ${res.status}: ${await res.text()}`);
    }
  } catch (e) {
    console.error("[email] send failed", e);
  }
}
