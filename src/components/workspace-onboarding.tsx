"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { Icon } from "@/components/icon";
import { apiRequest, normalizeApiError } from "@/lib/api-client";
import { notifyAuthChanged } from "@/lib/auth";

type Project = { id: string; name: string; environment: string };

export function WorkspaceOnboarding() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [state, setState] = useState<"idle" | "saving" | "error">("idle");
  const [message, setMessage] = useState("");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (name.trim().length < 2) {
      setState("error");
      setMessage("Enter a workspace name with at least two characters.");
      return;
    }
    setState("saving");
    setMessage("");
    try {
      const project = await apiRequest<Project>("/api/projects", {
        method: "POST",
        body: JSON.stringify({ action: "create", name: name.trim() }),
      });
      window.localStorage.setItem("agent-os-project", project.id);
      window.localStorage.setItem("agent-os-project-history", JSON.stringify([project.id]));
      window.dispatchEvent(new Event("agent-os-project-change"));
      notifyAuthChanged();
      router.replace("/dashboard");
    } catch (error) {
      setState("error");
      setMessage(normalizeApiError(error, "/api/projects").message);
    }
  };

  return (
    <main className="onboarding-layout">
      <aside className="onboarding-progress">
        <header className="auth-panel__brand"><span className="brand-mark"><span /></span><span><strong>AGENT OS</strong><small>First workspace</small></span></header>
        <div><small>SETUP</small><strong>1 / 1</strong></div>
        <ol><li className="is-current"><span>1</span><strong>Workspace</strong></li></ol>
        <p>Your workspace starts empty. Connect optional services from the environment settings when you need them.</p>
      </aside>

      <section className="onboarding-stage">
        <header><span><small>ONBOARDING / WORKSPACE</small><h1>Create your workspace</h1></span></header>
        <form className="onboarding-content" onSubmit={submit}>
          <div className="setup-block">
            <span className="setup-icon"><Icon name="folder" size={28} /></span>
            <h2>Name your first workspace</h2>
            <p>No sample agents, tasks, skills, schedules, or activity will be added.</p>
            <label><span>Workspace name</span><input value={name} onChange={(event) => setName(event.target.value)} autoFocus maxLength={80} /></label>
            {state === "error" ? <div className="setup-message" role="alert">{message}</div> : null}
          </div>
          <footer className="onboarding-actions">
            <button type="submit" className="primary-action" disabled={state === "saving" || name.trim().length < 2}>
              {state === "saving" ? <><span className="spinner" />Creating workspace</> : <>Create workspace <Icon name="arrow" size={17} /></>}
            </button>
          </footer>
        </form>
      </section>
    </main>
  );
}