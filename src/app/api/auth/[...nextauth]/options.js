import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { compare } from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import pool from "@/app/lib/db";

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password required");
        }
        const { rows } = await pool.query("SELECT * FROM users WHERE email = $1", [credentials.email]);
        const user = rows[0];
        if (!user) throw new Error("Email not found");
        const isPasswordValid = await compare(credentials.password, user.password);
        if (!isPasswordValid) throw new Error("Invalid password");
        return {
          id: user.user_id,
          email: user.email,
          name: `${user.first_name} ${user.last_name}`,
          isAdmin: !!user.is_admin,
          profilePic: user.profile_pic || null,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        try {
          const { rows } = await pool.query("SELECT user_id FROM users WHERE email = $1", [user.email]);
          if (rows.length === 0) {
            const userId = uuidv4();
            const parts = (user.name || "").trim().split(" ");
            const firstName = parts[0] || "User";
            const lastName = parts.slice(1).join(" ") || "";
            await pool.query(
              "INSERT INTO users (user_id, first_name, last_name, email, password) VALUES ($1, $2, $3, $4, $5)",
              [userId, firstName, lastName, user.email, ""]
            );
          }
        } catch (err) {
          console.error("Google signIn DB error:", err);
          return false;
        }
      }
      return true;
    },
    async jwt({ token, user, account, trigger }) {
      if (trigger === "update" && token.id) {
        const { rows } = await pool.query(
          "SELECT first_name, last_name, is_admin, profile_pic, phone_number, recovery_email FROM users WHERE user_id = $1",
          [token.id]
        );
        if (rows[0]) {
          token.name = `${rows[0].first_name} ${rows[0].last_name}`.trim();
          token.isAdmin = !!rows[0].is_admin;
          token.profilePic = rows[0].profile_pic || null;
          token.recoveryComplete = !!(rows[0].phone_number || rows[0].recovery_email);
        }
        return token;
      }

      if (user) {
        if (account?.provider === "credentials") {
          token.id = user.id;
          token.isAdmin = user.isAdmin;
          token.profilePic = user.profilePic;
          const { rows: rRows } = await pool.query(
            "SELECT phone_number, recovery_email FROM users WHERE user_id = $1",
            [user.id]
          );
          token.recoveryComplete = !!(rRows[0]?.phone_number || rRows[0]?.recovery_email);
        } else {
          const { rows } = await pool.query(
            "SELECT user_id, is_admin, profile_pic, first_name, last_name, phone_number, recovery_email FROM users WHERE email = $1",
            [token.email]
          );
          if (rows[0]) {
            token.id = rows[0].user_id;
            token.isAdmin = !!rows[0].is_admin;
            token.profilePic = rows[0].profile_pic || null;
            token.name = `${rows[0].first_name} ${rows[0].last_name}`.trim();
            token.recoveryComplete = !!(rows[0].phone_number || rows[0].recovery_email);
          }
        }
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id;
      session.user.isAdmin = token.isAdmin ?? false;
      session.user.profilePic = token.profilePic ?? null;
      session.user.recoveryComplete = token.recoveryComplete ?? false;
      if (token.name) session.user.name = token.name;
      return session;
    },
  },
  pages: { signIn: "/" },
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
};
