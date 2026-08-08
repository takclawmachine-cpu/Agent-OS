"use client";

import { Children, FormEvent, useEffect, useState, useSyncExternalStore } from "react";

import { ApiNotConnectedState, ResourceStateGate } from "@/components/api-state";
import { EmptyState } from "@/components/empty-state";
import { Icon } from "@/components/icon";
import { ModuleCard } from "@/components/module-card";
import { useRealtimeStatus } from "@/components/realtime-provider";
import { useUndo, type UndoHandler } from "@/components/undo-provider";
import { VoiceCore } from "@/components/voice-core";
import { apiRequest, normalizeApiError, type ApiError } from "@/lib/api-client";
import { modules, type ModuleDefinition } from "@/lib/modules";
import type { ProviderStatus } from "@/lib/resource-state";
import {
  speakText,
  startVoiceCapture,
  VOICE_TRANSCRIPT_EVENT,
} from "@/lib/voice";
import {
  type OriginalModuleState,
  useOriginalModuleStore,
} from "@/state/original-modules";

type VaultNote = { path: string; version: number; content: string; createdAt: string };
type ApiProvider = OriginalModuleState["apiStatus"][number];

const subscribeToOrigin = () => () => undefined;
const openModuleDialogEvent = "agent-os-open-module-dialog";

function openModuleDialog(slug: string) {
  window.dispatchEvent(new CustomEvent(openModuleDialogEvent, { detail: { slug } }));
}

function providerDisconnectedStatus(providers: ApiProvider[]): "unconfigured" | "unreachable" | "error" {
  if (!providers.length || providers.every((provider) => provider.status === "unconfigured")) return "unconfigured";
  if (providers.some((provider) => provider.status === "unreachable" || provider.status === "disconnected")) return "unreachable";
  return "error";
}

function allProvidersUnavailable(providers: ApiProvider[]) {
  return !providers.length || providers.every((provider) => ["disconnected", "error", "unconfigured", "unreachable"].includes(provider.status));
}

function providerDetail(provider: ApiProvider) {
  if (provider.status === "unconfigured") return "Not configured";
  if (provider.status === "unreachable" || provider.status === "disconnected") return "No response";
  if (provider.status === "error") return "Connection error";
  return provider.latency ? `${provider.latency} ms` : "Connected";
}

export function OriginalModuleView({ module }: { module: ModuleDefinition }) {
  const store = useOriginalModuleStore();
  const runUndoable = useUndo();

  if (module.slug === "dashboard") return (
    <ResourceStateGate state={store.hydrationState} persistenceError={store.persistenceError} onRetry={store.retryHydration}>
      <Dashboard projectId={store.projectId} state={store.state} />
    </ResourceStateGate>
  );

  return (
    <div className="module-view">
      <ModuleHeading module={module} live={module.slug === "agent-status"} />
      <ResourceStateGate state={store.hydrationState} persistenceError={store.persistenceError} onRetry={store.retryHydration}>
        {module.slug === "mail" ? <MailModule store={store} runUndoable={runUndoable} /> : null}
        {module.slug === "cron" ? <CronModule store={store} runUndoable={runUndoable} /> : null}
        {module.slug === "plans" ? <PlansModule store={store} /> : null}
        {module.slug === "browser-preview" ? <PreviewModule store={store} /> : null}
        {module.slug === "agents" ? <AgentsModule store={store} /> : null}
        {module.slug === "agent-status" ? <AgentStatusModule state={store.state} /> : null}
        {module.slug === "tokens" ? <TokensModule store={store} /> : null}
        {module.slug === "api-status" ? <ApiStatusModule store={store} /> : null}
        {module.slug === "github" ? <GithubModule store={store} runUndoable={runUndoable} /> : null}
        {module.slug === "chat" ? <ChatModule store={store} /> : null}
        {module.slug === "vault" ? <VaultModule store={store} /> : null}
      </ResourceStateGate>
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
  const compact = ["browser-preview", "mail", "agent-status", "chat", "vault"].includes(module.slug);
  const transportLabel = realtime.mode === "websocket" ? "WebSocket live" : realtime.mode === "polling" ? "Polling live" : "Live offline";
  return (
    <header className="page-heading">
      <span className="page-heading__icon">
        <Icon name={module.icon} size={24} />
      </span>
      <span>
        {!compact ? <small>PROJECT-SCOPED MODULE</small> : null}
        <h1>{module.label}</h1>
        {!compact ? <p>{module.description}</p> : null}
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

function Dashboard({ projectId, state }: { projectId: string; state: OriginalModuleState }) {
  const workingAgents = state.agents.filter(
    (agent) => agent.status === "working",
  ).length;
  const activeJobs = state.cron.jobs.filter(
    (job) => job.status === "active",
  ).length;
  const openPlans = state.plans.items.filter(
    (plan) => plan.status !== "approved",
  ).length;
  const dashboardMenus = modules.filter((module) => module.slug !== "dashboard" && module.slug !== "notifications" && module.slug !== "chat");
  const splitIndex = Math.ceil(dashboardMenus.length / 2);
  const leftMenus = dashboardMenus.slice(0, splitIndex);
  const rightMenus = dashboardMenus.slice(splitIndex);

  return (
    <div className="dashboard-view">
      <header className="page-heading dashboard-heading">
        <h1 aria-label="C.O.M.M.A.N.D C.E.N.T.E.R">
          <span className="dashboard-heading__word" aria-hidden="true">{"C.O.M.M.A.N.D".split("").map((character, index) => <span key={`${character}-${index}`}>{character}</span>)}</span>
          <span className="brand-mark dashboard-heading__mark"><span /></span>
          <span className="dashboard-heading__word" aria-hidden="true">{"C.E.N.T.E.R".split("").map((character, index) => <span key={`${character}-${index}`}>{character}</span>)}</span>
        </h1>
      </header>
      <section
        className="hero-console"
        aria-label="Hermes voice command center"
      >
        <nav className="hero-menu hero-menu--left" aria-label="Module actions left">
          {leftMenus.map((module) => (
            <button key={module.slug} type="button" className="hero-menu__button" onClick={() => openModuleDialog(module.slug)}>
              <span className="hero-menu__icon"><Icon name={module.icon} size={14} /></span>
              <span>{module.label}</span>
            </button>
          ))}
        </nav>
        <VoiceCore projectId={projectId} onChatClick={() => openModuleDialog("chat")} />
        <nav className="hero-menu hero-menu--right" aria-label="Module actions right">
          {rightMenus.map((module) => (
            <button key={module.slug} type="button" className="hero-menu__button" onClick={() => openModuleDialog(module.slug)}>
              <span className="hero-menu__icon"><Icon name={module.icon} size={14} /></span>
              <span>{module.label}</span>
            </button>
          ))}
        </nav>
      </section>
      <section className="telemetry-row" aria-label="Project telemetry">
        <div className="telemetry">
          <small>ORCHESTRATOR</small>
          <strong>HERMES</strong>
          <span>Ready for command</span>
        </div>
        <div className="telemetry">
          <small>AGENT MESH</small>
          <strong>{workingAgents} / {state.agents.length}</strong>
          <span>Nodes working</span>
        </div>
        <div className="telemetry">
          <small>TOKENS</small>
          <strong>{state.tokens.totalMillions.toFixed(2)}M</strong>
          <span>Project usage</span>
        </div>
        <div className="telemetry">
          <small>OPEN WORK</small>
          <strong>{activeJobs + openPlans}</strong>
          <span>Jobs and plans</span>
        </div>
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
          title="Provider Health"
          icon="api"
          eyebrow="Connection matrix"
        >
          {allProvidersUnavailable(state.apiStatus) ? (
            <ApiNotConnectedState
              provider="AI providers"
              status={providerDisconnectedStatus(state.apiStatus)}
              configureHref="/settings"
            />
          ) : (
            <div className="compact-list">
              {state.apiStatus.map((provider) => (
                <div key={provider.id}>
                  <StatusBadge status={provider.status} />
                  <span>
                    <strong>{provider.name}</strong>
                    <small>{providerDetail(provider)}</small>
                  </span>
                </div>
              ))}
            </div>
          )}
        </ModuleCard>
      </section>
    </div>
  );
}

function MailModule({ store, runUndoable }: { store: Store; runUndoable: UndoHandler }) {
  const [recipient, setRecipient] = useState("");
  const [subject, setSubject] = useState("");
  const [requestError, setRequestError] = useState<ApiError | null>(null);
  const smtp = store.state.apiStatus.find((provider) => provider.name.toLowerCase() === "smtp");
  const smtpUnavailable = smtp && ["disconnected", "error", "unconfigured", "unreachable"].includes(smtp.status);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!recipient.trim() || !subject.trim() || smtpUnavailable) return;
    const to = recipient.trim();
    const mailSubject = subject.trim();
    let delivered = false;
    try {
      await apiRequest("/api/providers?projectId=" + store.projectId, { method: "POST", body: JSON.stringify({ action: "mail", to, subject: mailSubject }) });
      delivered = true;
      setRequestError(null);
    } catch (error) {
      delivered = false;
      setRequestError(normalizeApiError(error, "/api/providers"));
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
    if (delivered) {
      setRecipient("");
      setSubject("");
    }
  };
  return (
    <ModuleGrid>
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
        {requestError ? <ApiNotConnectedState provider="SMTP" status="error" message={requestError.message} /> : null}
        {!requestError && smtpUnavailable ? <ApiNotConnectedState provider="SMTP" status={smtp.status === "unconfigured" ? "unconfigured" : smtp.status === "unreachable" ? "unreachable" : "error"} configureHref="/settings" /> : null}
        <form className="module-form" onSubmit={submit}>
          <label>
            Recipient
            <input
              type="email"
              value={recipient}
              onChange={(event) => setRecipient(event.target.value)}
              placeholder="team@example.com"
              disabled={Boolean(smtpUnavailable)}
            />
          </label>
          <label>
            Subject
            <input
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              placeholder="Project update"
              disabled={Boolean(smtpUnavailable)}
            />
          </label>
          <button className="primary-action" data-permission="write" disabled={Boolean(smtpUnavailable)}>
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
  const hasInputUrl = url.trim().length > 0;
  const hasPreviewUrl = store.state.preview.url.trim().length > 0;
  const canRenderFrame = (store.state.preview.state === "loading" || store.state.preview.state === "populated") && hasPreviewUrl;
  const loadDisabled = !hasInputUrl;
  const trustedPreview = useSyncExternalStore(subscribeToOrigin, () => {
    try {
      return new URL(store.state.preview.url, window.location.href).origin === window.location.origin;
    } catch {
      return false;
    }
  }, () => false);
  const load = () => {
    const nextUrl = url.trim();
    if (!nextUrl) return;
    try {
      new URL(nextUrl);
    } catch {
      store.update((current) => ({
        ...current,
        preview: { ...current.preview, state: "error" },
      }));
      return;
    }
    store.update((current) => ({
      ...current,
      preview: { ...current.preview, state: "loading", url: nextUrl },
    }));
  };
  return (
    <ModuleGrid>
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
          {(store.state.preview.state === "empty" || !hasPreviewUrl) ? (
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
          {canRenderFrame ? (
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
              placeholder="https://example.com"
            />
          </label>
          <button className="primary-action" onClick={load} disabled={loadDisabled}>
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
  return (
    <ModuleGrid>
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

function TokensModule({ store }: { store: Store }) {
  const state = store.state;
  const hostedProviders = state.apiStatus.filter((provider) => ["openai", "openrouter", "groq", "xai"].includes(provider.name.toLowerCase()));
  const noHostedProvider = hostedProviders.length > 0 && hostedProviders.every((provider) => ["disconnected", "error", "unconfigured", "unreachable"].includes(provider.status));
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
        {noHostedProvider && state.tokens.totalMillions === 0 ? <ApiNotConnectedState provider="Model providers" status={hostedProviders.every((provider) => provider.status === "unconfigured") ? "unconfigured" : "error"} configureHref="/settings" /> : <div className="token-visual">
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
        </div>}
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
  const [requestError, setRequestError] = useState<ApiError | null>(null);
  const check = async () => {
    try {
      const health = await apiRequest<Array<{ provider: string; status: ProviderStatus; latencyMs: number | null }>>(`/api/status?projectId=${store.projectId}`);
      store.update((current) => ({ ...current, apiStatus: health.map((provider) => ({ id: `provider-${provider.provider}`, name: provider.provider, latency: provider.latencyMs ?? 0, status: provider.status })) }));
      setRequestError(null);
    } catch (error) {
      setRequestError(normalizeApiError(error, "/api/status"));
    }
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
            store.state.apiStatus.filter((api) => ["disconnected", "error", "unconfigured", "unreachable"].includes(api.status))
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
        {requestError ? (
          <ApiNotConnectedState provider="Provider health API" status="error" message={requestError.message} onRetry={() => void check()} />
        ) : (
          <DataList empty={<EmptyState module="api-status" onAction={check} />}>
            {store.state.apiStatus.map((provider) => (
              <DataRow
                key={provider.id}
                title={provider.name}
                detail={provider.latency ? `${provider.latency} ms round trip` : "No response"}
                status={provider.status === "connected" ? "success" : provider.status === "degraded" ? "warning" : "error"}
                statusText={provider.status}
              />
            ))}
          </DataList>
        )}
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
  const githubProvider = store.state.apiStatus.find((provider) => provider.name.toLowerCase() === "github");
  const githubUnavailable = githubProvider && ["disconnected", "error", "unconfigured", "unreachable"].includes(githubProvider.status);
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
        ) : githubUnavailable ? (
          <ApiNotConnectedState provider="GitHub" status={githubProvider.status === "unconfigured" ? "unconfigured" : githubProvider.status === "unreachable" ? "unreachable" : "error"} configureHref="/settings" />
        ) : (
          <EmptyState module="github" actionHref="/settings" />
        )}
      </ModuleCard>
    </ModuleGrid>
  );
}

function ChatModule({ store }: { store: Store }) {
  const [message, setMessage] = useState("");
  const [requestError, setRequestError] = useState<ApiError | null>(null);
  const [recentsOpen, setRecentsOpen] = useState(true);
  const [sending, setSending] = useState(false);
  const hermes = store.state.apiStatus.find((provider) => provider.name.toLowerCase() === "hermes");
  const tts = store.state.apiStatus.find((provider) => provider.name.toLowerCase() === "tts");
  const unavailableStatuses = ["disconnected", "error", "unconfigured", "unreachable"];
  const hermesUnavailable = hermes && unavailableStatuses.includes(hermes.status);
  const ttsUnavailable = tts && unavailableStatuses.includes(tts.status);
  const recentChats = store.state.chat.filter((item) => item.who === "me").slice(-12).reverse();
  useEffect(() => {
    const receiveTranscript = (event: Event) => {
      const detail = (event as CustomEvent<{ projectId: string; target: string; text: string }>)
        .detail;
      if (detail.projectId === store.projectId && detail.target === "chat") setMessage(detail.text);
    };
    window.addEventListener(VOICE_TRANSCRIPT_EVENT, receiveTranscript);
    return () =>
      window.removeEventListener(VOICE_TRANSCRIPT_EVENT, receiveTranscript);
  }, [store.projectId]);
  const send = async (event: FormEvent) => {
    event.preventDefault();
    if (!message.trim() || hermesUnavailable || sending) return;
    const text = message.trim();
    setMessage("");
    setSending(true);
    try {
      const result = await apiRequest<{ messages: OriginalModuleState["chat"] }>("/api/project-assistant", { method: "POST", body: JSON.stringify({ projectId: store.projectId, provider: "hermes", message: text }) });
      store.updateCache((current) => ({
        ...current,
        chat: [...current.chat, ...result.messages],
      }));
      setRequestError(null);
    } catch (error) {
      setMessage(text);
      setRequestError(normalizeApiError(error, "/api/project-assistant"));
    } finally {
      setSending(false);
    }
  };
  return (
    <ModuleGrid>
      <ModuleCard
        title="Hermes Thread"
        icon="chat"
        eyebrow="Project conversation"
        live
        className="module-layout__full"
      >
        {requestError ? <ApiNotConnectedState provider="Hermes" status="error" message={requestError.message} /> : null}
        {!requestError && hermesUnavailable ? (
          <ApiNotConnectedState
            provider="Hermes"
            status={hermes.status === "unconfigured" ? "unconfigured" : hermes.status === "unreachable" ? "unreachable" : "error"}
            configureHref="/settings"
          />
        ) : null}
        <div className={`chat-workspace ${recentsOpen ? "" : "chat-workspace--recents-collapsed"}`}>
          <aside className="chat-recents" aria-label="Recent chats">
            <header className="chat-recents__header">
              {recentsOpen ? <strong>Recent chats</strong> : null}
              <button
                className="icon-button chat-recents__toggle"
                type="button"
                onClick={() => setRecentsOpen((open) => !open)}
                aria-label={recentsOpen ? "Collapse recent chats" : "Expand recent chats"}
                aria-expanded={recentsOpen}
              >
                <Icon name="chevron" size={16} />
              </button>
            </header>
            {recentsOpen ? recentChats.length ? (
              <nav className="chat-recents__list" aria-label="Recent messages">
                {recentChats.map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => document.getElementById(`chat-message-${item.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" })}
                  >
                    <span>{item.text}</span>
                    <time>{item.time}</time>
                  </button>
                ))}
              </nav>
            ) : <p className="chat-recents__empty">No recent chats yet.</p> : null}
          </aside>
          <div className="chat-conversation">
            <div className="chat-thread">
              {store.state.chat.length ? store.state.chat.map((item) => (
                <div
                  id={`chat-message-${item.id}`}
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
                      onClick={() => speakText(item.text, store.projectId)}
                      aria-label={`Read response aloud: ${item.text}`}
                      disabled={Boolean(ttsUnavailable)}
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
                disabled={Boolean(hermesUnavailable) || sending}
              />
              <button
                className="icon-button"
                type="button"
                onClick={() => startVoiceCapture("chat", store.projectId)}
                aria-label="Dictate message"
                disabled={Boolean(hermesUnavailable) || sending}
              >
                <Icon name="microphone" size={17} />
              </button>
              <button className="icon-button" aria-label="Send message" disabled={Boolean(hermesUnavailable) || sending}>
                <Icon name="send" size={17} />
              </button>
            </form>
          </div>
        </div>
      </ModuleCard>
    </ModuleGrid>
  );
}

function VaultModule({ store }: { store: Store }) {
  const [vaultNotes, setVaultNotes] = useState<VaultNote[]>([]);
  const [selected, setSelected] = useState<VaultNote | null>(null);
  useEffect(() => {
    void apiRequest<VaultNote[]>(`/api/vault?projectId=${encodeURIComponent(store.projectId)}`).then((notes) => {
      setVaultNotes(notes);
      setSelected(notes[0] ?? null);
    });
  }, [store.projectId]);
  const copyPath = () => selected && navigator.clipboard?.writeText(selected.path);
  return (
    <ModuleGrid>
      <ModuleCard
        title="Vault Index"
        icon="vault"
        eyebrow="Real workspace paths"
        className="module-layout__primary"
      >
        <div className="vault-list">
          {vaultNotes.map((note) => (
            <button
              key={note.path}
              className={selected?.path === note.path ? "is-active" : ""}
              onClick={() => setSelected(note)}
            >
              <Icon name="vault" size={17} />
              <span>
                <strong>{note.path.split("/").at(-1)}</strong>
                <small>{note.path}</small>
              </span>
            </button>
          ))}
          {!vaultNotes.length ? <EmptyState module="vault" /> : null}
        </div>
      </ModuleCard>
      <ModuleCard title={selected?.path.split("/").at(-1) ?? "Note preview"} icon="folder" eyebrow="Memory preview">
        {selected ? <div className="vault-preview">
          <code>{selected.path}</code>
          <p>{selected.content}</p>
          <button className="secondary-action" onClick={copyPath}>
            <Icon name="copy" size={15} />
            Copy workspace path
          </button>
        </div> : <EmptyState module="vault" />}
      </ModuleCard>
    </ModuleGrid>
  );
}

function ModuleGrid({
  stats = [],
  children,
}: {
  stats?: Array<[string, string]>;
  children: React.ReactNode;
}) {
  return (
    <>
      {stats.length ? <div className="module-stat-strip">
        {stats.map(([label, value]) => (
          <Metric key={label} label={label} value={value} />
        ))}
      </div> : null}
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
    | "unreachable"
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
        : status === "disconnected" || status === "unreachable"
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
