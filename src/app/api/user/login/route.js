// import NextAuth from "next-auth";
// import CredentialsProvider from "next-auth/providers/credentials";
// import { NextResponse } from "next/server";
// import { compare } from "bcryptjs";
// import jwt from "jsonwebtoken";
// import pool from "@/app/lib/db";

// export async function POST(req) {
//   try {
//     const result = await req.json();
//     console.log("result from front end", result);
//     const { email, password } = result;

//     if (!email || !password) {
//       return NextResponse.json(
//         { message: "Email and password required" },
//         { status: 400 }
//       );
//     }

//     const [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [
//       email,
//     ]);

//     const user = rows[0];

//     if (!user) {
//       return NextResponse.json({ message: "Email not found" }, { status: 404 });
//     }

//     const isValid = await compare(password, user.password);

//     if (!isValid) {
//       return NextResponse.json(
//         { message: "Invalid password" },
//         { status: 401 }
//       );
//     }

//     const token = jwt.sign(
//       {
//         id: user.user_id,
//         email: user.email,
//         name: `${user.first_name} ${user.last_name}`,
//       },
//       process.env.JWT_SECRET,
//       { expiresIn: "1h" }
//     );

//     return NextResponse.json({
//       token,
//       user: { id: user.user_id, email: user.email },
//     });
//   } catch (err) {
//     console.error("Login error:", err);
//     return NextResponse.json({ message: "Server error" }, { status: 500 });
//   }
// }
