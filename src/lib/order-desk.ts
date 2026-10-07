import "server-only";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/api-auth";
import { computeOrderTotals, roundMoney, toMoney } from "@/lib/money";
import { getSettings, getTaxConfig } from "@/lib/settings";
import { taxBreakdown } from "@/lib/tax";
import { serialiseOrder } from "@/lib/serialise-order";
import { canEditPaidOrders } from "@/lib/permissions";
import { editVerdict } from "@/lib/order-edit-rules";
import { priceLines } from "@/lib/order-lines";
import { boltRate, platformFee, settlementAfterCorrection, splitAddsUp } from "@/lib/till-rules";
import {
  OrderEventType,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  type Prisma,
  type UserRole,
} from "@/generated/prisma";

/**
 * Changing an order after it was rung — from the till or the back office, with
 * one set of rules (lib/order-edit-rules). Every change is recorded as an
 * EDITED event with what it was before and after, and the order is marked
 * edited so the back office can show and filter it.
 */

const splitLegSchema = z.object({
  method: z.enum(["CASH", "MOMO", "CARD"]),
  amount: z.number().min(0).max(1000000),
  ref: z.string().max(100).optional(),
});

const paymentSchema = z.object({
  paymentMethod: z.enum(["CASH", "MOMO", "CARD", "BOLT_FOOD", "SPLIT"]),
  splitPayments: z.array(splitLegSchema).optional(),
  paymentReference: z.string().max(100).optional(),
  tenderedAmount: z.number().min(0).max(1000000).optional(),
});

export const deskSchema = z.discriminatedUnion("action", [
  /** Correct how a paid order was paid, without touching its items. */
  z.object({ action: z.literal("payment"), reason: z.string().trim().max(200).optional() }).merge(paymentSchema),
  /**
   * The order as it should now be. Existing lines are referenced by `id` and
   * keep the price they were sold at; lines without an `id` are new and are
   * priced from the menu now. Lines left out are removed.
   */
  z.object({
    action: z.literal("edit"),
    lines: z
      .array(
        z.object({
          id: z.string().min(1).optional(),
          menuItemId: z.string().min(1).optional(),
          sizeId: z.string().min(1).nullish(),
          quantity: z.number().int().min(1).max(999),
          notes: z.string().max(200).nullish(),
        }),
      )
      .min(1, "An order needs at least one item. Void it instead."),
    discountAmount: z.number().min(0).max(1000000).optional(),
    /** Paid orders only: how the new total is paid. Defaults to the old method. */
    payment: paymentSchema.optional(),
    reason: z.string().trim().max(200).optional(),
  }),
]);

export type DeskInput = z.infer<typeof deskSchema>;

export type DeskResult =
  | { ok: true; order: ReturnType<typeof serialiseOrder> }
  | { ok: false; status: 400 | 403 | 404 | 409; message: string };

interface Actor {
  actorId: string;
  role: UserRole;
  ip?: string | null;
  source: "pos" | "admin";
}

export async function applyOrderDesk(params: { orderId: string; input: DeskInput } & Actor): Promise<DeskResult> {
  const order = await prisma.order.findUnique({
    where: { id: params.orderId },
    include: { items: true, session: { select: { id: true, status: true } } },
  });
  if (!order) return { ok: false, status: 404, message: "That order no longer exists." };

  const verdict = editVerdict(
    {
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      shiftStatus: order.session ? (order.session.status as "OPEN" | "CLOSED") : null,
    },
    canEditPaidOrders(params.role),
  );
  if (!verdict.ok) {
    return { ok: false, status: verdict.reason.startsWith("Only a manager") ? 403 : 409, message: verdict.reason };
  }

  if (params.input.action === "payment") {
    if (!verdict.paid) {
      return { ok: false, status: 409, message: "That order has not been paid yet. Take payment instead." };
    }
    return correctPayment(order, params.input, params);
  }
  return editOrder(order, params.input, verdict.paid, params);
}

type LoadedOrder = Prisma.OrderGetPayload<{
  include: { items: true; session: { select: { id: true; status: true } } };
}>;

function paymentFields(input: z.infer<typeof paymentSchema>, total: number) {
  const next = settlementAfterCorrection(input.paymentMethod);
  return {
    paymentMethod: input.paymentMethod as PaymentMethod,
    paymentStatus: next.paymentStatus as PaymentStatus,
    paymentReference: input.paymentReference ?? null,
    splitPayments: (input.paymentMethod === "SPLIT" ? input.splitPayments : null) as never,
    tenderedAmount: input.paymentMethod === "CASH" && input.tenderedAmount !== undefined ? input.tenderedAmount : null,
    changeAmount:
      input.paymentMethod === "CASH" && input.tenderedAmount !== undefined
        ? roundMoney(input.tenderedAmount - total)
        : null,
    nextStatus: next.orderStatus as OrderStatus,
  };
}

function checkPayment(input: z.infer<typeof paymentSchema>, total: number): string | null {
  if (input.paymentMethod === "SPLIT") {
    const check = splitAddsUp(total, input.splitPayments ?? []);
    if (!check.ok) return check.reason;
  }
  if (input.paymentMethod === "CASH" && input.tenderedAmount !== undefined && input.tenderedAmount + 0.01 < total) {
    return "The cash given is less than the total.";
  }
  return null;
}

async function correctPayment(
  order: LoadedOrder,
  input: Extract<DeskInput, { action: "payment" }>,
  actor: Actor,
): Promise<DeskResult> {
  const total = toMoney(order.total);
  const problem = checkPayment(input, total);
  if (problem) return { ok: false, status: 400, message: problem };

  const fields = paymentFields(input, total);
  const rate = boltRate(await getSettings());
  const updated = await prisma.$transaction(async (tx) => {
    const saved = await tx.order.update({
      where: { id: order.id },
      data: {
        paymentMethod: fields.paymentMethod,
        paymentStatus: fields.paymentStatus,
        paymentReference: fields.paymentReference,
        splitPayments: fields.splitPayments,
        tenderedAmount: fields.tenderedAmount,
        changeAmount: fields.changeAmount,
        platformFee: platformFee(input.paymentMethod, total, rate),
        status: order.status === OrderStatus.COMPLETED && fields.paymentStatus === "PAID" ? OrderStatus.COMPLETED : fields.nextStatus,
        editedAt: new Date(),
        editCount: { increment: 1 },
      },
      include: { items: true },
    });
    await tx.orderEvent.create({
      data: {
        orderId: order.id,
        type: OrderEventType.EDITED,
        actorId: actor.actorId,
        detail: {
          change: "payment",
          source: actor.source,
          reason: input.reason ?? null,
          payment: { from: order.paymentMethod, to: input.paymentMethod },
        } as never,
      },
    });
    return saved;
  });

  await logAudit({
    actorId: actor.actorId,
    action: "order.payment.correct",
    resource: "Order",
    resourceId: order.id,
    detail: { orderNumber: order.orderNumber, from: order.paymentMethod, to: input.paymentMethod, source: actor.source },
    ip: actor.ip ?? undefined,
  });
  return { ok: true, order: serialiseOrder(updated) };
}

async function editOrder(
  order: LoadedOrder,
  input: Extract<DeskInput, { action: "edit" }>,
  paid: boolean,
  actor: Actor,
): Promise<DeskResult> {
  // ---- The lines as they should now be -------------------------------------
  const byId = new Map(order.items.map((item) => [item.id, item]));
  const kept: {
    id: string;
    name: string;
    sizeLabel: string | null;
    unitPrice: number;
    quantity: number;
    notes: string | null;
  }[] = [];
  const additions: { menuItemId: string; sizeId?: string | null; quantity: number; notes?: string | null }[] = [];

  for (const line of input.lines) {
    if (line.id) {
      const item = byId.get(line.id);
      if (!item) return { ok: false, status: 400, message: "One of those lines is not on this order." };
      kept.push({
        id: item.id,
        name: item.name,
        sizeLabel: item.sizeLabel,
        unitPrice: toMoney(item.unitPrice),
        quantity: line.quantity,
        notes: line.notes === undefined ? item.notes : line.notes?.trim() || null,
      });
    } else if (line.menuItemId) {
      additions.push({ menuItemId: line.menuItemId, sizeId: line.sizeId, quantity: line.quantity, notes: line.notes });
    } else {
      return { ok: false, status: 400, message: "Each new line needs a dish." };
    }
  }

  let added: Awaited<ReturnType<typeof priceLines>> & { ok: true } = { ok: true, lines: [] };
  if (additions.length > 0) {
    const priced = await priceLines(additions);
    if (!priced.ok) return { ok: false, status: 400, message: priced.error };
    added = priced;
  }

  const removed = order.items.filter((item) => !kept.some((line) => line.id === item.id));

  // ---- New totals -----------------------------------------------------------
  const settings = await getSettings();
  const taxConfig = getTaxConfig(settings);
  const allLines = [
    ...kept.map((line) => ({ unitPrice: line.unitPrice, quantity: line.quantity })),
    ...added.lines.map((line) => ({ unitPrice: line.unitPrice, quantity: line.quantity })),
  ];
  const totals = computeOrderTotals({
    lines: allLines,
    discountAmount: input.discountAmount ?? toMoney(order.discountAmount),
  });
  const tax = taxBreakdown(totals.total, taxConfig);
  const newTotal = taxConfig.enabled && !taxConfig.inclusive ? tax.gross : totals.total;
  const oldTotal = toMoney(order.total);

  // ---- How it is paid now (paid orders only) --------------------------------
  let payment: ReturnType<typeof paymentFields> | null = null;
  if (paid) {
    const paymentInput =
      input.payment ??
      (order.paymentMethod === "SPLIT"
        ? null
        : { paymentMethod: order.paymentMethod as z.infer<typeof paymentSchema>["paymentMethod"] });
    if (!paymentInput) {
      if (Math.abs(newTotal - oldTotal) > 0.009) {
        return { ok: false, status: 400, message: "This was a split payment. Say how the new total is split." };
      }
    } else {
      const problem = checkPayment(paymentInput, newTotal);
      if (problem) return { ok: false, status: 400, message: problem };
      payment = paymentFields(paymentInput, newTotal);
    }
  } else if (input.payment) {
    return { ok: false, status: 400, message: "Take payment for an unpaid order with Take payment." };
  }

  const unchangedItems =
    removed.length === 0 &&
    added.lines.length === 0 &&
    kept.every((line) => {
      const item = byId.get(line.id)!;
      return item.quantity === line.quantity && (item.notes ?? null) === line.notes;
    });
  if (unchangedItems && Math.abs(newTotal - oldTotal) < 0.009 && (!payment || payment.paymentMethod === order.paymentMethod)) {
    return { ok: false, status: 400, message: "Nothing was changed." };
  }

  const describe = (rows: { name: string; sizeLabel: string | null; quantity: number }[]) =>
    rows.map((row) => ({ name: row.name, size: row.sizeLabel, quantity: row.quantity }));

  const updated = await prisma.$transaction(async (tx) => {
    for (const item of removed) await tx.orderItem.delete({ where: { id: item.id } });
    for (const line of kept) {
      await tx.orderItem.update({
        where: { id: line.id },
        data: { quantity: line.quantity, lineTotal: roundMoney(line.unitPrice * line.quantity), notes: line.notes },
      });
    }
    if (added.lines.length > 0) {
      await tx.orderItem.createMany({
        data: added.lines.map((line) => ({
          orderId: order.id,
          menuItemId: line.menuItemId,
          sizeId: line.sizeId,
          sizeLabel: line.sizeLabel,
          name: line.name,
          unitPrice: line.unitPrice,
          unitCost: line.unitCost,
          quantity: line.quantity,
          lineTotal: line.lineTotal,
          notes: line.notes,
        })),
      });
    }

    const allNamed = [
      ...kept.map((line) => ({ ...line, lineTotal: roundMoney(line.unitPrice * line.quantity) })),
      ...added.lines,
    ];
    const previous = (order.transactionSnapshot ?? {}) as Record<string, unknown>;
    const saved = await tx.order.update({
      where: { id: order.id },
      data: {
        subtotal: totals.subtotal,
        discountAmount: totals.discountAmount,
        taxAmount: tax.taxTotal,
        total: newTotal,
        platformFee: platformFee(payment?.paymentMethod ?? order.paymentMethod, newTotal, boltRate(settings)),
        ...(payment && {
          paymentMethod: payment.paymentMethod,
          paymentStatus: payment.paymentStatus,
          paymentReference: payment.paymentReference,
          splitPayments: payment.splitPayments,
          tenderedAmount: payment.tenderedAmount,
          changeAmount: payment.changeAmount,
        }),
        editedAt: new Date(),
        editCount: { increment: 1 },
        // New dishes have to be cooked: put the ticket back on the kitchen board.
        ...(added.lines.length > 0 && { kitchenStatus: "QUEUED", kitchenUpdatedAt: new Date() }),
        transactionSnapshot: {
          ...previous,
          lines: allNamed.map((line) => ({
            name: line.name,
            size: line.sizeLabel,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            lineTotal: line.lineTotal,
          })),
          totals,
          chargedTotal: newTotal,
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
        type: OrderEventType.EDITED,
        actorId: actor.actorId,
        detail: {
          change: "items",
          source: actor.source,
          reason: input.reason ?? null,
          before: { lines: describe(order.items), total: oldTotal, payment: order.paymentMethod },
          after: { lines: describe(allNamed), total: newTotal, payment: payment?.paymentMethod ?? order.paymentMethod },
          added: describe(added.lines),
          removed: describe(removed),
          // Lines kept with a new quantity, so the history can say "1 → 2".
          changed: kept
            .filter((line) => line.quantity !== byId.get(line.id)?.quantity)
            .map((line) => ({ name: line.name, size: line.sizeLabel, from: byId.get(line.id)?.quantity, to: line.quantity })),
        } as never,
      },
    });
    return saved;
  });

  await logAudit({
    actorId: actor.actorId,
    action: "order.edit",
    resource: "Order",
    resourceId: order.id,
    detail: { orderNumber: order.orderNumber, before: oldTotal, after: newTotal, paid, source: actor.source },
    ip: actor.ip ?? undefined,
  });

  return { ok: true, order: serialiseOrder(updated) };
}
