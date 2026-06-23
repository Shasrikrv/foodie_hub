import { getFriends } from "../friendrequest/requestedStatus";
import pool from "@/app/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return Response.json({ message: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const { rows } = await pool.query(
      `SELECT u.user_id, u.first_name, u.last_name
       FROM friend_request fr
       JOIN users u ON u.user_id IN (fr.sender_id, fr.receiver_id)
       WHERE fr.status = 2
         AND $1 IN (fr.sender_id, fr.receiver_id)
         AND u.user_id != $2`,
      [userId, userId]
    );
    return Response.json({ data: rows });
  } catch (error) {
    console.error("Connection error:", error);
    return Response.json({ message: "Database connection failed", error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const request = await req.json();
    const result = await getFriends(request);
    return Response.json({ result });
  } catch (error) {
    console.error("Connection error:", error);
    return Response.json({ message: "Database connection failed", error: error.message }, { status: 500 });
  }
}
