import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { NextResponse } from "next/server";
import { compare } from "bcryptjs";
import jwt from "jsonwebtoken";
import pool from "@/app/lib/db";

export const authOptions = {
  providers: [
    CredentialsProvider({
      id: "Credentials",
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        console.log("received credientials", credentials);
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password required");
        }
        console.log("credientials", credentials);
        const [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [
          credentials.email,
        ]);

        const user = rows[0];

        if (!user) {
          throw new Error("Email not found");
        }

        const isPasswordValid = await compare(
          credentials.password,
          user.password
        );

        if (!isPasswordValid) {
          throw new Error("Invalid password");
        }

        return {
          id: user.user_id,
          email: user.email,
          name: `${user.first_name} ${user.last_name}`,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // First login
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      // Attach ID to the session
      session.user.id = token.id;
      return session;
    },
  },
  pages: {
    signIn: "/auth/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
