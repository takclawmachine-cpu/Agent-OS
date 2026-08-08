"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";

import { useAuthenticatedSession } from "@/components/auth-gate";
import { Icon } from "@/components/icon";
import { NeuralField } from "@/components/neural-field";
import { useProjectPanels } from "@/components/project-panel-provider";
import { useRealtimeStatus } from "@/components/realtime-provider";
import { useReliability } from "@/components/reliability-provider";
import { apiRequest, normalizeApiError, type ApiError } from "@/lib/api-client";
import { notifyAuthChanged } from "@/lib/auth";
import { moduleGroups, modules } from "@/lib/modules";
import { startVoiceCapture, useVoiceState } from "@/lib/voice";
import { useOperationalModuleStore } from "@/state/mocks/operational-modules";
import { useOriginalModuleStore } from "@/state/mocks/original-modules";

type Project = { id: string; name: string; environment: string };

const projectEvent = "agent-os-project-change";
const themeEvent = "agent-os-theme-change";

function subscribe(eventName: string, callback: () => void) {
  window.addEventListener(eventName, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(eventName, callback);
    window.removeEventListener("storage", callback);
  };
}

function readStorage(key: string, fallback: string) {
  return window.localStorage.getItem(key) ?? fallback;
}

function parseRecentProjects(value: string, fallback: string[]) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) && parsed.every((id) => typeof id === "string")
      ? parsed
      : fallback;
  } catch {
    return fallback;
  }
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const session = useAuthenticatedSession();
  const operations = useOperationalModuleStore();
  const original = useOriginalModuleStore();
  const realtime = useRealtimeStatus();
  const { online } = useReliability();
  const { openProjectPanel } = useProjectPanels();
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsError, setProjectsError] = useState<ApiError | null>(null);
  const [projectOpen, setProjectOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [navigationOpen, setNavigationOpen] = useState(false);
  const [query, setQuery] = useState("");

  const activeProjectId = useSyncExternalStore(
    (callback) => subscribe(projectEvent, callback),
    () => readStorage("agent-os-project", ""),
    () => "",
  );
  const voiceState = useVoiceState(activeProjectId);
  const recentProjectIds = useSyncExternalStore(
    (callback) => subscribe(projectEvent, callback),
    () => readStorage("agent-os-project-history", "[]"),
    () => "[]",
  );
  const theme = useSyncExternalStore(
    (callback) => subscribe(themeEvent, callback),
    () => readStorage("agent-os-theme", "dark"),
    () => "dark",
  );
  const activeProject = projects.find((project) => project.id === activeProjectId) ?? projects[0];
  const activeProjectName = activeProject?.name ?? "No workspace";
  const unreadNotifications = operations.state.notifications.filter((notification) => !notification.read).length;
  const recentProjects = parseRecentProjects(recentProjectIds, projects.map((project) => project.id));
  const projectOrder = [...recentProjects, ...projects.map((project) => project.id).filter((id) => !recentProjects.includes(id))];
  const orderedProjects = projectOrder.map((id) => projects.find((project) => project.id === id)).filter(Boolean) as Project[];
  const activeSlug = pathname.split("/")[1] || "dashboard";
  const searchResults = modules.filter((module) => `${module.label} ${module.description}`.toLowerCase().includes(query.toLowerCase()));
  const apiUnavailable = projectsError !== null || operations.hydrationState.status === "error" || original.hydrationState.status === "error";
  const providerUnavailable = original.state.apiStatus.some((provider) => ["disconnected", "error", "unreachable"].includes(provider.status));
  const shellHealth = !online
    ? { label: "Browser offline", unavailable: true }
    : apiUnavailable
      ? { label: "Agent OS API unavailable", unavailable: true }
      : !realtime.connected
        ? { label: "Realtime offline", unavailable: true }
        : providerUnavailable
          ? { label: "Provider degraded", unavailable: true }
          : { label: "System nominal", unavailable: false };

  useEffect(() => {
    document.body.classList.toggle("theme-light", theme === "light");
  }, [theme]);

  useEffect(() => {
    document.body.classList.toggle("compact-density", operations.state.preferences.compactDensity);
  }, [operations.state.preferences.compactDensity]);

  useEffect(() => {
    document.body.dataset.voiceState = voiceState;
  }, [voiceState]);

  useEffect(() => {
    void apiRequest<Project[]>("/api/projects")
      .then((result) => {
        setProjects(result);
        setProjectsError(null);
        const selected = window.localStorage.getItem("agent-os-project");
        if (result.length && !result.some((project) => project.id === selected)) {
          window.localStorage.setItem("agent-os-project", result[0].id);
          window.localStorage.setItem("agent-os-project-history", JSON.stringify([result[0].id]));
          window.dispatchEvent(new Event(projectEvent));
        }
      })
      .catch((error: unknown) => setProjectsError(normalizeApiError(error, "/api/projects")));
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen((open) => !open);
      }
      if (event.key === "Escape") {
        setCommandOpen(false);
        setProjectOpen(false);
        setNavigationOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const selectProject = (projectId: string) => {
    const history = [projectId, ...recentProjects.filter((id) => id !== projectId)];
    window.localStorage.setItem("agent-os-project", projectId);
    window.localStorage.setItem("agent-os-project-history", JSON.stringify(history));
    window.dispatchEvent(new Event(projectEvent));
    setProjectOpen(false);
  };

  const toggleTheme = () => {
    window.localStorage.setItem("agent-os-theme", theme === "light" ? "dark" : "light");
    window.dispatchEvent(new Event(themeEvent));
  };

  const signOut = () => {
    void fetch("/api/auth/session", { method: "DELETE" }).finally(() => {
      notifyAuthChanged();
      router.replace("/login");
    });
  };

  if (pathname === "/login" || pathname === "/onboarding") {
    return <div className="auth-shell"><NeuralField />{children}</div>;
  }

  return (
    <div className="app-shell">
      <NeuralField />
      <header className="topbar">
        <div className="topbar__brand">
          <button className="icon-button navigation-toggle" type="button" onClick={() => setNavigationOpen((open) => !open)} aria-label="Toggle navigation" aria-expanded={navigationOpen}>
            <Icon name={navigationOpen ? "close" : "menu"} />
          </button>
          <span className="brand-mark"><span /></span>
          <span><strong>AGENT OS</strong><small>LOCAL COMMAND</small></span>
        </div>

        {projects.length && activeProject ? (
          <div className="project-switcher">
            <button type="button" className="project-trigger" onClick={() => setProjectOpen((open) => !open)} aria-expanded={projectOpen}>
              <Icon name="folder" size={16} />
              <span><small>Active project</small><strong>{activeProjectName}</strong></span>
              <Icon name="chevron" size={14} />
            </button>
            {projectOpen ? (
              <div className="project-menu">
                <span className="menu-label">Recent projects</span>
                {projectsError ? <span className="menu-label" role="alert">Projects API unavailable</span> : null}
                {orderedProjects.map((project) => (
                  <div className={`project-menu__row ${project.id === activeProject.id ? "is-active" : ""}`} key={project.id}>
                    <button type="button" onClick={() => selectProject(project.id)} title={`Open ${project.name} workspace`}><Icon name="folder" size={16} /><span><strong>{project.name}</strong><small>{project.environment}</small></span></button>
                    <button className="icon-button" type="button" onClick={() => { openProjectPanel(project); setProjectOpen(false); }} aria-label={`Open ${project.name} assistant`} title="Open project assistant"><Icon name="chat" size={15} /></button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        <button className="command-trigger" type="button" onClick={() => setCommandOpen(true)}>
          <Icon name="search" size={17} />
          <span>Search modules and commands</span>
          <kbd>Ctrl K</kbd>
        </button>

        <div className="topbar__actions">
          <span className={`connection-pill ${shellHealth.unavailable ? "is-offline" : ""}`.trim()}><span className="live-dot" />{shellHealth.label}</span>
          <button className="icon-button" type="button" onClick={() => startVoiceCapture("global", activeProjectId)} aria-label={`Voice input: ${online ? voiceState : "offline"}`} disabled={!online || !activeProjectId || voiceState !== "idle"}>
            <Icon name="microphone" />
          </button>
          <button className="icon-button" type="button" onClick={toggleTheme} aria-label={`Switch to ${theme === "light" ? "dark" : "light"} theme`}>
            <Icon name={theme === "light" ? "moon" : "sun"} />
          </button>
          <Link className="icon-button notification-button" href="/notifications" aria-label={`${unreadNotifications} unread notifications`}>
            <Icon name="notifications" />
            {unreadNotifications ? <span className="badge-dot">{unreadNotifications}</span> : null}
          </Link>
          <button className="profile" type="button" onClick={signOut} title="Sign out">
            <span>{session?.name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "OS"}</span><span><strong>{session?.name ?? "Owner"}</strong><small>{session?.role ?? "admin"}</small></span><Icon name="logout" size={15} />
          </button>
        </div>
      </header>

      <aside className={`sidebar ${navigationOpen ? "sidebar--open" : ""}`}>
        <nav aria-label="Agent OS modules">
          {moduleGroups.map((group) => (
            <section key={group.label}>
              <span className="sidebar__label">{group.label}</span>
              {group.modules.map((module) => (
                <Link key={module.slug} href={`/${module.slug}`} className={activeSlug === module.slug ? "is-active" : ""} onClick={() => setNavigationOpen(false)}>
                  <Icon name={module.icon} size={17} />
                  <span>{module.label}</span>
                  {module.slug === "agent-status" ? <span className="nav-live" /> : null}
                </Link>
              ))}
            </section>
          ))}
        </nav>
        <footer>
          <span className="sidebar__signal"><span className="live-dot" />{shellHealth.label}</span>
          <small>{operations.state.environment} / Phase 4</small>
        </footer>
      </aside>

      <main className="shell-main" data-project={activeProject.id} data-environment={operations.state.environment}>{children}</main>

      {commandOpen ? (
        <div className="command-overlay" role="presentation" onMouseDown={() => setCommandOpen(false)}>
          <section className="command-palette" role="dialog" aria-modal="true" aria-label="Search and command palette" onMouseDown={(event) => event.stopPropagation()}>
            <div className="command-input">
              <Icon name="search" />
              <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Jump to a module..." aria-label="Search modules" />
              <button className="icon-button" type="button" onClick={() => setCommandOpen(false)} aria-label="Close search"><Icon name="close" /></button>
            </div>
            <div className="command-results">
              {searchResults.map((module) => (
                <Link key={module.slug} href={`/${module.slug}`} onClick={() => { setCommandOpen(false); setQuery(""); }}>
                  <span className="module-card__icon"><Icon name={module.icon} /></span>
                  <span><strong>{module.label}</strong><small>{module.description}</small></span>
                  <kbd>↵</kbd>
                </Link>
              ))}
              {!searchResults.length ? <p>No matching module.</p> : null}
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
