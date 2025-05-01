import { NextRequest, NextResponse } from "next/server";
export { default } from "next-auth/middleware";
import { getToken } from "next-auth/jwt";

// This function can be marked `async` if using `await` inside
export async function middleware(request) {
  const token = await getToken({ req });
  const url = request.nextUrl;

  if (token && url.pathname.startswith("/auth/login")) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.redirect(new URL("/home", request.url));
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: ["/auth/login", "/auth/login/registration", "/"],
};
