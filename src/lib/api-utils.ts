import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";
import { Prisma } from "@/generated/prisma";

/**
 * Shared shapes for route handlers, so every endpoint fails in the same
 * predictable way and the client only has one error contract to understand.
 */

export function ok<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json(data, init);
}

export function badRequest(error: string, detail?: unknown): NextResponse {
  return NextResponse.json({ error, detail }, { status: 400 });
}

export function notFound(error = "Not found"): NextResponse {
  return NextResponse.json({ error }, { status: 404 });
}

export function conflict(error: string, detail?: unknown): NextResponse {
  return NextResponse.json({ error, detail }, { status: 409 });
}

export function serverError(error = "Something went wrong"): NextResponse {
  return NextResponse.json({ error }, { status: 500 });
}

/** Parses and validates a JSON body, returning a response on failure. */
export async function parseBody<T>(
  request: Request,
  schema: ZodType<T>,
): Promise<{ data: T } | NextResponse> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return badRequest("Expected a JSON body");
  }

  const result = schema.safeParse(raw);
  if (!result.success) {
    return badRequest("Some details are not valid", fieldErrors(result.error));
  }
  return { data: result.data };
}

/** Flattens Zod issues into { field: message } the forms can display inline. */
export function fieldErrors(error: ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path.join(".") || "_";
    if (!errors[path]) errors[path] = issue.message;
  }
  return errors;
}

/**
 * Turns a Prisma error into something a person can act on.
 *
 * Anything unrecognised is logged and reported as a generic failure — leaking
 * raw database errors to the browser tells an attacker about the schema and
 * tells the cashier nothing useful.
 */
export function handlePrismaError(error: unknown, context: string): NextResponse {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case "P2002": {
        const target = (error.meta?.target as string[] | undefined)?.join(", ");
        return conflict(
          target ? `That ${target} is already taken.` : "That record already exists.",
        );
      }
      case "P2003":
        return badRequest("That references something which no longer exists.");
      case "P2025":
        return notFound("That record no longer exists.");
      case "P1001":
      case "P1002":
        console.error(`[${context}] database unreachable`, error.code);
        return NextResponse.json(
          { error: "Cannot reach the database. Check your connection and try again." },
          { status: 503 },
        );
      case "P2024":
        console.error(`[${context}] connection pool timeout`);
        return NextResponse.json(
          { error: "The database is busy. Try again in a moment." },
          { status: 503 },
        );
    }
  }

  console.error(`[${context}]`, error);
  return serverError();
}
