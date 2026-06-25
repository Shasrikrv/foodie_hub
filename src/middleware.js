import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

const PUBLIC_AUTH_PATHS = [
  "/auth/login",
  "/auth/registration",
  "/auth/forgot-password",
  "/auth/reset-password",
];

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;

    if (req.nextauth.token && pathname === "/") {
      return NextResponse.redirect(new URL("/auth/home", req.url));
    }

    if (
      req.nextauth.token &&
      !req.nextauth.token.recoveryComplete &&
      !pathname.startsWith("/auth/setup") &&
      !pathname.startsWith("/api")
    ) {
      return NextResponse.redirect(new URL("/auth/setup", req.url));
    }
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;
        if (pathname === "/" || PUBLIC_AUTH_PATHS.some((p) => pathname.startsWith(p))) return true;
        return !!token;
      },
    },
    pages: { signIn: "/" },
  }
);

export const config = {
  matcher: ["/", "/auth/:path*"],
};
