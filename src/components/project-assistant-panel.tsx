"use client";

import { useEffect, useState } from "react";

import { FloatingDialog } from "@/components/dialog";
import { Icon } from "@/components/icon";
import { ProjectOpenConfirmation } from "@/components/project-open-confirmation";
import { apiRequest, normalizeApiError, type ApiError } from "@/lib/api-client";
import { startVoiceCapture, useVoiceState, VOICE_TRANSCRIPT_EVENT } from "@/lib/voice";

export type AssistantProject = { id: string; name: string; environment: string };
export type ProjectPanelLayout = { projectId: string; x: number; y: number; width: number; height: number; minimized: boolean; zIndex: number };

type ProjectSummary = {
  original: {
    agents: Array<{ id: string; status: string }>;
    chat: Array<{ id: string; who: "me" | "agent"; text: string; time: string }>;
    plans: { items: Array<{ id: string; status: string }> };
  };
  operational: { notifications: Array<{ id: string; read: boolean }> };
};

export function ProjectAssistantPanel({
  focused,
  layout,
  onClose,
  onFocus,
  onLayout,
  onOpenProject,
  onOpenWorkspace,
  onToggleMinimized,
  project,
}: {
  focused: boolean;
  layout: ProjectPanelLayout;
  onClose: () => void;
  onFocus: () => void;
  onLayout: (layout: Partial<ProjectPanelLayout>) => void;
  onOpenProject: (project: AssistantProject) => void;
  onOpenWorkspace: () => void;
  onToggleMinimized: () => void;
  project: AssistantProject;
}) {
  const [summary, setSummary] = useState<ProjectSummary | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [proposal, setProposal] = useState<AssistantProject[]>([]);
  const voiceState = useVoiceState(project.id);

  useEffect(() => {
    const controller = new AbortController();
    void apiRequest<ProjectSummary>(`/api/state?projectId=${encodeURIComponent(project.id)}`, { signal: controller.signal })
      .then((result) => { setSummary(result); setError(null); })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) setError(normalizeApiError(reason, "/api/state"));
      });
    return () => controller.abort();
  }, [project.id]);

  useEffect(() => {
    const receive = (event: Event) => {
      const detail = (event as CustomEvent<{ projectId: string; target: string; text: string }>).detail;
      if (detail.projectId === project.id && detail.target === "project-assistant") setMessage(detail.text);
    };
    window.addEventListener(VOICE_TRANSCRIPT_EVENT, receive);
    return () => window.removeEventListener(VOICE_TRANSCRIPT_EVENT, receive);
  }, [project.id]);

  const workingAgents = summary?.original.agents.filter((agent) => agent.status === "working").length ?? 0;
  const openPlans = summary?.original.plans.items.filter((plan) => plan.status !== "approved").length ?? 0;
  const unread = summary?.operational.notifications.filter((notification) => !notification.read).length ?? 0;
  const send = async (event: React.FormEvent) => {
    event.preventDefault();
    const text = message.trim();
    if (!text || sending || !summary) return;
    setSending(true);
    try {
      const result = await apiRequest<{ messages: ProjectSummary["original"]["chat"]; proposal?: { type: string; matches: AssistantProject[] } }>("/api/project-assistant", { method: "POST", body: JSON.stringify({ projectId: project.id, message: text }) });
      if (result.proposal?.matches.length) {
        setProposal(result.proposal.matches);
        return;
      }
      setSummary((current) => current ? { ...current, original: { ...current.original, chat: [...current.original.chat, ...result.messages] } } : current);
      setMessage("");
      setError(null);
    } catch (reason) {
      setError(normalizeApiError(reason, "/api/project-assistant"));
    } finally {
      setSending(false);
    }
  };

  return (
    <FloatingDialog
      actions={<><button className="icon-button" type="button" onClick={onToggleMinimized} aria-label={layout.minimized ? `Restore ${project.name}` : `Minimize ${project.name}`}><Icon name={layout.minimized ? "plus" : "chevron"} size={15} /></button><button className="icon-button" type="button" onClick={onClose} aria-label={`Close ${project.name}`}><Icon name="close" size={15} /></button></>}
      className={focused ? "is-focused" : ""}
      eyebrow={project.environment}
      label={project.name}
      minimized={layout.minimized}
      onFocus={onFocus}
      onMove={(position) => onLayout(position)}
      position={{ x: layout.x, y: layout.y }}
      size={{ width: layout.width, height: layout.height }}
      zIndex={layout.zIndex}
    >
      {proposal.length ? <ProjectOpenConfirmation matches={proposal} onCancel={() => setProposal([])} onConfirm={(target) => { setProposal([]); onOpenProject(target); }} /> : null}
      {error ? <div className="project-assistant-dialog__error" role="alert"><Icon name="api" /><span><strong>Project context unavailable</strong><small>{error.message}</small></span></div> : null}
      {!summary && !error ? <div className="project-assistant-dialog__loading" role="status"><span className="spinner" />Loading project context</div> : null}
      {summary ? <>
        <div className="project-assistant-stats"><span><strong>{workingAgents}</strong><small>Working agents</small></span><span><strong>{openPlans}</strong><small>Open plans</small></span><span><strong>{unread}</strong><small>Unread</small></span></div>
        <section className="project-assistant-conversation" aria-label={`${project.name} conversation`}>
          <header><span><small>PROJECT CONVERSATION</small><strong>Recent context</strong></span><span className={focused ? "live-tag" : "shell-status"}><span className="live-dot" />{focused ? "Focused" : "Standby"}</span></header>
          <div>{summary.original.chat.slice(-8).map((message) => <article className={message.who === "me" ? "is-user" : ""} key={message.id}><span>{message.text}</span><time>{message.time}</time></article>)}{!summary.original.chat.length ? <p>No conversation yet for this project.</p> : null}</div>
        </section>
        <form className="project-assistant-composer" onSubmit={send}>
          <textarea aria-label={`Message ${project.name}`} value={message} onChange={(event) => setMessage(event.target.value)} disabled={sending} placeholder={`Message ${project.name}...`} />
          <button className="icon-button" type="button" onClick={() => startVoiceCapture("project-assistant", project.id)} disabled={!focused || sending || voiceState !== "idle"} title={focused ? `Voice is ${voiceState}` : "Focus this project before using voice"} aria-label={`Voice input for ${project.name}: ${voiceState}`}><Icon name="microphone" /></button>
          <button className="icon-button" type="submit" disabled={sending || !message.trim()} aria-label={`Send message to ${project.name}`}><Icon name={sending ? "refresh" : "send"} /></button>
        </form>
        <button className="secondary-action project-assistant-open" type="button" onClick={onOpenWorkspace}>Open full workspace <Icon name="arrow" size={15} /></button>
      </> : null}
    </FloatingDialog>
  );
}