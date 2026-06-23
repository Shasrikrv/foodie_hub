import pool from "@/app/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";

export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return Response.json({ error: "Not authenticated" }, { status: 401 });

    const userId = session.user.id;
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const { rows: posts } = await client.query("SELECT content_id FROM posts WHERE user_id = $1", [userId]);
      const contentIds = posts.map((p) => p.content_id).filter(Boolean);

      if (contentIds.length > 0) {
        await client.query("DELETE FROM mealcontentjunction WHERE content_id = ANY($1)", [contentIds]);
        await client.query("DELETE FROM mealtype WHERE content_id = ANY($1)", [contentIds]);
        await client.query("DELETE FROM nutrition WHERE content_id = ANY($1)", [contentIds]);
        await client.query("DELETE FROM ingredients WHERE content_id = ANY($1)", [contentIds]);
        await client.query("DELETE FROM instructions WHERE content_id = ANY($1)", [contentIds]);
        await client.query("DELETE FROM content WHERE content_id = ANY($1)", [contentIds]);
      }

      await client.query("DELETE FROM posts WHERE user_id = $1", [userId]);
      await client.query("DELETE FROM likes WHERE user_id = $1", [userId]);
      await client.query("DELETE FROM comments WHERE user_id = $1", [userId]);
      await client.query("DELETE FROM notifications WHERE user_id = $1", [userId]);
      await client.query("DELETE FROM messages WHERE sender_id = $1 OR receiver_id = $1", [userId]);
      await client.query("DELETE FROM friend_request WHERE sender_id = $1 OR receiver_id = $1", [userId]);
      await client.query("UPDATE support_tickets SET user_id = NULL WHERE user_id = $1", [userId]);
      await client.query("DELETE FROM password_reset_tokens WHERE user_id = $1", [userId]);
      await client.query("DELETE FROM ai_credits WHERE user_id = $1", [userId]);
      await client.query("DELETE FROM users WHERE user_id = $1", [userId]);

      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }

    return Response.json({ success: true });
  } catch (err) {
    console.error("Account deletion error:", err);
    return Response.json({ error: "Failed to delete account" }, { status: 500 });
  }
}
