import { Suspense } from "react";
import { redirect } from "next/navigation";
import AnisLogo from "@/components/brand/AnisLogo";
import { getCurrentUser } from "@/lib/auth/session";
import { landingPathFor } from "@/lib/permissions";
import { DEVELOPER_CREDIT } from "@/lib/developer-credit";
import LoginForm from "./LoginForm";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect(landingPathFor(user.role));

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <AnisLogo priority className="h-20 w-auto" />
          <p className="mt-4 text-sm" style={{ color: "var(--s-ink-muted)" }}>
            Back office &amp; till
          </p>
          <p className="mt-2 text-center text-xs leading-relaxed" style={{ color: "var(--s-ink-faint)" }}>
            Add this page to your home screen. Cashiers open on the register;
            admins open on Today.
          </p>
        </div>

        <div className="s-card p-6">
          {/* useSearchParams needs a boundary or the whole route bails to CSR. */}
          <Suspense fallback={<div className="h-64" aria-hidden />}>
            <LoginForm />
          </Suspense>
        </div>

        <p className="mt-8 text-center text-xs" style={{ color: "var(--s-ink-faint)" }}>
          <a
            href={DEVELOPER_CREDIT.url}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
          >
            {DEVELOPER_CREDIT.label}
          </a>
        </p>
      </div>
    </main>
  );
}
