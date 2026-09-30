import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { canAccess } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { formatGHS, toMoney } from "@/lib/money";
import { callNumber } from "@/lib/session-utils";
import { PageHeader, Panel } from "@/components/admin/ui";

export const metadata = { title: "Search" };
export const dynamic = "force-dynamic";

export default async function OfficeSearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await getCurrentUser();
  const q = ((await searchParams).q ?? "").trim();
  const ready = q.length >= 2;

  const [orders, dishes, customers, staff] = await Promise.all([
    ready && canAccess(user?.role, "orders")
      ? prisma.order.findMany({
          where: {
            OR: [
              { orderNumber: { contains: q, mode: "insensitive" } },
              { customerName: { contains: q, mode: "insensitive" } },
              { customerPhone: { contains: q, mode: "insensitive" } },
            ],
          },
          orderBy: { createdAt: "desc" },
          take: 8,
          select: {
            id: true,
            orderNumber: true,
            customerName: true,
            total: true,
            paymentStatus: true,
            createdAt: true,
          },
        })
      : [],
    ready && canAccess(user?.role, "menu")
      ? prisma.menuItem.findMany({
          where: { name: { contains: q, mode: "insensitive" } },
          orderBy: { name: "asc" },
          take: 8,
          select: { id: true, name: true, price: true, isAvailable: true },
        })
      : [],
    ready && canAccess(user?.role, "customers")
      ? prisma.customer.findMany({
          where: {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { phone: { contains: q, mode: "insensitive" } },
            ],
          },
          orderBy: { name: "asc" },
          take: 8,
          select: { id: true, name: true, phone: true },
        })
      : [],
    ready && canAccess(user?.role, "staff")
      ? prisma.user.findMany({
          where: {
            isActive: true,
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
            ],
          },
          orderBy: { name: "asc" },
          take: 8,
          select: { id: true, name: true, role: true },
        })
      : [],
  ]);

  const groups = [
    {
      title: "Orders",
      href: "/admin/orders",
      rows: orders.map((order) => ({
        key: order.id,
        title: order.customerName || "Walk-in",
        detail: `#${callNumber(order.orderNumber)} · ${order.paymentStatus === "PENDING" ? "Unpaid" : "Paid"}`,
        amount: formatGHS(toMoney(order.total)),
      })),
    },
    {
      title: "Menu",
      href: "/admin/menu",
      rows: dishes.map((dish) => ({
        key: dish.id,
        title: dish.name,
        detail: dish.isAvailable ? "On the menu" : "Hidden",
        amount: formatGHS(toMoney(dish.price)),
      })),
    },
    {
      title: "Customers",
      href: q ? `/admin/customers?q=${encodeURIComponent(q)}` : "/admin/customers",
      rows: customers.map((customer) => ({
        key: customer.id,
        title: customer.name,
        detail: customer.phone,
        amount: "",
      })),
    },
    {
      title: "Staff",
      href: "/admin/staff",
      rows: staff.map((person) => ({
        key: person.id,
        title: person.name,
        detail: person.role.toLowerCase().replaceAll("_", " "),
        amount: "",
      })),
    },
  ].filter((group) => group.rows.length > 0);

  return (
    <>
      <PageHeader
        title="Search"
        description={ready ? `Results for “${q}”.` : "Type at least two letters. Orders, dishes, customers, and staff."}
      />

      {!ready ? (
        <Panel className="p-6">
          <p className="text-sm" style={{ color: "var(--s-ink-muted)" }}>
            Search from the bar above. An order number, a dish, a phone number, or a name all work.
          </p>
        </Panel>
      ) : groups.length === 0 ? (
        <Panel className="p-6">
          <p className="text-sm" style={{ color: "var(--s-ink-muted)" }}>
            Nothing matched “{q}”.
          </p>
        </Panel>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => (
            <Panel key={group.title} title={group.title} className="overflow-hidden">
              <ul className="divide-y" style={{ borderColor: "var(--s-border)" }}>
                {group.rows.map((row) => (
                  <li key={row.key}>
                    <Link
                      href={group.href}
                      className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-[var(--s-hover)]"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-bold">{row.title}</p>
                        <p className="text-xs capitalize" style={{ color: "var(--s-ink-faint)" }}>
                          {row.detail}
                        </p>
                      </div>
                      {row.amount && <span className="money font-semibold">{row.amount}</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            </Panel>
          ))}
        </div>
      )}
    </>
  );
}
