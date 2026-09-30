import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import SetPinForm from "./SetPinForm";

export const metadata = {
  title: "Set your till PIN — Anis",
  robots: { index: false, follow: false },
};

export default async function SetPinPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div data-surface="pos" data-theme="light" className="min-h-dvh">
      <main className="min-h-dvh flex flex-col items-center justify-center px-5 py-10">
        <div className="w-full max-w-sm">
          <h1 className="text-xl font-bold mb-1">Choose your till PIN</h1>
          <p className="text-sm mb-6" style={{ color: "var(--s-ink-muted)" }}>
            Signed in as {user.name}. This four-digit code unlocks the till as you,
            so every sale is punched under your name.
          </p>
          <div
            className="rounded-xl border p-6"
            style={{ background: "var(--s-panel)", borderColor: "var(--s-border)" }}
          >
            <SetPinForm />
          </div>
        </div>
      </main>
    </div>
  );
}
