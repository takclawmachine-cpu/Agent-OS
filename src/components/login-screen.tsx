"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import { Icon } from "@/components/icon";
import { authenticate, notifyAuthChanged } from "@/lib/auth";

type FormState = "idle" | "submitting" | "setup-required" | "connection-error" | "credential-error" | "success";
type SetupStatus = { ready: boolean; missing: string[] };

export function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [state, setState] = useState<FormState>("idle");
  const [emptyFields, setEmptyFields] = useState({ email: false, password: false });
  const [setup, setSetup] = useState<SetupStatus | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/config/status", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Configuration status is unavailable.");
        return response.json() as Promise<{ data: SetupStatus }>;
      })
      .then((result) => {
        setSetup(result.data);
        if (!result.data.ready) setState("setup-required");
      })
      .catch(() => {
        if (!controller.signal.aborted) setState("connection-error");
      });
    return () => controller.abort();
  }, []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const empty = { email: !email.trim(), password: !password.trim() };
    setEmptyFields(empty);
    setState("idle");
    if (empty.email || empty.password) return;

    setState("submitting");
    const result = await authenticate(email.trim(), password.trim());
    if (!result.ok) {
      setState(result.reason === "setup-required" ? "setup-required" : result.reason === "connection-failure" ? "connection-error" : "credential-error");
      return;
    }

    notifyAuthChanged();
    setState("success");
    const requestedPath = new URLSearchParams(window.location.search).get("next");
    window.setTimeout(() => router.replace(result.session.onboardingRequired ? "/onboarding" : requestedPath || "/dashboard"), 280);
  };

  return (
    <main className="auth-layout">
      <section className="auth-intro">
        <h1>Command Center<br /><span>Keep the context.</span></h1>
      </section>

      <section className="auth-panel" aria-labelledby="login-title">
        <header className="auth-panel__brand"><span className="brand-mark"><span /></span><span><strong>AGENT OS</strong></span></header>
        <div className="auth-panel__heading"><span className="module-card__icon"><Icon name="lock" /></span><span><h2 id="login-title">Sign in to command</h2></span></div>

        {state === "setup-required" ? <div className="auth-banner" role="alert"><Icon name="settings" size={17} /><span><strong>Setup is required</strong><small>Complete the environment settings before signing in{setup?.missing.length ? `: ${setup.missing.join(", ")}` : "."}</small></span></div> : null}
        {state === "connection-error" ? <div className="auth-banner" role="alert"><Icon name="api" size={17} /><span><strong>Agent OS is unavailable</strong><small>Check the application connection and try again.</small></span></div> : null}

        <form className="auth-form" onSubmit={submit} noValidate>
          <label className={emptyFields.email ? "field-error" : ""}>
            <span>Email</span>
            <span className="auth-input"><Icon name="mail" size={17} /><input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="username" placeholder="Owner email" /></span>
            {emptyFields.email ? <small>Enter your email to continue.</small> : null}
          </label>
          <label className={emptyFields.password || state === "credential-error" ? "field-error" : ""}>
            <span>Password</span>
            <span className="auth-input"><Icon name="lock" size={17} /><input value={password} onChange={(event) => setPassword(event.target.value)} type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="Enter password" /><button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "Hide password" : "Show password"}><Icon name="eye" size={16} /></button></span>
            {emptyFields.password ? <small>Enter your password to continue.</small> : state === "credential-error" ? <small>Incorrect email or password.</small> : null}
          </label>
          <button className="primary-action" type="submit" disabled={!setup?.ready || state === "submitting" || state === "success"}>
            {!setup ? <><span className="spinner" />Checking setup</> : state === "submitting" ? <><span className="spinner" />Checking session</> : state === "success" ? <><Icon name="check" size={17} />Session ready</> : <>Sign in <Icon name="arrow" size={17} /></>}
          </button>
        </form>


      </section>
    </main>
  );
}
