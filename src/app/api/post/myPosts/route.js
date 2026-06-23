import pool from "@/app/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    const { rows: posts } = await pool.query(
      `SELECT
        p.post_id, p.title, p.createdate AS "createDate", p.image_url,
        COALESCE(p.visibility, 'everyone') AS visibility,
        c.content_id, c.mealname AS "mealName",
        n.calories, n.protein, n.carbohydrates AS carbs, n.fats, n.fiber,
        mt.mealcategory AS "mealCategory",
        u.user_id AS author_id, u.first_name, u.last_name,
        (SELECT COUNT(*) FROM likes lk WHERE lk.post_id = p.post_id) AS like_count,
        (SELECT COUNT(*) FROM comments cm WHERE cm.post_id = p.post_id) AS comment_count,
        (SELECT COUNT(*) FROM likes ml WHERE ml.post_id = p.post_id AND ml.user_id = $1) AS user_liked
      FROM posts p
      JOIN content c ON c.content_id = p.content_id
      JOIN users u ON u.user_id = p.user_id
      LEFT JOIN nutrition n ON n.content_id = c.content_id
      LEFT JOIN mealtype mt ON mt.content_id = c.content_id
      WHERE p.user_id = $2
      ORDER BY COALESCE(p.createdate, '2000-01-01') DESC`,
      [userId, userId]
    );

    if (posts.length === 0) return Response.json({ data: [] });

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
      ingredients: ingredients.filter((i) => i.content_id === post.content_id),
      instructions: instructions.filter((i) => i.content_id === post.content_id),
    }));

    return Response.json({ data: result });
  } catch (error) {
    console.error("My posts error:", error);
    return Response.json({ error: "Failed to load posts" }, { status: 500 });
  }
}
