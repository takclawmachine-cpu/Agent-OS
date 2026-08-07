"use client";

import { useEffect } from "react";

import { Icon } from "@/components/icon";
import { reportReliabilityEvent } from "@/components/reliability-provider";

export function FieldError({ source, children }: { source: string; children: string }) {
  useEffect(() => {
    reportReliabilityEvent({ kind: "error", level: "field", source, message: children });
  }, [children, source]);

  return <small className="field-error-message" role="alert">{children}</small>;
}

export function ModuleError({
  source,
  title,
  message,
  onRetry,
}: {
  source: string;
  title: string;
  message: string;
  onRetry?: () => void;
}) {
  useEffect(() => {
    reportReliabilityEvent({ kind: "error", level: "module", source, message });
  }, [message, source]);

  return (
    <div className="module-error" role="alert">
      <Icon name="api" />
      <span><strong>{title}</strong><small>{message}</small></span>
      {onRetry ? <button className="secondary-action" type="button" onClick={onRetry}>Try again</button> : null}
    </div>
  );
}
