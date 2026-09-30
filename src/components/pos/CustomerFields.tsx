"use client";

import { useState } from "react";
import { Bike, ShoppingBag, UtensilsCrossed } from "lucide-react";
import Sheet from "./ui/Sheet";
import {
  formatGhanaPhone,
  GHANA_PHONE_HINT,
  GHANA_PHONE_PLACEHOLDER,
  storeGhanaPhone,
} from "@/lib/ghana-phone";
import { FieldInput, FieldLabel, FieldSelect, SegmentedControl } from "./ui/Field";

export type FulfillmentType = "DINE_IN" | "TAKEAWAY" | "DELIVERY";

/**
 * Order context on the bill: how it leaves, who it is for, and where it goes.
 *
 * Name, phone and address are all optional. Phone is digits only and shown in
 * the Ghana local format. Delivery unlocks a location line; dine-in unlocks
 * the table picker when tables exist.
 */
export default function CustomerFields({
  fulfillment,
  onFulfillment,
  name,
  phone,
  address,
  onName,
  onPhone,
  onAddress,
  tables = [],
  tableId = "",
  onTable,
}: {
  fulfillment: FulfillmentType;
  onFulfillment: (value: FulfillmentType) => void;
  name: string;
  phone: string;
  address: string;
  onName: (value: string) => void;
  onPhone: (value: string) => void;
  onAddress: (value: string) => void;
  tables?: { id: string; label: string; area: string; occupied: boolean }[];
  tableId?: string;
  onTable?: (id: string) => void;
}) {
  return (
    <div className="space-y-3">
      <div>
        <FieldLabel>Order type</FieldLabel>
        <SegmentedControl
          ariaLabel="Order type"
          value={fulfillment}
          onChange={(next) => {
            onFulfillment(next);
            if (next !== "DINE_IN") onTable?.("");
            if (next !== "DELIVERY") onAddress("");
          }}
          options={[
            { value: "DINE_IN", label: "Dine-in", icon: <UtensilsCrossed className="h-3.5 w-3.5" /> },
            { value: "TAKEAWAY", label: "Takeaway", icon: <ShoppingBag className="h-3.5 w-3.5" /> },
            { value: "DELIVERY", label: "Delivery", icon: <Bike className="h-3.5 w-3.5" /> },
          ]}
        />
      </div>

      {fulfillment === "DINE_IN" && tables.length > 0 && (
        <div>
          <FieldLabel htmlFor="pos-table" hint="Optional">
            Table
          </FieldLabel>
          <FieldSelect
            id="pos-table"
            value={tableId}
            onChange={(event) => onTable?.(event.target.value)}
          >
            <option value="">No table</option>
            {tables.map((table) => (
              <option key={table.id} value={table.id} disabled={table.occupied && table.id !== tableId}>
                {table.area} · {table.label}
                {table.occupied ? " (in use)" : ""}
              </option>
            ))}
          </FieldSelect>
        </div>
      )}

      <div>
        <FieldLabel htmlFor="pos-customer-name" hint="Optional">
          Customer
        </FieldLabel>
        <FieldInput
          id="pos-customer-name"
          type="text"
          value={name}
          onChange={(event) => onName(event.target.value)}
          placeholder="Name — empty for walk-in"
          autoComplete="name"
          maxLength={120}
        />
      </div>

      <div>
        <FieldLabel htmlFor="pos-customer-phone" hint="Optional">
          Phone
        </FieldLabel>
        <FieldInput
          id="pos-customer-phone"
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          value={formatGhanaPhone(phone)}
          onChange={(event) => onPhone(storeGhanaPhone(event.target.value))}
          placeholder={GHANA_PHONE_PLACEHOLDER}
          maxLength={12}
          aria-describedby="pos-phone-hint"
        />
        <p id="pos-phone-hint" className="mt-1 text-[11px]" style={{ color: "var(--s-ink-faint)" }}>
          {GHANA_PHONE_HINT}
        </p>
      </div>

      {fulfillment === "DELIVERY" && (
        <div>
          <FieldLabel htmlFor="pos-customer-address" hint="Optional">
            Location
          </FieldLabel>
          <FieldInput
            id="pos-customer-address"
            type="text"
            value={address}
            onChange={(event) => onAddress(event.target.value)}
            placeholder="Area, landmark or address"
            autoComplete="street-address"
            maxLength={200}
          />
        </div>
      )}
    </div>
  );
}

const TYPE_LABEL: Record<FulfillmentType, string> = {
  DINE_IN: "Dine-in",
  TAKEAWAY: "Takeaway",
  DELIVERY: "Delivery",
};

/** One line on the bill. The fields live in a sheet so the order stays visible. */
export function OrderContextBar(props: {
  fulfillment: FulfillmentType;
  onFulfillment: (value: FulfillmentType) => void;
  name: string;
  phone: string;
  address: string;
  onName: (value: string) => void;
  onPhone: (value: string) => void;
  onAddress: (value: string) => void;
  tables?: { id: string; label: string; area: string; occupied: boolean }[];
  tableId?: string;
  onTable?: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const who = props.name.trim() || "Walk-in";
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-between gap-3 rounded-2xl px-3 py-2.5 text-left"
        style={{ background: "var(--s-panel-alt)", boxShadow: "inset 0 0 0 1px var(--s-border)" }}
      >
        <span className="min-w-0">
          <span className="block text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color: "var(--s-ink-faint)" }}>
            {TYPE_LABEL[props.fulfillment]}
          </span>
          <span className="block truncate text-sm font-bold">{who}</span>
        </span>
        <span className="shrink-0 text-xs font-bold" style={{ color: "var(--s-brand)" }}>
          Details
        </span>
      </button>
      {open && (
        <Sheet title="Order details" subtitle="Optional. Empty is a walk-in." onClose={() => setOpen(false)}>
          <CustomerFields {...props} />
        </Sheet>
      )}
    </>
  );
}
