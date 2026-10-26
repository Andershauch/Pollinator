import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@/lib/auth/server";

const protectedPagePaths = ["/host", "/sessions", "/questions"];

export async function middleware(req: NextRequest) {
  if (protectedPagePaths.some((path) => req.nextUrl.pathname === path || req.nextUrl.pathname.startsWith(`${path}/`))) {
    return getAuth().middleware({ loginUrl: "/auth/sign-in" })(req);
  }

  // Preflight
  if (req.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  const res = NextResponse.next();
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  return res;
}

export const config = {
  matcher: ["/api/:path*", "/host/:path*", "/sessions/:path*", "/questions/:path*"],
};
