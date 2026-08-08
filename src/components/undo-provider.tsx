"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";

export type UndoAction = {
  message: string;
  execute: () => void;
  rollback: () => void;
};

export type UndoHandler = (action: UndoAction) => void;

type PendingUndo = Pick<UndoAction, "message" | "rollback">;

const UndoContext = createContext<UndoHandler>(() => undefined);

export function UndoProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState<PendingUndo | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const runUndoable = (action: UndoAction) => {
    action.execute();
    setPending({ message: action.message, rollback: action.rollback });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setPending(null), 6000);
  };

  const undo = () => {
    if (!pending) return;
    pending.rollback();
    setPending(null);
    if (timer.current) clearTimeout(timer.current);
  };

  return (
    <UndoContext.Provider value={runUndoable}>
      {children}
      {pending ? (
        <div className="undo-toast" role="status">
          <span>{pending.message}</span>
          <button type="button" onClick={undo}>Undo</button>
        </div>
      ) : null}
    </UndoContext.Provider>
  );
}

export function useUndo() {
  return useContext(UndoContext);
}
