"use client";

import { useSyncExternalStore } from "react";

/** Ticks once a minute, in Accra time. */
function subscribe(onChange: () => void) {
  const timer = window.setInterval(onChange, 15_000);
  return () => window.clearInterval(timer);
}
const minuteNow = () => Math.floor(Date.now() / 60_000);

function greeting(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

/** "Good afternoon" with the time and date, so the till greets the shift. */
export default function ServiceClock() {
  const minute = useSyncExternalStore(subscribe, minuteNow, () => 0);
  if (minute === 0) return <p className="text-3xl font-extrabold lg:text-5xl">Welcome</p>;
  const now = new Date(minute * 60_000);
  const hour = Number(now.toLocaleString("en-GB", { hour: "2-digit", hour12: false, timeZone: "Africa/Accra" }));
  return (
    <div>
      <p className="text-2xl font-extrabold sm:text-3xl lg:text-5xl">{greeting(hour)}</p>
      <p className="mt-1 text-base font-semibold text-white/90 tabular-nums sm:text-lg lg:text-xl">
        {now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Accra" })}
        {" · "}
        {now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "Africa/Accra" })}
      </p>
    </div>
  );
}
