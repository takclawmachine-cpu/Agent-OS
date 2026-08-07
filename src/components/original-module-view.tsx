"use client";

import Link from "next/link";
import { Children, FormEvent, useEffect, useState, useSyncExternalStore } from "react";

import { EmptyState } from "@/components/empty-state";
import { Icon } from "@/components/icon";
import { ModuleCard } from "@/components/module-card";
import { useRealtimeStatus } from "@/components/realtime-provider";
import { useUndo, type UndoHandler } from "@/components/undo-provider";
import { VoiceCore } from "@/components/voice-core";
import { apiRequest } from "@/lib/api-client";
import type { ModuleDefinition } from "@/lib/modules";
import {
  speakText,
  startVoiceCapture,
  VOICE_TRANSCRIPT_EVENT,
} from "@/lib/voice";
import {
  type OriginalModuleState,
  useOriginalModuleStore,
} from "@/state/mocks/original-modules";

const vaultNotes = [
  {
    id: "index",
    title: "Memory Bank Index",
    path: "memory_bank/index.md",
    detail:
      "Master retrieval surface for active decisions, architecture, prompts, and phase trackers.",
  },
  {
    id: "architecture",
    title: "Architecture Overview",
    path: "memory_bank/architecture/overview.md",
    detail:
      "Living product architecture, module inventory, and phase boundaries.",
  },
  {
    id: "design",
    title: "Design System Decision",
    path: "memory_bank/decisions/0001-design-system.md",
    detail: "Central tokens, permissions, state treatments, and icon contract.",
  },
  {
    id: "tracker",
    title: "Phase 2 Tracker",
    path: "memory_bank/todos/phase-2.md",
    detail: "Current backend integration status mirrored from the PRD checklist.",
  },
] as const;

const subscribeToOrigin = () => () => undefined;

export function OriginalModuleView({ module }: { module: ModuleDefinition }) {
  const store = useOriginalModuleStore();
  const runUndoable = useUndo();

  if (module.slug === "dashboard") return <Dashboard state={store.state} />;

  return (
    <div className="module-view">
      <ModuleHeading module={module} live={module.slug === "agent-status"} />
      {module.slug === "mail" ? <MailModule store={store} runUndoable={runUndoable} /> : null}
      {module.slug === "cron" ? <CronModule store={store} runUndoable={runUndoable} /> : null}
      {module.slug === "plans" ? <PlansModule store={store} /> : null}
      {module.slug === "browser-preview" ? (
        <PreviewModule store={store} />
      ) : null}
      {module.slug === "agents" ? <AgentsModule store={store} /> : null}
      {module.slug === "agent-status" ? (
        <AgentStatusModule state={store.state} />
      ) : null}
      {module.slug === "tokens" ? <TokensModule state={store.state} /> : null}
      {module.slug === "api-status" ? <ApiStatusModule store={store} /> : null}
      {module.slug === "github" ? <GithubModule store={store} runUndoable={runUndoable} /> : null}
      {module.slug === "chat" ? <ChatModule store={store} /> : null}
      {module.slug === "vault" ? <VaultModule /> : null}
    </div>
  );
}

function ModuleHeading({
  module,
  live = false,
}: {
  module: ModuleDefinition;
  live?: boolean;
}) {
  const realtime = useRealtimeStatus();
  const transportLabel = realtime.mode === "websocket" ? "WebSocket live" : realtime.mode === "polling" ? "Polling live" : "Live offline";
  return (
    <header className="page-heading">
      <span className="page-heading__icon">
        <Icon name={module.icon} size={24} />
      </span>
      <span>
        <small>PROJECT-SCOPED MODULE</small>
        <h1>{module.label}</h1>
        <p>{module.description}</p>
      </span>
      {live ? (
        <span className="live-tag">
          <span className="live-dot" />
          {transportLabel}
        </span>
      ) : (
        <span className="shell-status">
          <span className="live-dot" />
          Local state
        </span>
      )}
    </header>
  );
}

type Store = ReturnType<typeof useOriginalModuleStore>;

function Dashboard({ state }: { state: OriginalModuleState }) {
  const workingAgents = state.agents.filter(
    (agent) => agent.status === "working",
  ).length;
  const activeJobs = state.cron.jobs.filter(
    (job) => job.status === "active",
  ).length;
  const openPlans = state.plans.items.filter(
    (plan) => plan.status !== "approved",
  ).length;

  return (
    <div className="dashboard-view">
      <header className="page-heading dashboard-heading">
        <span>
          <small>PROJECT / ACTIVE SCOPE</small>
          <h1>Command Center</h1>
        </span>
        <span className="system-time">
          <span className="live-dot" />
          All systems nominal
        </span>
      </header>
      <section
        className="hero-console"
        aria-label="Hermes voice command center"
      >
        <div className="telemetry telemetry--north">
          <small>ORCHESTRATOR</small>
          <strong>HERMES</strong>
          <span>Ready for command</span>
        </div>
        <div className="telemetry telemetry--east">
          <small>AGENT MESH</small>
          <strong>
            {workingAgents} / {state.agents.length}
          </strong>
          <span>Nodes working</span>
        </div>
        <div className="telemetry telemetry--south">
          <small>TOKENS</small>
          <strong>{state.tokens.totalMillions.toFixed(2)}M</strong>
          <span>Project usage</span>
        </div>
        <div className="telemetry telemetry--west">
          <small>OPEN WORK</small>
          <strong>{activeJobs + openPlans}</strong>
          <span>Jobs and plans</span>
        </div>
        <VoiceCore />
      </section>
      <section className="dashboard-grid">
        <ModuleCard
          title="Agent Working Status"
          icon="activity"
          eyebrow="Execution mesh"
          live
          className="dashboard-grid__wide"
        >
          {state.liveProgress.length ? (
            <ProgressRows items={state.liveProgress} />
          ) : (
            <EmptyState module="dashboard" actionHref="/plans" />
          )}
        </ModuleCard>
        <ModuleCard
          title="Project Pulse"
          icon="dashboard"
          eyebrow="Derived from module state"
        >
          <div className="metric-grid">
            <Metric
              value={String(state.mail.messages.length)}
              label="Recent mail"
            />
            <Metric value={String(activeJobs)} label="Active jobs" />
            <Metric value={String(state.github.length)} label="Repositories" />
            <Metric value={String(openPlans)} label="Open plans" />
          </div>
        </ModuleCard>
        <ModuleCard
          title="Quick Actions"
          icon="terminal"
          eyebrow="Project tools"
        >
          <div className="quick-actions">
            <Link href="/mail">
              <Icon name="mail" />
              <span>Compose</span>
            </Link>
            <Link href="/plans">
              <Icon name="plans" />
              <span>New plan</span>
            </Link>
            <Link href="/chat">
              <Icon name="chat" />
              <span>Ask Hermes</span>
            </Link>
            <Link href="/browser-preview">
              <Icon name="preview" />
              <span>Preview</span>
            </Link>
          </div>
        </ModuleCard>
        <ModuleCard
          title="Provider Health"
          icon="api"
          eyebrow="Connection matrix"
        >
          <div className="compact-list">
            {state.apiStatus.map((provider) => (
              <div key={provider.id}>
                <StatusBadge status={provider.status} />
                <span>
                  <strong>{provider.name}</strong>
                  <small>
                    {provider.latency ? `${provider.latency} ms` : "Offline"}
                  </small>
                </span>
              </div>
            ))}
          </div>
        </ModuleCard>
      </section>
    </div>
  );
}

function MailModule({ store, runUndoable }: { store: Store; runUndoable: UndoHandler }) {
  const [recipient, setRecipient] = useState("");
  const [subject, setSubject] = useState("");
  const deliveryRate = (
    (store.state.mail.sent /
      Math.max(1, store.state.mail.sent + store.state.mail.failed)) *
    100
  ).toFixed(1);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!recipient.trim() || !subject.trim()) return;
    const to = recipient.trim();
    const mailSubject = subject.trim();
    let delivered = false;
    try {
      await apiRequest("/api/providers?projectId=" + store.projectId, { method: "POST", body: JSON.stringify({ action: "mail", to, subject: mailSubject }) });
      delivered = true;
    } catch {
      delivered = false;
    }
    store.update((current) => ({
      ...current,
      mail: {
        ...current.mail,
        sent: current.mail.sent + Number(delivered),
        failed: current.mail.failed + Number(!delivered),
        messages: [
          {
            id: crypto.randomUUID(),
            recipient: to,
            subject: mailSubject,
            time: "Now",
            status: delivered ? "sent" : "failed",
          },
          ...current.mail.messages,
        ],
      },
    }));
    setRecipient("");
    setSubject("");
  };
  return (
    <ModuleGrid
      stats={[
        ["Sent", store.state.mail.sent.toLocaleString()],
        ["Delivery", `${deliveryRate}%`],
        ["Failed", String(store.state.mail.failed)],
      ]}
    >
      <ModuleCard
        title="Recent Mail"
        icon="mail"
        eyebrow="Local delivery log"
        className="module-layout__primary"
      >
        <DataList
          empty={
            <EmptyState
              module="mail"
              onAction={() => setRecipient("team@example.com")}
            />
          }
        >
          {store.state.mail.messages.map((mail) => (
            <DataRow
              key={mail.id}
              title={mail.subject}
              detail={`${mail.recipient} / ${mail.time}`}
              status={mail.status === "sent" ? "success" : "error"}
              statusText={mail.status}
              onDelete={() => runUndoable({
                message: "Mail removed",
                execute: () => store.update((current) => ({ ...current, mail: { ...current.mail, messages: current.mail.messages.filter((item) => item.id !== mail.id) } })),
                rollback: () => store.update((current) => ({ ...current, mail: { ...current.mail, messages: current.mail.messages.some((item) => item.id === mail.id) ? current.mail.messages : [mail, ...current.mail.messages] } })),
              })}
            />
          ))}
        </DataList>
      </ModuleCard>
      <ModuleCard title="Compose" icon="plus" eyebrow="SMTP provider">
        <form className="module-form" onSubmit={submit}>
          <label>
            Recipient
            <input
              type="email"
              value={recipient}
              onChange={(event) => setRecipient(event.target.value)}
              placeholder="team@example.com"
            />
          </label>
          <label>
            Subject
            <input
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              placeholder="Project update"
            />
          </label>
          <button className="primary-action" data-permission="write">
            Send mail <Icon name="send" size={16} />
          </button>
        </form>
      </ModuleCard>
    </ModuleGrid>
  );
}

function CronModule({ store, runUndoable }: { store: Store; runUndoable: UndoHandler }) {
  const [name, setName] = useState("");
  const [schedule, setSchedule] = useState("0 9 * * *");
  const add = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    store.update((current) => ({
      ...current,
      cron: {
        ...current.cron,
        jobs: [
          {
            id: crypto.randomUUID(),
            name: name.trim(),
            schedule,
            nextRun: "Scheduled",
            status: "active",
          },
          ...current.cron.jobs,
        ],
      },
    }));
    setName("");
  };
  return (
    <ModuleGrid
      stats={[
        [
          "Active",
          String(
            store.state.cron.jobs.filter((job) => job.status === "active")
              .length,
          ),
        ],
        ["Successful", String(store.state.cron.successfulRuns)],
        [
          "Failed",
          String(
            store.state.cron.jobs.filter((job) => job.status === "failed")
              .length,
          ),
        ],
      ]}
    >
      <ModuleCard
        title="Scheduled Jobs"
        icon="clock"
        eyebrow="Local scheduler"
        className="module-layout__primary"
      >
        <DataList
          empty={
            <EmptyState
              module="cron"
              onAction={() => setName("Nightly project check")}
            />
          }
        >
          {store.state.cron.jobs.map((job) => (
            <DataRow
              key={job.id}
              title={job.name}
              detail={`${job.schedule} / ${job.nextRun}`}
              status={job.status === "active" ? "success" : "error"}
              statusText={job.status}
              onDelete={() => runUndoable({
                message: "Scheduled job removed",
                execute: () => store.update((current) => ({ ...current, cron: { ...current.cron, jobs: current.cron.jobs.filter((item) => item.id !== job.id) } })),
                rollback: () => store.update((current) => ({ ...current, cron: { ...current.cron, jobs: current.cron.jobs.some((item) => item.id === job.id) ? current.cron.jobs : [job, ...current.cron.jobs] } })),
              })}
            />
          ))}
        </DataList>
      </ModuleCard>
      <ModuleCard title="Add Job" icon="plus" eyebrow="Persisted schedule">
        <form className="module-form" onSubmit={add}>
          <label>
            Name
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Nightly backup"
            />
          </label>
          <label>
            Cron expression
            <input
              value={schedule}
              onChange={(event) => setSchedule(event.target.value)}
            />
          </label>
          <button className="primary-action" data-permission="write">
            Add job <Icon name="plus" size={16} />
          </button>
        </form>
      </ModuleCard>
    </ModuleGrid>
  );
}

function PlansModule({ store }: { store: Store }) {
  const [name, setName] = useState("");
  const counts = {
    review: store.state.plans.items.filter(
      (plan) => plan.status === "in-review",
    ).length,
    approved: store.state.plans.items.filter(
      (plan) => plan.status === "approved",
    ).length,
    hold: store.state.plans.items.filter((plan) => plan.status === "on-hold")
      .length,
  };
  const add = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    store.update((current) => ({
      ...current,
      plans: {
        ...current.plans,
        items: [
          {
            id: crypto.randomUUID(),
            name: name.trim(),
            owner: "Hermes",
            status: "in-review",
          },
          ...current.plans.items,
        ],
      },
    }));
    setName("");
  };
  return (
    <ModuleGrid
      stats={[
        ["In review", String(counts.review)],
        ["Approved", String(counts.approved)],
        ["On hold", String(counts.hold)],
      ]}
    >
      <ModuleCard
        title="Plan Control"
        icon="plans"
        eyebrow="Approval workflow"
        className="module-layout__primary"
      >
        <div className="module-tabs">
          {(["overview", "plans", "history"] as const).map((tab) => (
            <button
              key={tab}
              className={store.state.plans.activeTab === tab ? "is-active" : ""}
              onClick={() =>
                store.update((current) => ({
                  ...current,
                  plans: { ...current.plans, activeTab: tab },
                }))
              }
            >
              {tab}
            </button>
          ))}
        </div>
        <DataList
          empty={
            <EmptyState
              module="plans"
              onAction={() => setName("New execution plan")}
            />
          }
        >
          {store.state.plans.items.map((plan) => (
            <DataRow
              key={plan.id}
              title={plan.name}
              detail={`Owner: ${plan.owner}`}
              status={
                plan.status === "approved"
                  ? "success"
                  : plan.status === "in-review"
                    ? "warning"
                    : "neutral"
              }
              statusText={plan.status}
            />
          ))}
        </DataList>
      </ModuleCard>
      <ModuleCard title="New Plan" icon="plus" eyebrow="Local workflow">
        <form className="module-form" onSubmit={add}>
          <label>
            Plan title
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Describe the outcome"
            />
          </label>
          <button className="primary-action" data-permission="write">
            Create plan <Icon name="plus" size={16} />
          </button>
        </form>
      </ModuleCard>
    </ModuleGrid>
  );
}

function PreviewModule({ store }: { store: Store }) {
  const [url, setUrl] = useState(store.state.preview.url);
  const trustedPreview = useSyncExternalStore(subscribeToOrigin, () => {
    try {
      return new URL(store.state.preview.url, window.location.href).origin === window.location.origin;
    } catch {
      return false;
    }
  }, () => false);
  const load = () => {
    store.update((current) => ({
      ...current,
      preview: { ...current.preview, state: "loading", url },
    }));
  };
  return (
    <ModuleGrid
      stats={[
        ["State", store.state.preview.state],
        ["Target", "Local"],
        ["Scope", store.projectId],
      ]}
    >
      <ModuleCard
        title="Application Preview"
        icon="browser"
        eyebrow="Project URL"
        live={store.state.preview.state === "populated"}
        className="module-layout__primary"
      >
        <div
          className={`preview-surface preview-surface--${store.state.preview.state}`}
        >
          {store.state.preview.state === "empty" ? (
            <EmptyState module="browser-preview" onAction={load} />
          ) : null}
          {store.state.preview.state === "loading" ? (
            <>
              <span className="spinner" />
              <h2>Loading preview</h2>
            </>
          ) : null}
          {store.state.preview.state === "error" ? (
            <>
              <Icon name="api" size={34} />
              <h2>Preview unavailable</h2>
              <p>The configured application did not allow this preview. Check the URL and frame policy, then retry.</p>
            </>
          ) : null}
          {store.state.preview.state === "loading" || store.state.preview.state === "populated" ? (
            <iframe className={store.state.preview.state === "loading" ? "is-loading" : ""} title="Project application preview" src={store.state.preview.url} sandbox={trustedPreview ? undefined : "allow-forms allow-scripts"} onLoad={() => store.update((current) => ({ ...current, preview: { ...current.preview, state: "populated" } }))} onError={() => store.update((current) => ({ ...current, preview: { ...current.preview, state: "error" } }))} />
          ) : null}
        </div>
      </ModuleCard>
      <ModuleCard title="Preview Target" icon="play" eyebrow="Live browser frame">
        <div className="module-form">
          <label>
            URL
            <input
              value={url}
              onChange={(event) => setUrl(event.target.value)}
            />
          </label>
          <button className="primary-action" onClick={load}>
            {store.state.preview.state === "error" ? "Retry" : "Load preview"}{" "}
            <Icon name="play" size={16} />
          </button>
        </div>
      </ModuleCard>
    </ModuleGrid>
  );
}

function AgentsModule({ store }: { store: Store }) {
  const [name, setName] = useState("");
  const [model, setModel] = useState("GPT-5.3-Codex");
  const add = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    store.update((current) => ({
      ...current,
      agents: [
        ...current.agents,
        {
          id: crypto.randomUUID(),
          name: name.trim(),
          model,
          status: "idle",
          completed: 0,
        },
      ],
    }));
    setName("");
  };
  return (
    <ModuleGrid
      stats={[
        [
          "Active",
          `${store.state.agents.filter((agent) => agent.status === "working").length}/${store.state.agents.length}`,
        ],
        ["Running tasks", String(store.state.liveProgress.length)],
        [
          "Completed",
          String(
            store.state.agents.reduce((sum, agent) => sum + agent.completed, 0),
          ),
        ],
      ]}
    >
      <ModuleCard
        title="Agent Roster"
        icon="agents"
        eyebrow="Project assignments"
        className="module-layout__primary"
      >
        <DataList
          empty={
            <EmptyState
              module="agents"
              onAction={() => setName("QA Agent")}
            />
          }
        >
          {store.state.agents.map((agent) => (
            <DataRow
              key={agent.id}
              title={agent.name}
              detail={`${agent.model} / ${agent.completed} completed`}
              status={agent.status === "working" ? "success" : "neutral"}
              statusText={agent.status}
            />
          ))}
        </DataList>
      </ModuleCard>
      <ModuleCard title="Add Agent" icon="plus" eyebrow="Local configuration">
        <form className="module-form" onSubmit={add}>
          <label>
            Name
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="QA Agent"
            />
          </label>
          <label>
            Model
            <select
              value={model}
              onChange={(event) => setModel(event.target.value)}
            >
              <option>GPT-5.3-Codex</option>
              <option>GPT-5.3</option>
              <option>Local model</option>
            </select>
          </label>
          <button className="primary-action" data-permission="write">
            Add agent <Icon name="plus" size={16} />
          </button>
        </form>
      </ModuleCard>
    </ModuleGrid>
  );
}

function AgentStatusModule({ state }: { state: OriginalModuleState }) {
  const average = state.liveProgress.length
    ? Math.round(
        state.liveProgress.reduce((sum, work) => sum + work.percent, 0) /
          state.liveProgress.length,
      )
    : 0;
  return (
    <ModuleGrid
      stats={[
        ["Working", String(state.liveProgress.length)],
        ["Average", `${average}%`],
        ["Transport", "WebSocket"],
      ]}
    >
      <ModuleCard
        title="Live Work Queue"
        icon="activity"
        eyebrow="Five-second updates"
        live
        className="module-layout__full"
      >
        {state.liveProgress.length ? (
          <ProgressRows items={state.liveProgress} />
        ) : (
          <EmptyState module="agent-status" actionHref="/agents" />
        )}
      </ModuleCard>
    </ModuleGrid>
  );
}

function TokensModule({ state }: { state: OriginalModuleState }) {
  return (
    <ModuleGrid
      stats={[
        ["Total", `${state.tokens.totalMillions.toFixed(2)}M`],
        ["Input", `${state.tokens.inputPercent}%`],
        ["Cost", `₹${state.tokens.cost.toLocaleString("en-IN")}`],
      ]}
    >
      <ModuleCard
        title="Token Distribution"
        icon="tokens"
        eyebrow="Project usage"
        className="module-layout__primary"
      >
        <div className="token-visual">
          <div
            className="token-donut"
            style={
              {
                "--token-input": `${state.tokens.inputPercent}%`,
              } as React.CSSProperties
            }
          >
            <span>
              <strong>{state.tokens.totalMillions.toFixed(2)}M</strong>
              <small>Total tokens</small>
            </span>
          </div>
          <div className="token-legend">
            <span>
              <i />
              Input <strong>{state.tokens.inputPercent}%</strong>
            </span>
            <span>
              <i />
              Output <strong>{state.tokens.outputPercent}%</strong>
            </span>
          </div>
        </div>
      </ModuleCard>
      <ModuleCard title="Cost Ledger" icon="billing" eyebrow="Provider usage">
        <div className="cost-display">
          <small>Current project</small>
          <strong>₹{state.tokens.cost.toLocaleString("en-IN")}</strong>
          <span>Updated from persisted provider usage</span>
        </div>
      </ModuleCard>
    </ModuleGrid>
  );
}

function ApiStatusModule({ store }: { store: Store }) {
  const check = async () => {
    const health = await apiRequest<Array<{ provider: string; status: string; latencyMs: number | null }>>(`/api/status?projectId=${store.projectId}`);
    store.update((current) => ({ ...current, apiStatus: health.map((provider) => ({ id: `provider-${provider.provider}`, name: provider.provider, latency: provider.latencyMs ?? 0, status: provider.status === "connected" ? "connected" : provider.status === "degraded" ? "degraded" : provider.status === "unconfigured" ? "unconfigured" : "disconnected" })) }));
  };
  return (
    <ModuleGrid
      stats={[
        [
          "Connected",
          String(
            store.state.apiStatus.filter((api) => api.status === "connected")
              .length,
          ),
        ],
        [
          "Degraded",
          String(
            store.state.apiStatus.filter((api) => api.status === "degraded")
              .length,
          ),
        ],
        [
          "Offline",
          String(
            store.state.apiStatus.filter((api) => api.status === "disconnected" || api.status === "unconfigured")
              .length,
          ),
        ],
      ]}
    >
      <ModuleCard
        title="Provider Matrix"
        icon="api"
        eyebrow="Local health checks"
        className="module-layout__primary"
      >
        <DataList
          empty={<EmptyState module="api-status" onAction={check} />}
        >
          {store.state.apiStatus.map((provider) => (
            <DataRow
              key={provider.id}
              title={provider.name}
              detail={
                provider.latency
                  ? `${provider.latency} ms round trip`
                  : "No response"
              }
              status={
                provider.status === "connected"
                  ? "success"
                  : provider.status === "degraded"
                    ? "warning"
                    : "error"
              }
              statusText={provider.status}
            />
          ))}
        </DataList>
      </ModuleCard>
      <ModuleCard
        title="Manual Check"
        icon="refresh"
        eyebrow="Provider health request"
      >
        <p className="module-copy">
          Calls each configured backend provider and persists its latest health result.
        </p>
        <button className="primary-action" onClick={() => void check()}>
          Run check <Icon name="refresh" size={16} />
        </button>
      </ModuleCard>
    </ModuleGrid>
  );
}

function GithubModule({ store, runUndoable }: { store: Store; runUndoable: UndoHandler }) {
  return (
    <ModuleGrid
      stats={[
        ["Repositories", String(store.state.github.length)],
        [
          "Open issues",
          String(
            store.state.github.reduce((sum, repo) => sum + repo.openIssues, 0),
          ),
        ],
        [
          "Resolved",
          String(
            store.state.github.reduce(
              (sum, repo) => sum + repo.resolvedIssues,
              0,
            ),
          ),
        ],
      ]}
    >
      <ModuleCard
        title="Repositories"
        icon="github"
        eyebrow="Project source"
        className="module-layout__full"
      >
        {store.state.github.length ? (
          <div className="repo-grid">
            {store.state.github.map((repo) => (
            <article key={repo.id}>
              <header>
                <Icon name="github" />
                <span>
                  <strong>{repo.name}</strong>
                  <small>{repo.branch}</small>
                </span>
                <button
                  className="icon-button"
                  data-permission="write"
                  onClick={() => runUndoable({
                    message: "Repository removed",
                    execute: () => store.update((current) => ({ ...current, github: current.github.filter((item) => item.id !== repo.id) })),
                    rollback: () => store.update((current) => ({ ...current, github: current.github.some((item) => item.id === repo.id) ? current.github : [repo, ...current.github] })),
                  })}
                  aria-label={`Remove ${repo.name}`}
                >
                  <Icon name="trash" size={15} />
                </button>
              </header>
              <div className="repo-metrics">
                <span>
                  <strong>{repo.openIssues}</strong>
                  <small>Open</small>
                </span>
                <span>
                  <strong>{repo.resolvedIssues}</strong>
                  <small>Resolved</small>
                </span>
                <span>
                  <strong>{repo.coverage}%</strong>
                  <small>Coverage</small>
                </span>
              </div>
              <span className="progress">
                <i style={{ width: `${repo.coverage}%` }} />
              </span>
            </article>
            ))}
          </div>
        ) : (
          <EmptyState module="github" actionHref="/settings" />
        )}
      </ModuleCard>
    </ModuleGrid>
  );
}

function ChatModule({ store }: { store: Store }) {
  const [message, setMessage] = useState("");
  useEffect(() => {
    const receiveTranscript = (event: Event) => {
      const detail = (event as CustomEvent<{ target: string; text: string }>)
        .detail;
      if (detail.target === "chat") setMessage(detail.text);
    };
    window.addEventListener(VOICE_TRANSCRIPT_EVENT, receiveTranscript);
    return () =>
      window.removeEventListener(VOICE_TRANSCRIPT_EVENT, receiveTranscript);
  }, []);
  const send = async (event: FormEvent) => {
    event.preventDefault();
    if (!message.trim()) return;
    const text = message.trim();
    setMessage("");
    store.update((current) => ({
      ...current,
      chat: [
        ...current.chat,
        { id: crypto.randomUUID(), who: "me", text, time: "Now" },
      ],
    }));
    let reply: string;
    try {
      const result = await apiRequest<{ text: string }>(`/api/providers?projectId=${store.projectId}`, { method: "POST", body: JSON.stringify({ action: "chat", provider: "hermes", message: text }) });
      reply = result.text;
    } catch (error) {
      reply = error instanceof Error ? error.message : "Hermes provider request failed.";
    }
    store.update((current) => ({
      ...current,
      chat: [...current.chat, { id: crypto.randomUUID(), who: "agent", text: reply, time: "Now" }],
    }));
  };
  return (
    <ModuleGrid
      stats={[
        ["Messages", String(store.state.chat.length)],
        ["Agent", "Hermes"],
        ["Context", store.projectId],
      ]}
    >
      <ModuleCard
        title="Hermes Thread"
        icon="chat"
        eyebrow="Project conversation"
        live
        className="module-layout__full"
      >
        <div className="chat-thread">
          {store.state.chat.length ? store.state.chat.map((item) => (
            <div
              key={item.id}
              className={`chat-bubble chat-bubble--${item.who}`}
            >
              <small>
                {item.who === "me" ? "You" : "Hermes"} / {item.time}
              </small>
              <p>{item.text}</p>
              {item.who === "agent" ? (
                <button
                  className="message-audio"
                  type="button"
                  onClick={() => speakText(item.text)}
                  aria-label={`Read response aloud: ${item.text}`}
                >
                  <Icon name="voice" size={14} />
                  Read aloud
                </button>
              ) : null}
            </div>
          )) : (
            <EmptyState
              module="chat"
              onAction={() => setMessage("Summarize the active project")}
            />
          )}
        </div>
        <form className="chat-compose" onSubmit={send}>
          <input
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Message Hermes..."
            aria-label="Message Hermes"
          />
          <button
            className="icon-button"
            type="button"
            onClick={() => startVoiceCapture("chat")}
            aria-label="Dictate message"
          >
            <Icon name="microphone" size={17} />
          </button>
          <button className="icon-button" aria-label="Send message">
            <Icon name="send" size={17} />
          </button>
        </form>
      </ModuleCard>
    </ModuleGrid>
  );
}

function VaultModule() {
  const [selected, setSelected] = useState<(typeof vaultNotes)[number]>(
    vaultNotes[0],
  );
  const copyPath = () => navigator.clipboard?.writeText(selected.path);
  return (
    <ModuleGrid
      stats={[
        ["Indexed notes", "7"],
        ["Decisions", "7"],
        ["Status", "Synchronized"],
      ]}
    >
      <ModuleCard
        title="Vault Index"
        icon="vault"
        eyebrow="Real workspace paths"
        className="module-layout__primary"
      >
        <div className="vault-list">
          {vaultNotes.map((note) => (
            <button
              key={note.id}
              className={selected.id === note.id ? "is-active" : ""}
              onClick={() => setSelected(note)}
            >
              <Icon name="vault" size={17} />
              <span>
                <strong>{note.title}</strong>
                <small>{note.path}</small>
              </span>
            </button>
          ))}
        </div>
      </ModuleCard>
      <ModuleCard title={selected.title} icon="folder" eyebrow="Memory preview">
        <div className="vault-preview">
          <code>{selected.path}</code>
          <p>{selected.detail}</p>
          <button className="secondary-action" onClick={copyPath}>
            <Icon name="copy" size={15} />
            Copy workspace path
          </button>
        </div>
      </ModuleCard>
    </ModuleGrid>
  );
}

function ModuleGrid({
  stats,
  children,
}: {
  stats: Array<[string, string]>;
  children: React.ReactNode;
}) {
  return (
    <>
      <div className="module-stat-strip">
        {stats.map(([label, value]) => (
          <Metric key={label} label={label} value={value} />
        ))}
      </div>
      <section className="module-layout original-module-layout">
        {children}
      </section>
    </>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <span>
      <strong>{value}</strong>
      <small>{label}</small>
    </span>
  );
}

function StatusBadge({
  status,
  text,
}: {
  status:
    | "connected"
    | "degraded"
    | "disconnected"
    | "unconfigured"
    | "success"
    | "warning"
    | "error"
    | "neutral";
  text?: string;
}) {
  const normalized =
    status === "connected"
      ? "success"
      : status === "degraded"
        ? "warning"
        : status === "disconnected"
          ? "error"
          : status === "unconfigured"
            ? "neutral"
          : status;
  return (
    <span className={`status-badge status-badge--${normalized}`}>
      <i />
      {text ?? status}
    </span>
  );
}

function DataList({
  children,
  empty,
}: {
  children: React.ReactNode;
  empty: React.ReactNode;
}) {
  return <div className="data-list">{Children.count(children) ? children : empty}</div>;
}

function DataRow({
  title,
  detail,
  status,
  statusText,
  onDelete,
}: {
  title: string;
  detail: string;
  status: "success" | "warning" | "error" | "neutral";
  statusText: string;
  onDelete?: () => void;
}) {
  return (
    <div className="data-row">
      <span>
        <strong>{title}</strong>
        <small>{detail}</small>
      </span>
      <StatusBadge status={status} text={statusText} />
      {onDelete ? (
        <button
          className="icon-button"
          data-permission="write"
          onClick={onDelete}
          aria-label={`Delete ${title}`}
        >
          <Icon name="trash" size={15} />
        </button>
      ) : null}
    </div>
  );
}

function ProgressRows({
  items,
}: {
  items: OriginalModuleState["liveProgress"];
}) {
  return (
    <div className="progress-list">
      {items.map((work) => (
        <div className="progress-row" key={work.id}>
          <span className="agent-avatar">{work.agent.charAt(0)}</span>
          <span>
            <strong>{work.agent}</strong>
            <small>{work.task}</small>
          </span>
          <span className="progress">
            <i style={{ width: `${work.percent}%` }} />
          </span>
          <b>{work.percent}%</b>
        </div>
      ))}
    </div>
  );
}
