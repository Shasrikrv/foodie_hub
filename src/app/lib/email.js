import nodemailer from "nodemailer";

export function createTransport() {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || "smtp.gmail.com",
    port: parseInt(process.env.EMAIL_PORT || "587"),
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

export async function sendPasswordResetEmail(to, resetUrl) {
  const transport = createTransport();
  await transport.sendMail({
    from: `"FoodieHub" <${process.env.EMAIL_USER}>`,
    to,
    subject: "Reset your FoodieHub password",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
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
