import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/auth/jwt";
import { canAccess, landingPathFor, resourceForPath } from "@/lib/permissions";

/**
 * Front door for /admin, /pos and their APIs.
 *
 * Next 16 calls this a proxy rather than middleware. It guards by URL shape
 * using only the signed cookie — no database, no Prisma — so it stays fast and
 * bundles cleanly. The real authorisation check runs inside each route handler
 * via requireResource(); this layer exists to turn away the obvious cases before
 * they reach any application code.
 */

/**
 * "/account" has no resource entry in permissions.ts on purpose: every signed-in
 * person may change their own password, whatever their role. Listing it here
 * still requires a valid session to reach it.
 */
const PROTECTED_PREFIXES = ["/admin", "/pos", "/api/admin", "/api/pos", "/app", "/account"];

function isProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // CVE-2025-29927: a crafted x-middleware-subrequest header can convince Next
  // that this check already ran. Strip it from anything arriving off the wire.
  const headers = new Headers(request.headers);
  headers.delete("x-middleware-subrequest");
  const forward = { request: { headers } };

  if (!isProtected(pathname)) {
    return NextResponse.next(forward);
  }

  const isApi = pathname.startsWith("/api/");
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;

  if (!session) {
    if (isApi) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    const login = new URL("/login", request.url);
    login.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(login);
  }

  // The PWA start_url. Sends each person to the screen they actually work on.
  if (pathname === "/app") {
    return NextResponse.redirect(new URL(landingPathFor(session.role), request.url));
  }

  const resource = resourceForPath(pathname);
  if (resource && !canAccess(session.role, resource)) {
    if (isApi) return NextResponse.json({ error: "Not allowed" }, { status: 403 });
    // Land them somewhere they can actually use rather than a dead end.
    return NextResponse.redirect(new URL(landingPathFor(session.role), request.url));
  }

  return NextResponse.next(forward);
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/pos/:path*",
    "/account/:path*",
    "/api/admin/:path*",
    "/api/pos/:path*",
    "/app",
  ],
};
