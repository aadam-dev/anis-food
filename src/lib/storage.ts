import "server-only";
import { createHash } from "node:crypto";
import sharp from "sharp";

/**
 * Menu image uploads, straight to Supabase Storage.
 *
 * We use Supabase only for the file bucket here — Prisma owns the database — so
 * this talks to the Storage REST API directly with the service-role key rather
 * than pulling in the whole Supabase client. The key bypasses row-level
 * security, so this module is server-only and the key is never sent to the
 * browser.
 *
 * Phone photos come in at several megabytes; sharp resizes them to a sensible
 * width and re-encodes as WebP before upload, so the bucket does not fill with
 * 8 MB originals and the menu page stays fast.
 */

const MAX_WIDTH = 1400;
const WEBP_QUALITY = 82;

export interface UploadResult {
  url: string;
  path: string;
}

export function storageConfigured(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function bucket(): string {
  return process.env.SUPABASE_STORAGE_BUCKET || "menu";
}

/**
 * Resizes, re-encodes and uploads an image. Returns its public URL.
 * Throws with a readable message the route can surface to the admin.
 */
export async function uploadMenuImage(input: ArrayBuffer): Promise<UploadResult> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    throw new Error(
      "Image uploads are not set up yet. Add SUPABASE_SERVICE_ROLE_KEY and create the storage bucket.",
    );
  }

  let webp: Buffer;
  try {
    webp = await sharp(Buffer.from(input))
      .rotate() // respect the phone's EXIF orientation
      .resize({ width: MAX_WIDTH, withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer();
  } catch {
    throw new Error("That file is not an image we can read. Try a JPG, PNG or WebP.");
  }

  // Content-addressed name: the same image uploaded twice reuses one object, and
  // the URL changes whenever the picture actually changes (so caches never serve
  // a stale photo under the same name).
  const hash = createHash("sha256").update(webp).digest("hex").slice(0, 16);
  const path = `items/${hash}.webp`;

  const endpoint = `${supabaseUrl}/storage/v1/object/${bucket()}/${path}`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "image/webp",
      // Overwrite quietly if this exact image already exists.
      "x-upsert": "true",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
    body: new Uint8Array(webp),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    console.error("[storage] upload failed", response.status, detail);
    if (response.status === 404) {
      throw new Error(
        `The "${bucket()}" storage bucket does not exist yet. Create it in Supabase (make it public).`,
      );
    }
    if (response.status === 400 && detail.includes("row-level security")) {
      throw new Error("The storage key is not allowed to upload. Check SUPABASE_SERVICE_ROLE_KEY.");
    }
    throw new Error("Could not upload that image. Try again.");
  }

  return {
    path,
    url: `${supabaseUrl}/storage/v1/object/public/${bucket()}/${path}`,
  };
}
