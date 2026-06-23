import pool from "@/app/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { v4 as uuidv4 } from "uuid";

async function notify(pool, { userId, fromUserId, type }) {
  if (userId === fromUserId) return;
  await pool.query(
    "INSERT INTO notifications (notification_id, user_id, from_user_id, type) VALUES ($1, $2, $3, $4)",
    [uuidv4(), userId, fromUserId, type]
  ).catch(() => {});
}

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { targetUserId } = await req.json();
    const senderId = session.user.id;

    if (senderId === targetUserId) {
      return Response.json({ error: "You cannot send a request to yourself" }, { status: 400 });
    }

    const { rows: existing } = await pool.query(
      `SELECT request_id FROM friend_request
       WHERE (sender_id = $1 AND receiver_id = $2) OR (sender_id = $3 AND receiver_id = $4)`,
      [senderId, targetUserId, targetUserId, senderId]
    );

    if (existing.length > 0) {
      return Response.json({ error: "Friend request already exists" }, { status: 400 });
    }

    const requestId = uuidv4();
    await pool.query(
      "INSERT INTO friend_request (request_id, sender_id, receiver_id, status) VALUES ($1, $2, $3, 1)",
      [requestId, senderId, targetUserId]
    );

    await notify(pool, { userId: targetUserId, fromUserId: senderId, type: "friend_request" });
    return Response.json({ success: true, message: "Friend request sent" });
  } catch (err) {
    console.error("Friend request error:", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return Response.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { rows } = await pool.query(
      `SELECT fr.request_id, u.user_id, u.first_name, u.last_name, u.email
       FROM friend_request fr
       JOIN users u ON u.user_id = fr.sender_id
       WHERE fr.receiver_id = $1 AND fr.status = 1`,
      [session.user.id]
    );

    return Response.json({ data: rows });
  } catch (error) {
    console.error("Connection error:", error);
    return Response.json({ message: "Database connection failed", error: error.message }, { status: 500 });
  }
}
