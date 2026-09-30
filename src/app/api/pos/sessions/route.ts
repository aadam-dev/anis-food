import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireResource, logAudit, clientIp } from "@/lib/api-auth";
import { ok, parseBody, badRequest, conflict, handlePrismaError } from "@/lib/api-utils";
import { drawerDifference } from "@/lib/cash";
import { isStaleSession, businessDay } from "@/lib/session-utils";
import { closeProblem, resolveClosingCash } from "@/lib/shift-close";
import { summariseSession } from "@/lib/pos-session";
import { SessionStatus } from "@/generated/prisma";

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

    const openTickets = await prisma.order.count({
      where: { sessionId: session.id, paymentStatus: "PENDING", status: { not: "CANCELLED" } },
    });

    const hasCount = body.cashCount && Object.keys(body.cashCount).length > 0;
    const closingCash = resolveClosingCash({
      cashCount: hasCount ? body.cashCount : null,
      closingCash: body.closingCash,
    });

    const summary = await summariseSession(session.id);
    if (!summary) return badRequest("That shift no longer exists.");

    const notes = body.notes?.trim() || null;
    const problem = closeProblem({
      unpaidCount: openTickets,
      expectedCash: summary.expectedCash,
      closingCash,
      notes,
    });
    if (problem) return badRequest(problem, { unpaid: openTickets });

    const closed = await prisma.posSession.update({
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
        cashCount: (hasCount ? body.cashCount : undefined) as never,
        notes: notes ?? session.notes,
      },
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
