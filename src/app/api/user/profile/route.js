import pool from "@/app/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { compare, hash } from "bcryptjs";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { rows } = await pool.query(
      "SELECT user_id, first_name, last_name, email, bio, profile_pic, is_admin, anthropic_api_key IS NOT NULL AND anthropic_api_key != '' AS has_anthropic_key, openai_api_key IS NOT NULL AND openai_api_key != '' AS has_openai_key, gemini_api_key IS NOT NULL AND gemini_api_key != '' AS has_gemini_key FROM users WHERE user_id = $1",
      [session.user.id]
    );
    if (!rows[0]) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json({ data: rows[0] });
  } catch (err) {
    return Response.json({ error: "Failed" }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("avatar");
      if (!file) return Response.json({ error: "No file" }, { status: 400 });

      const allowed = ["image/jpeg", "image/png", "image/webp"];
      if (!allowed.includes(file.type)) return Response.json({ error: "Invalid file type" }, { status: 400 });

      const buffer = Buffer.from(await file.arrayBuffer());
      const url = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          { folder: "foodiehub/avatars", resource_type: "image" },
          (err, result) => {
            if (err) reject(err);
            else resolve(result.secure_url);
          }
        ).end(buffer);
      });

      await pool.query("UPDATE users SET profile_pic = $1 WHERE user_id = $2", [url, session.user.id]);
      return Response.json({ url });
    }

    const { firstName, lastName, bio, currentPassword, newPassword, anthropicApiKey, openaiApiKey, geminiApiKey } = await req.json();

    if (anthropicApiKey !== undefined) {
      await pool.query("UPDATE users SET anthropic_api_key = $1 WHERE user_id = $2", [anthropicApiKey?.trim() || null, session.user.id]);
      return Response.json({ success: true });
    }
    if (openaiApiKey !== undefined) {
      await pool.query("UPDATE users SET openai_api_key = $1 WHERE user_id = $2", [openaiApiKey?.trim() || null, session.user.id]);
      return Response.json({ success: true });
    }
    if (geminiApiKey !== undefined) {
      await pool.query("UPDATE users SET gemini_api_key = $1 WHERE user_id = $2", [geminiApiKey?.trim() || null, session.user.id]);
      return Response.json({ success: true });
    }

    if (newPassword) {
      const { rows } = await pool.query("SELECT password FROM users WHERE user_id = $1", [session.user.id]);
      const valid = await compare(currentPassword || "", rows[0]?.password || "");
      if (!valid) return Response.json({ error: "Current password is incorrect" }, { status: 400 });
      const hashed = await hash(newPassword, 12);
      await pool.query("UPDATE users SET password = $1 WHERE user_id = $2", [hashed, session.user.id]);
    }

    await pool.query(
      "UPDATE users SET first_name = $1, last_name = $2, bio = $3 WHERE user_id = $4",
      [firstName?.trim() || "", lastName?.trim() || "", bio?.trim() || null, session.user.id]
    );

    return Response.json({ success: true });
  } catch (err) {
    console.error("Profile PUT error:", err);
    return Response.json({ error: "Failed" }, { status: 500 });
  }
}
