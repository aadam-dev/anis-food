import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireResource, logAudit, clientIp } from "@/lib/api-auth";
import { ok, parseBody, badRequest, conflict, handlePrismaError } from "@/lib/api-utils";
import { roundMoney } from "@/lib/money";
import { drawerDifference, countedTotal } from "@/lib/cash";
import { isStaleSession, businessDay } from "@/lib/session-utils";
import { summariseSession } from "@/lib/pos-session";
import { SessionStatus, OrderStatus, OrderEventType } from "@/generated/prisma";

/**
 * The shift.
 *
 * One open shift at a time, for the whole shop. Two open drawers cannot be
 * reconciled against one physical till, so the second attempt is refused rather
 * than quietly creating a set of books nobody can balance.
 */

const openSchema = z.object({
  openingFloat: z.number().min(0).max(100000),
  /** Optional. Null and 0 mean different things — see the schema comment. */
  openingMomo: z.number().min(0).max(1000000).nullable().optional(),
  notes: z.string().max(500).optional(),
});

const closeSchema = z.object({
  sessionId: z.string().min(1),
  cashCount: z.record(z.string(), z.number().int().min(0)).optional(),
  closingCash: z.number().min(0).max(1000000).optional(),
  closingMomo: z.number().min(0).max(1000000).nullable().optional(),
  notes: z.string().max(500).optional(),
  /** Void any still-open tickets as part of closing — the escape hatch for a
   *  stale shift whose unpaid tabs can no longer be settled at the till. */
  voidOpenTickets: z.boolean().optional(),
});

/** The shift the till should be working against, if any. */
export async function GET() {
  const auth = await requireResource("pos");
  if (auth instanceof NextResponse) return auth;

  try {
    const open = await prisma.posSession.findFirst({
      where: { status: SessionStatus.OPEN },
      orderBy: { openedAt: "desc" },
    });

    if (!open) return ok({ session: null });
    return ok({ session: await summariseSession(open.id) });
  } catch (error) {
    return handlePrismaError(error, "pos/sessions GET");
  }
}

/** Open a shift. */
export async function POST(request: Request) {
  const auth = await requireResource("pos");
  if (auth instanceof NextResponse) return auth;

  const parsed = await parseBody(request, openSchema);
  if (parsed instanceof NextResponse) return parsed;
  const body = parsed.data;

  try {
    const existing = await prisma.posSession.findFirst({
      where: { status: SessionStatus.OPEN },
      include: { openedBy: { select: { name: true } } },
    });

    if (existing) {
      const stale = isStaleSession(existing.openedAt);
      return conflict(
        stale
          ? `A shift from ${businessDay(existing.openedAt)} was never closed. ` +
              `Close it first so that day's takings stay on that day.`
          : `${existing.openedBy.name} already has a shift open. ` +
              `Only one till can be open at a time.`,
        { sessionId: existing.id, stale },
      );
    }

    const session = await prisma.posSession.create({
      data: {
        openedById: auth.user.sub,
        openingFloat: body.openingFloat,
        openingMomo: body.openingMomo ?? null,
        notes: body.notes,
      },
    });

    await logAudit({
      actorId: auth.user.sub,
      action: "pos.session.open",
      resource: "PosSession",
      resourceId: session.id,
      detail: { openingFloat: body.openingFloat, openingMomo: body.openingMomo ?? null },
      ip: clientIp(request),
    });

    return ok({ session: await summariseSession(session.id) }, { status: 201 });
  } catch (error) {
    return handlePrismaError(error, "pos/sessions POST");
  }
}

/** Close a shift. */
export async function PATCH(request: Request) {
  const auth = await requireResource("pos");
  if (auth instanceof NextResponse) return auth;

  const parsed = await parseBody(request, closeSchema);
  if (parsed instanceof NextResponse) return parsed;
  const body = parsed.data;

  try {
    const session = await prisma.posSession.findUnique({ where: { id: body.sessionId } });
    if (!session) return badRequest("That shift no longer exists.");
    if (session.status === SessionStatus.CLOSED) {
      return conflict("That shift is already closed.");
    }

    const openTicketRows = await prisma.order.findMany({
      where: { sessionId: session.id, paymentStatus: "PENDING", status: { not: "CANCELLED" } },
      select: { id: true },
    });
    // Blocked only if the cashier hasn't chosen to void them. The count comes
    // back so the till can offer a one-tap "Void & close" — without it, a stale
    // shift whose tickets can't be reached is a dead end.
    if (openTicketRows.length > 0 && !body.voidOpenTickets) {
      return badRequest(
        `${openTicketRows.length} order(s) have not been paid for yet. Settle them from the ` +
          `Tickets tab, or void them and close the shift.`,
        { openTickets: openTicketRows.length, canVoidAndClose: true },
      );
    }

    // Prefer the counted denominations over a typed total: the count is the
    // physical evidence, the typed figure is someone's arithmetic.
    const countedFromDenominations = body.cashCount ? countedTotal(body.cashCount) : null;
    const closingCash =
      countedFromDenominations ??
      (body.closingCash !== undefined ? roundMoney(body.closingCash) : null);

    const summary = await summariseSession(session.id);
    if (!summary) return badRequest("That shift no longer exists.");

    const closed = await prisma.$transaction(async (tx) => {
      // Void the stragglers first (unpaid tickets contribute nothing to cash, so
      // this does not move the reconciliation). Each void is audited on its order.
      if (body.voidOpenTickets && openTicketRows.length > 0) {
        for (const ticket of openTicketRows) {
          await tx.order.update({
            where: { id: ticket.id },
            data: {
              status: OrderStatus.CANCELLED,
              voidedAt: new Date(),
              voidNote: "Voided when the shift was closed",
            },
          });
          await tx.orderEvent.create({
            data: {
              orderId: ticket.id,
              type: OrderEventType.VOIDED,
              actorId: auth.user.sub,
              detail: { reason: "shift close" } as never,
            },
          });
        }
      }

      return tx.posSession.update({
        where: { id: session.id },
        data: {
          status: SessionStatus.CLOSED,
          closedAt: new Date(),
          closedById: auth.user.sub,
          closingCash,
          closingMomo: body.closingMomo ?? null,
          // Snapshotted so a later menu edit or a voided order cannot silently
          // rewrite what this shift was reconciled against.
          expectedCash: summary.expectedCash,
          expectedMomo: summary.expectedMomo,
          cashCount: (body.cashCount ?? undefined) as never,
          notes: body.notes ?? session.notes,
        },
      });
    });

    await logAudit({
      actorId: auth.user.sub,
      action: "pos.session.close",
      resource: "PosSession",
      resourceId: closed.id,
      detail: {
        expectedCash: summary.expectedCash,
        closingCash,
        difference: drawerDifference(summary.expectedCash, closingCash),
      },
      ip: clientIp(request),
    });

    return ok({ session: await summariseSession(closed.id) });
  } catch (error) {
    return handlePrismaError(error, "pos/sessions PATCH");
  }
}
