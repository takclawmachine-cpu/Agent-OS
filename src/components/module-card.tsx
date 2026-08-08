import type { ReactNode } from "react";

import { Icon } from "@/components/icon";
import type { IconName } from "@/lib/modules";

export function ModuleCard({
  title,
  icon,
  eyebrow,
  live = false,
  children,
  className = "",
}: {
  title: string;
  icon: IconName;
  eyebrow?: string;
  live?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <article className={`module-card ${className}`.trim()}>
      <header className="module-card__header">
        <span className="module-card__icon"><Icon name={icon} /></span>
        <span>
          {eyebrow ? <span className="module-card__eyebrow">{eyebrow}</span> : null}
          <strong>{title}</strong>
        </span>
        {live ? <span className="live-tag"><span className="live-dot" />Live</span> : null}
      </header>
      <div className="module-card__body">{children}</div>
    </article>
  );
}
