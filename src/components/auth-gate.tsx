"use client";

import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";

import { AUTH_EVENT, type AuthSession } from "@/lib/auth";

const AuthSessionContext = createContext<AuthSession | null>(null);

export function useAuthenticatedSession() {
  return useContext(AuthSessionContext);
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLogin = pathname === "/login";
  const [session, setSession] = useState<AuthSession | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let active = true;
    const checkSession = () => {
      setChecked(false);
      fetch("/api/auth/session", { cache: "no-store" })
        .then(async (response) => response.ok ? (await response.json() as { data: AuthSession }).data : null)
        .catch(() => null)
        .then((nextSession) => {
          if (!active) return;
          setSession(nextSession);
          setChecked(true);
        });
    };
    checkSession();
    window.addEventListener(AUTH_EVENT, checkSession);
    return () => {
      active = false;
      window.removeEventListener(AUTH_EVENT, checkSession);
    };
  }, []);

  useEffect(() => {
    if (!checked) return;
    if (!isLogin && !session) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
    if (isLogin && session) {
      router.replace(session.onboardingRequired ? "/onboarding" : "/dashboard");
    }
    if (session && pathname !== "/onboarding" && session.onboardingRequired) {
      router.replace("/onboarding");
    }
    if (session && pathname === "/onboarding" && !session.onboardingRequired) {
      router.replace("/dashboard");
    }
  }, [checked, isLogin, pathname, router, session]);

  if (!checked || (!isLogin && !session)) {
    return <div className="session-check" role="status"><span className="spinner" />Checking session</div>;
  }

  return <AuthSessionContext.Provider value={session}>{children}</AuthSessionContext.Provider>;
}
