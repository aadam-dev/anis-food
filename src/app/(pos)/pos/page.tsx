import { getCurrentUser } from "@/lib/auth/session";
import { getSettings } from "@/lib/settings";
import { currentSession } from "@/lib/pos-session";
import { prisma } from "@/lib/db";
import { toMoney } from "@/lib/money";
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
  const [settings, session, categories, items, tickets] = await Promise.all([
    getSettings(),
    currentSession(),
    prisma.menuCategory.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, sortOrder: true },
    }),
    prisma.menuItem.findMany({
      where: { isAvailable: true, category: { isActive: true } },
      orderBy: [{ category: { sortOrder: "asc" } }, { sortOrder: "asc" }],
      select: {
        id: true,
        slug: true,
        name: true,
        price: true,
        categoryId: true,
        imageUrl: true,
        isPopular: true,
      },
    }),
    prisma.order.findMany({
      where: { paymentStatus: "PENDING", status: { not: "CANCELLED" } },
      orderBy: { createdAt: "asc" },
      include: { items: true },
      take: 100,
    }),
  ]);

  const menuItems: PosMenuItem[] = items.map((item) => ({
    id: item.id,
    slug: item.slug,
    name: item.name,
    price: toMoney(item.price),
    categoryId: item.categoryId,
    imageUrl: item.imageUrl,
    isPopular: item.isPopular,
  }));

  const openTickets: OrderView[] = tickets.map((order) => ({
    id: order.id,
    orderNumber: order.orderNumber,
    clientRef: order.clientRef,
    status: order.status,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    paymentReference: order.paymentReference,
    splitPayments: order.splitPayments as OrderView["splitPayments"],
    deliveryType: order.deliveryType,
    subtotal: toMoney(order.subtotal),
    discountAmount: toMoney(order.discountAmount),
    taxAmount: toMoney(order.taxAmount),
    total: toMoney(order.total),
    tenderedAmount: order.tenderedAmount === null ? null : toMoney(order.tenderedAmount),
    changeAmount: order.changeAmount === null ? null : toMoney(order.changeAmount),
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    notes: order.notes,
    createdAt: order.createdAt.toISOString(),
    items: order.items.map((item) => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      unitPrice: toMoney(item.unitPrice),
      lineTotal: toMoney(item.lineTotal),
      notes: item.notes,
    })),
  }));

  return (
    <Register
      user={{ name: user!.name, role: user!.role }}
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
    />
  );
}
