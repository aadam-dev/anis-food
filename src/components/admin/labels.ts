/** Plain names for the enum values the database stores. */
export const PAYMENT_LABELS: Record<string, string> = {
  CASH: "Cash",
  MOMO: "Mobile Money",
  CARD: "Card",
  BANK_TRANSFER: "Bank transfer",
  BOLT_FOOD: "Bolt Food",
  UNPAID: "Unpaid",
  SPLIT: "Split",
};

export const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  PREPARING: "Preparing",
  READY: "Ready",
  COMPLETED: "Completed",
  CANCELLED: "Voided",
};

export const ORDER_SOURCE_LABELS: Record<string, string> = {
  POS: "Till",
  ONLINE: "Online",
  BOLT: "Bolt",
  WALK_IN: "Walk-in",
};

export const ROLE_LABELS: Record<string, string> = {
  OWNER: "Owner",
  SUPER_ADMIN: "Super admin",
  MANAGER: "Manager",
  ACCOUNTANT: "Accountant",
  CASHIER: "Cashier",
};

export const PAYROLL_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  APPROVED: "Approved",
  PAID: "Paid",
};

export const VOID_REASON_LABELS: Record<string, string> = {
  MISTAKE: "Rung by mistake",
  CUSTOMER_CANCELLED: "Customer cancelled",
  KITCHEN_ERROR: "Kitchen error",
  DUPLICATE: "Duplicate",
  OTHER: "Other",
};
