import pool from "@/app/lib/db";
import { hash } from "bcryptjs";

export async function POST(req) {
  try {
    const { token, password } = await req.json();
    if (!token || !password) return Response.json({ error: "Token and password are required" }, { status: 400 });
    if (password.length < 8) return Response.json({ error: "Password must be at least 8 characters" }, { status: 400 });

    const { rows } = await pool.query(
      `SELECT prt.user_id FROM password_reset_tokens prt
       WHERE prt.token = $1 AND prt.used = FALSE AND prt.expires_at > NOW()`,
      [token]
    );

    if (!rows[0]) {
      return Response.json({ error: "Reset link is invalid or has expired. Please request a new one." }, { status: 400 });
    }

    const hashed = await hash(password, 12);
    await pool.query("UPDATE users SET password = $1 WHERE user_id = $2", [hashed, rows[0].user_id]);
    await pool.query("UPDATE password_reset_tokens SET used = TRUE WHERE token = $1", [token]);

    return Response.json({ success: true });
  } catch (err) {
    console.error("Reset password error:", err);
    return Response.json({ error: "Something went wrong" }, { status: 500 });
  }
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");
    if (!token) return Response.json({ valid: false });

    const { rows } = await pool.query(
      "SELECT token FROM password_reset_tokens WHERE token = $1 AND used = FALSE AND expires_at > NOW()",
      [token]
    );
    return Response.json({ valid: !!rows[0] });
  } catch {
    return Response.json({ valid: false });
  }
}
