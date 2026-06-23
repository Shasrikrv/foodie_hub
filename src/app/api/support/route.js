import pool from "@/app/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { v4 as uuidv4 } from "uuid";

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    const { email, subject, message } = await req.json();

    if (!email?.trim() || !subject?.trim() || !message?.trim()) {
      return Response.json({ error: "All fields are required" }, { status: 400 });
    }

    await pool.query(
      "INSERT INTO support_tickets (ticket_id, user_id, email, subject, message) VALUES ($1, $2, $3, $4, $5)",
      [uuidv4(), session?.user?.id || null, email.trim(), subject.trim(), message.trim()]
    );
    return Response.json({ success: true });
  } catch (err) {
    console.error("Support error:", err);
    return Response.json({ error: "Failed to submit" }, { status: 500 });
  }
}
