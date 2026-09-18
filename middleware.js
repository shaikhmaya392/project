import { NextResponse } from "next/server";
import { verifySessionToken, SESSION_COOKIE } from "./lib/session";

const PUBLIC_PATHS = ["/login", "/signup"];
const PUBLIC_PREFIXES = ["/api/auth", "/quotations/", "/_next", "/logo.png", "/logo-color.png", "/favicon"];

function isPublic(pathname, method) {
  if (PUBLIC_PATHS.includes(pathname)) return true;
  if (pathname === "/api/leads/webhook") return true;
  if (pathname === "/api/admin/seed") return true;
  // Public quotation view/accept endpoint: GET/POST /api/quotations/<token>
  // (not /api/quotations itself, and not PATCH - editing needs staff auth).
  if (/^\/api\/quotations\/[^/]+$/.test(pathname)) {
    return method === "GET" || method === "POST";
  }
  return PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
}

export async function middleware(request) {
  const { pathname } = request.nextUrl;
  if (isPublic(pathname, request.method)) return NextResponse.next();

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = await verifySessionToken(token);

  if (!session) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|logo.png|logo-color.png|favicon.ico).*)"],
};
