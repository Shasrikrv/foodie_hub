import pool from "@/app/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";

export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return Response.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q");

    if (!query) {
      return Response.json({ data: [] });
    }

    const me = session.user.id;
    const like = `%${query}%`;

    const [rows] = await pool.query(
      `SELECT
        u.user_id, u.first_name, u.last_name, u.email,
        CASE
          WHEN fr_sent.request_id IS NOT NULL THEN 'pending_sent'
          WHEN fr_recv.request_id IS NOT NULL THEN 'pending_received'
          WHEN fr_friend.request_id IS NOT NULL THEN 'friends'
          ELSE NULL
        END AS relationship
      FROM users u
      LEFT JOIN friend_request fr_sent
        ON fr_sent.sender_id = ? AND fr_sent.receiver_id = u.user_id AND fr_sent.status = 1
      LEFT JOIN friend_request fr_recv
        ON fr_recv.receiver_id = ? AND fr_recv.sender_id = u.user_id AND fr_recv.status = 1
      LEFT JOIN friend_request fr_friend
        ON fr_friend.status = 2
        AND ((fr_friend.sender_id = ? AND fr_friend.receiver_id = u.user_id)
          OR (fr_friend.receiver_id = ? AND fr_friend.sender_id = u.user_id))
      WHERE (u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ?)
        AND u.user_id != ?`,
      [me, me, me, me, like, like, like, me]
    );

    return Response.json({ data: rows });
  } catch (error) {
    console.error("Search error:", error);
    return Response.json({ message: "Database connection failed", error: error.message }, { status: 500 });
  }
}
