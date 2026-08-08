"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { Icon } from "@/components/icon";
import { ModuleView } from "@/components/module-view";
import { NeuralField } from "@/components/neural-field";
import { useProjectPanels } from "@/components/project-panel-provider";
import { useRealtimeStatus } from "@/components/realtime-provider";
import { useReliability } from "@/components/reliability-provider";
import { apiRequest, normalizeApiError, type ApiError } from "@/lib/api-client";
import { notifyAuthChanged } from "@/lib/auth";
import { getModule, modules } from "@/lib/modules";
import { useVoiceState } from "@/lib/voice";
import { useOperationalModuleStore } from "@/state/operational-modules";
import { useOriginalModuleStore } from "@/state/original-modules";

type Project = { id: string; name: string; environment: string };

const projectEvent = "agent-os-project-change";
const themeEvent = "agent-os-theme-change";
const openModuleDialogEvent = "agent-os-open-module-dialog";

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
  if (pathname === "/login" || pathname === "/onboarding") {
    return <div className="auth-shell"><NeuralField />{children}</div>;
  }
  return <WorkspaceShell>{children}</WorkspaceShell>;
}

function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const operations = useOperationalModuleStore();
  const original = useOriginalModuleStore();
  const realtime = useRealtimeStatus();
  const { online } = useReliability();
  const { openProjectPanel } = useProjectPanels();
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projectsError, setProjectsError] = useState<ApiError | null>(null);
  const [projectOpen, setProjectOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [moduleDialogSlug, setModuleDialogSlug] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const notificationWrapperRef = useRef<HTMLDivElement | null>(null);

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
  const recentNotifications = operations.state.notifications.slice(0, 7);
  const recentProjects = parseRecentProjects(recentProjectIds, projects.map((project) => project.id));
  const projectOrder = [...recentProjects, ...projects.map((project) => project.id).filter((id) => !recentProjects.includes(id))];
  const orderedProjects = projectOrder.map((id) => projects.find((project) => project.id === id)).filter(Boolean) as Project[];
  const searchResults = modules.filter((module) => `${module.label} ${module.description}`.toLowerCase().includes(query.toLowerCase()));
  const dialogModule = moduleDialogSlug ? getModule(moduleDialogSlug) : undefined;
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
        setProjectsLoading(false);
        setProjectsError(null);
        const selected = window.localStorage.getItem("agent-os-project");
        if (result.length && !result.some((project) => project.id === selected)) {
          window.localStorage.setItem("agent-os-project", result[0].id);
          window.localStorage.setItem("agent-os-project-history", JSON.stringify([result[0].id]));
          window.dispatchEvent(new Event(projectEvent));
        }
      })
      .catch((error: unknown) => {
        setProjectsLoading(false);
        setProjectsError(normalizeApiError(error, "/api/projects"));
      });
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
        setNotificationOpen(false);
        setModuleDialogSlug(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    const onOpenModuleDialog = (event: Event) => {
      const detail = (event as CustomEvent<{ slug?: string }>).detail;
      if (!detail?.slug || !getModule(detail.slug)) return;
      setModuleDialogSlug(detail.slug);
      setNotificationOpen(false);
      setCommandOpen(false);
    };
    window.addEventListener(openModuleDialogEvent, onOpenModuleDialog);
    return () => window.removeEventListener(openModuleDialogEvent, onOpenModuleDialog);
  }, []);

  useEffect(() => {
    if (!notificationOpen) return;
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (notificationWrapperRef.current?.contains(target)) return;
      setNotificationOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [notificationOpen]);

  const openModuleDialog = (slug: string) => {
    if (!getModule(slug)) return;
    setModuleDialogSlug(slug);
    setNotificationOpen(false);
    setCommandOpen(false);
  };

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

  if (projectsLoading) {
    return <div className="session-check" role="status"><span className="spinner" />Loading workspace</div>;
  }

  return (
    <div className="app-shell">
      <NeuralField />
      <header className="topbar">
        <div className="topbar__brand">
          <span className="brand-mark"><span /></span>
          <span><strong>AGENT OS</strong></span>
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
          <button className="icon-button" type="button" onClick={toggleTheme} aria-label={`Switch to ${theme === "light" ? "dark" : "light"} theme`}>
            <Icon name={theme === "light" ? "moon" : "sun"} />
          </button>
          <div className="notification-wrapper" ref={notificationWrapperRef}>
            <button className="icon-button notification-button" type="button" onClick={() => setNotificationOpen((open) => !open)} aria-expanded={notificationOpen} aria-haspopup="dialog" aria-label={`${unreadNotifications} unread notifications`}>
              <Icon name="notifications" />
              {unreadNotifications ? <span className="badge-dot">{unreadNotifications}</span> : null}
            </button>
            {notificationOpen ? (
              <section className="notification-menu" role="dialog" aria-label="Recent notifications">
                <header>
                  <span>
                    <strong>Recent Notifications</strong>
                    <small>Latest {recentNotifications.length} entries</small>
                  </span>
                </header>
                <div className="notification-menu__list">
                  {recentNotifications.length ? recentNotifications.map((notice) => (
                    <button key={notice.id} type="button" onClick={() => openModuleDialog("notifications")}>
                      <span className={`notice-mark notice-mark--${notice.severity}`} />
                      <span>
                        <strong>{notice.title}</strong>
                        <small>{notice.detail}</small>
                      </span>
                      <time>{notice.time}</time>
                    </button>
                  )) : <p>No recent notifications.</p>}
                </div>
                <footer>
                  <button className="secondary-action" type="button" onClick={() => openModuleDialog("notifications")}>View all notifications</button>
                </footer>
              </section>
            ) : null}
          </div>
          <button className="icon-button" type="button" onClick={signOut} aria-label="Sign out" title="Sign out">
            <Icon name="logout" size={16} />
          </button>
        </div>
      </header>

      <main className="shell-main" data-project={activeProject?.id ?? ""} data-environment={operations.state.environment}>{children}</main>

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
                <button key={module.slug} type="button" onClick={() => { openModuleDialog(module.slug); setQuery(""); }}>
                  <span className="module-card__icon"><Icon name={module.icon} /></span>
                  <span><strong>{module.label}</strong><small>{module.description}</small></span>
                  <kbd>↵</kbd>
                </button>
              ))}
              {!searchResults.length ? <p>No matching module.</p> : null}
            </div>
          </section>
        </div>
      ) : null}

      {dialogModule ? (
        <div className="module-overlay" role="presentation" onMouseDown={() => setModuleDialogSlug(null)}>
          <section className="module-dialog" role="dialog" aria-modal="true" aria-label={`${dialogModule.label} module`} onMouseDown={(event) => event.stopPropagation()}>
            <button className="icon-button module-dialog__close" type="button" onClick={() => setModuleDialogSlug(null)} aria-label="Close module dialog">
              <Icon name="close" />
            </button>
            <div className="module-dialog__body">
              <ModuleView module={dialogModule} />
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
