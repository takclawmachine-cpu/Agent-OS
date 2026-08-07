"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";

import { AUTH_EVENT, AUTH_SESSION_KEY, ONBOARDING_KEY, clearSession, parseOnboarding, parseSession } from "@/lib/auth";

function subscribe(callback: () => void) {
  window.addEventListener(AUTH_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(AUTH_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

function getSnapshot() {
  return window.localStorage.getItem(AUTH_SESSION_KEY);
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  const sessionValue = useSyncExternalStore(subscribe, getSnapshot, () => null);
  const session = parseSession(sessionValue);
  const isLogin = pathname === "/login";
  const [serverCheckedSession, setServerCheckedSession] = useState<string | null>(null);
  const serverChecked = !sessionValue || serverCheckedSession === sessionValue;

  useEffect(() => {
    if (!hydrated || !sessionValue || serverChecked) return;
    const controller = new AbortController();
    fetch("/api/auth/session", { signal: controller.signal })
      .then((response) => {
        if (response.status === 401) clearSession();
      })
      .catch(() => undefined)
      .finally(() => setServerCheckedSession(sessionValue));
    return () => controller.abort();
  }, [hydrated, serverChecked, sessionValue]);

  useEffect(() => {
    if (!hydrated || !serverChecked) return;
    if (!isLogin && !session) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
    if (isLogin && session) {
      const onboarding = parseOnboarding(window.localStorage.getItem(ONBOARDING_KEY));
      router.replace(onboarding.completed ? "/dashboard" : "/onboarding");
    }
  }, [hydrated, isLogin, pathname, router, serverChecked, session]);

  if (!hydrated || !serverChecked || (!isLogin && !session)) {
    return <div className="session-check" role="status"><span className="spinner" />Checking session</div>;
  }

  return children;
}
