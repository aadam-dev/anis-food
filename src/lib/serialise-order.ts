import { toMoney } from "./money";
import type { Prisma } from "@/generated/prisma";

/** Shapes an order for the receipt, the shift desk, and the back office. */
export function serialiseOrder(order: Prisma.OrderGetPayload<{ include: { items: true } }>) {
  const snapshot = order.transactionSnapshot as {
    tax?: {
      inclusive: boolean;
      net: number;
      taxTotal: number;
      lines: { code: string; label: string; rate: number; amount: number }[];
    } | null;
  } | null;
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    clientRef: order.clientRef,
    sessionId: order.sessionId,
    status: order.status,
    source: order.source,
    staffId: order.staffId,
    editedAt: order.editedAt?.toISOString() ?? null,
    editCount: order.editCount,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    paymentReference: order.paymentReference,
    splitPayments: order.splitPayments as
      | { method: string; amount: number; ref?: string }[]
      | null,
    deliveryType: order.deliveryType,
    subtotal: toMoney(order.subtotal),
    discountAmount: toMoney(order.discountAmount),
    taxAmount: toMoney(order.taxAmount),
    total: toMoney(order.total),
    tenderedAmount: order.tenderedAmount === null ? null : toMoney(order.tenderedAmount),
    changeAmount: order.changeAmount === null ? null : toMoney(order.changeAmount),
    tax: snapshot?.tax ?? null,
    tableLabel: order.tableLabel,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    customerAddress: order.customerAddress,
    notes: order.notes,
    createdAt: order.createdAt.toISOString(),
    items: order.items.map((item) => ({
      id: item.id,
      menuItemId: item.menuItemId,
      sizeId: item.sizeId,
      sizeLabel: item.sizeLabel,
      name: item.name,
      quantity: item.quantity,
      unitPrice: toMoney(item.unitPrice),
      lineTotal: toMoney(item.lineTotal),
      notes: item.notes,
    })),
  };
}
