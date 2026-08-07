export type ProviderStatus = "connected" | "degraded" | "unconfigured" | "unreachable" | "error";

export type ResourceSource = "api" | "cache" | "local" | "provider" | "realtime";

export type ResourceMetadata = {
  source: ResourceSource;
  lastSucceededAt: string | null;
  retryable: boolean;
  providerStatus?: ProviderStatus;
};

export type ResourceError = {
  code: string;
  message: string;
};

export type ResourceState<T> =
  | { status: "idle"; metadata: ResourceMetadata }
  | { status: "loading"; metadata: ResourceMetadata }
  | { status: "ready-empty"; data: T; metadata: ResourceMetadata }
  | { status: "ready-populated"; data: T; metadata: ResourceMetadata }
  | { status: "unconfigured"; metadata: ResourceMetadata }
  | { status: "disconnected"; reason: "unreachable" | "error"; metadata: ResourceMetadata }
  | { status: "error"; error: ResourceError; metadata: ResourceMetadata }
  | { status: "stale"; data: T; staleAt: string; metadata: ResourceMetadata };

type ResolveResourceStateInput<T> = {
  data?: T;
  error?: ResourceError;
  isEmpty: (data: T) => boolean;
  loading?: boolean;
  metadata: ResourceMetadata;
  staleAt?: string;
};

export function resolveResourceState<T>({
  data,
  error,
  isEmpty,
  loading = false,
  metadata,
  staleAt,
}: ResolveResourceStateInput<T>): ResourceState<T> {
  if (error) return { status: "error", error, metadata };
  if (metadata.providerStatus === "unconfigured") return { status: "unconfigured", metadata };
  if (metadata.providerStatus === "unreachable" || metadata.providerStatus === "error") {
    return { status: "disconnected", reason: metadata.providerStatus, metadata };
  }
  if (data !== undefined && staleAt) return { status: "stale", data, staleAt, metadata };
  if (loading) return { status: "loading", metadata };
  if (data === undefined) return { status: "idle", metadata };
  return isEmpty(data)
    ? { status: "ready-empty", data, metadata }
    : { status: "ready-populated", data, metadata };
}