import { z } from "zod";

const day = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a date like 2026-10-07")
  .nullable()
  .optional();
const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => value || null)
    .nullable()
    .optional();

/** One staff member as the back office edits them. */
export const staffSchema = z.object({
  name: z.string().trim().min(1, "Enter a name").max(120),
  position: z.string().trim().max(60).default(""),
  phone: text(30),
  photoUrl: text(500),
  payType: z.enum(["MONTHLY", "DAILY", "HOURLY"]).default("MONTHLY"),
  payRate: z.number().min(0).max(1_000_000).default(0),
  momoNumber: text(30),
  bankName: text(80),
  bankAccount: text(40),
  ssnit: z.boolean().default(false),
  startedAt: day,
  endedAt: day,
  isActive: z.boolean().default(true),
  notes: text(500),
  /** The login this person uses at the till, if any. */
  userId: z.string().min(1).nullable().optional(),
});

/** Explicit, so a partial update never fills in defaults for fields it did not send. */
export const staffUpdateSchema = z
  .object({
    name: z.string().trim().min(1, "Enter a name").max(120).optional(),
    position: z.string().trim().max(60).optional(),
    phone: text(30),
    photoUrl: text(500),
    payType: z.enum(["MONTHLY", "DAILY", "HOURLY"]).optional(),
    payRate: z.number().min(0).max(1_000_000).optional(),
    momoNumber: text(30),
    bankName: text(80),
    bankAccount: text(40),
    ssnit: z.boolean().optional(),
    startedAt: day,
    endedAt: day,
    isActive: z.boolean().optional(),
    notes: text(500),
    userId: z.string().min(1).nullable().optional(),
  })
  .refine((body) => Object.keys(body).length > 0, "Nothing to change");

export const toDate = (value: string | null | undefined) =>
  value === undefined ? undefined : value === null ? null : new Date(`${value}T00:00:00Z`);

const PAY_FIELDS = ["payType", "payRate", "momoNumber", "bankName", "bankAccount"] as const;

/**
 * What this role may not change on a staff record: pay is for those who run
 * payroll or see costs, and linking a login is for those who manage logins.
 */
export function forbiddenStaffFields(
  body: Record<string, unknown>,
  may: { pay: boolean; logins: boolean },
): string | null {
  if (!may.pay && PAY_FIELDS.some((field) => body[field] !== undefined)) return "Only payroll can change pay details.";
  if (!may.logins && body.userId !== undefined) return "Only the owner or IT can link a login.";
  return null;
}
