import pool from "@/app/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";

export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return Response.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q");

    if (!query) {
      return Response.json({ data: [] });
    }

    const [rows] = await pool.query(
      `select user_id, first_name, last_name, email
        from users
        where (first_name like ? or last_name like ? or email like ?)
        and user_id != ?`,
      [`%${query}%`, `%${query}%`, `%${query}%`, session.user.id]
    );
    return Response.json({ data: rows });
  } catch (error) {
    console.error("Connection error:", error);
    return Response.json(
      {
        message: "Database connection failed",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
