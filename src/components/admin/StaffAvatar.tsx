"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Camera, Loader2 } from "lucide-react";
import { staffAvatarTint, staffInitials } from "@/lib/staff-avatar";

/** A staff member's photo, or their initials on a stable colour when there is none. */
export function StaffAvatar({ name, photoUrl, size = 48 }: { name: string; photoUrl: string | null; size?: number }) {
  if (photoUrl) {
    return (
      <span className="relative block shrink-0 overflow-hidden rounded-full" style={{ width: size, height: size }}>
        <Image src={photoUrl} alt="" fill sizes={`${size}px`} className="object-cover" />
      </span>
    );
  }
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full font-bold text-white"
      style={{ width: size, height: size, background: staffAvatarTint(name || "?"), fontSize: size * 0.36 }}
      aria-hidden
    >
      {staffInitials(name || "?")}
    </span>
  );
}

/**
 * Tap the photo to choose a new one. It uploads straight away and hands back
 * the URL; the form saves it with everything else.
 */
export function PhotoPicker({
  name,
  photoUrl,
  onChange,
}: {
  name: string;
  photoUrl: string | null;
  onChange: (url: string | null) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pick(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("purpose", "staff");
      const response = await fetch("/api/admin/upload", { method: "POST", body: form });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) setError(data.error ?? "Could not upload that photo.");
      else onChange(data.url as string);
    } catch {
      setError("No connection. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={() => input.current?.click()}
        className="relative rounded-full"
        aria-label={photoUrl ? "Change photo" : "Add a photo"}
      >
        <StaffAvatar name={name} photoUrl={photoUrl} size={80} />
        <span
          className="absolute -bottom-1 -right-1 grid h-8 w-8 place-items-center rounded-full text-white"
          style={{ background: "var(--s-brand)", boxShadow: "0 0 0 3px var(--s-panel)" }}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
        </span>
      </button>
      <div className="text-sm">
        <button type="button" onClick={() => input.current?.click()} className="font-bold" style={{ color: "var(--s-brand)" }}>
          {photoUrl ? "Change photo" : "Add a photo"}
        </button>
        {photoUrl && (
          <button type="button" onClick={() => onChange(null)} className="ml-3 font-semibold" style={{ color: "var(--s-ink-muted)" }}>
            Remove
          </button>
        )}
        <p className="mt-0.5 text-xs" style={{ color: error ? "var(--s-bad)" : "var(--s-ink-faint)" }}>
          {error ?? "A clear face photo helps everyone know who is on shift."}
        </p>
      </div>
      <input ref={input} type="file" accept="image/*" onChange={pick} className="hidden" />
    </div>
  );
}
