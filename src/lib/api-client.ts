type ApiRequestInit = RequestInit & { timeoutMs?: number };

type ApiErrorCode =
  | "authentication_required"
  | "forbidden"
  | "conflict"
  | "payload_too_large"
  | "rate_limited"
  | "provider_unavailable"
  | "server_error"
  | "request_failed"
  | "invalid_response"
  | "request_timeout"
  | "network_error";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number | null,
    public readonly code: ApiErrorCode,
    public readonly retryable: boolean,
    public readonly source: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function normalizeApiError(error: unknown, source = "api") {
  return error instanceof ApiError
    ? error
    : new ApiError("The API request failed unexpectedly.", null, "request_failed", false, source);
}

function errorDetails(status: number): { code: ApiErrorCode; retryable: boolean } {
  if (status === 401) return { code: "authentication_required", retryable: false };
  if (status === 403) return { code: "forbidden", retryable: false };
  if (status === 409) return { code: "conflict", retryable: true };
  if (status === 413) return { code: "payload_too_large", retryable: false };
  if (status === 429) return { code: "rate_limited", retryable: true };
  if (status === 503) return { code: "provider_unavailable", retryable: true };
  if (status >= 500) return { code: "server_error", retryable: true };
  return { code: "request_failed", retryable: false };
}

export async function apiRequest<T>(pathname: string, init: ApiRequestInit = {}) {
  const { timeoutMs = 15_000, ...requestInit } = init;
  const headers = new Headers(requestInit.headers);
  if (init.body && !headers.has("content-type")) headers.set("content-type", "application/json");
  const timeoutSignal = AbortSignal.timeout(timeoutMs);
  const signal = requestInit.signal ? AbortSignal.any([requestInit.signal, timeoutSignal]) : timeoutSignal;
  try {
    const response = await fetch(pathname, { ...requestInit, headers, signal });
    const body = await response.text();
    let result: { data?: T; error?: string; code?: string };
    try {
      result = body ? JSON.parse(body) as typeof result : {};
    } catch {
      throw new ApiError("The API returned an invalid response.", response.status, "invalid_response", true, pathname);
    }
    if (!response.ok) {
      const details = errorDetails(response.status);
      throw new ApiError(result.error ?? `Request failed with ${response.status}.`, response.status, details.code, details.retryable, pathname);
    }
    if (!("data" in result)) throw new ApiError("The API response did not include data.", response.status, "invalid_response", true, pathname);
    return result.data as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof DOMException && (error.name === "AbortError" || error.name === "TimeoutError")) {
      throw new ApiError("The API request timed out.", null, "request_timeout", true, pathname);
    }
    throw new ApiError("The API could not be reached.", null, "network_error", true, pathname);
  }
}