import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * Keeps the Supabase project awake.
 *
 * Supabase's free tier pauses a project after seven days with no database
 * activity, and a paused project takes the whole till and back office down until
 * someone restores it by hand. A tiny query on a daily schedule counts as
 * activity, so the seven-day clock never runs out. Vercel Cron calls this once a
 * day (see vercel.json).
 *
 * Vercel signs cron requests with `Authorization: Bearer $CRON_SECRET`. We
 * reject anything without it so the endpoint can't be used to poke the database
 * from the open internet — but only when the secret is actually configured, so
 * local runs and first deploys before the secret is set still work.
 */

// This must hit the database on every call, never a cached response.
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true, at: new Date().toISOString() });
  } catch (error) {
    console.error("[cron/keepalive]", error);
    return NextResponse.json({ ok: false, error: "Database unreachable" }, { status: 503 });
  }
}
