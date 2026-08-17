import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireResource, logAudit, clientIp } from "@/lib/api-auth";
import { ok, parseBody, handlePrismaError, badRequest } from "@/lib/api-utils";
import { SETTING_KEYS, revalidateSettings, type SettingKey } from "@/lib/settings";
import { revalidateMenu } from "@/lib/menu-data.server";

/**
 * Reading and writing settings.
 *
 * Only keys in SETTING_KEYS are accepted. The allow-list is the whole point: a
 * settings endpoint that stored any key it was handed would let anyone write
 * arbitrary rows the app then trusts. A tax rate outside [0, 1) is refused for
 * the same reason — one bad value here corrupts every total in the system.
 */
const patchSchema = z.record(z.string(), z.string().max(2000));

const ALLOWED = new Set<string>(SETTING_KEYS);

export async function GET() {
  const auth = await requireResource("settings");
  if (auth instanceof NextResponse) return auth;

  try {
    const rows = await prisma.setting.findMany();
    const values: Record<string, string> = {};
    for (const row of rows) if (ALLOWED.has(row.key)) values[row.key] = row.value;
    return ok({ settings: values });
  } catch (error) {
    return handlePrismaError(error, "admin/settings GET");
  }
}

export async function PATCH(request: Request) {
  const auth = await requireResource("settings");
  if (auth instanceof NextResponse) return auth;

  const parsed = await parseBody(request, patchSchema);
  if (parsed instanceof NextResponse) return parsed;
  const body = parsed.data;

  const unknown = Object.keys(body).filter((key) => !ALLOWED.has(key));
  if (unknown.length > 0) {
    return badRequest(`Unknown setting(s): ${unknown.join(", ")}`);
  }

  if ("tax_rate" in body) {
    const rate = Number(body.tax_rate);
    if (!Number.isFinite(rate) || rate < 0 || rate >= 1) {
      return badRequest("Tax rate must be a decimal between 0 and 1, e.g. 0.125 for 12.5%.");
    }
  }
  if ("pos_theme" in body && body.pos_theme !== "light" && body.pos_theme !== "dark") {
    return badRequest("Theme must be light or dark.");
  }
  if ("admin_theme" in body && body.admin_theme !== "light" && body.admin_theme !== "dark") {
    return badRequest("Theme must be light or dark.");
  }

  try {
    await prisma.$transaction(
      Object.entries(body).map(([key, value]) =>
        prisma.setting.upsert({
          where: { key },
          update: { value },
          create: { key, value },
        }),
      ),
    );

    revalidateSettings();
    // A currency symbol or tax change touches what the public menu would show.
    if ("currency_symbol" in body || "tax_rate" in body) revalidateMenu();

    await logAudit({
      actorId: auth.user.sub,
      action: "settings.update",
      resource: "Setting",
      resourceId: (Object.keys(body) as SettingKey[]).join(","),
      detail: { keys: Object.keys(body) },
      ip: clientIp(request),
    });

    return ok({ saved: Object.keys(body) });
  } catch (error) {
    return handlePrismaError(error, "admin/settings PATCH");
  }
}
