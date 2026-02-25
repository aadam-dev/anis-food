"use client";

import { useState, useRef, useEffect } from "react";
import { Info } from "lucide-react";

interface InfoTooltipProps {
  /** Simple-language note shown when the user clicks or hovers the (i) icon. */
  note: string;
  /** Optional label for aria. */
  label?: string;
  /** Trigger on hover instead of click. */
  trigger?: "click" | "hover";
}

export default function InfoTooltip({ note, label = "More information", trigger = "click" }: InfoTooltipProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (trigger !== "click" || !open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [trigger, open]);

  return (
    <span ref={containerRef} className="inline-flex items-center relative">
      <button
        type="button"
        onClick={() => trigger === "click" && setOpen((o) => !o)}
        onMouseEnter={() => trigger === "hover" && setOpen(true)}
        onMouseLeave={() => trigger === "hover" && setOpen(false)}
        className="inline-flex items-center justify-center w-5 h-5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1"
        aria-label={label}
        aria-expanded={open}
      >
        <Info className="w-3.5 h-3.5" />
      </button>
      {open && (
        <span
          role="tooltip"
          className="absolute left-full ml-1.5 top-1/2 -translate-y-1/2 z-50 w-64 p-3 text-sm text-gray-700 bg-white border border-gray-200 rounded-lg shadow-lg"
          onMouseEnter={() => trigger === "hover" && setOpen(true)}
          onMouseLeave={() => trigger === "hover" && setOpen(false)}
        >
          {note}
        </span>
      )}
    </span>
  );
}
