import { Resend } from "resend";

import { serverEnv } from "~/lib/env";

export const resend = new Resend(serverEnv.RESEND_API_KEY);

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  const { error } = await resend.emails.send({
    from: "BobrChat <noreply@bobrchat.com>",
    to,
    subject,
    html,
  });

  if (error) {
    console.error("Failed to send email:", error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
}
