import pool from "@/app/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";

export async function DELETE(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { targetUserId } = await req.json();
    if (!targetUserId) {
      return Response.json({ error: "targetUserId is required" }, { status: 400 });
    }

    const userId = session.user.id;

    await pool.query(
      `DELETE FROM friend_request
       WHERE status = 2
       AND ((sender_id = $1 AND receiver_id = $2) OR (sender_id = $3 AND receiver_id = $4))`,
      [userId, targetUserId, targetUserId, userId]
    );

    return Response.json({ success: true });
  } catch (error) {
    console.error("Unfollow error:", error);
    return Response.json({ error: "Failed to unfollow" }, { status: 500 });
  }
}
