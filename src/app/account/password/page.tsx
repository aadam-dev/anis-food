import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import ChangePasswordForm from "./ChangePasswordForm";

export const metadata = {
  title: "Change your password — Anis",
  robots: { index: false, follow: false },
};

export default async function ChangePasswordPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div data-surface="pos" data-theme="dark" className="min-h-dvh">
      <main className="min-h-dvh flex flex-col items-center justify-center px-5 py-10">
        <div className="w-full max-w-sm">
          <h1 className="text-xl font-bold mb-1">Choose a new password</h1>
          <p className="text-sm mb-6" style={{ color: "var(--s-ink-muted)" }}>
            Signed in as {user.email}. The password you were given is temporary — pick
            one only you know.
          </p>
          <div
            className="rounded-xl border p-6"
            style={{ background: "var(--s-panel)", borderColor: "var(--s-border)" }}
          >
            <ChangePasswordForm />
          </div>
        </div>
      </main>
    </div>
  );
}
