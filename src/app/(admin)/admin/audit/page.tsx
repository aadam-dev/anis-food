import Link from "next/link";
import { Download } from "lucide-react";
import { prisma } from "@/lib/db";
import { resolvePeriod } from "@/lib/period";
import { getAudit } from "@/lib/audit-query";
import { AUDIT_AREAS } from "@/lib/audit-describe";
import { PageHeader, Panel, EmptyState, Table, Chip } from "@/components/admin/ui";
import PeriodPicker from "@/components/admin/PeriodPicker";
import AuditFilters from "./AuditFilters";

export const metadata = { title: "Audit trail" };
export const dynamic = "force-dynamic";

const PAGE = 100;

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const one = (key: string) => (Array.isArray(params[key]) ? params[key][0] : params[key]) as string | undefined;
  const period = resolvePeriod(params, "week");
  const page = Math.max(1, Number(one("page")) || 1);
  const area = one("area");
  const actorId = one("who");

  const [{ rows, count }, people] = await Promise.all([
    getAudit({ from: period.from, to: period.to, area, actorId, take: PAGE, skip: (page - 1) * PAGE }),
    prisma.user.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  const query = new URLSearchParams(Object.entries(params).filter(([, value]) => typeof value === "string") as [string, string][]);
  const pageHref = (next: number) => {
    const copy = new URLSearchParams(query);
    copy.set("page", String(next));
    return `?${copy.toString()}`;
  };
  query.delete("page");
  const pages = Math.max(1, Math.ceil(count / PAGE));

  return (
    <>
      <PageHeader
        eyebrow={`Manage · ${period.label}`}
        title="Audit trail"
        description="Who did what, and when: sales, voids, edits, money moved, prices changed, logins. Nothing here can be edited."
        actions={<PeriodPicker period={period} />}
      />
      <AuditFilters areas={[...AUDIT_AREAS]} people={people} area={area ?? ""} who={actorId ?? ""} />
      <Panel
        title={`${count} event${count === 1 ? "" : "s"}`}
        action={
          <a href={`/api/admin/audit/export?${query.toString()}`} className="inline-flex items-center gap-1.5 text-sm font-bold" style={{ color: "var(--s-brand)" }}>
            <Download className="h-4 w-4" /> Excel
          </a>
        }
      >
        {rows.length === 0 ? (
          <EmptyState title="Nothing recorded for these filters" hint="Try a longer period or another area." />
        ) : (
          <Table>
            <thead>
              <tr>
                <th>When</th>
                <th>Who</th>
                <th>Area</th>
                <th>What happened</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="muted whitespace-nowrap">
                    {row.at.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Accra" })}
                  </td>
                  <td className="whitespace-nowrap font-semibold">{row.who}</td>
                  <td>
                    <Chip tone="neutral">{row.area}</Chip>
                  </td>
                  <td>{row.what}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
        {pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 text-sm sm:px-5">
            {page > 1 ? <Link href={pageHref(page - 1)} className="font-bold" style={{ color: "var(--s-brand)" }}>← Newer</Link> : <span />}
            <span style={{ color: "var(--s-ink-muted)" }}>
              Page {page} of {pages}
            </span>
            {page < pages ? <Link href={pageHref(page + 1)} className="font-bold" style={{ color: "var(--s-brand)" }}>Older →</Link> : <span />}
          </div>
        )}
      </Panel>
    </>
  );
}
