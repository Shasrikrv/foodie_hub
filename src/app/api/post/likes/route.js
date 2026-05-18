import pool from "@/app/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { v4 as uuidv4 } from "uuid";

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return Response.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { postId } = await req.json();
    if (!postId) {
      return Response.json({ message: "postId is required" }, { status: 400 });
    }

    const userId = session.user.id;

    const [existing] = await pool.execute(
      "SELECT like_id FROM likes WHERE user_id = ? AND post_id = ?",
      [userId, postId]
    );

    if (existing.length > 0) {
      await pool.execute("DELETE FROM likes WHERE user_id = ? AND post_id = ?", [userId, postId]);
      return Response.json({ liked: false });
    }

    await pool.execute(
      "INSERT INTO likes (like_id, user_id, post_id) VALUES (?, ?, ?)",
      [uuidv4(), userId, postId]
    );
    return Response.json({ liked: true });
  } catch (error) {
    console.error("Like error:", error);
    return Response.json({ message: "Failed to toggle like", error: error.message }, { status: 500 });
  }
}
