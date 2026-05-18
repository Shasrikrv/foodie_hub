import { NextResponse } from "next/server";
import pool from "@/app/lib/db";
import { hash } from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

const registerSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  email: z.string().email("Invalid email format"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(
      /[^A-Za-z0-9]/,
      "Password must contain at least one special character"
    ),
});

export async function GET() {
  try {
    const [rows] = await pool.query("SELECT * FROM user ");
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

export async function POST(req) {
  try {
    const request = await req.json();
    console.log(request);
    // Validate request body against schema
    const result = registerSchema.safeParse(request);

    if (!result.success) {
      const errors = result.error.errors.map((error) => ({
        field: error.path[0],
        message: error.message,
      }));

      return NextResponse.json({ errors }, { status: 400 });
    }

    const { firstName, lastName, email, password } = result.data;

    // Check if email already exists
    const [existingUsers] = await pool.query(
      "SELECT user_id FROM users WHERE email = ?",
      [email]
    );

    if (existingUsers.length > 0) {
      return NextResponse.json(
        { error: "Email already exists" },
        { status: 400 }
      );
    }

    const hashedPassword = await hash(password, 12);
    const userId = uuidv4();
    await pool.execute(
      "INSERT INTO users (user_id, first_name, last_name, email, password) VALUES (?, ?, ?, ?, ?)",
      [userId, firstName, lastName, email, hashedPassword]
    );

    return NextResponse.json(
      { message: "User registered successfully" },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);

    if (error.code === "ER_DUP_ENTRY") {
      return NextResponse.json(
        { error: "Email already exists" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "An error occurred during registration" },
      { status: 500 }
    );
  }
}
