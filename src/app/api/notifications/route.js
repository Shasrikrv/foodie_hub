import pool from "@/app/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const [rows] = await pool.query(
      `SELECT n.notification_id, n.type, n.post_id, n.is_read, n.created_at,
              u.first_name, u.last_name, u.profile_pic,
              p.title AS post_title
       FROM notifications n
       JOIN users u ON u.user_id = n.from_user_id
       LEFT JOIN posts p ON p.post_id = n.post_id
       WHERE n.user_id = ?
       ORDER BY n.created_at DESC
       LIMIT 50`,
      [session.user.id]
    );

    const unread = rows.filter((r) => !r.is_read).length;
    return Response.json({ data: rows, unread });
  } catch (err) {
    console.error("Notifications GET error:", err);
    return Response.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { action } = await req.json();
    if (action === "markAllRead") {
      await pool.query("UPDATE notifications SET is_read = 1 WHERE user_id = ?", [session.user.id]);
      return Response.json({ success: true });
    }
    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    return Response.json({ error: "Failed" }, { status: 500 });
  }
}
