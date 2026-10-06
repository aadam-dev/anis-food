import { NextResponse } from "next/server";
import { requireResource, logAudit, clientIp } from "@/lib/api-auth";
import { ok, badRequest, serverError } from "@/lib/api-utils";
import { uploadMenuImage, storageConfigured } from "@/lib/storage";

/**
 * Photo of a paper receipt for an expense. Same pipeline as menu photos (re-
 * encoded to WebP, content-addressed, so the URL is unguessable), filed under
 * receipts/ and guarded by the expenses permission rather than the menu one.
 */
const MAX_BYTES = 10 * 1024 * 1024;

export async function POST(request: Request) {
  const auth = await requireResource("expenses");
  if (auth instanceof NextResponse) return auth;

  if (!storageConfigured()) {
    return badRequest("Photo uploads are not set up yet. Ask whoever runs the system to add the storage key.");
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return badRequest("Expected an uploaded photo.");
  }
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return badRequest("No photo was uploaded.");
  if (file.size > MAX_BYTES) return badRequest("That photo is too large. Keep it under 10 MB.");
  if (!file.type.startsWith("image/")) return badRequest("That is not a photo. Use a JPG, PNG or WebP.");

  try {
    const result = await uploadMenuImage(await file.arrayBuffer(), "receipts");
    await logAudit({
      actorId: auth.user.sub,
      action: "expense.receipt.upload",
      resource: "Expense",
      detail: { path: result.path },
      ip: clientIp(request),
    });
    return ok({ url: result.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed.";
    console.error("[admin/expenses/receipt]", error);
    return message.length < 200 ? badRequest(message) : serverError();
  }
}
