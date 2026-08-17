import { NextResponse } from "next/server";
import { requireResource, logAudit, clientIp } from "@/lib/api-auth";
import { ok, badRequest, serverError } from "@/lib/api-utils";
import { uploadMenuImage, storageConfigured } from "@/lib/storage";

/**
 * Accepts a menu photo and returns its hosted URL.
 *
 * Only checks that live here, not in the client: a browser can send anything, so
 * the size and type limits are enforced server-side where they cannot be
 * bypassed. sharp re-encodes to WebP, which also means a file that merely claims
 * to be an image but is not gets rejected rather than stored.
 */
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB — a phone photo, before we shrink it

export async function POST(request: Request) {
  const auth = await requireResource("menu");
  if (auth instanceof NextResponse) return auth;

  if (!storageConfigured()) {
    return badRequest(
      "Image uploads are not set up yet. Add SUPABASE_SERVICE_ROLE_KEY in the environment and create the storage bucket.",
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return badRequest("Expected an uploaded file.");
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return badRequest("No file was uploaded.");
  }
  if (file.size === 0) {
    return badRequest("That file is empty.");
  }
  if (file.size > MAX_BYTES) {
    return badRequest("That image is too large. Keep it under 10 MB.");
  }
  if (!file.type.startsWith("image/")) {
    return badRequest("That is not an image. Use a JPG, PNG or WebP.");
  }

  try {
    const result = await uploadMenuImage(await file.arrayBuffer());

    await logAudit({
      actorId: auth.user.sub,
      action: "menu.image.upload",
      resource: "MenuItem",
      detail: { path: result.path },
      ip: clientIp(request),
    });

    return ok({ url: result.url });
  } catch (error) {
    // The storage helper throws readable messages (bucket missing, key wrong);
    // pass those through, but never a raw stack.
    const message = error instanceof Error ? error.message : "Upload failed.";
    console.error("[admin/upload]", error);
    return message.length < 200 ? badRequest(message) : serverError();
  }
}
