import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/auth-token";

const OPEN_API = [/^\/api\/auth\/login$/, /^\/api\/auth\/accept$/, /^\/api\/webhooks\//, /^\/api\/setup\//];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (OPEN_API.some((pattern) => pattern.test(pathname))) return NextResponse.next();
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  if (session) return NextResponse.next();
  if (pathname.startsWith("/api")) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/app/:path*", "/api/:path*"],
};
