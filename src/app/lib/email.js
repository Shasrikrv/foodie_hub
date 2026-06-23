import nodemailer from "nodemailer";

// Creates a real SMTP transport using env vars, or an Ethereal test transport in dev
export async function createTransport() {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  // If credentials are configured, use them (Gmail or any SMTP)
  if (user && pass) {
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST || "smtp.gmail.com",
      port: parseInt(process.env.EMAIL_PORT || "587"),
      secure: false,
      auth: { user, pass },
    });
  }

  // Dev fallback: auto-create an Ethereal test account (emails are captured at ethereal.email)
  if (process.env.NODE_ENV !== "production") {
    const testAccount = await nodemailer.createTestAccount();
    const transport = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: { user: testAccount.user, pass: testAccount.pass },
    });
    // Attach the preview URL generator so callers can log it
    transport._ethereal = true;
    return transport;
  }

  throw new Error("EMAIL_USER and EMAIL_PASS must be set in production.");
}

const baseStyle = "font-family:sans-serif;max-width:480px;margin:0 auto";
const FROM = () => `"FoodieHub" <${process.env.EMAIL_USER || "noreply@foodiehub.app"}>`;

async function send(mailOptions) {
  const transport = await createTransport();
  const info = await transport.sendMail(mailOptions);

  // In dev with Ethereal, log the preview URL so you can inspect the email
  if (transport._ethereal) {
    console.log("\n📧 Ethereal preview URL:", nodemailer.getTestMessageUrl(info), "\n");
  }
  return info;
}

export async function sendPasswordResetEmail(to, resetUrl) {
  return send({
    from: FROM(),
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
    from: `"FoodieHub Support" <${process.env.EMAIL_USER || "noreply@foodiehub.app"}>`,
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
    from: `"FoodieHub Support" <${process.env.EMAIL_USER || "noreply@foodiehub.app"}>`,
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
    from: FROM(),
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
