import { commentOnPost } from "../postDetalis";
import pool from "@/app/lib/db";

export async function POST(req) {
  try {
    const request = await req.json();
    const result = await commentOnPost(request);
    return Response.json({ result: result });
  } catch (error) {
    console.error("Connection error", error);
    return Response.json(
      {
        message: "Database connection failed",
        error: error.message,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const [rows] = await pool.query("SELECT * FROM comments ");
    return Response.json({
      data: rows,
    });
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
