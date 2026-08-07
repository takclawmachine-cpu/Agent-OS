export function canWriteApi() {
  try {
    const session = JSON.parse(window.localStorage.getItem("agent-os-session") ?? "null") as { role?: string } | null;
    return session?.role === "admin" || session?.role === "editor";
  } catch {
    return false;
  }
}

export async function apiRequest<T>(pathname: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("content-type")) headers.set("content-type", "application/json");
  const response = await fetch(pathname, { ...init, headers });
  const result = await response.json() as { data?: T; error?: string };
  if (!response.ok) throw new Error(result.error ?? `Request failed with ${response.status}.`);
  return result.data as T;
}