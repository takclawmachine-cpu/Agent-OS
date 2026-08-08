"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

type Position = { x: number; y: number };

export function FloatingDialog({
  actions,
  children,
  className = "",
  eyebrow,
  label,
  minimized,
  onFocus,
  onMove,
  position,
  size,
  zIndex,
}: {
  actions: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  eyebrow: string;
  label: string;
  minimized: boolean;
  onFocus: () => void;
  onMove: (position: Position) => void;
  position: Position;
  size: { width: number; height: number };
  zIndex: number;
}) {
  const drag = useRef<{ pointerId: number; startX: number; startY: number; origin: Position } | null>(null);

  useEffect(() => {
    const move = (event: PointerEvent) => {
      const active = drag.current;
      if (!active || event.pointerId !== active.pointerId) return;
      const width = minimized ? 320 : size.width;
      const height = minimized ? 58 : size.height;
      onMove({
        x: Math.max(8, Math.min(window.innerWidth - width - 8, active.origin.x + event.clientX - active.startX)),
        y: Math.max(72, Math.min(window.innerHeight - height - 8, active.origin.y + event.clientY - active.startY)),
      });
    };
    const stop = (event: PointerEvent) => {
      if (drag.current?.pointerId === event.pointerId) drag.current = null;
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
    };
  }, [minimized, onMove, size.height, size.width]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <section
      aria-label={`${label} project assistant`}
      className={`project-assistant-dialog ${minimized ? "is-minimized" : ""} ${className}`.trim()}
      onPointerDown={onFocus}
      role="dialog"
      style={{ left: position.x, top: position.y, width: minimized ? 320 : size.width, height: minimized ? 58 : size.height, zIndex }}
    >
      <header
        className="project-assistant-dialog__handle"
        onPointerDown={(event) => {
          if ((event.target as HTMLElement).closest("button")) return;
          drag.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, origin: position };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
      >
        <span><small>{eyebrow}</small><strong>{label}</strong></span>
        <span className="project-assistant-dialog__actions">{actions}</span>
      </header>
      {!minimized ? <div className="project-assistant-dialog__body">{children}</div> : null}
    </section>,
    document.body,
  );
}