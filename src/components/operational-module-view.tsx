"use client";

import Link from "next/link";
import { FormEvent, useDeferredValue, useState } from "react";

import { EmptyState } from "@/components/empty-state";
import { Icon } from "@/components/icon";
import { ModuleCard } from "@/components/module-card";
import { useRealtimeStatus } from "@/components/realtime-provider";
import { useReliability } from "@/components/reliability-provider";
import { modules, type ModuleDefinition } from "@/lib/modules";
import { useOperationalModuleStore } from "@/state/mocks/operational-modules";
import { useOriginalModuleStore } from "@/state/mocks/original-modules";

type OperationalStore = ReturnType<typeof useOperationalModuleStore>;

const searchableKnowledge = [
  { title: "Memory Bank Index", detail: "Project decisions and active phase trackers", href: "/vault", kind: "Knowledge" },
  { title: "Hermes local contract", detail: "WebSocket endpoint and event envelope", href: "/api-status", kind: "Knowledge" },
  { title: "Phase 2 module plan", detail: "Current backend integration sequence", href: "/plans", kind: "Knowledge" },
] as const;

const environments = [
  { name: "Local", endpoint: "127.0.0.1:3000", detail: "SQLite data and local realtime service", status: "healthy" },
  { name: "Staging", endpoint: "staging.agent-os.internal", detail: "Shared validation environment", status: "ready" },
  { name: "Production", endpoint: "agent-os.internal", detail: "Protected release environment", status: "locked" },
] as const;

export function OperationalModuleView({ module }: { module: ModuleDefinition }) {
  const operations = useOperationalModuleStore();

  return (
    <div className="module-view">
      <ModuleHeading module={module} live={module.slug === "notifications" || module.slug === "status"} />
      {module.slug === "notifications" ? <NotificationsModule store={operations} /> : null}
      {module.slug === "search" ? <SearchModule /> : null}
      {module.slug === "settings" ? <SettingsModule store={operations} /> : null}
      {module.slug === "status" ? <StatusModule /> : null}
      {module.slug === "billing" ? <BillingModule operations={operations} /> : null}
      {module.slug === "digests" ? <DigestsModule store={operations} /> : null}
      {module.slug === "environments" ? <EnvironmentsModule store={operations} /> : null}
    </div>
  );
}

function ModuleHeading({ module, live }: { module: ModuleDefinition; live: boolean }) {
  const realtime = useRealtimeStatus();
  const transportLabel = realtime.mode === "websocket" ? "WebSocket live" : realtime.mode === "polling" ? "Polling live" : "Live offline";
  return (
    <header className="page-heading">
      <span className="page-heading__icon"><Icon name={module.icon} size={24} /></span>
      <span><small>PROJECT OPERATIONS</small><h1>{module.label}</h1><p>{module.description}</p></span>
      <span className={live ? "live-tag" : "shell-status"}><span className="live-dot" />{live ? transportLabel : "Project scoped"}</span>
    </header>
  );
}

function NotificationsModule({ store }: { store: OperationalStore }) {
  const realtime = useRealtimeStatus();
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const unread = store.state.notifications.filter((notice) => !notice.read).length;
  const visible = filter === "unread" ? store.state.notifications.filter((notice) => !notice.read) : store.state.notifications;
  const markAllRead = () => store.update((state) => ({ ...state, notifications: state.notifications.map((notice) => ({ ...notice, read: true })) }));

  return <OperationalGrid stats={[["Unread", String(unread)], ["Total", String(store.state.notifications.length)], ["Transport", realtime.mode === "websocket" ? "WebSocket" : realtime.mode === "polling" ? "Polling" : "Offline"]]}>
    <ModuleCard title="Notification Inbox" icon="notifications" eyebrow="Project events" live className="module-layout__primary">
      <div className="module-tabs"><button className={filter === "all" ? "is-active" : ""} onClick={() => setFilter("all")}>All</button><button className={filter === "unread" ? "is-active" : ""} onClick={() => setFilter("unread")}>Unread {unread}</button></div>
      <div className="notification-list">
        {visible.map((notice) => <button key={notice.id} className={notice.read ? "" : "is-unread"} onClick={() => store.update((state) => ({ ...state, notifications: state.notifications.map((item) => item.id === notice.id ? { ...item, read: true } : item) }))}><span className={`notice-mark notice-mark--${notice.severity}`} /><span><strong>{notice.title}</strong><small>{notice.detail}</small></span><time>{notice.time}</time></button>)}
        {!visible.length ? store.state.notifications.length ? <EmptyState module="notifications" kind="filtered-empty" title="No unread notifications" description="All project notifications have been reviewed." actionLabel="Show all notifications" onAction={() => setFilter("all")} /> : <EmptyState module="notifications" actionHref="/status" /> : null}
      </div>
    </ModuleCard>
    <ModuleCard title="Inbox Controls" icon="check" eyebrow="Local actions"><p className="module-copy">Mark the current project&apos;s event stream as reviewed.</p><button className="primary-action" onClick={markAllRead} disabled={!unread}>Mark all read <Icon name="check" size={16} /></button></ModuleCard>
  </OperationalGrid>;
}

function SearchModule() {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());
  const moduleResults = modules.filter((module) => `${module.label} ${module.description}`.toLowerCase().includes(deferredQuery)).map((module) => ({ title: module.label, detail: module.description, href: `/${module.slug}`, kind: "Module" }));
  const knowledgeResults = searchableKnowledge.filter((item) => `${item.title} ${item.detail}`.toLowerCase().includes(deferredQuery));
  const results = deferredQuery ? [...moduleResults, ...knowledgeResults] : moduleResults.slice(0, 8);

  return <OperationalGrid stats={[["Modules", String(modules.length)], ["Knowledge", String(searchableKnowledge.length)], ["Scope", "Active project"]]}>
    <ModuleCard title="Search Index" icon="search" eyebrow="Modules and project knowledge" className="module-layout__full">
      <label className="search-surface"><Icon name="search" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search modules, routes, and indexed knowledge..." autoFocus /></label>
      <div className="search-result-list">{results.map((result) => <Link href={result.href} key={`${result.kind}-${result.title}`}><span className="module-card__icon"><Icon name={result.kind === "Module" ? "dashboard" : "vault"} /></span><span><strong>{result.title}</strong><small>{result.detail}</small></span><em>{result.kind}</em><Icon name="arrow" size={15} /></Link>)}{!results.length ? <EmptyState module="search" kind="filtered-empty" title="No project matches" description="Try a module name, route, or indexed topic." actionLabel="Clear search" onAction={() => setQuery("")} /> : null}</div>
    </ModuleCard>
  </OperationalGrid>;
}

function SettingsModule({ store }: { store: OperationalStore }) {
  const { online, simulateOffline } = useReliability();
  const toggle = (key: keyof typeof store.state.preferences) => store.update((state) => ({ ...state, preferences: { ...state.preferences, [key]: !state.preferences[key] } }));
  const preferences = store.state.preferences;
  return <OperationalGrid stats={[["Saved", "Locally"], ["Scope", store.projectId], ["Role", "Admin"]]}>
    <ModuleCard title="Notifications & Updates" icon="settings" eyebrow="Project preferences" className="module-layout__primary">
      <div className="preference-list"><Preference label="Desktop notifications" detail="Surface project events while Agent OS is open." checked={preferences.desktopNotifications} onChange={() => toggle("desktopNotifications")} /><Preference label="Live module updates" detail="Apply realtime events to active module surfaces." checked={preferences.liveUpdates} onChange={() => toggle("liveUpdates")} /><Preference label="Digest email" detail="Queue scheduled summaries for local mail delivery." checked={preferences.digestEmail} onChange={() => toggle("digestEmail")} /></div>
    </ModuleCard>
    <ModuleCard title="Interface" icon="dashboard" eyebrow="Display density"><Preference label="Compact module rows" detail="Reduce list spacing on repeated operational data." checked={preferences.compactDensity} onChange={() => toggle("compactDensity")} /><div className="reliability-control"><span><strong>Connectivity test</strong><small>Exercise app-wide and module offline recovery without stopping the dev server.</small></span><button className="secondary-action" type="button" onClick={() => simulateOffline("settings-test")} disabled={!online}>Simulate offline</button></div></ModuleCard>
  </OperationalGrid>;
}

function Preference({ label, detail, checked, onChange }: { label: string; detail: string; checked: boolean; onChange: () => void }) {
  return <label className="toggle-row"><span><strong>{label}</strong><small>{detail}</small></span><input type="checkbox" checked={checked} onChange={onChange} /></label>;
}

function StatusModule() {
  const original = useOriginalModuleStore();
  const connected = original.state.apiStatus.filter((provider) => provider.status === "connected").length;
  const activeJobs = original.state.cron.jobs.filter((job) => job.status === "active").length;
  const services = [
    { name: "Agent runtime", detail: `${original.state.liveProgress.length} work streams`, status: "Operational" },
    { name: "Provider mesh", detail: `${connected}/${original.state.apiStatus.length} connected`, status: connected >= 2 ? "Operational" : "Degraded" },
    { name: "Scheduler", detail: `${activeJobs} active jobs`, status: original.state.cron.jobs.some((job) => job.status === "failed") ? "Degraded" : "Operational" },
    { name: "Project storage", detail: "Local snapshot available", status: "Operational" },
  ];
  const degraded = services.filter((service) => service.status === "Degraded").length;
  return <OperationalGrid stats={[["Operational", String(services.length - degraded)], ["Degraded", String(degraded)], ["Uptime", "99.98%"]]}>
    <ModuleCard title="Service Health" icon="status" eyebrow="Cross-module status" live className="module-layout__primary"><div className="service-grid">{services.map((service) => <div key={service.name}><StatusBadge status={service.status === "Operational" ? "success" : "warning"} text={service.status} /><span><strong>{service.name}</strong><small>{service.detail}</small></span></div>)}</div></ModuleCard>
    <ModuleCard title="Provider Latency" icon="api" eyebrow="Latest local checks">{original.state.apiStatus.length ? <div className="compact-list">{original.state.apiStatus.map((provider) => <div key={provider.id}><StatusBadge status={provider.status === "connected" ? "success" : provider.status === "degraded" ? "warning" : "error"} text={provider.status} /><span><strong>{provider.name}</strong><small>{provider.latency ? `${provider.latency} ms` : "No response"}</small></span></div>)}</div> : <EmptyState module="status" actionHref="/api-status" />}</ModuleCard>
  </OperationalGrid>;
}

function BillingModule({ operations }: { operations: OperationalStore }) {
  const original = useOriginalModuleStore();
  const [cap, setCap] = useState(String(operations.state.billing.monthlyCap));
  const usage = original.state.tokens.cost;
  const percent = operations.state.billing.monthlyCap > 0 ? Math.min(100, Math.round((usage / operations.state.billing.monthlyCap) * 100)) : 0;
  const save = (event: FormEvent) => { event.preventDefault(); const value = Number(cap); if (value >= 100) operations.update((state) => ({ ...state, billing: { ...state.billing, monthlyCap: value } })); };
  return <OperationalGrid stats={[["Usage", `₹${usage.toLocaleString("en-IN")}`], ["Monthly cap", `₹${operations.state.billing.monthlyCap.toLocaleString("en-IN")}`], ["Consumed", `${percent}%`]]}>
    <ModuleCard title="Usage Cap" icon="billing" eyebrow="Project budget" className="module-layout__primary">{usage ? <div className="budget-meter"><header><span><small>Current estimate</small><strong>₹{usage.toLocaleString("en-IN")}</strong></span><b>{percent}%</b></header><span className="progress"><i style={{ width: `${percent}%` }} /></span><p>Alert at {operations.state.billing.alertThreshold}% of the configured monthly cap.</p></div> : <EmptyState module="billing" actionHref="/chat" />}</ModuleCard>
    <ModuleCard title="Edit Cap" icon="settings" eyebrow="Admin control"><form className="module-form" onSubmit={save}><label>Monthly cap (₹)<input type="number" min="100" step="100" value={cap} onChange={(event) => setCap(event.target.value)} /></label><button className="primary-action" data-permission="admin">Save cap <Icon name="check" size={16} /></button></form></ModuleCard>
  </OperationalGrid>;
}

function DigestsModule({ store }: { store: OperationalStore }) {
  const digest = store.state.digests;
  const toggleModule = (name: string) => store.update((state) => ({ ...state, digests: { ...state.digests, modules: state.digests.modules.includes(name) ? state.digests.modules.filter((item) => item !== name) : [...state.digests.modules, name] } }));
  const generate = () => store.update((state) => ({ ...state, digests: { ...state.digests, history: [{ id: crypto.randomUUID(), title: `${state.digests.cadence === "daily" ? "Daily" : "Weekly"} project digest`, createdAt: "Just now", status: "ready" }, ...state.digests.history] } }));
  return <OperationalGrid stats={[["Cadence", digest.cadence], ["Included", String(digest.modules.length)], ["Next run", digest.deliveryTime]]}>
    <ModuleCard title="Digest History" icon="digests" eyebrow="Composed summaries" className="module-layout__primary">{digest.history.length ? <div className="data-list">{digest.history.map((item) => <div className="data-row" key={item.id}><span><strong>{item.title}</strong><small>{item.createdAt}</small></span><StatusBadge status={item.status === "ready" ? "success" : "neutral"} text={item.status} /></div>)}</div> : <EmptyState module="digests" onAction={generate} />}</ModuleCard>
    <ModuleCard title="Schedule" icon="clock" eyebrow="Shared composition"><div className="module-form"><label>Cadence<select value={digest.cadence} onChange={(event) => store.update((state) => ({ ...state, digests: { ...state.digests, cadence: event.target.value as "daily" | "weekly" } }))}><option value="daily">Daily</option><option value="weekly">Weekly</option></select></label><label>Delivery time<input type="time" value={digest.deliveryTime} onChange={(event) => store.update((state) => ({ ...state, digests: { ...state.digests, deliveryTime: event.target.value } }))} /></label><div className="module-choice-grid">{["Agents", "Tokens", "GitHub", "Cron"].map((name) => <label key={name}><input type="checkbox" checked={digest.modules.includes(name)} onChange={() => toggleModule(name)} />{name}</label>)}</div><button className="primary-action" onClick={generate}>Generate now <Icon name="reports" size={16} /></button></div></ModuleCard>
  </OperationalGrid>;
}

function EnvironmentsModule({ store }: { store: OperationalStore }) {
  return <OperationalGrid stats={[["Active", store.state.environment], ["Available", String(environments.length)], ["Scope", store.projectId]]}>
    <ModuleCard title="Environment Matrix" icon="environments" eyebrow="Project targets" className="module-layout__full"><div className="environment-grid">{environments.map((environment) => { const active = store.state.environment === environment.name; return <article key={environment.name} className={active ? "is-active" : ""}><header><span><strong>{environment.name}</strong><small>{environment.endpoint}</small></span><StatusBadge status={environment.status === "healthy" ? "success" : environment.status === "ready" ? "neutral" : "warning"} text={active ? "active" : environment.status} /></header><p>{environment.detail}</p><button className={active ? "secondary-action" : "primary-action"} disabled={active || environment.status === "locked"} onClick={() => store.update((state) => ({ ...state, environment: environment.name }))}>{active ? "Current environment" : environment.status === "locked" ? "Requires release" : `Activate ${environment.name}`}</button></article>; })}</div></ModuleCard>
  </OperationalGrid>;
}

function OperationalGrid({ stats, children }: { stats: Array<[string, string]>; children: React.ReactNode }) {
  return <><div className="module-stat-strip">{stats.map(([label, value]) => <span key={label}><strong>{value}</strong><small>{label}</small></span>)}</div><section className="module-layout original-module-layout">{children}</section></>;
}

function StatusBadge({ status, text }: { status: "success" | "warning" | "error" | "neutral"; text: string }) {
  return <span className={`status-badge status-badge--${status}`}><i />{text}</span>;
}