import pool from "@/app/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { compare, hash } from "bcryptjs";
import { writeFile } from "fs/promises";
import { join } from "path";
import { v4 as uuidv4 } from "uuid";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const [rows] = await pool.query(
      "SELECT user_id, first_name, last_name, email, bio, profile_pic, is_admin FROM users WHERE user_id = ?",
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
      // Profile picture upload
      const form = await req.formData();
      const file = form.get("avatar");
      if (!file) return Response.json({ error: "No file" }, { status: 400 });

      const allowed = ["image/jpeg", "image/png", "image/webp"];
      if (!allowed.includes(file.type)) return Response.json({ error: "Invalid file type" }, { status: 400 });

      const ext = file.type.split("/")[1];
      const filename = `${uuidv4()}.${ext}`;
      const bytes = await file.arrayBuffer();
      const uploadDir = join(process.cwd(), "public", "uploads", "avatars");
      await writeFile(join(uploadDir, filename), Buffer.from(bytes));
      const url = `/uploads/avatars/${filename}`;

      await pool.query("UPDATE users SET profile_pic = ? WHERE user_id = ?", [url, session.user.id]);
      return Response.json({ url });
    }

    // JSON update (name, bio, password)
    const { firstName, lastName, bio, currentPassword, newPassword } = await req.json();

    if (newPassword) {
      const [rows] = await pool.query("SELECT password FROM users WHERE user_id = ?", [session.user.id]);
      const valid = await compare(currentPassword || "", rows[0]?.password || "");
      if (!valid) return Response.json({ error: "Current password is incorrect" }, { status: 400 });
      const hashed = await hash(newPassword, 12);
      await pool.query("UPDATE users SET password = ? WHERE user_id = ?", [hashed, session.user.id]);
    }

    await pool.query(
      "UPDATE users SET first_name = ?, last_name = ?, bio = ? WHERE user_id = ?",
      [firstName?.trim() || "", lastName?.trim() || "", bio?.trim() || null, session.user.id]
    );

    return Response.json({ success: true });
  } catch (err) {
    console.error("Profile PUT error:", err);
    return Response.json({ error: "Failed" }, { status: 500 });
  }
}
