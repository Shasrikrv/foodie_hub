import pool from "@/app/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";

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
      const [rows] = await pool.query(
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
      const [rows] = await pool.query(
        `SELECT st.*, u.first_name, u.last_name
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
  try {
    const session = await getServerSession(authOptions);
    requireAdmin(session);

    const { action, userId, ticketId, credits } = await req.json();

    if (action === "addCredits") {
      await pool.query(
        `INSERT INTO ai_credits (user_id, credits) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE credits = credits + VALUES(credits)`,
        [userId, credits || 5]
      );
      return Response.json({ success: true });
    }

    if (action === "toggleAdmin") {
      await pool.query("UPDATE users SET is_admin = NOT is_admin WHERE user_id = ?", [userId]);
      return Response.json({ success: true });
    }

    if (action === "resolveTicket") {
      await pool.query("UPDATE support_tickets SET status = 'resolved' WHERE ticket_id = ?", [ticketId]);
      return Response.json({ success: true });
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    if (err.message === "Forbidden") return Response.json({ error: "Forbidden" }, { status: 403 });
    return Response.json({ error: "Failed" }, { status: 500 });
  }
}
