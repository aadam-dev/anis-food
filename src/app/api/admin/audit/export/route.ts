import { NextResponse } from "next/server";
import { requireResource } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { resolvePeriod } from "@/lib/period";
import { getSettings } from "@/lib/settings";
import { getAudit } from "@/lib/audit-query";
import { Report, periodText } from "@/lib/excel";

/** The audit trail for a period as a spreadsheet (up to 20,000 events). */
export async function GET(request: Request) {
  const auth = await requireResource("users");
  if (auth instanceof NextResponse) return auth;
  const params = Object.fromEntries(new URL(request.url).searchParams);
  const period = resolvePeriod(params, "week");
  const [{ rows, count }, settings, me] = await Promise.all([
    getAudit({ from: period.from, to: period.to, area: params.area || undefined, actorId: params.who || undefined, take: 20_000 }),
    getSettings(),
    prisma.user.findUnique({ where: { id: auth.user.sub }, select: { name: true } }),
  ]);
  const report = new Report({ business: settings.business_name, period: periodText(period.from, period.to), generatedBy: me?.name });
  report.table("Audit trail", {
    title: "Audit trail",
    note: [params.area && `Area: ${params.area}`, count > rows.length && `First ${rows.length} of ${count} events`].filter(Boolean).join(" · ") || undefined,
    columns: [
      { header: "When", value: (row) => row.at, type: "datetime" },
      { header: "Who", value: (row) => row.who },
      { header: "Area", value: (row) => row.area },
      { header: "What happened", value: (row) => row.what, width: 80 },
      { header: "Device address", value: (row) => row.ip },
    ],
    rows,
  });
  return report.response(`anis-audit-${period.from}-to-${period.to}`);
}
