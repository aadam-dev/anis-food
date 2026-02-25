/**
 * Shared API utilities: error handling, validation helpers, and DB error detection.
 * Used by all API routes and server components for consistent behaviour.
 */
import { NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// Error response helpers
// ---------------------------------------------------------------------------

/** Return a consistent JSON error response. */
export function errorResponse(message: string, status: number, details?: unknown) {
  return NextResponse.json(
    { error: message, ...(details ? { details } : {}) },
    { status }
  );
}

/** Detect Prisma / network connection errors. */
export function isDatabaseConnectionError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes("Can't reach database") ||
    msg.includes("Connection refused") ||
    msg.includes("ETIMEDOUT") ||
    msg.includes("ENOTFOUND") ||
    msg.includes("P1001") ||
    msg.includes("P1002")
  );
}

/** Detect Prisma validation / constraint errors. */
export function isPrismaValidationError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes("P2002") || // Unique constraint
    msg.includes("P2003") || // Foreign key constraint
    msg.includes("P2025") || // Record not found
    msg.includes("P2011") || // Null constraint
    msg.includes("P2012")    // Missing required value
  );
}

/** Map a caught error to an appropriate API response. */
export function handlePrismaError(err: unknown): NextResponse {
  if (isDatabaseConnectionError(err)) {
    return errorResponse("Database unavailable. Please try again later.", 503);
  }
  if (isPrismaValidationError(err)) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("P2002")) return errorResponse("A record with that value already exists.", 409);
    if (msg.includes("P2025")) return errorResponse("Record not found.", 404);
    return errorResponse("Invalid request data.", 400);
  }
  // Log only the error message (not the full stack/object) to avoid leaking sensitive info
  console.error("[API] Unhandled error:", err instanceof Error ? err.message : "Unknown error");
  return errorResponse("Internal server error.", 500);
}

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

/** Parse and clamp a numeric search param to a safe positive integer. */
export function parsePositiveInt(value: string | null, fallback: number, max?: number): number {
  const parsed = parseInt(value ?? "", 10);
  if (isNaN(parsed) || parsed < 1) return fallback;
  return max ? Math.min(parsed, max) : parsed;
}

/** Valid order status transitions. */
const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  PENDING: ["PREPARING", "CANCELLED"],
  PREPARING: ["COMPLETED", "CANCELLED"],
  // Terminal states — no further transitions
  COMPLETED: [],
  CANCELLED: [],
};

/** Check whether a status transition is allowed. */
export function isValidStatusTransition(from: string, to: string): boolean {
  return VALID_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}
