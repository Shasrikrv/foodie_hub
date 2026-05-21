import pool from "@/app/lib/db";
import { sendPasswordResetEmail } from "@/app/lib/email";
import { randomBytes } from "crypto";

export async function POST(req) {
  try {
    const { email } = await req.json();
    if (!email?.trim()) return Response.json({ error: "Email is required" }, { status: 400 });

    const [rows] = await pool.query(
      "SELECT user_id, password FROM users WHERE email = ?",
      [email.trim().toLowerCase()]
    );

    // Always return success to prevent email enumeration
    if (!rows[0]) {
      return Response.json({ success: true });
    }

    const user = rows[0];

    // Google users have empty password — tell them to use Google sign-in
    if (!user.password) {
      return Response.json({ googleUser: true });
    }

    // Generate a secure token
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Invalidate any previous tokens for this user
    await pool.query("UPDATE password_reset_tokens SET used = 1 WHERE user_id = ?", [user.user_id]);

    await pool.query(
      "INSERT INTO password_reset_tokens (token, user_id, expires_at) VALUES (?, ?, ?)",
      [token, user.user_id, expiresAt]
    );

    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const resetUrl = `${baseUrl}/auth/reset-password?token=${token}`;

    try {
      await sendPasswordResetEmail(email.trim(), resetUrl);
    } catch (emailErr) {
      console.error("Email send failed:", emailErr.message);
      // In development: return the link directly so it can still be used
      if (process.env.NODE_ENV !== "production") {
        return Response.json({ success: true, devResetUrl: resetUrl });
      }
      return Response.json({ error: "Failed to send email. Check your email config." }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch (err) {
    console.error("Forgot password error:", err);
    return Response.json({ error: "Something went wrong" }, { status: 500 });
  }
}
