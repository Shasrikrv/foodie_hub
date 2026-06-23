import pool from "@/app/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";

export async function DELETE(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { postId } = await req.json();
    if (!postId) return Response.json({ error: "postId required" }, { status: 400 });

    const { rows: posts } = await pool.query(
      "SELECT content_id FROM posts WHERE post_id = $1 AND user_id = $2",
      [postId, session.user.id]
    );
    if (!posts.length) {
      return Response.json({ error: "Post not found or not authorized" }, { status: 403 });
    }
    const contentId = posts[0].content_id;

    await pool.query("DELETE FROM likes WHERE post_id = $1", [postId]);
    await pool.query("DELETE FROM comments WHERE post_id = $1", [postId]);
    await pool.query("DELETE FROM posts WHERE post_id = $1", [postId]);
    await pool.query("DELETE FROM mealcontentjunction WHERE content_id = $1", [contentId]);
    await pool.query("DELETE FROM mealtype WHERE content_id = $1", [contentId]);
    await pool.query("DELETE FROM ingredients WHERE content_id = $1", [contentId]);
    await pool.query("DELETE FROM instructions WHERE content_id = $1", [contentId]);
    await pool.query("DELETE FROM nutrition WHERE content_id = $1", [contentId]);
    await pool.query("DELETE FROM content WHERE content_id = $1", [contentId]);

    return Response.json({ success: true });
  } catch (error) {
    console.error("Delete error:", error);
    return Response.json({ error: "Failed to delete post" }, { status: 500 });
  }
}
