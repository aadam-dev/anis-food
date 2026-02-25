"use client";

import { useState } from "react";
import { BUSINESS_INFO } from "@/lib/constants";
import { getOpenStatus, type OpenStatus } from "@/lib/hours";

interface LiveOpenStatusProps {
  className?: string;
  /** Inline (e.g. hero): dot + short text. Card: full hours + live status. */
  variant?: "inline" | "card";
}

export default function LiveOpenStatus({
  className = "",
  variant = "inline",
}: LiveOpenStatusProps) {
  const [status] = useState<OpenStatus | null>(() =>
    getOpenStatus(
      BUSINESS_INFO.timezone,
      BUSINESS_INFO.hours,
      BUSINESS_INFO.hoursStructured
    )
  );

  if (status === null) {
    if (variant === "inline") {
      return (
        <div className={`flex items-center gap-2 text-sm font-medium text-gray-400 ${className}`}>
          <div className="w-2 h-2 rounded-full bg-gray-500 animate-pulse" />
          <span>Loading…</span>
        </div>
      );
    }
    return (
      <div className={className}>
        <p className="text-gray-600">
          <span className="block">Mon-Fri: {BUSINESS_INFO.hours.weekdays}</span>
          <span className="block">Sat-Sun: {BUSINESS_INFO.hours.weekends}</span>
        </p>
      </div>
    );
  }

  if (variant === "inline") {
    return (
      <div className={`flex items-center gap-2 text-sm font-medium ${className}`}>
        <div
          className={`w-2 h-2 rounded-full shrink-0 ${
            status.isOpen ? "bg-green-500 animate-pulse" : "bg-gray-500"
          }`}
        />
        <span className={status.isOpen ? "text-green-400" : "text-gray-400"}>
          {status.isOpen ? "Open Now" : "Closed"}
          {status.isOpen && status.nextClose && ` • Closes ${status.nextClose}`}
          {!status.isOpen && status.nextOpen && ` • Opens ${status.nextOpen}`}
        </span>
      </div>
    );
  }

  return (
    <div className={className}>
      <p className="text-gray-600">
        <span className="block">Mon-Fri: {BUSINESS_INFO.hours.weekdays}</span>
        <span className="block">Sat-Sun: {BUSINESS_INFO.hours.weekends}</span>
      </p>
      <p className="mt-2 text-sm font-medium">
        <span
          className={
            status.isOpen ? "text-green-600" : "text-gray-500"
          }
        >
          {status.isOpen ? "Open now" : "Closed"}
          {status.isOpen && status.nextClose && ` • Closes ${status.nextClose}`}
          {!status.isOpen && status.nextOpen && ` • Opens ${status.nextOpen}`}
        </span>
      </p>
    </div>
  );
}
