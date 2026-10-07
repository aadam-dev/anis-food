import { getCurrentUser } from "@/lib/auth/session";
import { getSettings } from "@/lib/settings";
import { currentSession } from "@/lib/pos-session";
import { prisma } from "@/lib/db";
import { SELLABLE_DISH } from "@/lib/menu-sizes";
import { toMoney } from "@/lib/money";
import { menuImage } from "@/lib/menu-image";
import { canAccess, canEditPaidOrders, canVoidAtTill } from "@/lib/permissions";
import { serialiseOrder } from "@/lib/serialise-order";
import Register from "@/components/pos/Register";
import type { OrderView, PosCategory, PosMenuItem, SessionView } from "@/components/pos/types";

export const dynamic = "force-dynamic";

/**
 * Everything the till needs is fetched here, on the server, and handed over as
 * props. The register then has no loading state on first paint — a cashier with
 * a customer waiting should see the menu immediately, not a spinner.
 */
export default async function PosPage() {
  const user = await getCurrentUser();
  const [settings, session, categories, items, tickets, expenseCategories] = await Promise.all([
    getSettings(),
    currentSession(),
    prisma.menuCategory.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, sortOrder: true },
    }),
    prisma.menuItem.findMany({
      where: SELLABLE_DISH,
      orderBy: [{ category: { sortOrder: "asc" } }, { sortOrder: "asc" }],
      select: {
        id: true,
        slug: true,
        name: true,
        price: true,
        categoryId: true,
        imageUrl: true,
        isPopular: true,
          sizes: {
            where: { isAvailable: true },
            orderBy: { sortOrder: "asc" },
            select: { id: true, label: true, price: true },
          },
      },
    }),
    prisma.order.findMany({
      where: {
        paymentStatus: "PENDING",
        status: { not: "CANCELLED" },
        paymentMethod: { not: "BOLT_FOOD" },
      },
      orderBy: { createdAt: "asc" },
      include: { items: true },
      take: 100,
    }),
    prisma.expenseCategory.findMany({
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const menuItems: PosMenuItem[] = items.map((item) => ({
    id: item.id,
    slug: item.slug,
    name: item.name,
    // A dish with sizes sells from its cheapest size.
    price: item.sizes.length ? Math.min(...item.sizes.map((size) => toMoney(size.price))) : toMoney(item.price),
    sizes: item.sizes.map((size) => ({ id: size.id, label: size.label, price: toMoney(size.price) })),
    categoryId: item.categoryId,
    imageUrl: menuImage(item.imageUrl, item.categoryId, item.name),
    isPopular: item.isPopular,
  }));

  // The same shape the till gets from the API on refresh, so a ticket looks
  // identical on first paint and after a reload.
  const openTickets: OrderView[] = tickets.map(serialiseOrder) as OrderView[];

  const canFileExpense = canAccess(user!.role, "expenses");
  const canVoid = canVoidAtTill(user!.role);
  const canEditPaid = canEditPaidOrders(user!.role);
  const backOfficeHref = canAccess(user!.role, "admin") ? "/admin" : undefined;

  return (
    <Register
      user={{ id: user!.sub, name: user!.name, role: user!.role }}
      business={{
        header: settings.receipt_header,
        address: settings.business_address,
        phone: settings.business_phone,
        footer: settings.receipt_footer,
        taxLabel: settings.tax_label,
      }}
      defaultOpeningFloat={Number(settings.default_opening_float) || 0}
      initialSession={session as SessionView | null}
      initialCategories={categories as PosCategory[]}
      initialItems={menuItems}
      initialTickets={openTickets}
      expenseCategories={expenseCategories}
      canFileExpense={canFileExpense}
      canVoid={canVoid}
      canEditPaid={canEditPaid}
      backOfficeHref={backOfficeHref}
    />
  );
}
