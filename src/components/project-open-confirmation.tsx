"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

import { Icon } from "@/components/icon";
import type { AssistantProject } from "@/components/project-assistant-panel";

export function ProjectOpenConfirmation({ matches, onCancel, onConfirm }: { matches: AssistantProject[]; onCancel: () => void; onConfirm: (project: AssistantProject) => void }) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    cancelRef.current?.focus();
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") onCancel(); };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [onCancel]);
  if (typeof document === "undefined") return null;
  return createPortal(<div className="project-confirmation-overlay" onMouseDown={onCancel} role="presentation">
    <section aria-labelledby="project-confirmation-title" aria-modal="true" className="project-confirmation" onMouseDown={(event) => event.stopPropagation()} role="dialog">
      <header><span className="module-card__icon"><Icon name="folder" /></span><span><small>PROJECT CONTEXT</small><strong id="project-confirmation-title">{matches.length === 1 ? "Open this project assistant?" : "Choose a project assistant"}</strong></span></header>
      <p>{matches.length === 1 ? "Your current project remains open. The selected project will open in a separate assistant panel." : "More than one project matches your command. Select the intended context."}</p>
      <div className="project-confirmation__choices">{matches.map((project) => <button type="button" key={project.id} onClick={() => onConfirm(project)}><Icon name="chat" /><span><strong>{project.name}</strong><small>{project.environment}</small></span><Icon name="arrow" size={15} /></button>)}</div>
      <footer><button className="secondary-action" type="button" ref={cancelRef} onClick={onCancel}>Cancel</button></footer>
    </section>
  </div>, document.body);
}