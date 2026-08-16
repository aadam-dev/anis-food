import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { landingPathFor } from "@/lib/permissions";

/**
 * The back-office PWA's start_url.
 *
 * One home-screen icon, two destinations: a cashier lands on the till, Karim
 * lands on the back office. The proxy usually resolves this from the cookie
 * before the request gets here; this route is the fallback for when it does not
 * (a direct navigation, or a request that slipped past the matcher).
 */
export async function GET() {
  const user = await getCurrentUser();
  redirect(user ? landingPathFor(user.role) : "/login");
}
