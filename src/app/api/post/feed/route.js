import pool from "@/app/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return Response.json({ message: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    const { rows: posts } = await pool.query(
      `SELECT
        p.post_id,
        p.title,
        p.createdate AS "createDate",
        p.image_url,
        COALESCE(p.visibility, 'everyone') AS visibility,
        c.content_id,
        c.mealname AS "mealName",
        n.calories, n.protein, n.carbohydrates AS carbs, n.fats, n.fiber,
        mt.mealcategory AS "mealCategory",
        u.user_id AS author_id,
        u.first_name,
        u.last_name,
        (SELECT COUNT(*) FROM likes lk WHERE lk.post_id = p.post_id) AS like_count,
        (SELECT COUNT(*) FROM comments cm WHERE cm.post_id = p.post_id) AS comment_count,
        (SELECT COUNT(*) FROM likes ml WHERE ml.post_id = p.post_id AND ml.user_id = $1) AS user_liked,
        CASE WHEN u.user_id = $2 OR EXISTS(
          SELECT 1 FROM friend_request fr
          WHERE fr.status = 2
          AND ((fr.sender_id = u.user_id AND fr.receiver_id = $3)
            OR (fr.receiver_id = u.user_id AND fr.sender_id = $4))
        ) THEN 1 ELSE 0 END AS is_priority
      FROM posts p
      JOIN content c ON c.content_id = p.content_id
      JOIN users u ON u.user_id = p.user_id
      LEFT JOIN nutrition n ON n.content_id = c.content_id
      LEFT JOIN mealtype mt ON mt.content_id = c.content_id
      WHERE (
        COALESCE(p.visibility, 'everyone') = 'everyone'
        OR p.user_id = $5
        OR EXISTS(
          SELECT 1 FROM friend_request fr
          WHERE fr.status = 2
          AND ((fr.sender_id = p.user_id AND fr.receiver_id = $6)
            OR (fr.receiver_id = p.user_id AND fr.sender_id = $7))
        )
      )
      ORDER BY is_priority DESC, COALESCE(p.createdate, '2000-01-01') DESC`,
      [userId, userId, userId, userId, userId, userId, userId]
    );

    if (posts.length === 0) {
      return Response.json({ data: [] });
    }

    const contentIds = [...new Set(posts.map((p) => p.content_id))];

    const { rows: ingredients } = await pool.query(
      "SELECT content_id, name, quantity, units FROM ingredients WHERE content_id = ANY($1)",
      [contentIds]
    );

    const { rows: instructions } = await pool.query(
      "SELECT content_id, steps, description FROM instructions WHERE content_id = ANY($1) ORDER BY steps",
      [contentIds]
    );

    const result = posts.map((post) => ({
      ...post,
      user_liked: Number(post.user_liked) > 0,
      is_priority: Number(post.is_priority) > 0,
      ingredients: ingredients.filter((i) => i.content_id === post.content_id),
      instructions: instructions.filter((i) => i.content_id === post.content_id),
    }));

    return Response.json({ data: result });
  } catch (error) {
    console.error("Feed error:", error);
    return Response.json({ message: "Failed to load feed", error: error.message }, { status: 500 });
  }
}
