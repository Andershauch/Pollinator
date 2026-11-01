import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@/lib/auth/server";
import { applySecurityHeaders } from "@/lib/security";

const protectedPagePaths = ["/host", "/sessions", "/questions", "/report"];

export async function middleware(req: NextRequest) {
  const isProtectedPage = protectedPagePaths.some(
    (path) => req.nextUrl.pathname === path || req.nextUrl.pathname.startsWith(`${path}/`)
  );

  const response = isProtectedPage
    ? await getAuth().middleware({ loginUrl: "/auth/sign-in" })(req)
    : NextResponse.next();

  applySecurityHeaders(response.headers, {
    noStore: req.nextUrl.pathname.startsWith("/api/") || isProtectedPage || req.nextUrl.pathname.startsWith("/auth/"),
  });

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
