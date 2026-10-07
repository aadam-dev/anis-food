/**
 * The audit trail in words. Each stored action becomes one sentence a person
 * can read without knowing the code: "Changed Jollof with Goat price from
 * GH₵120.00 to GH₵130.00". Unknown actions fall back to something readable.
 */

type Detail = Record<string, unknown> | null | undefined;

const money = (value: unknown) => {
  const number = Number(value);
  return Number.isFinite(number) ? `GH₵${number.toFixed(2)}` : String(value ?? "");
};

const METHOD: Record<string, string> = {
  CASH: "cash",
  MOMO: "MoMo",
  CARD: "card",
  BOLT_FOOD: "Bolt",
  SPLIT: "split payment",
  UNPAID: "pay later",
  BANK_TRANSFER: "bank transfer",
};
const ACCOUNT: Record<string, string> = { SAFE: "the cash safe", MOMO: "MoMo", BANK: "the bank", TILL: "the till" };
const FIELD: Record<string, string> = {
  price: "price",
  costPrice: "cost",
  isAvailable: "on the menu",
  isPopular: "popular",
  name: "name",
  description: "description",
  categoryId: "category",
  imageUrl: "photo",
  payRate: "pay rate",
  payType: "pay basis",
  position: "job",
  phone: "phone",
  photoUrl: "photo",
  isActive: "active",
  userId: "till login",
};

function changes(detail: Detail): string {
  const list = detail?.changes as Record<string, { from: unknown; to: unknown }> | undefined;
  if (!list) return "";
  return Object.entries(list)
    .map(([key, { from, to }]) => {
      const label = FIELD[key] ?? key;
      if (key === "price" || key === "costPrice" || key === "payRate") return `${label} ${money(from)} → ${money(to)}`;
      if (typeof to === "boolean") return `${label} ${to ? "on" : "off"}`;
      if (key === "imageUrl" || key === "photoUrl") return `new ${label}`;
      return `${label} “${from ?? "—"}” → “${to ?? "—"}”`;
    })
    .join(", ");
}

/** Which part of the business an action belongs to, for filtering. */
export function auditArea(action: string, resource: string): string {
  if (action.startsWith("menu.")) return "Menu";
  if (action.startsWith("order.") || action.startsWith("pos.order") || action === "kitchen.status") return "Orders";
  if (action.startsWith("pos.")) return "Till";
  if (action.startsWith("payroll.")) return "Payroll";
  if (action.startsWith("accounts.")) return "Accounts";
  if (action.startsWith("expense")) return "Expenses";
  if (action.startsWith("inventory.")) return "Inventory";
  if (action.startsWith("table.")) return "Tables";
  if (action.startsWith("settings.")) return "Settings";
  if (action.startsWith("auth.")) return "Sign-in";
  if (action.startsWith("user.") || (action.startsWith("staff.") && resource === "User")) return "Users";
  if (action.startsWith("staff.")) return "Staff";
  return "Other";
}

export const AUDIT_AREAS = [
  "Orders",
  "Till",
  "Menu",
  "Accounts",
  "Expenses",
  "Payroll",
  "Staff",
  "Users",
  "Inventory",
  "Tables",
  "Settings",
  "Sign-in",
  "Other",
] as const;

export function describeAudit(action: string, resource: string, detail: Detail): string {
  const d = detail ?? {};
  const order = d.orderNumber ? ` ${String(d.orderNumber).split("-").pop()?.replace(/^0+/, "")} (${d.orderNumber})` : "";
  switch (action) {
    case "pos.order.create":
      return `Rang up order${order} for ${money(d.total)}`;
    case "pos.order.settle":
      return `Took payment for order${order}: ${money(d.total)} by ${METHOD[String(d.paymentMethod)] ?? d.paymentMethod}`;
    case "order.edit":
      return `Edited order${order}: total ${money(d.before)} → ${money(d.after)}`;
    case "order.payment.correct":
      return `Changed payment on order${order} from ${METHOD[String(d.from)] ?? d.from} to ${METHOD[String(d.to)] ?? d.to}`;
    case "order.void":
      return `Voided order${order}${d.reason ? ` (${String(d.reason).replace(/_/g, " ").toLowerCase()})` : ""}`;
    case "order.accept":
      return `Accepted online order${order}`;
    case "kitchen.status":
      return `Kitchen marked order${order} ${String(d.kitchenStatus ?? "").toLowerCase()}`;
    case "pos.session.open":
      return `Opened the till with ${money(d.openingFloat)} float`;
    case "pos.session.close": {
      const difference = Number(d.difference);
      return `Closed the till: counted ${money(d.closingCash)}, expected ${money(d.expectedCash)}${
        Number.isFinite(difference) && difference !== 0 ? ` (${difference < 0 ? "short" : "over"} ${money(Math.abs(difference))})` : " (balanced)"
      }`;
    }
    case "pos.cash.movement": {
      const kind = String(d.kind);
      if (kind === "DEPOSIT") return `Moved ${money(d.amount)} from the till to ${ACCOUNT[String(d.destination)] ?? d.destination}`;
      if (kind === "SPEND") return `Spent ${money(d.amount)} from the till: ${d.reason ?? ""}`;
      return `Put ${money(d.amount)} into the till: ${d.reason ?? ""}`;
    }
    case "pos.switch":
      return `Took over the till from ${d.fromName ?? "another user"}`;
    case "pos.switch.failed":
      return `Wrong PIN switching to ${d.attemptedName ?? "another user"} at the till`;
    case "menu.item.update": {
      const what = changes(d);
      return `Changed ${d.slug ?? "a dish"}${what ? `: ${what}` : ""}`;
    }
    case "menu.item.create":
      return `Added dish ${d.name ?? d.slug ?? ""}`;
    case "menu.item.delete":
      return `Deleted dish ${d.name ?? d.slug ?? ""}`;
    case "menu.image.upload":
      return "Uploaded a dish photo";
    case "staff.photo.upload":
      return "Uploaded a staff photo";
    case "menu.item.sizes":
      return `Changed the sizes of a dish`;
    case "payroll.run":
      return `Ran payroll for ${d.periodStart ?? "a period"}: ${d.created ?? 0} payslip(s)`;
    case "payroll.paid":
      return `Paid ${d.name ?? "staff"} ${money(d.amount)} from ${ACCOUNT[String(d.paidFrom)] ?? d.paidFrom}`;
    case "payroll.status":
      return `Moved a payslip from ${String(d.from).toLowerCase()} to ${String(d.to).toLowerCase()}`;
    case "payroll.edit":
      return `Edited a payslip: ${money(d.before)} → ${money(d.after)}`;
    case "payroll.rate": {
      const to = d.to as { type?: string; rate?: number } | undefined;
      const unit = { MONTHLY: "month", DAILY: "day", HOURLY: "hour" }[String(to?.type)] ?? "period";
      return `Set ${d.name ?? "a staff member"}'s pay to ${money(to?.rate)} per ${unit}`;
    }
    case "staff.create":
      return resource === "User" ? `Created login ${d.email ?? ""} (${String(d.role ?? "").toLowerCase()})` : `Added ${d.name ?? "a staff member"} to staff`;
    case "staff.update":
      return resource === "User"
        ? `Changed login ${d.target ?? ""}: ${((d.changed as string[]) ?? []).join(", ")}`
        : `Updated ${d.name ?? "a staff member"}${changes(d) ? `: ${changes(d)}` : ""}`;
    case "staff.delete":
      return `Removed ${d.name ?? "a staff member"} from staff`;
    case "user.create":
      return `Created login ${d.email ?? ""} (${String(d.role ?? "").toLowerCase()})`;
    case "user.update":
      return `Changed login ${d.target ?? ""}: ${((d.changed as string[]) ?? []).join(", ")}`;
    case "accounts.transfer":
      return `Moved ${money(d.amount)} from ${ACCOUNT[String(d.from)]} to ${ACCOUNT[String(d.to)]}`;
    case "accounts.opening":
      return `Set ${ACCOUNT[String(d.account)]}'s opening balance to ${money(d.amount)}`;
    case "accounts.bolt_payout":
      return `Recorded a Bolt payout of ${money(d.amount)} into ${ACCOUNT[String(d.to)]}`;
    case "accounts.withdrawal":
      return `Owner took ${money(d.amount)} from ${ACCOUNT[String(d.from)]}: ${d.reason ?? ""}`;
    case "accounts.capital":
      return `Owner put ${money(d.amount)} into ${ACCOUNT[String(d.to)]}`;
    case "accounts.adjustment":
      return `Corrected ${ACCOUNT[String(d.account)]} to ${money(d.counted)}: ${d.reason ?? ""}`;
    case "accounts.delete":
      return `Removed a recorded money movement`;
    case "expense.create":
      return `Added expense ${d.description ?? ""}: ${money(d.amount)}`;
    case "expense.delete":
      return `Deleted an expense`;
    case "settings.update":
      return `Changed settings: ${((d.keys as string[]) ?? []).map((key) => key.replace(/_/g, " ")).join(", ")}`;
    case "auth.login":
    case "auth.login.pin":
      return action === "auth.login.pin" ? "Signed in with PIN" : "Signed in with password";
    case "auth.login.failed":
      return "Failed sign-in attempt";
    case "auth.logout":
      return "Signed out";
    case "auth.pin.set":
      return "Set a new PIN";
    case "auth.password.changed":
      return "Changed password";
    default: {
      const name = d.name ?? d.description ?? d.label ?? d.orderNumber ?? "";
      return `${action.replace(/[._]/g, " ")}${name ? `: ${name}` : ""}`;
    }
  }
}
