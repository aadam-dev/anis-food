export interface PosMenuSize {
  id: string;
  label: string;
  price: number;
}

export interface PosMenuItem {
  id: string;
  slug: string;
  name: string;
  /** For a dish with sizes, the cheapest size: shown as "from". */
  price: number;
  /** Small / Medium / Large. Empty for a dish sold one way. */
  sizes?: PosMenuSize[];
  categoryId: string;
  imageUrl: string | null;
  isPopular: boolean;
}

export interface PosCategory {
  id: string;
  name: string;
  sortOrder: number;
}

export interface CartLine {
  /** Identifies the line: the dish, plus its size when it has one. Two sizes
   *  of the same dish are two lines. */
  key: string;
  menuItemId: string;
  sizeId?: string | null;
  sizeLabel?: string | null;
  name: string;
  unitPrice: number;
  quantity: number;
  /** Kept on the line so the cart rail can show the dish after a restore. */
  imageUrl?: string | null;
  notes?: string;
}

export interface CashMovementView {
  id: string;
  direction: "IN" | "OUT";
  kind: "IN" | "SPEND" | "DEPOSIT" | "WAGES";
  destination: "MOMO" | "BANK" | null;
  amount: number;
  reason: string;
  by: string;
  at: string;
}

export interface SessionView {
  id: string;
  status: "OPEN" | "CLOSED";
  openedAt: string;
  closedAt: string | null;
  openedBy: { id: string; name: string };
  closedBy: { id: string; name: string } | null;
  businessDay: string;
  isStale: boolean;
  openingFloat: number;
  openingMomo: number | null;
  takings: {
    gross: number;
    byMethod: Record<string, number>;
    cash: number;
    momo: number;
    orderCount: number;
  };
  cashIn: number;
  cashOut: number;
  expectedCash: number;
  expectedMomo: number | null;
  closingCash: number | null;
  closingMomo: number | null;
  cashCount: Record<string, number> | null;
  difference: number | null;
  differenceLabel: string;
  movements: CashMovementView[];
  notes: string | null;
}

export interface OrderView {
  id: string;
  orderNumber: string;
  clientRef: string;
  sessionId?: string | null;
  status: string;
  /** POS, ONLINE, BOLT or WALK_IN. Website orders show an Online tag. */
  source?: string;
  staffId?: string | null;
  /** Set when the order was changed after it was rung. */
  editedAt?: string | null;
  editCount?: number;
  /** When a cashier accepted this online order; null while it is still new. */
  acceptedAt?: string | null;
  paymentMethod: string;
  paymentStatus: string;
  paymentReference: string | null;
  splitPayments: { method: string; amount: number; ref?: string }[] | null;
  deliveryType: string;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  tenderedAmount: number | null;
  changeAmount: number | null;
  tax: {
    inclusive: boolean;
    net: number;
    taxTotal: number;
    lines: { code: string; label: string; rate: number; amount: number }[];
  } | null;
  tableLabel: string | null;
  customerName: string | null;
  customerPhone: string | null;
  customerAddress?: string | null;
  notes: string | null;
  createdAt: string;
  items: {
    id: string;
    menuItemId?: string | null;
    sizeId?: string | null;
    sizeLabel?: string | null;
    name: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    notes: string | null;
  }[];
}

export type PaymentChoice =
  | "CASH"
  | "MOMO"
  | "CARD"
  | "BOLT_FOOD"
  | "SPLIT"
  | "UNPAID";
