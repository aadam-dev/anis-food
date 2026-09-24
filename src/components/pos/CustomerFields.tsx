"use client";

/**
 * Optional customer on a sale.
 *
 * Mounted on the cart and again on the payment sheet against the same state,
 * so a name typed before charging is still there, and can still be added at
 * the last moment. Empty is a walk-in: nothing is stored, and the receipt
 * says so. The phone only appears once there is a name to attach it to.
 */
export default function CustomerFields({
  name,
  phone,
  onName,
  onPhone,
}: {
  name: string;
  phone: string;
  onName: (value: string) => void;
  onPhone: (value: string) => void;
}) {
  const fieldStyle = {
    background: "var(--s-panel-alt)",
    borderColor: "var(--s-border)",
    color: "var(--s-ink)",
  };

  return (
    <div className="space-y-2">
      <label className="block">
        <span className="sr-only">Customer name</span>
        <input
          type="text"
          value={name}
          onChange={(event) => {
            const next = event.target.value;
            onName(next);
            if (!next.trim()) onPhone("");
          }}
          placeholder="Customer name — empty for walk-in"
          autoComplete="name"
          maxLength={120}
          className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none"
          style={fieldStyle}
        />
      </label>
      {name.trim() && (
        <label className="block">
          <span className="sr-only">Customer phone</span>
          <input
            type="tel"
            inputMode="tel"
            value={phone}
            onChange={(event) => onPhone(event.target.value)}
          placeholder="Phone (optional)"
          autoComplete="tel"
          maxLength={30}
            className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none"
            style={fieldStyle}
          />
        </label>
      )}
    </div>
  );
}
