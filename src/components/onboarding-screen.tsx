"use client";

import { useRouter } from "next/navigation";
import { useSyncExternalStore } from "react";

import { EmptyState } from "@/components/empty-state";
import { Icon } from "@/components/icon";
import { ONBOARDING_EVENT, ONBOARDING_KEY, defaultOnboardingState, parseOnboarding, writeOnboarding } from "@/lib/auth";

const steps = ["Project", "Hermes", "Voice", "Review"] as const;

function subscribe(callback: () => void) {
  window.addEventListener(ONBOARDING_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(ONBOARDING_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

function snapshot() {
  return window.localStorage.getItem(ONBOARDING_KEY) ?? JSON.stringify(defaultOnboardingState);
}

export function OnboardingScreen() {
  const router = useRouter();
  const storedState = useSyncExternalStore(subscribe, snapshot, () => JSON.stringify(defaultOnboardingState));
  const state = parseOnboarding(storedState);

  const update = (changes: Partial<typeof state>) => writeOnboarding({ ...state, ...changes });
  const next = () => update({ currentStep: Math.min(state.currentStep + 1, steps.length - 1) });
  const back = () => update({ currentStep: Math.max(state.currentStep - 1, 0) });
  const finish = () => {
    writeOnboarding({ ...state, completed: true });
    window.localStorage.setItem("agent-os-project", "agent-os");
    router.replace("/dashboard");
  };

  return (
    <main className="onboarding-layout">
      <aside className="onboarding-progress">
        <header className="auth-panel__brand"><span className="brand-mark"><span /></span><span><strong>AGENT OS</strong><small>First-run sequence</small></span></header>
        <div><small>SETUP PROGRESS</small><strong>{state.currentStep + 1} / {steps.length}</strong></div>
        <ol>
          {steps.map((step, index) => <li key={step} className={index === state.currentStep ? "is-current" : index < state.currentStep ? "is-complete" : ""}><span>{index < state.currentStep ? <Icon name="check" size={14} /> : index + 1}</span><strong>{step}</strong></li>)}
        </ol>
        <p>Your progress is stored locally after every choice. Closing this page will resume at the same step.</p>
      </aside>

      <section className="onboarding-stage">
        <header><span><small>ONBOARDING / {steps[state.currentStep].toUpperCase()}</small><h1>{stepTitle(state.currentStep)}</h1></span><span className="connection-pill"><span className="live-dot" />Saved locally</span></header>

        <div className="onboarding-content">
          {state.completed ? (
            <EmptyState
              module="onboarding"
              onAction={() => writeOnboarding(defaultOnboardingState)}
            />
          ) : null}
          {!state.completed && state.currentStep === 0 ? (
            <div className="setup-block">
              <span className="setup-icon"><Icon name="folder" size={28} /></span>
              <h2>Name your first project</h2>
              <p>Every module, memory entry, and live subscription follows this project scope.</p>
              <label><span>Project name</span><input value={state.projectName} onChange={(event) => update({ projectName: event.target.value })} autoFocus /></label>
            </div>
          ) : null}

          {!state.completed && state.currentStep === 1 ? (
            <div className="setup-block">
              <span className="setup-icon"><Icon name="api" size={28} /></span>
              <h2>Choose the Hermes channel</h2>
              <p>Use simulated events for an offline demo, or connect the project to the realtime WebSocket service.</p>
              <div className="segmented-control">
                <button type="button" className={state.hermesMode === "mock" ? "is-active" : ""} onClick={() => update({ hermesMode: "mock" })}>Simulated events</button>
                <button type="button" className={state.hermesMode === "websocket" ? "is-active" : ""} onClick={() => update({ hermesMode: "websocket" })}>Local WebSocket</button>
              </div>
              {state.hermesMode === "websocket" ? <label><span>Hermes endpoint</span><input value={state.hermesUrl} onChange={(event) => update({ hermesUrl: event.target.value })} /></label> : <div className="setup-message"><span className="live-dot" />Using deterministic local events</div>}
            </div>
          ) : null}

          {!state.completed && state.currentStep === 2 ? (
            <div className="setup-block">
              <span className="setup-icon"><Icon name="voice" size={28} /></span>
              <h2>Set the voice default</h2>
              <p>The global mic can remain available while text input stays the fallback.</p>
              <label className="toggle-row"><span><strong>Enable voice entry</strong><small>Allow the dashboard and supported modules to invoke the shared voice state machine.</small></span><input type="checkbox" checked={state.voiceEnabled} onChange={(event) => update({ voiceEnabled: event.target.checked })} /></label>
            </div>
          ) : null}

          {!state.completed && state.currentStep === 3 ? (
            <div className="setup-block">
              <span className="setup-icon"><Icon name="check" size={28} /></span>
              <h2>Ready for local command</h2>
              <p>Review the saved setup before entering the dashboard.</p>
              <dl className="setup-review"><div><dt>Project</dt><dd>{state.projectName || "Agent OS"}</dd></div><div><dt>Hermes</dt><dd>{state.hermesMode === "mock" ? "Simulated events" : state.hermesUrl}</dd></div><div><dt>Voice</dt><dd>{state.voiceEnabled ? "Enabled" : "Text only"}</dd></div></dl>
            </div>
          ) : null}
        </div>

        {!state.completed ? <footer className="onboarding-actions">
          <button type="button" className="secondary-action" onClick={back} disabled={state.currentStep === 0}>Back</button>
          {state.currentStep < steps.length - 1 ? <button type="button" className="primary-action" onClick={next} disabled={state.currentStep === 0 && !state.projectName.trim()}>Continue <Icon name="arrow" size={17} /></button> : <button type="button" className="primary-action" onClick={finish}>Enter command center <Icon name="arrow" size={17} /></button>}
        </footer> : null}
      </section>
    </main>
  );
}

function stepTitle(step: number) {
  return ["Establish project scope", "Connect the orchestrator", "Tune interaction", "Confirm the system"][step];
}
