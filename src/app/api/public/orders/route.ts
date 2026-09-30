import { z } from "zod";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ok, parseBody, badRequest, handlePrismaError } from "@/lib/api-utils";
import { computeOrderTotals, toMoney, roundMoney } from "@/lib/money";
import { businessDay, formatOrderNumber } from "@/lib/session-utils";
import { getSettings, getTaxConfig } from "@/lib/settings";
import { taxBreakdown } from "@/lib/tax";
import { saleBooks } from "@/lib/till-rules";
import { serialiseOrder } from "@/lib/serialise-order";
import {
  PaymentMethod,
  PaymentStatus,
  OrderStatus,
  OrderSource,
  DeliveryType,
  OrderEventType,
  Prisma,
} from "@/generated/prisma";

/**
 * Website checkout. Creates an unpaid Online order the back office can see,
 * then the browser opens WhatsApp so the kitchen still gets a ping.
 *
 * Prices come from the database only — the cart totals are never trusted.
 */

const lineSchema = z.object({
  menuItemId: z.string().min(1),
  quantity: z.number().int().min(1).max(99),
  notes: z.string().max(200).optional(),
});

const createSchema = z.object({
  clientRef: z.string().min(8).max(100),
  lines: z.array(lineSchema).min(1).max(40),
  deliveryType: z.enum(["pickup", "delivery"]),
  customerName: z.string().min(1).max(120),
  customerPhone: z.string().min(7).max(30),
  customerAddress: z.string().max(200).optional(),
  notes: z.string().max(500).optional(),
});

export async function POST(request: Request) {
  const parsed = await parseBody(request, createSchema);
  if (parsed instanceof NextResponse) return parsed;
  const body = parsed.data;

  try {
    const existing = await prisma.order.findUnique({
      where: { clientRef: body.clientRef },
      include: { items: true },
    });
    if (existing) {
      return ok({ order: serialiseOrder(existing), duplicate: true });
    }

    if (body.deliveryType === "delivery" && !body.customerAddress?.trim()) {
      return badRequest("Add a delivery address.");
    }

    const menuItemIds = [...new Set(body.lines.map((line) => line.menuItemId))];
    const menuItems = await prisma.menuItem.findMany({
      where: { id: { in: menuItemIds }, isAvailable: true },
      select: { id: true, name: true, price: true, costPrice: true },
    });
    const byId = new Map(menuItems.map((item) => [item.id, item]));
    const missing = menuItemIds.filter((id) => !byId.has(id));
    if (missing.length > 0) {
      return badRequest("Some dishes are no longer available. Refresh the menu.", { missing });
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

    const books = saleBooks("UNPAID");
    const settings = await getSettings();
    const totals = computeOrderTotals({
      lines: lines.map((line) => ({ unitPrice: line.unitPrice, quantity: line.quantity })),
      discountAmount: 0,
    });
    const taxConfig = getTaxConfig(settings);
    const tax = taxBreakdown(totals.total, taxConfig);
    const orderTotal = taxConfig.enabled && !taxConfig.inclusive ? tax.gross : totals.total;
    const deliveryType =
      body.deliveryType === "delivery" ? DeliveryType.DELIVERY : DeliveryType.TAKEAWAY;
    const day = businessDay();

    const writeOrder = (attempt: number) =>
      prisma.$transaction(async (tx) => {
        const todayCount = await tx.order.count({
          where: { orderNumber: { startsWith: `ANIS-${day.replace(/-/g, "")}-` } },
        });
        const orderNumber = formatOrderNumber(day, todayCount + 1 + attempt);

        const created = await tx.order.create({
          data: {
            orderNumber,
            clientRef: body.clientRef,
            status: books.orderStatus as OrderStatus,
            source: OrderSource.ONLINE,
            deliveryType,
            paymentMethod: PaymentMethod.UNPAID,
            paymentStatus: books.paymentStatus as PaymentStatus,
            subtotal: totals.subtotal,
            discountAmount: totals.discountAmount,
            taxAmount: tax.taxTotal,
            total: orderTotal,
            customerName: body.customerName.trim(),
            customerPhone: body.customerPhone.trim(),
            customerAddress: body.customerAddress?.trim() || null,
            notes: body.notes?.trim() || null,
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

        const withSnapshot = await tx.order.update({
          where: { id: created.id },
          data: {
            transactionSnapshot: {
              orderNumber,
              soldAt: created.createdAt.toISOString(),
              soldBy: "Online",
              lines: lines.map((line) => ({
                name: line.name,
                quantity: line.quantity,
                unitPrice: line.unitPrice,
                lineTotal: line.lineTotal,
              })),
              totals,
              chargedTotal: orderTotal,
              tax: taxConfig.enabled
                ? { inclusive: taxConfig.inclusive, net: tax.net, lines: tax.lines, taxTotal: tax.taxTotal }
                : null,
              paymentMethod: "UNPAID",
              source: "ONLINE",
            } as never,
          },
          include: { items: true },
        });

        await tx.orderEvent.create({
          data: {
            orderId: created.id,
            type: OrderEventType.CREATED,
            detail: { total: orderTotal, source: "ONLINE", paymentMethod: "UNPAID" } as never,
          },
        });

        return withSnapshot;
      });

    let order: Awaited<ReturnType<typeof writeOrder>> | null = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        order = await writeOrder(attempt);
        break;
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
          continue;
        }
        throw error;
      }
    }
    if (!order) return badRequest("Could not place the order. Try again.");

    return ok({ order: serialiseOrder(order) }, { status: 201 });
  } catch (error) {
    return handlePrismaError(error, "public/orders POST");
  }
}
