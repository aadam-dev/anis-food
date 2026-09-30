import "server-only";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/api-auth";
import { computeOrderTotals, roundMoney, toMoney } from "@/lib/money";
import { getSettings, getTaxConfig } from "@/lib/settings";
import { taxBreakdown } from "@/lib/tax";
import { serialiseOrder } from "@/lib/serialise-order";
import {
  isUnpaidTicket,
  settlementAfterCorrection,
  splitAddsUp,
} from "@/lib/till-rules";
import {
  OrderEventType,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  SessionStatus,
} from "@/generated/prisma";

const splitLegSchema = z.object({
  method: z.enum(["CASH", "MOMO", "CARD", "BANK_TRANSFER", "BOLT_FOOD"]),
  amount: z.number().min(0).max(1000000),
  ref: z.string().max(100).optional(),
});

export const deskSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("payment"),
    paymentMethod: z.enum(["CASH", "MOMO", "CARD", "BANK_TRANSFER", "BOLT_FOOD", "SPLIT"]),
    splitPayments: z.array(splitLegSchema).optional(),
    paymentReference: z.string().max(100).optional(),
  }),
  z.object({
    action: z.literal("lines"),
    lines: z
      .array(
        z.object({
          id: z.string().min(1),
          quantity: z.number().int().min(0).max(999),
        }),
      )
      .min(1),
  }),
]);

export type DeskResult =
  | { ok: true; order: ReturnType<typeof serialiseOrder> }
  | { ok: false; status: 400 | 404 | 409; message: string };

/**
 * Fix a tender, or change an unpaid ticket, while the shift is still open.
 * A paid mistake is not rewritten here — that is a void and a new sale.
 */
export async function applyOrderDesk(params: {
  orderId: string;
  input: z.infer<typeof deskSchema>;
  actorId: string;
  ip?: string | null;
  source: "pos" | "admin";
}): Promise<DeskResult> {
  const order = await prisma.order.findUnique({
    where: { id: params.orderId },
    include: { items: true, session: { select: { id: true, status: true } } },
  });
  if (!order) return { ok: false, status: 404, message: "That order no longer exists." };
  if (order.status === OrderStatus.CANCELLED) {
    return { ok: false, status: 409, message: "That order was voided." };
  }
  if (order.paymentStatus === PaymentStatus.REFUNDED) {
    return { ok: false, status: 409, message: "That order was refunded." };
  }

  const open = await prisma.posSession.findFirst({ where: { status: SessionStatus.OPEN } });
  if (!open) {
    return { ok: false, status: 409, message: "No shift is open." };
  }
  if (order.session && order.session.status === SessionStatus.CLOSED) {
    return { ok: false, status: 409, message: "That shift is already closed." };
  }
  if (order.sessionId && order.sessionId !== open.id) {
    return { ok: false, status: 409, message: "That sale belongs to another shift." };
  }

  if (params.input.action === "lines") {
    return editUnpaidLines(order, params.input.lines, params);
  }
  return correctPayment(order, params.input, params, open.id);
}

async function correctPayment(
  order: {
    id: string;
    orderNumber: string;
    sessionId: string | null;
    total: { toString(): string } | number;
    paymentMethod: string;
    status: OrderStatus;
  },
  input: Extract<z.infer<typeof deskSchema>, { action: "payment" }>,
  params: { actorId: string; ip?: string | null; source: "pos" | "admin" },
  sessionId: string,
): Promise<DeskResult> {
  const total = toMoney(order.total);
  if (input.paymentMethod === "SPLIT") {
    const check = splitAddsUp(total, input.splitPayments ?? []);
    if (!check.ok) return { ok: false, status: 400, message: check.reason };
  }

  const next = settlementAfterCorrection(input.paymentMethod);
  const updated = await prisma.$transaction(async (tx) => {
    const saved = await tx.order.update({
      where: { id: order.id },
      data: {
        paymentMethod: input.paymentMethod as PaymentMethod,
        paymentStatus: next.paymentStatus as PaymentStatus,
        paymentReference: input.paymentReference,
        splitPayments: (input.paymentMethod === "SPLIT" ? input.splitPayments : null) as never,
        sessionId,
        status:
          order.status === OrderStatus.COMPLETED && next.paymentStatus === "PAID"
            ? OrderStatus.COMPLETED
            : (next.orderStatus as OrderStatus),
      },
      include: { items: true },
    });
    await tx.orderEvent.create({
      data: {
        orderId: order.id,
        type: OrderEventType.STATUS_CHANGED,
        actorId: params.actorId,
        detail: {
          action: "payment_corrected",
          from: order.paymentMethod,
          to: input.paymentMethod,
          source: params.source,
        } as never,
      },
    });
    return saved;
  });

  await logAudit({
    actorId: params.actorId,
    action: "order.payment.correct",
    resource: "Order",
    resourceId: order.id,
    detail: {
      orderNumber: order.orderNumber,
      from: order.paymentMethod,
      to: input.paymentMethod,
      source: params.source,
    },
    ip: params.ip ?? undefined,
  });

  return { ok: true, order: serialiseOrder(updated) };
}

async function editUnpaidLines(
  order: {
    id: string;
    orderNumber: string;
    paymentStatus: string;
    paymentMethod: string;
    status: string;
    discountAmount: { toString(): string } | number;
    items: { id: string; unitPrice: { toString(): string } | number; name: string; notes: string | null }[];
    transactionSnapshot: unknown;
  },
  lines: { id: string; quantity: number }[],
  params: { actorId: string; ip?: string | null; source: "pos" | "admin" },
): Promise<DeskResult> {
  if (!isUnpaidTicket(order)) {
    return {
      ok: false,
      status: 409,
      message: "Paid orders are not edited. Void the sale and ring it again.",
    };
  }

  const known = new Set(order.items.map((item) => item.id));
  if (lines.length !== known.size || lines.some((line) => !known.has(line.id))) {
    return { ok: false, status: 400, message: "Send every line on the ticket." };
  }
  if (lines.every((line) => line.quantity === 0)) {
    return { ok: false, status: 400, message: "Void the ticket instead of clearing every line." };
  }

  const settings = await getSettings();
  const taxConfig = getTaxConfig(settings);

  const updated = await prisma.$transaction(async (tx) => {
    for (const line of lines) {
      const item = order.items.find((entry) => entry.id === line.id)!;
      if (line.quantity === 0) {
        await tx.orderItem.delete({ where: { id: line.id } });
        continue;
      }
      await tx.orderItem.update({
        where: { id: line.id },
        data: {
          quantity: line.quantity,
          lineTotal: roundMoney(toMoney(item.unitPrice) * line.quantity),
        },
      });
    }

    const kept = lines
      .filter((line) => line.quantity > 0)
      .map((line) => {
        const item = order.items.find((entry) => entry.id === line.id)!;
        return { unitPrice: toMoney(item.unitPrice), quantity: line.quantity, name: item.name };
      });
    const totals = computeOrderTotals({
      lines: kept.map((line) => ({ unitPrice: line.unitPrice, quantity: line.quantity })),
      discountAmount: toMoney(order.discountAmount),
    });
    const tax = taxBreakdown(totals.total, taxConfig);
    const orderTotal = taxConfig.enabled && !taxConfig.inclusive ? tax.gross : totals.total;
    const previous = (order.transactionSnapshot ?? {}) as Record<string, unknown>;

    const saved = await tx.order.update({
      where: { id: order.id },
      data: {
        subtotal: totals.subtotal,
        discountAmount: totals.discountAmount,
        taxAmount: tax.taxTotal,
        total: orderTotal,
        transactionSnapshot: {
          ...previous,
          lines: kept.map((line) => ({
            name: line.name,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            lineTotal: roundMoney(line.unitPrice * line.quantity),
          })),
          totals,
          chargedTotal: orderTotal,
          tax: taxConfig.enabled
            ? { inclusive: taxConfig.inclusive, net: tax.net, lines: tax.lines, taxTotal: tax.taxTotal }
            : null,
        } as never,
      },
      include: { items: true },
    });

    await tx.orderEvent.create({
      data: {
        orderId: order.id,
        type: OrderEventType.STATUS_CHANGED,
        actorId: params.actorId,
        detail: {
          action: "lines_edited",
          source: params.source,
          lines: lines.map((line) => ({ id: line.id, quantity: line.quantity })),
        } as never,
      },
    });
    return saved;
  });

  await logAudit({
    actorId: params.actorId,
    action: "order.lines.edit",
    resource: "Order",
    resourceId: order.id,
    detail: { orderNumber: order.orderNumber, source: params.source },
    ip: params.ip ?? undefined,
  });

  return { ok: true, order: serialiseOrder(updated) };
}
