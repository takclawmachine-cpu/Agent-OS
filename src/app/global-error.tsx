"use client";

import { useEffect } from "react";

const pageStyle = {
  display: "grid",
  minHeight: "100vh",
  placeContent: "center",
  gap: "12px",
  padding: "24px",
  color: "#f4f4f5",
  background: "#101012",
  fontFamily: "ui-sans-serif, sans-serif",
} as const;

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
    void fetch("/api/dev-log", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind: "error", level: "app", source: "global-boundary", message: error.message, path: window.location.pathname }),
    }).catch(() => undefined);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0 }}>
        <main style={pageStyle} role="alert">
          <small style={{ color: "#f87171", fontWeight: 700 }}>AGENT OS / APPLICATION ERROR</small>
          <h1 style={{ margin: 0 }}>Agent OS could not continue</h1>
          <p style={{ maxWidth: "54ch", margin: 0, color: "#a1a1aa" }}>A root interface failure interrupted this view. Repair the local condition, then retry the application.</p>
          <button type="button" onClick={reset} style={{ width: "fit-content", marginTop: "8px", padding: "10px 16px", border: 0, borderRadius: "4px", color: "#101012", background: "#f4f4f5", fontWeight: 700, cursor: "pointer" }}>Retry application</button>
        </main>
      </body>
    </html>
  );
}
