import Link from "next/link";

import { ModuleError } from "@/components/error-notice";
import { Icon } from "@/components/icon";
import type { ApiError } from "@/lib/api-client";
import type { ResourceState } from "@/lib/resource-state";

type DisconnectedStatus = "unconfigured" | "unreachable" | "error";

export function ApiNotConnectedState({
  provider,
  status,
  message,
  configureHref,
  onRetry,
}: {
  provider: string;
  status: DisconnectedStatus;
  message?: string;
  configureHref?: string;
  onRetry?: () => void;
}) {
  const unconfigured = status === "unconfigured";
  const title = unconfigured ? `${provider} is not configured` : `${provider} is not connected`;
  const description = message ?? (unconfigured
    ? `Configure ${provider} before using this feature.`
    : `Agent OS could not reach ${provider}. Check the connection and try again.`);

  return (
    <div className="inline-empty inline-empty--disconnected" data-resource-state={status} role={unconfigured ? "status" : "alert"}>
      <Icon name="api" />
      <strong>{title}</strong>
      <span>{description}</span>
      {onRetry ? (
        <button className="primary-action" type="button" onClick={onRetry}>Retry connection</button>
      ) : configureHref ? (
        <Link className="primary-action" href={configureHref}>Open settings</Link>
      ) : null}
    </div>
  );
}

export function StaleDataNotice({ lastSucceededAt, onRetry }: { lastSucceededAt: string; onRetry?: () => void }) {
  return (
    <div className="status-banner" data-resource-state="stale" role="status">
      <Icon name="clock" size={15} />
      <span>Showing cached data from {new Date(lastSucceededAt).toLocaleString()}.</span>
      {onRetry ? <button type="button" onClick={onRetry}>Refresh</button> : null}
    </div>
  );
}

export function ResourceStateGate({
  state,
  persistenceError,
  onRetry,
  children,
}: {
  state: ResourceState<unknown>;
  persistenceError: ApiError | null;
  onRetry: () => void;
  children: React.ReactNode;
}) {
  if (state.status === "idle" || state.status === "loading") {
    return (
      <div className="module-error" role="status">
        <Icon name="refresh" />
        <span><strong>Loading project data</strong><small>Waiting for the Agent OS API.</small></span>
      </div>
    );
  }
  if (state.status === "error") {
    return <ModuleError source="state-hydration" title="Project data unavailable" message={state.error.message} onRetry={onRetry} />;
  }
  return (
    <>
      {persistenceError ? <ModuleError source="state-persistence" title="Changes were not saved" message={persistenceError.message} /> : null}
      {children}
    </>
  );
}