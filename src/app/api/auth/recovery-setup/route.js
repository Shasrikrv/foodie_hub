import pool from "@/app/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { recoveryEmail, phoneNumber } = await req.json();
  if (!recoveryEmail?.trim() && !phoneNumber?.trim()) {
    return Response.json({ error: "Please provide a recovery email or phone number" }, { status: 400 });
  }

  await pool.query(
    "UPDATE users SET recovery_email = $1, phone_number = $2 WHERE user_id = $3",
    [recoveryEmail?.trim() || null, phoneNumber?.trim() || null, session.user.id]
  );
  return Response.json({ success: true });
}
