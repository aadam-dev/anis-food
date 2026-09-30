/**
 * Initials-and-tint placeholders for staff who have not uploaded a photo.
 * Stable for a given name so Maxwell stays the same colour across the till
 * switcher, the staff list, and the order filter.
 */

const AVATAR_TINTS = [
  "#C45C26",
  "#2F6F4E",
  "#1F4E79",
  "#8B3A3A",
  "#5C4B8A",
  "#B45309",
  "#0F766E",
  "#7C2D12",
] as const;

export function staffInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function staffAvatarTint(name: string): string {
  // Mix first + last token so "Maxwell Kaku" and "Maudallia Tetteh" land on
  // different slots even when FNV would collide on the full string.
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const key = `${parts[0] ?? ""}|${parts[parts.length - 1] ?? ""}|${name.length}`;
  let hash = 2166136261;
  for (let i = 0; i < key.length; i++) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return AVATAR_TINTS[(hash >>> 0) % AVATAR_TINTS.length];
}

/** First token of a display name, lowercased — used to match "maxwell" to Maxwell Kaku. */
export function firstNameKey(name: string): string {
  return name.trim().split(/\s+/)[0]?.toLowerCase() ?? "";
}
