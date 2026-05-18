import {
  requesteStatus,
  authorizeStatus,
  getFriends,
  getFriendRequests,
} from "./requestedStatus";
import pool from "@/app/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";

export async function POST(req) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { targetUserId } = body;
    const senderId = session.user.id;

    if (senderId === targetUserId) {
      return NextResponse.json(
        { error: "You cannot send a request to yourself" },
        { status: 400 }
      );
    }

    // check if already exists
    const [existing] = await pool.query(
      `SELECT * FROM friend_request 
       WHERE (sender_id = ? AND receiver_id = ?) 
          OR (sender_id = ? AND receiver_id = ?)`,
      [senderId, targetUserId, targetUserId, senderId]
    );

    if (existing.length > 0) {
      return NextResponse.json(
        { error: "Friend request already exists" },
        { status: 400 }
      );
    }

    // insert new request
    await pool.query(
      `INSERT INTO friend_request (sender_id, receiver_id, status)
       VALUES (?, ?, 1)`,
      [senderId, targetUserId]
    );

    return NextResponse.json({ success: true, message: "Friend request sent" });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return Response.json({ message: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    const [rows] = await pool.query(
      `SELECT fr.request_id, u.user_id, u.first_name, u.last_name, u.email, fr.status
       FROM friend_request fr
       JOIN users u ON u.user_id = fr.sender_id
       WHERE fr.receiver_id = ? AND fr.status = 1`,
      [userId]
    );

    return Response.json({ data: rows });
  } catch (error) {
    console.error("Connection error:", error);
    return Response.json(
      { message: "Database connection failed", error: error.message },
      { status: 500 }
    );
  }
}
