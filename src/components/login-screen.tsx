"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { Icon } from "@/components/icon";
import { authenticate, DEMO_EMAIL, DEMO_PASSWORD, ONBOARDING_KEY, parseOnboarding, writeSession } from "@/lib/auth";

type FormState = "idle" | "submitting" | "connection-error" | "credential-error" | "success";

export function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [state, setState] = useState<FormState>("idle");
  const [emptyFields, setEmptyFields] = useState({ email: false, password: false });

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const empty = { email: !email.trim(), password: !password.trim() };
    setEmptyFields(empty);
    setState("idle");
    if (empty.email || empty.password) return;

    setState("submitting");
    const result = await authenticate(email.trim(), password.trim());
    if (!result.ok) {
      setState(result.reason === "connection-failure" ? "connection-error" : "credential-error");
      return;
    }

    writeSession(result.session);
    setState("success");
    const onboarding = parseOnboarding(window.localStorage.getItem(ONBOARDING_KEY));
    const requestedPath = new URLSearchParams(window.location.search).get("next");
    window.setTimeout(() => router.replace(onboarding.completed ? requestedPath || "/dashboard" : "/onboarding"), 280);
  };

  const useDemo = () => {
    setEmail(DEMO_EMAIL);
    setPassword(DEMO_PASSWORD);
    setEmptyFields({ email: false, password: false });
    setState("idle");
  };

  return (
    <main className="auth-layout">
      <section className="auth-intro">
        <span className="auth-kicker"><span className="live-dot" />Local intelligence layer</span>
        <h1>Command your agents.<br /><span>Keep the context.</span></h1>
        <p>One project-scoped interface for Hermes, specialist agents, operational tools, and indexed memory.</p>
        <div className="auth-signal-grid" aria-hidden="true">
          <span><strong>27</strong><small>Modules routed</small></span>
          <span><strong>SQLite</strong><small>Persistent runtime</small></span>
          <span><strong>5-state</strong><small>UI contract</small></span>
        </div>
      </section>

      <section className="auth-panel" aria-labelledby="login-title">
        <header className="auth-panel__brand"><span className="brand-mark"><span /></span><span><strong>AGENT OS</strong><small>Secure local access</small></span></header>
        <div className="auth-panel__heading"><span className="module-card__icon"><Icon name="lock" /></span><span><small>SESSION GATE</small><h2 id="login-title">Sign in to command</h2></span></div>

        {state === "connection-error" ? <div className="auth-banner" role="alert"><Icon name="api" size={17} /><span><strong>Hermes is unreachable</strong><small>Check the local connection and try again.</small></span></div> : null}

        <form className="auth-form" onSubmit={submit} noValidate>
          <label className={emptyFields.email ? "field-error" : ""}>
            <span>Email</span>
            <span className="auth-input"><Icon name="mail" size={17} /><input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="username" placeholder="admin@agentos.demo" /></span>
            {emptyFields.email ? <small>Enter your email to continue.</small> : null}
          </label>
          <label className={emptyFields.password || state === "credential-error" ? "field-error" : ""}>
            <span>Password</span>
            <span className="auth-input"><Icon name="lock" size={17} /><input value={password} onChange={(event) => setPassword(event.target.value)} type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="Enter password" /><button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "Hide password" : "Show password"}><Icon name="eye" size={16} /></button></span>
            {emptyFields.password ? <small>Enter your password to continue.</small> : state === "credential-error" ? <small>Incorrect email or password.</small> : null}
          </label>
          <button className="primary-action" type="submit" disabled={state === "submitting" || state === "success"}>
            {state === "submitting" ? <><span className="spinner" />Checking session</> : state === "success" ? <><Icon name="check" size={17} />Session ready</> : <>Sign in <Icon name="arrow" size={17} /></>}
          </button>
        </form>

        <div className="demo-credentials">
          <span><small>Demo ID</small><code>{DEMO_EMAIL}</code></span>
          <span><small>Password</small><code>{DEMO_PASSWORD}</code></span>
          <button type="button" onClick={useDemo}>Use demo account</button>
        </div>
        <p className="auth-note">Use password <code>fail</code> to test the connection-failure state.</p>
      </section>
    </main>
  );
}
