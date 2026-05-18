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

    const { postId, commentText } = await req.json();
    if (!postId || !commentText?.trim()) {
      return Response.json({ message: "postId and commentText are required" }, { status: 400 });
    }

    await pool.execute(
      "INSERT INTO comments (comment_id, user_id, post_id, comment_text) VALUES (?, ?, ?, ?)",
      [uuidv4(), session.user.id, postId, commentText.trim()]
    );

    return Response.json({ message: "Comment added" }, { status: 201 });
  } catch (error) {
    console.error("Comment error:", error);
    return Response.json({ message: "Failed to add comment", error: error.message }, { status: 500 });
  }
}

export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return Response.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const postId = searchParams.get("postId");

    if (!postId) {
      return Response.json({ message: "postId is required" }, { status: 400 });
    }

    const [rows] = await pool.execute(
      `SELECT cm.comment_id, cm.comment_text, u.user_id, u.first_name, u.last_name
       FROM comments cm
       JOIN users u ON u.user_id = cm.user_id
       WHERE cm.post_id = ?
       ORDER BY cm.comment_id`,
      [postId]
    );

    return Response.json({ data: rows });
  } catch (error) {
    console.error("Get comments error:", error);
    return Response.json({ message: "Failed to fetch comments", error: error.message }, { status: 500 });
  }
}
