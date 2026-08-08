"use client";

import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useState } from "react";

import { ProjectAssistantPanel, type AssistantProject, type ProjectPanelLayout } from "@/components/project-assistant-panel";
import { apiRequest } from "@/lib/api-client";

const STORAGE_KEY = "agent-os-project-panels:v1";
const PROJECT_EVENT = "agent-os-project-change";
const MAX_PANELS = 4;

type PanelContext = { openProjectPanel: (project: AssistantProject) => void };
const ProjectPanelContext = createContext<PanelContext | null>(null);

export function useProjectPanels() {
  const context = useContext(ProjectPanelContext);
  if (!context) throw new Error("useProjectPanels must be used inside ProjectPanelProvider.");
  return context;
}

function savedLayouts(): ProjectPanelLayout[] {
  try {
    const value = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(value) ? value.filter((item): item is ProjectPanelLayout => typeof item?.projectId === "string") : [];
  } catch {
    return [];
  }
}

export function ProjectPanelProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [projects, setProjects] = useState<AssistantProject[]>([]);
  const [panels, setPanels] = useState<ProjectPanelLayout[]>([]);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (pathname === "/login" || pathname === "/onboarding") return;
    void apiRequest<AssistantProject[]>("/api/projects").then((available) => {
      setProjects(available);
      const ids = new Set(available.map((project) => project.id));
      setPanels(savedLayouts().filter((panel) => ids.has(panel.projectId)).slice(0, MAX_PANELS));
    });
  }, [pathname]);

  useEffect(() => {
    if (!projects.length) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(panels.map(({ projectId, x, y, width, height, minimized, zIndex }) => ({ projectId, x, y, width, height, minimized, zIndex }))));
  }, [panels, projects.length]);

  const focusPanel = useCallback((projectId: string) => {
    setPanels((current) => {
      const nextZ = Math.max(140, ...current.map((panel) => panel.zIndex)) + 1;
      return current.map((panel) => panel.projectId === projectId ? { ...panel, minimized: false, zIndex: nextZ } : panel);
    });
  }, []);

  const openProjectPanel = useCallback((project: AssistantProject) => {
    setNotice("");
    setProjects((current) => current.some((item) => item.id === project.id) ? current : [...current, project]);
    setPanels((current) => {
      const existing = current.find((panel) => panel.projectId === project.id);
      const nextZ = Math.max(140, ...current.map((panel) => panel.zIndex)) + 1;
      if (existing) return current.map((panel) => panel.projectId === project.id ? { ...panel, minimized: false, zIndex: nextZ } : panel);
      if (current.length >= MAX_PANELS) {
        setNotice("Four project assistants are already open. Close one before opening another.");
        return current;
      }
      const offset = current.length * 28;
      return [...current, { projectId: project.id, x: 92 + offset, y: 96 + offset, width: 430, height: 610, minimized: false, zIndex: nextZ }];
    });
  }, []);

  const openFullWorkspace = (projectId: string) => {
    const previous = (() => { try { return JSON.parse(window.localStorage.getItem("agent-os-project-history") ?? "[]") as string[]; } catch { return []; } })();
    window.localStorage.setItem("agent-os-project", projectId);
    window.localStorage.setItem("agent-os-project-history", JSON.stringify([projectId, ...previous.filter((id) => id !== projectId)]));
    window.dispatchEvent(new Event(PROJECT_EVENT));
    router.push("/chat");
  };

  const focusedId = panels.reduce<ProjectPanelLayout | null>((focused, panel) => !focused || panel.zIndex > focused.zIndex ? panel : focused, null)?.projectId;

  return <ProjectPanelContext.Provider value={{ openProjectPanel }}>
    {children}
    {panels.map((panel) => {
      const project = projects.find((item) => item.id === panel.projectId);
      if (!project) return null;
      return <ProjectAssistantPanel
        focused={focusedId === panel.projectId}
        key={panel.projectId}
        layout={panel}
        onClose={() => setPanels((current) => current.filter((item) => item.projectId !== panel.projectId))}
        onFocus={() => focusPanel(panel.projectId)}
        onLayout={(change) => setPanels((current) => current.map((item) => item.projectId === panel.projectId ? { ...item, ...change } : item))}
        onOpenProject={openProjectPanel}
        onOpenWorkspace={() => openFullWorkspace(panel.projectId)}
        onToggleMinimized={() => setPanels((current) => current.map((item) => item.projectId === panel.projectId ? { ...item, minimized: !item.minimized } : item))}
        project={project}
      />;
    })}
    {notice ? <div className="project-panel-notice" role="alert">{notice}<button type="button" onClick={() => setNotice("")}>Dismiss</button></div> : null}
  </ProjectPanelContext.Provider>;
}