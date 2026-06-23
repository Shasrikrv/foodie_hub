import pool from "@/app/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { v4 as uuidv4 } from "uuid";

async function notify(pool, { userId, fromUserId, type, postId }) {
  if (userId === fromUserId) return;
  await pool.query(
    "INSERT INTO notifications (notification_id, user_id, from_user_id, type, post_id) VALUES ($1, $2, $3, $4, $5)",
    [uuidv4(), userId, fromUserId, type, postId || null]
  ).catch(() => {});
}

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return Response.json({ message: "Unauthorized" }, { status: 401 });

    const { postId } = await req.json();
    if (!postId) return Response.json({ message: "postId is required" }, { status: 400 });

    const userId = session.user.id;
    const { rows: existing } = await pool.query(
      "SELECT like_id FROM likes WHERE user_id = $1 AND post_id = $2",
      [userId, postId]
    );

    if (existing.length > 0) {
      await pool.query("DELETE FROM likes WHERE user_id = $1 AND post_id = $2", [userId, postId]);
      return Response.json({ liked: false });
    }

    await pool.query("INSERT INTO likes (like_id, user_id, post_id) VALUES ($1, $2, $3)", [uuidv4(), userId, postId]);

    const { rows: posts } = await pool.query("SELECT user_id FROM posts WHERE post_id = $1", [postId]);
    if (posts[0]) {
      await notify(pool, { userId: posts[0].user_id, fromUserId: userId, type: "like", postId });
    }

    return Response.json({ liked: true });
  } catch (error) {
    return Response.json({ message: "Failed to toggle like", error: error.message }, { status: 500 });
  }
}
