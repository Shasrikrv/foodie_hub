import pool from "@/app/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { sendAdminReplyEmail, sendAdminResetLinkEmail, sendTestEmail } from "@/app/lib/email";
import { randomBytes } from "crypto";

function requireAdmin(session) {
  if (!session?.user?.isAdmin) throw new Error("Forbidden");
}

export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);
    requireAdmin(session);

    const { searchParams } = new URL(req.url);
    const view = searchParams.get("view") || "users";

    if (view === "users") {
      const { rows } = await pool.query(
        `SELECT u.user_id, u.first_name, u.last_name, u.email, u.is_admin, u.profile_pic,
                COALESCE(ac.credits, 0) AS ai_credits,
                (SELECT COUNT(*) FROM posts p WHERE p.user_id = u.user_id) AS post_count,
                (SELECT COUNT(*) FROM friend_request fr WHERE fr.status = 2 AND (fr.sender_id = u.user_id OR fr.receiver_id = u.user_id)) AS friend_count
         FROM users u
         LEFT JOIN ai_credits ac ON ac.user_id = u.user_id
         ORDER BY u.first_name`
      );
      return Response.json({ data: rows });
    }

    if (view === "tickets") {
      const { rows } = await pool.query(
        `SELECT st.*, u.first_name, u.last_name, u.user_id AS linked_user_id, (u.password IS NOT NULL AND u.password != '') AS is_credential_user
         FROM support_tickets st
         LEFT JOIN users u ON u.user_id = st.user_id
         ORDER BY st.created_at DESC`
      );
      return Response.json({ data: rows });
    }

    return Response.json({ error: "Unknown view" }, { status: 400 });
  } catch (err) {
    if (err.message === "Forbidden") return Response.json({ error: "Forbidden" }, { status: 403 });
    console.error("Admin GET error:", err);
    return Response.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(req) {
  const client = await pool.connect();

  try {
    const session = await getServerSession(authOptions);
    requireAdmin(session);

    const body = await req.json();
    const { action, userId, ticketId, credits } = body;

    if (action === "addCredits") {
      await pool.query(
        `INSERT INTO ai_credits (user_id, credits)
         VALUES ($1, $2)
         ON CONFLICT (user_id)
         DO UPDATE SET credits = ai_credits.credits + EXCLUDED.credits`,
        [userId, credits || 5]
      );
      return Response.json({ success: true });
    }

    if (action === "toggleAdmin") {
      await pool.query("UPDATE users SET is_admin = NOT is_admin WHERE user_id = $1", [userId]);
      return Response.json({ success: true });
    }

    if (action === "resolveTicket") {
      await pool.query("UPDATE support_tickets SET status = 'resolved' WHERE ticket_id = $1", [ticketId]);
      return Response.json({ success: true });
    }

    if (action === "generateResetLink") {
      const { rows } = await pool.query(
        "SELECT user_id, email, password FROM users WHERE user_id = $1",
        [userId]
      );

      const user = rows[0];
      if (!user) return Response.json({ error: "User not found" }, { status: 404 });
      if (!user.password || user.password === "") {
        return Response.json({ error: "This user signs in with Google — no password to reset." }, { status: 400 });
      }

      const token = randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

      await pool.query("UPDATE password_reset_tokens SET used = TRUE WHERE user_id = $1", [user.user_id]);
      await pool.query(
        "INSERT INTO password_reset_tokens (token, user_id, expires_at) VALUES ($1, $2, $3)",
        [token, user.user_id, expiresAt]
      );

      const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
      const resetUrl = `${baseUrl}/auth/reset-password?token=${token}`;

      let emailSent = false;
      try {
        await sendAdminResetLinkEmail(user.email, resetUrl);
        emailSent = true;
      } catch {
        emailSent = false;
      }

      return Response.json({ success: true, resetUrl, emailSent });
    }

    if (action === "sendReply") {
      const { ticketEmail, ticketSubject, replyMessage } = body;

      if (!ticketEmail || !replyMessage?.trim()) {
        return Response.json({ error: "Email and reply message are required" }, { status: 400 });
      }

      await sendAdminReplyEmail(
        ticketEmail,
        ticketSubject || "Your Support Request",
        replyMessage.trim(),
        session.user.name || "FoodieHub Support"
      );

      if (ticketId) {
        await pool.query("UPDATE support_tickets SET status = 'resolved' WHERE ticket_id = $1", [ticketId]);
      }

      return Response.json({ success: true });
    }

    if (action === "deleteUser") {
      if (userId === session.user.id) {
        return Response.json({ error: "Cannot delete your own account" }, { status: 400 });
      }

      try {
        await client.query("BEGIN");

        const { rows: postsResult } = await client.query("SELECT content_id FROM posts WHERE user_id = $1", [userId]);
        const contentIds = postsResult.map((p) => p.content_id).filter(Boolean);

        if (contentIds.length > 0) {
          await client.query("DELETE FROM mealcontentjunction WHERE content_id = ANY($1)", [contentIds]);
          await client.query("DELETE FROM mealtype WHERE content_id = ANY($1)", [contentIds]);
          await client.query("DELETE FROM nutrition WHERE content_id = ANY($1)", [contentIds]);
          await client.query("DELETE FROM ingredients WHERE content_id = ANY($1)", [contentIds]);
          await client.query("DELETE FROM instructions WHERE content_id = ANY($1)", [contentIds]);
          await client.query("DELETE FROM content WHERE content_id = ANY($1)", [contentIds]);
        }

        await client.query("DELETE FROM posts WHERE user_id = $1", [userId]);
        await client.query("DELETE FROM likes WHERE user_id = $1", [userId]);
        await client.query("DELETE FROM comments WHERE user_id = $1", [userId]);
        await client.query("DELETE FROM notifications WHERE user_id = $1", [userId]);
        await client.query("DELETE FROM messages WHERE sender_id = $1 OR receiver_id = $1", [userId]);
        await client.query("DELETE FROM friend_request WHERE sender_id = $1 OR receiver_id = $1", [userId]);
        await client.query("UPDATE support_tickets SET user_id = NULL WHERE user_id = $1", [userId]);
        await client.query("DELETE FROM password_reset_tokens WHERE user_id = $1", [userId]);
        await client.query("DELETE FROM ai_credits WHERE user_id = $1", [userId]);
        await client.query("DELETE FROM users WHERE user_id = $1", [userId]);

        await client.query("COMMIT");
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      }

      return Response.json({ success: true });
    }

    if (action === "testEmail") {
      const to = body.to || session.user.email;
      try {
        await sendTestEmail(to);
      } catch (emailErr) {
        return Response.json({ error: emailErr.message }, { status: 500 });
      }
      return Response.json({ success: true, sentTo: to });
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    if (err.message === "Forbidden") return Response.json({ error: "Forbidden" }, { status: 403 });
    console.error("Admin POST error:", err);
    return Response.json({ error: "Failed" }, { status: 500 });
  } finally {
    client.release();
  }
}
