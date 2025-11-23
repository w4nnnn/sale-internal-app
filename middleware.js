import { NextResponse } from "next/server";
import { withAuth } from "next-auth/middleware";

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const role = req.nextauth.token?.role;

    if (pathname === "/login" && role) {
      const redirectTarget = role === "admin" ? "/dashboard-admin" : "/dashboard";
      return NextResponse.redirect(new URL(redirectTarget, req.url));
    }

    if (pathname.startsWith("/dashboard-admin")) {
      if (role !== "admin") {
        const redirectTarget = role === "sales" ? "/dashboard" : "/login";
        return NextResponse.redirect(new URL(redirectTarget, req.url));
      }
      return NextResponse.next();
    }

    if (pathname.startsWith("/dashboard")) {
      if (role !== "sales") {
        const redirectTarget = role === "admin" ? "/dashboard-admin" : "/login";
        return NextResponse.redirect(new URL(redirectTarget, req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ req, token }) => {
        const pathname = req.nextUrl.pathname;
        if (pathname === "/login") {
          return true;
        }
        return Boolean(token);
      },
    },
  }
);

export const config = {
  matcher: [
    "/login",
    "/dashboard",
    "/dashboard/:path*",
    "/dashboard-admin",
    "/dashboard-admin/:path*",
    "/api/pelanggan/:path*",
    "/api/aplikasi/:path*",
    "/api/users/:path*",
    "/post-login",
  ],
};
