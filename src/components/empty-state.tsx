import Link from "next/link";

import { Icon } from "@/components/icon";
import { moduleEmptyStates } from "@/lib/empty-states";
import type { ModuleSlug } from "@/lib/modules";

type EmptyStateProps = {
  module: ModuleSlug;
  kind?: "true-empty" | "filtered-empty";
  title?: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
};

export function EmptyState({
  module,
  kind = "true-empty",
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
}: EmptyStateProps) {
  const content = moduleEmptyStates[module];
  const label = actionLabel ?? content.actionLabel;

  return (
    <div className={`inline-empty inline-empty--${kind}`} data-empty-kind={kind}>
      <Icon name={content.icon} />
      <strong>{title ?? content.title}</strong>
      <span>{description ?? content.description}</span>
      {onAction ? (
        <button className="primary-action" type="button" onClick={onAction}>
          {label}
        </button>
      ) : actionHref ? (
        <Link className="primary-action" href={actionHref}>
          {label}
        </Link>
      ) : null}
    </div>
  );
}
