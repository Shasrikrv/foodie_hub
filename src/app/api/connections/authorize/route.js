import { authorizeStatus } from "../friendrequest/requestedStatus";
import pool from "@/app/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return Response.json(
        {
          message: "Unauthorized",
        },
        { status: 401 }
      );
    }
    console.log("User:", session.user);
    const request = await req.json();
    const result = await authorizeStatus(request, session.user.id);
    return Response.json(result);
  } catch (error) {
    console.error("Connection Error", error);
    return Response.json(
      {
        message: "Database connestion is failed",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return Response.json(
        {
          message: "Unauthorized",
        },
        { status: 401 }
      );
    }
    console.log("User:", session.user);
    const [rows] = await pool.query(
      `SELECT fr.request_id, u.user_id, u.first_name, u.last_name, u.email, fr.status
   FROM friend_request fr
   JOIN users u ON u.user_id = fr.sender_id
   WHERE fr.receiver_id = ? AND fr.status = 1`,
      [session.user.id]
    );
    return Response.json({
      data: rows,
    });
  } catch (error) {
    console.error("Connection error:", error);
    return Response.json(
      {
        message: "Database connection failed",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
