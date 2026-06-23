import pool from "@/app/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { v4 as uuidv4 } from "uuid";

pool.query(
  "ALTER TABLE comments ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()"
).catch(() => {});

async function notify(pool, { userId, fromUserId, type, postId }) {
  if (userId === fromUserId) return;
  await pool.query(
    "INSERT INTO notifications (notification_id, user_id, from_user_id, type, post_id) VALUES ($1, $2, $3, $4, $5)",
    [uuidv4(), userId, fromUserId, type, postId || null]
  ).catch(() => {});
}

export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return Response.json({ message: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const postId = searchParams.get("postId");
    if (!postId) return Response.json({ message: "postId is required" }, { status: 400 });

    const { rows } = await pool.query(
      `SELECT cm.comment_id, cm.comment_text, cm.created_at,
              u.user_id, u.first_name, u.last_name, u.profile_pic
       FROM comments cm
       JOIN users u ON u.user_id = cm.user_id
       WHERE cm.post_id = $1
       ORDER BY cm.created_at ASC`,
      [postId]
    );
    return Response.json({ data: rows });
  } catch (error) {
    console.error("Comment GET error:", error.message);
    return Response.json({ message: "Failed to fetch comments", error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return Response.json({ message: "Unauthorized" }, { status: 401 });

    const { postId, commentText } = await req.json();
    if (!postId || !commentText?.trim()) {
      return Response.json({ message: "postId and commentText are required" }, { status: 400 });
    }

    await pool.query(
      "INSERT INTO comments (comment_id, user_id, post_id, comment_text) VALUES ($1, $2, $3, $4)",
      [uuidv4(), session.user.id, postId, commentText.trim()]
    );

    const { rows: posts } = await pool.query("SELECT user_id FROM posts WHERE post_id = $1", [postId]);
    if (posts[0]) {
      await notify(pool, { userId: posts[0].user_id, fromUserId: session.user.id, type: "comment", postId });
    }

    return Response.json({ message: "Comment added" }, { status: 201 });
  } catch (error) {
    console.error("Comment POST error:", error);
    return Response.json({ message: "Failed to add comment", error: error.message }, { status: 500 });
  }
}

export async function PATCH(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { commentId, commentText } = await req.json();
    if (!commentId || !commentText?.trim()) {
      return Response.json({ error: "commentId and commentText are required" }, { status: 400 });
    }

    const { rows } = await pool.query("SELECT user_id FROM comments WHERE comment_id = $1", [commentId]);
    if (!rows[0]) return Response.json({ error: "Comment not found" }, { status: 404 });
    if (rows[0].user_id !== session.user.id) return Response.json({ error: "Forbidden" }, { status: 403 });

    await pool.query("UPDATE comments SET comment_text = $1 WHERE comment_id = $2", [commentText.trim(), commentId]);
    return Response.json({ success: true });
  } catch (error) {
    console.error("Comment PATCH error:", error);
    return Response.json({ error: "Failed to edit comment" }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { commentId } = await req.json();
    if (!commentId) return Response.json({ error: "commentId is required" }, { status: 400 });

    const { rows } = await pool.query(
      `SELECT c.user_id AS comment_user_id, p.user_id AS post_user_id
       FROM comments c
       JOIN posts p ON p.post_id = c.post_id
       WHERE c.comment_id = $1`,
      [commentId]
    );
    if (!rows[0]) return Response.json({ error: "Comment not found" }, { status: 404 });

    const isCommenter = rows[0].comment_user_id === session.user.id;
    const isPostOwner = rows[0].post_user_id === session.user.id;
    if (!isCommenter && !isPostOwner) return Response.json({ error: "Forbidden" }, { status: 403 });

    await pool.query("DELETE FROM comments WHERE comment_id = $1", [commentId]);
    return Response.json({ success: true });
  } catch (error) {
    console.error("Comment DELETE error:", error);
    return Response.json({ error: "Failed to delete comment" }, { status: 500 });
  }
}
