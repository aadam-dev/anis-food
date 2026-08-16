export interface PosMenuItem {
  id: string;
  slug: string;
  name: string;
  price: number;
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
  menuItemId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  notes?: string;
}

export interface CashMovementView {
  id: string;
  direction: "IN" | "OUT";
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
  status: string;
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
  customerName: string | null;
  customerPhone: string | null;
  notes: string | null;
  createdAt: string;
  items: {
    id: string;
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
  | "BANK_TRANSFER"
  | "BOLT_FOOD"
  | "SPLIT"
  | "UNPAID";
