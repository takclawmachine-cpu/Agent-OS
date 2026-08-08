"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";

import { ApiNotConnectedState, ResourceStateGate } from "@/components/api-state";
import { EmptyState } from "@/components/empty-state";
import { FieldError, ModuleError } from "@/components/error-notice";
import { Icon } from "@/components/icon";
import { ModuleCard } from "@/components/module-card";
import { OfflineNotice, useReliability } from "@/components/reliability-provider";
import { useUndo } from "@/components/undo-provider";
import { VoiceCore } from "@/components/voice-core";
import { apiRequest } from "@/lib/api-client";
import type { ModuleDefinition } from "@/lib/modules";
import { simulateVoiceError, startVoiceCapture, useVoiceState, VOICE_TRANSCRIPT_EVENT } from "@/lib/voice";
import { useOperationalModuleStore } from "@/state/mocks/operational-modules";
import { useOriginalModuleStore } from "@/state/mocks/original-modules";
import { useToolModuleStore, type ToolModuleState } from "@/state/mocks/tool-modules";

type ToolStore = ReturnType<typeof useToolModuleStore>;

type ProjectSkill = { id: string; name: string; category: string; description: string; agentIds: string | null };
export function ToolModuleView({ module }: { module: ModuleDefinition }) {
  const tools = useToolModuleStore();
  return (
    <div className="module-view">
      <header className="page-heading"><span className="page-heading__icon"><Icon name={module.icon} size={24} /></span><span><small>PROJECT TOOLS</small><h1>{module.label}</h1><p>{module.description}</p></span><span className="shell-status"><span className="live-dot" />Phase 2 backend</span></header>
      <ResourceStateGate state={tools.hydrationState} persistenceError={tools.persistenceError} onRetry={tools.retryHydration}>
        {module.slug === "voice" ? <VoiceModule /> : null}
        {module.slug === "todo" ? <TodoModule store={tools} /> : null}
        {module.slug === "skills" ? <SkillsModule store={tools} /> : null}
        {module.slug === "terminal" ? <TerminalModule store={tools} /> : null}
        {module.slug === "api-explorer" ? <ApiExplorerModule /> : null}
        {module.slug === "reports" ? <ReportModule /> : null}
        {module.slug === "preview-app" ? <PreviewShortcut /> : null}
      </ResourceStateGate>
    </div>
  );
}

function VoiceModule() {
  const state = useVoiceState();
  const { online } = useReliability();
  const original = useOriginalModuleStore();
  const [transcript, setTranscript] = useState<string | null>(null);
  const whisper = original.state.apiStatus.find((provider) => provider.name.toLowerCase() === "whisper");
  const whisperUnavailable = whisper && ["disconnected", "error", "unconfigured", "unreachable"].includes(whisper.status);
  useEffect(() => {
    const receive = (event: Event) => {
      const detail = (event as CustomEvent<{ target: string; text: string }>).detail;
      if (detail.target === "voice") setTranscript(detail.text);
    };
    window.addEventListener(VOICE_TRANSCRIPT_EVENT, receive);
    return () => window.removeEventListener(VOICE_TRANSCRIPT_EVENT, receive);
  }, []);
  return <ToolGrid stats={[["State", whisperUnavailable ? whisper.status : online ? state : "offline"], ["Provider", "Whisper"], ["Mode", "STT + TTS"]]}><ModuleCard title="Voice Channel" icon="voice" eyebrow="Shared state machine" live className="module-layout__primary"><OfflineNotice source="Voice transcription" />{whisperUnavailable ? <ApiNotConnectedState provider="Whisper" status={whisper.status === "unconfigured" ? "unconfigured" : whisper.status === "unreachable" ? "unreachable" : "error"} configureHref="/settings" /> : <div className="voice-module-surface"><VoiceCore target="voice" /></div>}</ModuleCard><ModuleCard title="Transcript" icon="chat" eyebrow="Latest capture">{state === "error" ? <ModuleError source="voice" title="Microphone unavailable" message="Permission was denied or no usable speech was detected. Text input remains available." /> : transcript ? <div className="transcript-panel"><small>COMMITTED TEXT</small><p>{transcript}</p><button className="secondary-action" onClick={() => startVoiceCapture("voice")} disabled={!online || state !== "idle" || Boolean(whisperUnavailable)}><Icon name="microphone" size={15} />Capture again</button><button className="secondary-action" onClick={simulateVoiceError} disabled={!online || state !== "idle"}>Simulate permission error</button></div> : whisperUnavailable ? <ApiNotConnectedState provider="Whisper" status={whisper.status === "unconfigured" ? "unconfigured" : whisper.status === "unreachable" ? "unreachable" : "error"} configureHref="/settings" /> : <EmptyState module="voice" onAction={() => startVoiceCapture("voice")} />}</ModuleCard></ToolGrid>;
}

function TodoModule({ store }: { store: ToolStore }) {
  const original = useOriginalModuleStore();
  const runUndoable = useUndo();
  const [text, setText] = useState("");
  const [linkType, setLinkType] = useState<"none" | "plan" | "agent">("none");
  const [linkId, setLinkId] = useState("");
  useEffect(() => {
    const receive = (event: Event) => {
      const detail = (event as CustomEvent<{ target: string; text: string }>).detail;
      if (detail.target === "todo") setText(detail.text);
    };
    window.addEventListener(VOICE_TRANSCRIPT_EVENT, receive);
    return () => window.removeEventListener(VOICE_TRANSCRIPT_EVENT, receive);
  }, []);
  const options = linkType === "plan" ? original.state.plans.items.map((item) => ({ id: item.id, label: item.name })) : linkType === "agent" ? original.state.agents.map((item) => ({ id: item.id, label: item.name })) : [];
  const add = (event: FormEvent) => { event.preventDefault(); if (!text.trim()) return; store.update((state) => ({ ...state, todos: [{ id: crypto.randomUUID(), text: text.trim(), completed: false, linkType, linkId: linkType === "none" ? "" : linkId }, ...state.todos] })); setText(""); };
  const remove = (todo: ToolModuleState["todos"][number]) => runUndoable({
    message: "To-do deleted",
    execute: () => store.update((state) => ({ ...state, todos: state.todos.filter((item) => item.id !== todo.id) })),
    rollback: () => store.update((state) => ({ ...state, todos: state.todos.some((item) => item.id === todo.id) ? state.todos : [todo, ...state.todos] })),
  });
  const open = store.state.todos.filter((todo) => !todo.completed).length;
  return <ToolGrid stats={[["Open", String(open)], ["Completed", String(store.state.todos.length - open)], ["Scope", "Personal"]]}><ModuleCard title="My To-Do List" icon="todo" eyebrow="Manual work" className="module-layout__primary"><div className="todo-list">{store.state.todos.map((todo) => <div key={todo.id} className={todo.completed ? "is-complete" : ""}><input type="checkbox" checked={todo.completed} onChange={() => store.update((state) => ({ ...state, todos: state.todos.map((item) => item.id === todo.id ? { ...item, completed: !item.completed } : item) }))} aria-label={`Complete ${todo.text}`} /><span><strong>{todo.text}</strong><small>{todo.linkType === "none" ? "Independent task" : `${todo.linkType}: ${todo.linkId}`}</small></span><button className="icon-button" onClick={() => remove(todo)} aria-label={`Delete ${todo.text}`}><Icon name="trash" size={15} /></button></div>)}{!store.state.todos.length ? <EmptyState module="todo" onAction={() => setText("Review the active project")} /> : null}</div></ModuleCard><ModuleCard title="Quick Add" icon="plus" eyebrow="Optional project link"><form className="module-form" onSubmit={add}><label>Task<div className="input-with-action"><input value={text} onChange={(event) => setText(event.target.value)} placeholder="What needs your attention?" /><button type="button" className="icon-button" onClick={() => startVoiceCapture("todo")} aria-label="Dictate to-do"><Icon name="microphone" size={16} /></button></div></label><label>Link to<select value={linkType} onChange={(event) => { setLinkType(event.target.value as typeof linkType); setLinkId(""); }}><option value="none">No link</option><option value="plan">Plan</option><option value="agent">Agent task</option></select></label>{linkType !== "none" ? <label>Target<select value={linkId} onChange={(event) => setLinkId(event.target.value)}><option value="">Select target</option>{options.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label> : null}<button className="primary-action">Add to-do <Icon name="plus" size={16} /></button></form></ModuleCard></ToolGrid>;
}

function SkillsModule({ store }: { store: ToolStore }) {
  const original = useOriginalModuleStore();
  const [agentId, setAgentId] = useState(original.state.agents[0]?.id ?? "");
  const [skills, setSkills] = useState<ProjectSkill[]>([]);
  useEffect(() => {
    void apiRequest<ProjectSkill[]>(`/api/skills?projectId=${encodeURIComponent(store.projectId)}`).then(setSkills);
  }, [store.projectId]);
  const assigned = skills.filter((skill) => skill.agentIds?.split(",").includes(agentId));
  const toggle = async (skill: ProjectSkill) => {
    const next = await apiRequest<ProjectSkill[]>(`/api/skills?projectId=${encodeURIComponent(store.projectId)}`, { method: "POST", body: JSON.stringify({ agentId, skillId: skill.id, assigned: !assigned.some((item) => item.id === skill.id) }) });
    setSkills(next);
  };
  return <ToolGrid stats={[["Catalog", String(skills.length)], ["Assigned", String(assigned.length)], ["Agents", String(original.state.agents.length)]]}><ModuleCard title="Skill Catalog" icon="skills" eyebrow="Database registry" className="module-layout__primary">{skills.length ? <div className="skill-grid">{skills.map((skill) => <article key={skill.id}><Icon name="skills" /><span><strong>{skill.name}</strong><small>{skill.agentIds?.split(",").filter(Boolean).length ?? 0} agents</small></span></article>)}</div> : <EmptyState module="skills" />}</ModuleCard><ModuleCard title="Agent Assignment" icon="agents" eyebrow="Persisted mapping">{!original.state.agents.length ? <EmptyState module="skills" title="No agents available" description="Add an agent before assigning catalog skills." actionLabel="Add an agent" actionHref="/agents" /> : !skills.length ? <EmptyState module="skills" /> : <div className="module-form"><label>Agent<select value={agentId} onChange={(event) => setAgentId(event.target.value)}>{original.state.agents.map((agent) => <option value={agent.id} key={agent.id}>{agent.name}</option>)}</select></label><div className="assignment-list">{skills.map((skill) => <label key={skill.id}><input type="checkbox" checked={assigned.some((item) => item.id === skill.id)} onChange={() => void toggle(skill)} />{skill.name}</label>)}</div></div>}</ModuleCard></ToolGrid>;
}

function TerminalModule({ store }: { store: ToolStore }) {
  const { online } = useReliability();
  const runUndoable = useUndo();
  const [command, setCommand] = useState("");
  const execute = async (value: string) => { if (!online) return; const normalized = value.trim().toLowerCase(); if (!normalized) return; setCommand(""); if (normalized === "clear") { const removed = store.state.terminal; runUndoable({ message: "Terminal history cleared", execute: () => store.update((state) => ({ ...state, terminal: [] })), rollback: () => store.update((state) => ({ ...state, terminal: [...removed.filter((line) => !state.terminal.some((current) => current.id === line.id)), ...state.terminal] })) }); return; } const commandLine = { id: crypto.randomUUID(), kind: "command" as const, text: `$ ${normalized}` }; store.update((state) => ({ ...state, terminal: [...state.terminal, commandLine] })); try { const result = await apiRequest<{ id: string; output: string; status: string }>(`/api/terminal?projectId=${store.projectId}`, { method: "POST", body: JSON.stringify({ command: normalized, sessionId: "web" }) }); store.update((state) => ({ ...state, terminal: [...state.terminal, { id: result.id, kind: result.status === "completed" ? "output" : "error", text: result.output }] })); } catch (error) { store.update((state) => ({ ...state, terminal: [...state.terminal, { id: crypto.randomUUID(), kind: "error", text: error instanceof Error ? error.message : "Terminal request failed." }] })); } };
  const run = (event: FormEvent) => { event.preventDefault(); execute(command); };
  return <ToolGrid stats={[["Mode", online ? "Sandboxed" : "Offline"], ["Commands", "4 allowed"], ["Execution", "Server gated"]]}><ModuleCard title="Command Console" icon="terminal" eyebrow="Project sandbox" className="module-layout__full"><OfflineNotice source="Terminal backend" /><div className="terminal-shell"><div className="terminal-output">{store.state.terminal.map((line) => <code className={`terminal-line terminal-line--${line.kind}`} key={line.id}>{line.text}</code>)}{!store.state.terminal.length ? <EmptyState module="terminal" onAction={() => void execute("help")} /> : null}</div><form onSubmit={run}><span>$</span><input value={command} onChange={(event) => setCommand(event.target.value)} placeholder="help" aria-label="Terminal command" autoComplete="off" disabled={!online} /><button disabled={!online}>Run</button></form></div></ModuleCard></ToolGrid>;
}

function ApiExplorerModule() {
  const { online } = useReliability();
  const allowedEndpoints = ["/api/agents", "/api/status", "/api/plans", "/api/reports"] as const;
  const [method, setMethod] = useState("GET");
  const [endpoint, setEndpoint] = useState("/api/agents");
  const [payload, setPayload] = useState("{\n  \"status\": \"working\"\n}");
  const [response, setResponse] = useState<string | null>(null);
  const [payloadError, setPayloadError] = useState("");
  const sendRequest = async () => { if (!online) return; try { if (!allowedEndpoints.some((allowed) => allowed === endpoint)) throw new Error("Only Agent OS API endpoints are allowed."); const parsed = JSON.parse(payload); setPayloadError(""); const started = performance.now(); const result = await fetch(`${endpoint}?projectId=agent-os`, { method, headers: method === "GET" ? undefined : { "content-type": "application/json" }, body: method === "GET" ? undefined : JSON.stringify(parsed) }); const body = await result.json(); setResponse(`${result.status} ${result.statusText} · ${Math.round(performance.now() - started)}ms\n${JSON.stringify(body, null, 2)}`); } catch (error) { if (error instanceof SyntaxError) setPayloadError("Enter valid JSON before sending the request."); else setResponse(`Request failed\n${error instanceof Error ? error.message : "Unknown error"}`); } };
  const send = (event: FormEvent) => { event.preventDefault(); sendRequest(); };
  return <ToolGrid stats={[["Scope", "Internal API"], ["Mode", online ? "Live backend" : "Offline"], ["Auth", "Local session"]]}><ModuleCard title="Request Builder" icon="api" eyebrow="App endpoints only" className="module-layout__primary"><OfflineNotice source="API Explorer backend" /><form className="module-form" onSubmit={send}><label>Method<select value={method} onChange={(event) => setMethod(event.target.value)}><option>GET</option><option>POST</option><option>PATCH</option></select></label><label>Endpoint<select value={endpoint} onChange={(event) => setEndpoint(event.target.value)}>{allowedEndpoints.map((allowed) => <option key={allowed}>{allowed}</option>)}</select></label><label className={payloadError ? "field-error" : ""}>JSON payload<textarea value={payload} onChange={(event) => { setPayload(event.target.value); if (payloadError) setPayloadError(""); }} />{payloadError ? <FieldError source="api-explorer-payload">{payloadError}</FieldError> : null}</label><button className="primary-action" disabled={!online}>Send request <Icon name="send" size={16} /></button></form></ModuleCard><ModuleCard title="Response" icon="status" eyebrow="Live backend result">{response ? <pre className="api-response">{response}</pre> : <EmptyState module="api-explorer" onAction={() => void sendRequest()} />}</ModuleCard></ToolGrid>;
}

function ReportModule() {
  const operations = useOperationalModuleStore();
  const [range, setRange] = useState("Last 7 days");
  const [included, setIncluded] = useState(operations.state.digests.modules);
  const [preview, setPreview] = useState<Record<string, unknown> | null>(null);
  const toggle = (name: string) => setIncluded((current) => current.includes(name) ? current.filter((item) => item !== name) : [...current, name]);
  const generate = async () => { const result = await apiRequest<{ snapshot: Record<string, unknown> }>("/api/reports?projectId=agent-os", { method: "POST", body: JSON.stringify({ range, modules: included }) }); setPreview(result.snapshot); };
  return <ToolGrid stats={[["Range", range], ["Included", String(included.length)], ["Trigger", "On demand"]]}><ModuleCard title="Report Configuration" icon="reports" eyebrow="Digest composition" className="module-layout__primary"><div className="module-form"><label>Date range<select value={range} onChange={(event) => setRange(event.target.value)}><option>Last 24 hours</option><option>Last 7 days</option><option>Last 30 days</option></select></label><div className="module-choice-grid">{["Agents", "Tokens", "GitHub", "Cron"].map((name) => <label key={name}><input type="checkbox" checked={included.includes(name)} onChange={() => toggle(name)} />{name}</label>)}</div><button className="primary-action" onClick={() => void generate()} disabled={!included.length}>Generate report <Icon name="reports" size={16} /></button></div></ModuleCard><ModuleCard title="Report Preview" icon="digests" eyebrow="Persisted point-in-time snapshot"><div className="report-preview">{preview ? <><header><small>{range.toUpperCase()}</small><strong>Agent OS Project Report</strong></header><pre className="api-response">{JSON.stringify(preview, null, 2)}</pre></> : <EmptyState module="reports" onAction={() => void generate()} />}</div></ModuleCard></ToolGrid>;
}

function PreviewShortcut() {
  const router = useRouter();
  const original = useOriginalModuleStore();
  const redirected = useRef(false);
  useEffect(() => {
    if (redirected.current) return;
    redirected.current = true;
    original.update((state) => ({ ...state, preview: { ...state.preview, state: "populated" } }));
    router.replace("/browser-preview");
  }, [original, router]);
  return <ToolGrid stats={[["Target", "Browser Preview"], ["Scope", original.projectId], ["State", "Preloading"]]}><ModuleCard title="Opening Preview" icon="preview" eyebrow="Shared module shortcut" className="module-layout__full"><div className="inline-empty"><span className="spinner" /><strong>Loading project preview</strong><span>Reusing the Browser Preview module state.</span></div></ModuleCard></ToolGrid>;
}

function ToolGrid({ stats, children }: { stats: Array<[string, string]>; children: React.ReactNode }) {
  return <><div className="module-stat-strip">{stats.map(([label, value]) => <span key={label}><strong>{value}</strong><small>{label}</small></span>)}</div><section className="module-layout original-module-layout tool-module-layout">{children}</section></>;
}