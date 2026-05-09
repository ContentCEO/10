import { Resend } from "resend";

export async function sendEmail(args: {
  to: string;
  subject: string;
  body: string;
}): Promise<{ id: string }> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!key || !from) throw new Error("Resend not configured");
  const resend = new Resend(key);
  const html = args.body
    .split(/\n{2,}/)
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br/>")}</p>`)
    .join("");
  const { data, error } = await resend.emails.send({
    from,
    to: args.to,
    subject: args.subject,
    html,
    text: args.body,
  });
  if (error) throw new Error(error.message);
  return { id: data?.id ?? "" };
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
