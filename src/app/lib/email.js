import { Resend } from "resend";

const FROM = "FoodieHub <onboarding@resend.dev>";

function getClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY is not set.");
  return new Resend(apiKey);
}

async function send({ to, subject, html }) {
  const resend = getClient();
  const { error } = await resend.emails.send({ from: FROM, to, subject, html });
  if (error) throw new Error(error.message);
}

const baseStyle = "font-family:sans-serif;max-width:480px;margin:0 auto";

export async function sendPasswordResetEmail(to, resetUrl) {
  return send({
    to,
    subject: "Reset your FoodieHub password",
    html: `
      <div style="${baseStyle}">
        <h2 style="color:#f97316">FoodieHub</h2>
        <p>We received a request to reset your password.</p>
        <p>Click the button below to set a new password. This link expires in <strong>1 hour</strong>.</p>
        <a href="${resetUrl}"
           style="display:inline-block;background:#f97316;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0">
          Reset Password
        </a>
        <p style="color:#888;font-size:13px">If you didn't request this, you can safely ignore this email.</p>
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
        <p style="color:#aaa;font-size:12px">FoodieHub · share recipes, inspire meals</p>
      </div>
    `,
  });
}

export async function sendAdminReplyEmail(to, ticketSubject, replyMessage, adminName = "FoodieHub Support") {
  return send({
    to,
    subject: `Re: ${ticketSubject} — FoodieHub Support`,
    html: `
      <div style="${baseStyle}">
        <h2 style="color:#f97316">FoodieHub Support</h2>
        <p style="color:#555;font-size:14px">Hi there! Here is our response to your support request about <strong>${ticketSubject}</strong>:</p>
        <div style="background:#f9f9f9;border-left:4px solid #f97316;padding:16px 20px;border-radius:0 8px 8px 0;margin:20px 0">
          <p style="color:#333;margin:0;white-space:pre-wrap">${replyMessage}</p>
        </div>
        <p style="color:#888;font-size:13px">— ${adminName}, FoodieHub Support Team</p>
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
        <p style="color:#aaa;font-size:12px">FoodieHub · share recipes, inspire meals</p>
      </div>
    `,
  });
}

export async function sendAdminResetLinkEmail(to, resetUrl) {
  return send({
    to,
    subject: "Your FoodieHub password reset link",
    html: `
      <div style="${baseStyle}">
        <h2 style="color:#f97316">FoodieHub</h2>
        <p>A FoodieHub admin has generated a password reset link for your account.</p>
        <p>Click the button below to set a new password. This link expires in <strong>1 hour</strong>.</p>
        <a href="${resetUrl}"
           style="display:inline-block;background:#f97316;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0">
          Reset Password
        </a>
        <p style="color:#888;font-size:13px">If you didn't request this, please contact support immediately.</p>
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
        <p style="color:#aaa;font-size:12px">FoodieHub · share recipes, inspire meals</p>
      </div>
    `,
  });
}

export async function sendTestEmail(to) {
  return send({
    to,
    subject: "FoodieHub — SMTP test successful ✓",
    html: `
      <div style="${baseStyle}">
        <h2 style="color:#f97316">FoodieHub</h2>
        <p style="font-size:16px">Your email configuration is working correctly! 🎉</p>
        <p style="color:#888;font-size:13px">This is a test email sent from the FoodieHub admin panel.</p>
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
        <p style="color:#aaa;font-size:12px">FoodieHub · share recipes, inspire meals</p>
      </div>
    `,
  });
}
