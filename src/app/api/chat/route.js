import pool from "@/app/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { v4 as uuidv4 } from "uuid";

export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const friendId = searchParams.get("friendId");
    const me = session.user.id;

    if (friendId) {
      // Fetch conversation
      const [rows] = await pool.query(
        `SELECT m.message_id, m.message_text, m.created_at, m.is_read,
                m.sender_id, u.first_name, u.last_name, u.profile_pic
         FROM messages m
         JOIN users u ON u.user_id = m.sender_id
         WHERE (m.sender_id = ? AND m.receiver_id = ?)
            OR (m.sender_id = ? AND m.receiver_id = ?)
         ORDER BY m.created_at ASC`,
        [me, friendId, friendId, me]
      );
      // Mark incoming messages as read
      await pool.query(
        "UPDATE messages SET is_read = 1 WHERE sender_id = ? AND receiver_id = ? AND is_read = 0",
        [friendId, me]
      );
      return Response.json({ data: rows });
    }

    // Fetch friends list with last message + unread count
    const [friends] = await pool.query(
      `SELECT u.user_id, u.first_name, u.last_name, u.profile_pic,
              (SELECT m2.message_text FROM messages m2
               WHERE (m2.sender_id = u.user_id AND m2.receiver_id = ?)
                  OR (m2.sender_id = ? AND m2.receiver_id = u.user_id)
               ORDER BY m2.created_at DESC LIMIT 1) AS last_message,
              (SELECT m3.created_at FROM messages m3
               WHERE (m3.sender_id = u.user_id AND m3.receiver_id = ?)
                  OR (m3.sender_id = ? AND m3.receiver_id = u.user_id)
               ORDER BY m3.created_at DESC LIMIT 1) AS last_message_at,
              (SELECT COUNT(*) FROM messages m4
               WHERE m4.sender_id = u.user_id AND m4.receiver_id = ? AND m4.is_read = 0) AS unread
       FROM friend_request fr
       JOIN users u ON u.user_id IN (fr.sender_id, fr.receiver_id)
       WHERE fr.status = 2
         AND ? IN (fr.sender_id, fr.receiver_id)
         AND u.user_id != ?
       GROUP BY u.user_id
       ORDER BY last_message_at DESC`,
      [me, me, me, me, me, me, me]
    );
    return Response.json({ data: friends });
  } catch (err) {
    console.error("Chat GET error:", err);
    return Response.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { receiverId, text } = await req.json();
    if (!receiverId || !text?.trim()) return Response.json({ error: "receiverId and text required" }, { status: 400 });

    const me = session.user.id;

    // Verify friendship
    const [fr] = await pool.query(
      `SELECT request_id FROM friend_request WHERE status = 2
       AND ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?))`,
      [me, receiverId, receiverId, me]
    );
    if (!fr.length) return Response.json({ error: "You can only message friends" }, { status: 403 });

    await pool.query(
      "INSERT INTO messages (message_id, sender_id, receiver_id, message_text) VALUES (?, ?, ?, ?)",
      [uuidv4(), me, receiverId, text.trim()]
    );
    return Response.json({ success: true });
  } catch (err) {
    console.error("Chat POST error:", err);
    return Response.json({ error: "Failed" }, { status: 500 });
  }
}
