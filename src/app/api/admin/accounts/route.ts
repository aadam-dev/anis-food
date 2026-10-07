import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireResource, logAudit, clientIp } from "@/lib/api-auth";
import { ok, parseBody, badRequest, handlePrismaError } from "@/lib/api-utils";
import { roundMoney } from "@/lib/money";
import { ACCOUNT_LABELS, balanceOf } from "@/lib/accounts";
import { getFlows } from "@/lib/accounts.server";

const account = z.enum(["SAFE", "MOMO", "BANK"]);
const amount = z.number().positive("Enter an amount").max(10_000_000);
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional();
const reason = z.string().trim().max(200).default("");

/** One hand-recorded movement. Everything else is read from its own record. */
const schema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("transfer"), from: account, to: account, amount, day, reason }),
  z.object({ type: z.literal("opening"), account, amount: z.number().min(0).max(10_000_000), day, reason }),
  z.object({ type: z.literal("bolt_payout"), to: z.enum(["MOMO", "BANK"]), amount, day, reason }),
  z.object({ type: z.literal("withdrawal"), from: account, amount, day, reason: z.string().trim().min(3, "Say what it was for").max(200) }),
  z.object({ type: z.literal("capital"), to: account, amount, day, reason }),
  z.object({
    type: z.literal("adjustment"),
    account,
    /** What the account actually holds, from a count or a statement. */
    counted: z.number().min(-10_000_000).max(10_000_000),
    day,
    reason: z.string().trim().min(3, "Say why the balance was off").max(200),
  }),
]);

/** Noon on the chosen business day, or now when the day is today or not given. */
function momentOf(dayValue: string | undefined): Date {
  if (!dayValue) return new Date();
  const today = new Date().toISOString().slice(0, 10);
  return dayValue === today ? new Date() : new Date(`${dayValue}T12:00:00Z`);
}

export async function POST(request: Request) {
  const auth = await requireResource("accounts");
  if (auth instanceof NextResponse) return auth;
  const parsed = await parseBody(request, schema);
  if (parsed instanceof NextResponse) return parsed;
  const body = parsed.data;
  const at = momentOf(body.day);
  const base = { occurredAt: at, createdById: auth.user.sub };

  try {
    let entries: { account: "SAFE" | "MOMO" | "BANK"; direction: "IN" | "OUT"; amount: number; kind: string; reason: string; transferId?: string }[];
    switch (body.type) {
      case "transfer": {
        if (body.from === body.to) return badRequest("Pick two different accounts.");
        const transferId = randomUUID();
        const note = body.reason || `${ACCOUNT_LABELS[body.from]} to ${ACCOUNT_LABELS[body.to]}`;
        entries = [
          { account: body.from, direction: "OUT", amount: body.amount, kind: "TRANSFER", reason: note, transferId },
          { account: body.to, direction: "IN", amount: body.amount, kind: "TRANSFER", reason: note, transferId },
        ];
        break;
      }
      case "opening":
        entries = [{ account: body.account, direction: "IN", amount: body.amount, kind: "OPENING_BALANCE", reason: body.reason }];
        break;
      case "bolt_payout":
        entries = [{ account: body.to, direction: "IN", amount: body.amount, kind: "BOLT_PAYOUT", reason: body.reason }];
        break;
      case "withdrawal":
        entries = [{ account: body.from, direction: "OUT", amount: body.amount, kind: "WITHDRAWAL", reason: body.reason }];
        break;
      case "capital":
        entries = [{ account: body.to, direction: "IN", amount: body.amount, kind: "CAPITAL", reason: body.reason }];
        break;
      case "adjustment": {
        const flows = (await getFlows()).filter((flow) => flow.account === body.account);
        const difference = roundMoney(body.counted - balanceOf(flows, at));
        if (Math.abs(difference) < 0.01) return badRequest("That is already the balance. Nothing to correct.");
        entries = [
          {
            account: body.account,
            direction: difference > 0 ? "IN" : "OUT",
            amount: Math.abs(difference),
            kind: "ADJUSTMENT",
            reason: body.reason,
          },
        ];
        break;
      }
    }

    const created = await prisma.$transaction(
      entries.map((entry) =>
        prisma.moneyEntry.create({
          data: { ...entry, amount: roundMoney(entry.amount), kind: entry.kind as never, ...base },
          select: { id: true },
        }),
      ),
    );

    await logAudit({
      actorId: auth.user.sub,
      action: `accounts.${body.type}`,
      resource: "MoneyEntry",
      resourceId: created[0]?.id,
      detail: { ...body, entries: entries.map((entry) => ({ account: entry.account, direction: entry.direction, amount: entry.amount })) },
      ip: clientIp(request),
    });
    return ok({ ids: created.map((row) => row.id) }, { status: 201 });
  } catch (error) {
    return handlePrismaError(error, "admin/accounts POST");
  }
}
