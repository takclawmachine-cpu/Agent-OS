import { Icon } from "@/components/icon";
import { ModuleCard } from "@/components/module-card";
import { OperationalModuleView } from "@/components/operational-module-view";
import { OriginalModuleView } from "@/components/original-module-view";
import { ToolModuleView } from "@/components/tool-module-view";
import { isOperationalModule, isOriginalModule, isToolModule, type ModuleDefinition } from "@/lib/modules";

export function ModuleView({ module }: { module: ModuleDefinition }) {
  if (isOriginalModule(module.slug)) return <OriginalModuleView module={module} />;
  if (isOperationalModule(module.slug)) return <OperationalModuleView module={module} />;
  if (isToolModule(module.slug)) return <ToolModuleView module={module} />;
  return <ModuleShell module={module} />;
}

function ModuleShell({ module }: { module: ModuleDefinition }) {
  return (
    <div className="module-view">
      <header className="page-heading">
        <span className="page-heading__icon"><Icon name={module.icon} size={24} /></span>
        <span><small>AGENT OS MODULE</small><h1>{module.label}</h1><p>{module.description}</p></span>
        <span className="shell-status"><span className="live-dot" />Shell connected</span>
      </header>

      <section className="module-layout">
        <ModuleCard title="Module Surface" icon={module.icon} eyebrow="Project route" className="module-layout__primary">
          <div className="module-placeholder">
            <span className="module-placeholder__glyph"><Icon name={module.icon} size={34} /></span>
            <h2>{module.label} is routed</h2>
            <p>This module is connected to the active project shell and shared reliability state.</p>
          </div>
        </ModuleCard>
        <ModuleCard title="Project Scope" icon="folder" eyebrow="Single source of truth">
          <dl className="detail-list"><div><dt>Source</dt><dd>Active project</dd></div><div><dt>Transport</dt><dd>API / realtime</dd></div><div><dt>Storage</dt><dd>SQLite</dd></div></dl>
        </ModuleCard>
        <ModuleCard title="State Contract" icon="status" eyebrow="Required before completion">
          <div className="state-chips"><span>Empty</span><span>Loading</span><span>Populated</span><span>Error</span><span>Offline</span></div>
        </ModuleCard>
      </section>
    </div>
  );
}
