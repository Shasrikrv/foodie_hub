import pool from "@/app/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { v4 as uuidv4 } from "uuid";

async function notify(pool, { userId, fromUserId, type, postId }) {
  if (userId === fromUserId) return;
  await pool.query(
    "INSERT INTO notifications (notification_id, user_id, from_user_id, type, post_id) VALUES (?, ?, ?, ?, ?)",
    [uuidv4(), userId, fromUserId, type, postId || null]
  ).catch(() => {}); // non-critical
}

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return Response.json({ message: "Unauthorized" }, { status: 401 });

    const { postId, commentText } = await req.json();
    if (!postId || !commentText?.trim()) {
      return Response.json({ message: "postId and commentText are required" }, { status: 400 });
    }

    await pool.execute(
      "INSERT INTO comments (comment_id, user_id, post_id, comment_text) VALUES (?, ?, ?, ?)",
      [uuidv4(), session.user.id, postId, commentText.trim()]
    );

    // Notify post author
    const [posts] = await pool.query("SELECT user_id FROM posts WHERE post_id = ?", [postId]);
    if (posts[0]) {
      await notify(pool, { userId: posts[0].user_id, fromUserId: session.user.id, type: "comment", postId });
    }

    return Response.json({ message: "Comment added" }, { status: 201 });
  } catch (error) {
    console.error("Comment error:", error);
    return Response.json({ message: "Failed to add comment", error: error.message }, { status: 500 });
  }
}

export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return Response.json({ message: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const postId = searchParams.get("postId");
    if (!postId) return Response.json({ message: "postId is required" }, { status: 400 });

    const [rows] = await pool.execute(
      `SELECT cm.comment_id, cm.comment_text, u.user_id, u.first_name, u.last_name, u.profile_pic
       FROM comments cm
       JOIN users u ON u.user_id = cm.user_id
       WHERE cm.post_id = ?
       ORDER BY cm.comment_id`,
      [postId]
    );
    return Response.json({ data: rows });
  } catch (error) {
    return Response.json({ message: "Failed to fetch comments", error: error.message }, { status: 500 });
  }
}
