import Link from "next/link";
import { prisma } from "@/lib/db";
import { PageHeader, Panel } from "@/components/admin/ui";
import InstallPrompt from "@/components/pwa/InstallPrompt";

export const metadata = { title: "Overview" };
export const dynamic = "force-dynamic";

/**
 * Placeholder overview. The real cockpit — today against the same weekday last
 * week, payment mix, open tickets, drawer state — lands with the reporting work
 * once the till is writing orders. Until then this shows what is actually set up
 * rather than pretending to have numbers it cannot have.
 */
export default async function AdminOverviewPage() {
  const [menuCount, availableCount, staffCount] = await Promise.all([
    prisma.menuItem.count(),
    prisma.menuItem.count({ where: { isAvailable: true } }),
    prisma.user.count({ where: { isActive: true } }),
  ]);

  return (
    <>
      <PageHeader
        title="Overview"
        description="Sales figures appear here once the till starts taking orders."
      />

      <div className="mb-4">
        <InstallPrompt />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Panel className="p-5">
          <p className="text-sm" style={{ color: "var(--s-ink-muted)" }}>
            Dishes on the menu
          </p>
          <p className="money mt-1 text-3xl font-bold">{availableCount}</p>
          <p className="mt-1 text-xs" style={{ color: "var(--s-ink-faint)" }}>
            of {menuCount} total
          </p>
        </Panel>

        <Panel className="p-5">
          <p className="text-sm" style={{ color: "var(--s-ink-muted)" }}>
            Active staff accounts
          </p>
          <p className="money mt-1 text-3xl font-bold">{staffCount}</p>
        </Panel>

        <Panel className="p-5">
          <p className="text-sm" style={{ color: "var(--s-ink-muted)" }}>
            Next step
          </p>
          <Link
            href="/admin/menu"
            className="mt-1 inline-block font-semibold"
            style={{ color: "var(--s-brand)" }}
          >
            Check prices &amp; costs →
          </Link>
        </Panel>
      </div>
    </>
  );
}
