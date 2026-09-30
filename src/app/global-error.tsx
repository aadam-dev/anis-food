"use client";

/**
 * Root-level error boundary. Catches errors that escape the app (e.g. in layout).
 * Must define its own <html> and <body>.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: '"Plus Jakarta Sans", sans-serif', background: "#F4F6F8", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
        <div style={{ maxWidth: "28rem", textAlign: "center" }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#111", marginBottom: "0.5rem" }}>
            Something went wrong
          </h1>
          <p style={{ color: "#4B5563", marginBottom: "1.5rem" }}>
            We couldn’t load the app. Please try again.
          </p>
          {error.digest && (
            <p style={{ color: "#9CA3AF", marginBottom: "1rem", fontSize: "0.75rem" }}>
              Ref: {error.digest}
            </p>
          )}
          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={reset}
              style={{
                padding: "0.75rem 1rem",
                fontSize: "0.875rem",
                fontWeight: 700,
                color: "#fff",
                background: "#DC2626",
                border: "none",
                borderRadius: "1rem",
                cursor: "pointer",
              }}
            >
              Try again
            </button>
            <a
              href="/admin"
              style={{
                padding: "0.75rem 1rem",
                fontSize: "0.875rem",
                fontWeight: 700,
                color: "#111",
                background: "#fff",
                border: "1px solid #e5e7eb",
                borderRadius: "1rem",
                textDecoration: "none",
              }}
            >
              Back office
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
