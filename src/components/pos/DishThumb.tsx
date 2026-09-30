"use client";

import { useState } from "react";

/**
 * Photo or letter tile for a dish on the till.
 *
 * Shared by the menu grid and the cart so a focused line looks like the same
 * dish the cashier just tapped, even when that dish has no photo yet.
 */
const THUMB_TINTS = ["#F70E07", "#F07704", "#D40D06", "#B45309", "#9A3412", "#7C2D12"];

export function dishTint(name: string): string {
  return THUMB_TINTS[hashString(name) % THUMB_TINTS.length];
}

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  return hash;
}

export default function DishThumb({
  name,
  imageUrl,
  className = "w-full aspect-[4/3]",
  letterClassName = "text-2xl",
}: {
  name: string;
  imageUrl?: string | null;
  className?: string;
  letterClassName?: string;
}) {
  const [failed, setFailed] = useState(false);
  const showImage = imageUrl && !failed;

  if (showImage) {
    return (
      <span
        className={`block overflow-hidden ${className}`}
        style={{ background: "var(--s-panel-alt)" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- POS needs the
            service worker to cache these directly; next/image's loader would not. */}
        <img
          src={imageUrl}
          alt=""
          loading="lazy"
          onError={() => setFailed(true)}
          className="w-full h-full object-cover"
        />
      </span>
    );
  }

  return (
    <span
      className={`grid place-items-center font-bold text-white/90 ${className} ${letterClassName}`}
      style={{ background: dishTint(name) }}
      aria-hidden="true"
    >
      {name.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}
