import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireResource } from "@/lib/api-auth";
import { ok, parseBody, badRequest, handlePrismaError } from "@/lib/api-utils";
import { tillStaffFilter } from "@/lib/till-visibility";
import { Prisma } from "@/generated/prisma";

const lineSchema = z.object({
  menuItemId: z.string().min(1),
  name: z.string().min(1).max(200),
  unitPrice: z.number().min(0).max(1000000),
  quantity: z.number().int().min(1).max(999),
  notes: z.string().max(200).optional(),
  imageUrl: z.string().max(500).nullable().optional(),
});

const createSchema = z.object({
  lines: z.array(lineSchema).min(1, "Add something before holding the order"),
  discount: z.number().min(0).max(1000000).optional(),
  label: z.string().max(80).optional(),
  customerName: z.string().max(120).optional(),
  customerPhone: z.string().max(30).optional(),
  customerAddress: z.string().max(200).optional(),
  fulfillment: z.enum(["DINE_IN", "TAKEAWAY", "DELIVERY"]).optional(),
  tableId: z.string().max(80).optional(),
});

function present(row: {
  id: string;
  label: string | null;
  lines: Prisma.JsonValue;
  discount: Prisma.Decimal;
  customerName: string | null;
  customerPhone: string | null;
  customerAddress: string | null;
  fulfillment: string;
  tableId: string | null;
  createdAt: Date;
  staff: { id: string; name: string };
}) {
  const lines = Array.isArray(row.lines) ? row.lines : [];
  return {
    id: row.id,
    label: row.label || row.customerName || "Held order",
    lines,
    discount: Number(row.discount),
    customerName: row.customerName,
    customerPhone: row.customerPhone,
    customerAddress: row.customerAddress,
    fulfillment: row.fulfillment,
    tableId: row.tableId,
    createdAt: row.createdAt.toISOString(),
    staffId: row.staff.id,
    staffName: row.staff.name,
    itemCount: lines.reduce((sum: number, line) => {
      if (!line || typeof line !== "object" || Array.isArray(line) || !("quantity" in line)) return sum;
      const quantity = Number(line.quantity);
      return sum + (Number.isFinite(quantity) ? quantity : 0);
    }, 0),
  };
}

const include = { staff: { select: { id: true, name: true } } } as const;

export async function GET() {
  const auth = await requireResource("pos");
  if (auth instanceof NextResponse) return auth;

  try {
    const rows = await prisma.heldCart.findMany({
      where: tillStaffFilter(auth.user.role, auth.user.sub),
      orderBy: { updatedAt: "desc" },
      include,
      take: 40,
    });
    return ok({ drafts: rows.map(present) });
  } catch (error) {
    return handlePrismaError(error, "pos/drafts GET");
  }
}

export async function POST(request: Request) {
  const auth = await requireResource("pos");
  if (auth instanceof NextResponse) return auth;

  const parsed = await parseBody(request, createSchema);
  if (parsed instanceof NextResponse) return parsed;
  const body = parsed.data;

  try {
    const open = await prisma.heldCart.count({ where: { staffId: auth.user.sub } });
    if (open >= 12) {
      return badRequest("Too many orders are on hold. Finish or clear one first.");
    }

    const row = await prisma.heldCart.create({
      data: {
        staffId: auth.user.sub,
        label: body.label?.trim() || body.customerName?.trim() || null,
        lines: body.lines,
        discount: body.discount ?? 0,
        customerName: body.customerName?.trim() || null,
        customerPhone: body.customerPhone?.trim() || null,
        customerAddress: body.customerAddress?.trim() || null,
        fulfillment: body.fulfillment ?? "TAKEAWAY",
        tableId: body.tableId || null,
      },
      include,
    });
    return ok({ draft: present(row) }, { status: 201 });
  } catch (error) {
    return handlePrismaError(error, "pos/drafts POST");
  }
}
