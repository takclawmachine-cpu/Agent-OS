import { notFound } from "next/navigation";

import { ModuleView } from "@/components/module-view";
import { getModule, modules } from "@/lib/modules";

export const dynamicParams = false;

export function generateStaticParams() {
  return modules.map((module) => ({ module: module.slug }));
}

export default async function ModulePage({ params }: PageProps<"/[module]">) {
  const { module: slug } = await params;
  const moduleDefinition = getModule(slug);

  if (!moduleDefinition) notFound();

  return <ModuleView module={moduleDefinition} />;
}
