// Sends SMS via Twilio. Returns { sent: true } or { sent: false, reason } if Twilio is not configured.
export async function sendPasswordResetSms(to, resetUrl) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;

  if (!sid || !token || !from) {
    return { sent: false, reason: "Twilio not configured" };
  }

  const twilio = (await import("twilio")).default;
  const client = twilio(sid, token);

  await client.messages.create({
    body: `Your FoodieHub password reset link (expires in 1 hour):\n${resetUrl}`,
    from,
    to,
  });

  return { sent: true };
}
