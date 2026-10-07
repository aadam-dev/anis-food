import { Suspense } from "react";
import Image from "next/image";
import AnisLogo from "@/components/brand/AnisLogo";
import { DEVELOPER_CREDIT } from "@/lib/developer-credit";
import LoginForm from "./LoginForm";
import ServiceClock from "./ServiceClock";

/**
 * The door to the till and the back office. On a tablet or desk it is half
 * photo, half sign-in; on a phone the photo becomes a band across the top.
 * Big targets and a PIN pad, because it is used with busy hands.
 */
export default function LoginPage() {
  return (
    <main className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      <section className="relative isolate flex min-h-[21vh] flex-col justify-between overflow-hidden p-5 text-white sm:min-h-[38vh] sm:p-6 lg:min-h-dvh lg:p-10">
        <Image
          src="/images/menu/jollof-fried-chicken.jpg"
          alt=""
          fill
          priority
          sizes="(min-width: 1024px) 55vw, 100vw"
          className="-z-20 object-cover"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-black/55 via-black/25 to-black/80" />
        <div style={{ paddingTop: "env(safe-area-inset-top)" }}>
          <span className="inline-block rounded-2xl bg-white/95 px-3 py-2 shadow-lg">
            <AnisLogo priority className="h-9 w-auto sm:h-12 lg:h-14" />
          </span>
        </div>
        <div>
          <ServiceClock />
          <p className="mt-2 hidden max-w-sm text-sm text-white/80 sm:block lg:text-base">
            Anis Food and Drink · Madina, Accra. Sign in to open the till, take orders and see how the day is going.
          </p>
        </div>
      </section>

      <section
        className="flex flex-col items-center justify-center px-5 py-5 sm:py-8 lg:px-12"
        style={{ background: "var(--s-bg)", paddingBottom: "max(2rem, env(safe-area-inset-bottom))" }}
      >
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-extrabold">Sign in</h1>
          <p className="mt-1 hidden text-sm sm:block" style={{ color: "var(--s-ink-muted)" }}>
            Your first name and 4-digit PIN.
          </p>
          <div className="mt-4 sm:mt-6">
            {/* useSearchParams needs a boundary or the whole route bails to CSR. */}
            <Suspense fallback={<div className="h-96" aria-hidden />}>
              <LoginForm />
            </Suspense>
          </div>
          <p className="mt-6 text-center text-xs sm:mt-10" style={{ color: "var(--s-ink-faint)" }}>
            <a href={DEVELOPER_CREDIT.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
              {DEVELOPER_CREDIT.label}
            </a>
          </p>
        </div>
      </section>
    </main>
  );
}
