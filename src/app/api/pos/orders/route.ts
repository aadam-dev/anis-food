import { NextResponse, after } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireResource, logAudit, clientIp } from "@/lib/api-auth";
import { ok, parseBody, badRequest, conflict, handlePrismaError } from "@/lib/api-utils";
import { computeOrderTotals, toMoney, roundMoney, changeDue } from "@/lib/money";
import { businessDay, formatOrderNumber } from "@/lib/session-utils";
import { getSettings, taxRateFrom } from "@/lib/settings";
import {
  PaymentMethod,
  PaymentStatus,
  OrderStatus,
  OrderSource,
  DeliveryType,
  OrderEventType,
  SessionStatus,
  Prisma,
} from "@/generated/prisma";

/**
 * Taking money.
 *
 * Three rules hold this together, and each one exists because of a specific way
 * tills go wrong:
 *
 *  1. clientRef idempotency — a retry over a flaky Madina connection returns the
 *     original order instead of charging the customer twice.
 *  2. Prices come from the database, never the request — the client sends ids
 *     and quantities, nothing that determines what is charged.
 *  3. The receipt is snapshotted at the moment of sale — tomorrow's price change
 *     must not rewrite today's receipt.
 */

const lineSchema = z.object({
  menuItemId: z.string().min(1),
  quantity: z.number().int().min(1).max(99),
  notes: z.string().max(200).optional(),
});

const splitLegSchema = z.object({
  method: z.enum(["CASH", "MOMO", "CARD", "BANK_TRANSFER", "BOLT_FOOD"]),
  amount: z.number().min(0).max(1000000),
  ref: z.string().max(100).optional(),
});

const createSchema = z.object({
  /** Minted on the device before the request leaves it. */
  clientRef: z.string().min(8).max(100),
  lines: z.array(lineSchema).min(1, "Add something to the order first"),
  paymentMethod: z.enum([
    "CASH",
    "MOMO",
    "CARD",
    "BANK_TRANSFER",
    "BOLT_FOOD",
    "UNPAID",
    "SPLIT",
  ]),
  splitPayments: z.array(splitLegSchema).optional(),
  paymentReference: z.string().max(100).optional(),
  tenderedAmount: z.number().min(0).max(1000000).optional(),
  discountAmount: z.number().min(0).max(1000000).optional(),
  deliveryType: z.enum(["DINE_IN", "TAKEAWAY", "DELIVERY"]).default("DINE_IN"),
  source: z.enum(["POS", "ONLINE", "BOLT", "WALK_IN"]).default("POS"),
  customerName: z.string().max(120).optional(),
  customerPhone: z.string().max(30).optional(),
  notes: z.string().max(500).optional(),
});

const settleSchema = z.object({
  orderId: z.string().min(1),
  paymentMethod: z.enum(["CASH", "MOMO", "CARD", "BANK_TRANSFER", "BOLT_FOOD", "SPLIT"]),
  splitPayments: z.array(splitLegSchema).optional(),
  paymentReference: z.string().max(100).optional(),
  tenderedAmount: z.number().min(0).max(1000000).optional(),
});

/** Shapes an order for the receipt and the open-tickets rail. */
function serialiseOrder(
  order: Prisma.OrderGetPayload<{ include: { items: true } }>,
) {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    clientRef: order.clientRef,
    status: order.status,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    paymentReference: order.paymentReference,
    splitPayments: order.splitPayments,
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
  };
}

/** Open tickets — sent to the kitchen, not yet paid for. */
export async function GET() {
  const auth = await requireResource("pos");
  if (auth instanceof NextResponse) return auth;

  try {
    const orders = await prisma.order.findMany({
      where: { paymentStatus: PaymentStatus.PENDING, status: { not: OrderStatus.CANCELLED } },
      orderBy: { createdAt: "asc" },
      include: { items: true },
      take: 100,
    });
    return ok({ orders: orders.map(serialiseOrder) });
  } catch (error) {
    return handlePrismaError(error, "pos/orders GET");
  }
}

export async function POST(request: Request) {
  const auth = await requireResource("pos");
  if (auth instanceof NextResponse) return auth;

  const parsed = await parseBody(request, createSchema);
  if (parsed instanceof NextResponse) return parsed;
  const body = parsed.data;

  try {
    // Rule 1. Before anything else: has this exact sale already landed? A phone
    // that lost signal mid-request will retry, and the customer must not pay
    // twice because the network was worse than the cashier.
    const existing = await prisma.order.findUnique({
      where: { clientRef: body.clientRef },
      include: { items: true },
    });
    if (existing) {
      return ok({ order: serialiseOrder(existing), duplicate: true });
    }

    const isUnpaid = body.paymentMethod === "UNPAID";

    const session = await prisma.posSession.findFirst({
      where: { status: SessionStatus.OPEN },
    });
    // An unpaid ticket touches no money, so it can be raised before the drawer
    // is counted in. Anything that takes payment needs a shift to belong to,
    // or the takings have nowhere to be reconciled against.
    if (!session && !isUnpaid) {
      return conflict(
        "No shift is open. Open the till first so this sale is counted in the right shift.",
      );
    }

    // Rule 2. Re-read every price from the database. What the client sent about
    // money is ignored entirely.
    const menuItemIds = [...new Set(body.lines.map((line) => line.menuItemId))];
    const menuItems = await prisma.menuItem.findMany({
      where: { id: { in: menuItemIds } },
      select: { id: true, name: true, price: true, costPrice: true, isAvailable: true },
    });
    const byId = new Map(menuItems.map((item) => [item.id, item]));

    const missing = menuItemIds.filter((id) => !byId.has(id));
    if (missing.length > 0) {
      return badRequest("Some items are no longer on the menu. Refresh the till.", { missing });
    }

    const lines = body.lines.map((line) => {
      const item = byId.get(line.menuItemId)!;
      const unitPrice = toMoney(item.price);
      return {
        menuItemId: item.id,
        name: item.name,
        unitPrice,
        unitCost: item.costPrice === null ? null : toMoney(item.costPrice),
        quantity: line.quantity,
        lineTotal: roundMoney(unitPrice * line.quantity),
        notes: line.notes,
      };
    });

    const settings = await getSettings();
    const totals = computeOrderTotals({
      lines: lines.map((line) => ({ unitPrice: line.unitPrice, quantity: line.quantity })),
      discountAmount: body.discountAmount ?? 0,
      taxRate: taxRateFrom(settings),
    });

    // Split legs must add up. A bill that is 2 pesewas short of its own total is
    // a drawer that will not balance at 10pm, and nobody will know why.
    if (body.paymentMethod === "SPLIT") {
      if (!body.splitPayments || body.splitPayments.length < 2) {
        return badRequest("A split payment needs at least two parts.");
      }
      const sum = roundMoney(
        body.splitPayments.reduce((running, leg) => running + toMoney(leg.amount), 0),
      );
      if (Math.abs(sum - totals.total) > 0.01) {
        return badRequest(
          `The split adds up to GH₵${sum.toFixed(2)} but the bill is GH₵${totals.total.toFixed(2)}.`,
        );
      }
    }

    if (body.paymentMethod === "CASH" && body.tenderedAmount !== undefined) {
      if (toMoney(body.tenderedAmount) + 0.01 < totals.total) {
        return badRequest("The amount given is less than the total.");
      }
    }

    const day = businessDay();
    const ip = clientIp(request);

    const writeOrder = (attempt: number) =>
      prisma.$transaction(async (tx) => {
        // Sequence within the business day, so the call number restarts each day.
        // Counting is not atomic against another till doing the same thing a
        // millisecond later, so a clash is possible; orderNumber is unique, the
        // clash is caught below, and the retry simply counts again. Cheap, and
        // it keeps the numbers human-readable — which a UUID would not be when
        // a cashier has to shout it across the room.
        const todayCount = await tx.order.count({
          where: { orderNumber: { startsWith: `ANIS-${day.replace(/-/g, "")}-` } },
        });
        const orderNumber = formatOrderNumber(day, todayCount + 1 + attempt);

      const tendered =
        body.paymentMethod === "CASH" && body.tenderedAmount !== undefined
          ? toMoney(body.tenderedAmount)
          : null;

      const created = await tx.order.create({
        data: {
          orderNumber,
          clientRef: body.clientRef,
          sessionId: session?.id ?? null,
          status: isUnpaid ? OrderStatus.PREPARING : OrderStatus.COMPLETED,
          source: body.source as OrderSource,
          deliveryType: body.deliveryType as DeliveryType,
          paymentMethod: body.paymentMethod as PaymentMethod,
          paymentStatus: isUnpaid ? PaymentStatus.PENDING : PaymentStatus.PAID,
          paymentReference: body.paymentReference,
          splitPayments: (body.splitPayments ?? undefined) as never,
          subtotal: totals.subtotal,
          discountAmount: totals.discountAmount,
          taxAmount: totals.taxAmount,
          total: totals.total,
          tenderedAmount: tendered,
          changeAmount: tendered === null ? null : changeDue(totals.total, tendered),
          customerName: body.customerName,
          customerPhone: body.customerPhone,
          staffId: auth.user.sub,
          notes: body.notes,
          items: {
            create: lines.map((line) => ({
              menuItemId: line.menuItemId,
              name: line.name,
              unitPrice: line.unitPrice,
              unitCost: line.unitCost,
              quantity: line.quantity,
              lineTotal: line.lineTotal,
              notes: line.notes,
            })),
          },
        },
        include: { items: true },
      });

      // Rule 3. Freeze the receipt as sold.
      await tx.order.update({
        where: { id: created.id },
        data: {
          transactionSnapshot: {
            orderNumber,
            soldAt: created.createdAt.toISOString(),
            soldBy: auth.user.name,
            lines: lines.map((line) => ({
              name: line.name,
              quantity: line.quantity,
              unitPrice: line.unitPrice,
              lineTotal: line.lineTotal,
            })),
            totals,
            paymentMethod: body.paymentMethod,
            splitPayments: body.splitPayments ?? null,
          } as never,
        },
      });

      await tx.orderEvent.create({
        data: {
          orderId: created.id,
          type: OrderEventType.CREATED,
          actorId: auth.user.sub,
          detail: { total: totals.total, paymentMethod: body.paymentMethod } as never,
        },
      });

      return created;
    });

    let order: Awaited<ReturnType<typeof writeOrder>> | null = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        order = await writeOrder(attempt);
        break;
      } catch (error) {
        const clashedOnNumber =
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002" &&
          (error.meta?.target as string[] | undefined)?.includes("orderNumber");
        // Only a number clash is retryable. Anything else is a real failure and
        // must surface rather than being attempted five times.
        if (!clashedOnNumber || attempt === 4) throw error;
      }
    }
    if (!order) return handlePrismaError(new Error("order write failed"), "pos/orders POST");

    after(
      logAudit({
        actorId: auth.user.sub,
        action: "pos.order.create",
        resource: "Order",
        resourceId: order.id,
        detail: { orderNumber: order.orderNumber, total: totals.total },
        ip,
      }),
    );

    return ok({ order: serialiseOrder(order), duplicate: false }, { status: 201 });
  } catch (error) {
    // A unique-constraint clash on clientRef means two copies of the same
    // request raced. The other one won; return its order rather than an error.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002" &&
      (error.meta?.target as string[] | undefined)?.includes("clientRef")
    ) {
      const winner = await prisma.order.findUnique({
        where: { clientRef: body.clientRef },
        include: { items: true },
      });
      if (winner) return ok({ order: serialiseOrder(winner), duplicate: true });
    }
    return handlePrismaError(error, "pos/orders POST");
  }
}

/** Settle an open ticket. */
export async function PATCH(request: Request) {
  const auth = await requireResource("pos");
  if (auth instanceof NextResponse) return auth;

  const parsed = await parseBody(request, settleSchema);
  if (parsed instanceof NextResponse) return parsed;
  const body = parsed.data;

  try {
    const order = await prisma.order.findUnique({
      where: { id: body.orderId },
      include: { items: true },
    });
    if (!order) return badRequest("That order no longer exists.");
    if (order.paymentStatus === PaymentStatus.PAID) {
      return conflict("That order has already been paid for.");
    }
    if (order.status === OrderStatus.CANCELLED) {
      return conflict("That order was voided.");
    }

    const session = await prisma.posSession.findFirst({ where: { status: SessionStatus.OPEN } });
    if (!session) {
      return conflict("No shift is open. Open the till before taking payment.");
    }

    const total = toMoney(order.total);

    if (body.paymentMethod === "SPLIT") {
      if (!body.splitPayments || body.splitPayments.length < 2) {
        return badRequest("A split payment needs at least two parts.");
      }
      const sum = roundMoney(
        body.splitPayments.reduce((running, leg) => running + toMoney(leg.amount), 0),
      );
      if (Math.abs(sum - total) > 0.01) {
        return badRequest(
          `The split adds up to GH₵${sum.toFixed(2)} but the bill is GH₵${total.toFixed(2)}.`,
        );
      }
    }

    const tendered =
      body.paymentMethod === "CASH" && body.tenderedAmount !== undefined
        ? toMoney(body.tenderedAmount)
        : null;
    if (tendered !== null && tendered + 0.01 < total) {
      return badRequest("The amount given is less than the total.");
    }

    const settled = await prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { id: order.id },
        // Note what is absent: the line items. Once a ticket has gone to the
        // kitchen, changing what was cooked is a void-and-reorder, not an edit.
        data: {
          paymentMethod: body.paymentMethod as PaymentMethod,
          paymentStatus: PaymentStatus.PAID,
          paymentReference: body.paymentReference,
          splitPayments: (body.splitPayments ?? undefined) as never,
          tenderedAmount: tendered,
          changeAmount: tendered === null ? null : changeDue(total, tendered),
          status: OrderStatus.COMPLETED,
          // Belongs to the shift that took the money, not the one that cooked it.
          sessionId: session.id,
        },
        include: { items: true },
      });

      await tx.orderEvent.create({
        data: {
          orderId: order.id,
          type: OrderEventType.SETTLED,
          actorId: auth.user.sub,
          detail: { paymentMethod: body.paymentMethod, total } as never,
        },
      });

      return updated;
    });

    after(
      logAudit({
        actorId: auth.user.sub,
        action: "pos.order.settle",
        resource: "Order",
        resourceId: order.id,
        detail: { orderNumber: order.orderNumber, paymentMethod: body.paymentMethod, total },
        ip: clientIp(request),
      }),
    );

    return ok({ order: serialiseOrder(settled) });
  } catch (error) {
    return handlePrismaError(error, "pos/orders PATCH");
  }
}
