import pool from "@/app/lib/db";
import { sendPasswordResetEmail } from "@/app/lib/email";
import { sendPasswordResetSms } from "@/app/lib/sms";
import { randomBytes } from "crypto";

function maskEmail(email) {
  const [local, domain] = email.split("@");
  return local[0] + "***@" + domain;
}

function maskPhone(phone) {
  return phone.slice(0, -4).replace(/\d/g, "*") + phone.slice(-4);
}

async function generateResetUrl(userId) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  await pool.query("UPDATE password_reset_tokens SET used = TRUE WHERE user_id = $1", [userId]);
  await pool.query(
    "INSERT INTO password_reset_tokens (token, user_id, expires_at) VALUES ($1, $2, $3)",
    [token, userId, expiresAt]
  );
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  return `${baseUrl}/auth/reset-password?token=${token}`;
}

export async function POST(req) {
  try {
    const body = await req.json();

    // ── Step 2: user chose a delivery method ──
    if (body.lookupToken && body.method) {
      const { lookupToken, method } = body;

      const { rows: sessions } = await pool.query(
        "SELECT user_id FROM recovery_sessions WHERE token = $1 AND expires_at > NOW()",
        [lookupToken]
      );
      if (!sessions[0]) {
        return Response.json({ error: "Session expired. Please start over." }, { status: 400 });
      }
      const userId = sessions[0].user_id;
      await pool.query("DELETE FROM recovery_sessions WHERE token = $1", [lookupToken]);

      const { rows } = await pool.query(
        "SELECT email, recovery_email, phone_number FROM users WHERE user_id = $1",
        [userId]
      );
      if (!rows[0]) return Response.json({ error: "User not found." }, { status: 404 });

      const user = rows[0];
      const resetUrl = await generateResetUrl(userId);

      if (method === "email") {
        await sendPasswordResetEmail(user.email, resetUrl);
        return Response.json({ success: true, via: "email" });
      }

      if (method === "recovery_email") {
        if (!user.recovery_email) return Response.json({ error: "No recovery email on file." }, { status: 400 });
        await sendPasswordResetEmail(user.recovery_email, resetUrl);
        return Response.json({ success: true, via: "recovery_email" });
      }

      if (method === "sms") {
        if (!user.phone_number) return Response.json({ error: "No phone number on file." }, { status: 400 });
        const result = await sendPasswordResetSms(user.phone_number, resetUrl);
        if (!result.sent) {
          if (process.env.NODE_ENV !== "production") {
            return Response.json({ success: true, via: "sms", devResetUrl: resetUrl });
          }
          return Response.json({ error: "SMS service is not configured." }, { status: 500 });
        }
        return Response.json({ success: true, via: "sms" });
      }

      return Response.json({ error: "Invalid method." }, { status: 400 });
    }

    // ── Step 1: user entered their account email ──
    const { email } = body;
    if (!email?.trim()) return Response.json({ error: "Email is required" }, { status: 400 });

    const { rows } = await pool.query(
      "SELECT user_id, email, password, recovery_email, phone_number FROM users WHERE email = $1",
      [email.trim().toLowerCase()]
    );

    if (!rows[0]) return Response.json({ success: true });

    const user = rows[0];
    if (!user.password) return Response.json({ googleUser: true });

    const twilioConfigured = !!(
      process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_PHONE_NUMBER
    );

    const methods = [
      { type: "email", masked: maskEmail(user.email) },
      user.recovery_email && { type: "recovery_email", masked: maskEmail(user.recovery_email) },
      user.phone_number && (twilioConfigured || process.env.NODE_ENV !== "production") &&
        { type: "sms", masked: maskPhone(user.phone_number) },
    ].filter(Boolean);

    // Only one option — send immediately (preserves existing behaviour)
    if (methods.length === 1) {
      const resetUrl = await generateResetUrl(user.user_id);
      try {
        await sendPasswordResetEmail(user.email, resetUrl);
      } catch {
        if (process.env.NODE_ENV !== "production") {
          return Response.json({ success: true, devResetUrl: resetUrl });
        }
        return Response.json({ error: "Failed to send email. Check your email config." }, { status: 500 });
      }
      return Response.json({ success: true });
    }

    // Multiple options — let the user choose
    const lookupToken = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    await pool.query(
      "INSERT INTO recovery_sessions (token, user_id, expires_at) VALUES ($1, $2, $3)",
      [lookupToken, user.user_id, expiresAt]
    );

    return Response.json({ methods, lookupToken });
  } catch (err) {
    console.error("Forgot password error:", err);
    return Response.json({ error: "Something went wrong" }, { status: 500 });
  }
}
