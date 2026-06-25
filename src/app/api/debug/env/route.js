import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    DB_HOST: process.env.DB_HOST ? "exists" : "missing",
    DB_PORT: process.env.DB_PORT ? "exists" : "missing",
    DB_USER: process.env.DB_USER ? "exists" : "missing",
    DB_PASSWORD: process.env.DB_PASSWORD ? "exists" : "missing",
    DB_NAME: process.env.DB_NAME ? "exists" : "missing",
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ? "exists" : "missing",
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ? "exists" : "missing",
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? "exists" : "missing",
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME ? "exists" : "missing",
    CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY ? "exists" : "missing",
    CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET ? "exists" : "missing",
  });
}
