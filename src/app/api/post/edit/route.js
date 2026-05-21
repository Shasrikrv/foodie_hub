import pool from "@/app/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { v4 as uuidv4 } from "uuid";

export async function PUT(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      postId, title, visibility, mealName,
      calories, protein, carbs, fats, fiber,
      ingredients, instructions,
    } = await req.json();

    if (!postId || !title?.trim()) {
      return Response.json({ error: "postId and title are required" }, { status: 400 });
    }

    // Verify ownership
    const [posts] = await pool.query(
      "SELECT content_id FROM posts WHERE post_id = ? AND user_id = ?",
      [postId, session.user.id]
    );
    if (!posts.length) {
      return Response.json({ error: "Post not found or not authorized" }, { status: 403 });
    }
    const contentId = posts[0].content_id;

    const vis = ["friends", "everyone"].includes(visibility) ? visibility : "everyone";

    await pool.query(
      "UPDATE posts SET title = ?, visibility = ? WHERE post_id = ?",
      [title.trim(), vis, postId]
    );

    if (mealName?.trim()) {
      await pool.query("UPDATE content SET mealName = ? WHERE content_id = ?", [mealName.trim(), contentId]);
    }

    // Nutrition — replace entirely
    await pool.query("DELETE FROM nutrition WHERE content_id = ?", [contentId]);
    if (calories || protein || carbs || fats || fiber) {
      await pool.query(
        "INSERT INTO nutrition (nutrition_id, content_id, calories, protein, carbohydrates, fats, fiber) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [uuidv4(), contentId, calories || null, protein || null, carbs || null, fats || null, fiber || null]
      );
    }

    // Ingredients — replace entirely
    await pool.query("DELETE FROM ingredients WHERE content_id = ?", [contentId]);
    for (const ing of (ingredients || [])) {
      if (!ing.name?.trim()) continue;
      await pool.query(
        "INSERT INTO ingredients (ingredients_id, content_id, name, quantity, units) VALUES (?, ?, ?, ?, ?)",
        [uuidv4(), contentId, ing.name.trim(), ing.quantity || null, ing.unit || "g"]
      );
    }

    // Instructions — replace entirely
    await pool.query("DELETE FROM instructions WHERE content_id = ?", [contentId]);
    for (const inst of (instructions || [])) {
      if (!inst.description?.trim()) continue;
      await pool.query(
        "INSERT INTO instructions (instructions_id, content_id, steps, description) VALUES (?, ?, ?, ?)",
        [uuidv4(), contentId, inst.step, inst.description.trim()]
      );
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("Edit error:", error);
    return Response.json({ error: "Failed to update post" }, { status: 500 });
  }
}
