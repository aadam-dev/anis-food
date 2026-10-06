/**
 * Who may change an order after it was rung, and when. Shared by the till, the
 * back office and the server so a button is only ever shown when the server
 * would accept it.
 *
 *  - Voided or refunded: never.
 *  - Unpaid ticket: anyone at the till, while it is still on an open (or no) shift.
 *  - Paid, or Bolt: a manager or owner, and only while that order's shift is
 *    still open. A closed shift has been counted and reconciled; changing its
 *    sales afterwards would make the drawer report lie. Void and re-ring instead.
 */

export interface EditableOrder {
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  /** Status of the shift the order belongs to; null when it has none yet. */
  shiftStatus: "OPEN" | "CLOSED" | null;
}

export type EditVerdict = { ok: true; paid: boolean } | { ok: false; reason: string };

export function editVerdict(order: EditableOrder, mayEditPaid: boolean): EditVerdict {
  if (order.status === "CANCELLED") return { ok: false, reason: "That order was voided." };
  if (order.paymentStatus === "REFUNDED") return { ok: false, reason: "That order was refunded." };
  if (order.shiftStatus === "CLOSED") {
    return { ok: false, reason: "That shift is closed and counted. Void the order and ring it again." };
  }

  const unpaid = order.paymentStatus === "PENDING" && order.paymentMethod === "UNPAID";
  if (unpaid) return { ok: true, paid: false };

  if (!mayEditPaid) return { ok: false, reason: "Only a manager can change a paid order." };
  if (order.shiftStatus !== "OPEN") {
    return { ok: false, reason: "Paid orders can only be changed while their shift is open." };
  }
  return { ok: true, paid: true };
}

/** What happens to money after an edit: collect more, give back, or nothing. */
export function settleDifference(before: number, after: number): { kind: "collect" | "refund" | "none"; amount: number } {
  const diff = Math.round((after - before) * 100) / 100;
  if (Math.abs(diff) < 0.01) return { kind: "none", amount: 0 };
  return diff > 0 ? { kind: "collect", amount: diff } : { kind: "refund", amount: -diff };
}
