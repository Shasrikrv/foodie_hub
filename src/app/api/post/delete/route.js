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

    // Verify ownership and get content_id
    const [posts] = await pool.query(
      "SELECT content_id FROM posts WHERE post_id = ? AND user_id = ?",
      [postId, session.user.id]
    );
    if (!posts.length) {
      return Response.json({ error: "Post not found or not authorized" }, { status: 403 });
    }
    const contentId = posts[0].content_id;

    // Delete in FK-safe order
    await pool.query("DELETE FROM likes WHERE post_id = ?", [postId]);
    await pool.query("DELETE FROM comments WHERE post_id = ?", [postId]);
    await pool.query("DELETE FROM posts WHERE post_id = ?", [postId]);
    await pool.query("DELETE FROM mealContentJunction WHERE content_id = ?", [contentId]);
    await pool.query("DELETE FROM mealType WHERE content_id = ?", [contentId]);
    await pool.query("DELETE FROM ingredients WHERE content_id = ?", [contentId]);
    await pool.query("DELETE FROM instructions WHERE content_id = ?", [contentId]);
    await pool.query("DELETE FROM nutrition WHERE content_id = ?", [contentId]);
    await pool.query("DELETE FROM content WHERE content_id = ?", [contentId]);

    return Response.json({ success: true });
  } catch (error) {
    console.error("Delete error:", error);
    return Response.json({ error: "Failed to delete post" }, { status: 500 });
  }
}
