"use client";

import Link from "next/link";
import { useEffect } from "react";

import { Icon } from "@/components/icon";
import { reportReliabilityEvent } from "@/components/reliability-provider";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
    reportReliabilityEvent({
      kind: "error",
      level: "app",
      source: "app-boundary",
      message: error.message || "Unexpected application error",
    });
  }, [error]);

  return (
    <main className="app-error" role="alert">
      <span className="app-error__icon"><Icon name="api" size={28} /></span>
      <small>APPLICATION ERROR</small>
      <h1>This module could not continue</h1>
      <p>The rest of Agent OS remains available. Retry this route before returning to the dashboard.</p>
      <div>
        <button className="primary-action" type="button" onClick={reset}>Retry module</button>
        <Link className="secondary-action" href="/dashboard">Open dashboard</Link>
      </div>
    </main>
  );
}
