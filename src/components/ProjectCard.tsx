import Link from "next/link";

import TechBadge from "./TechBadge";
import { projectCategoryStyle } from "@/lib/tech";
import type { Project } from "@/lib/types";

function formatMonth(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "short",
    timeZone: "Asia/Seoul",
  }).format(d);
}

export default function ProjectCard({ project }: { project: Project }) {
  const diagramCount = project.diagrams.length;

  return (
    <Link
      href={`/projects/${project.slug}`}
      className="group flex h-full flex-col rounded-2xl border border-line bg-elevated p-5 transition hover:-translate-y-0.5 hover:border-line-strong hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/40"
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className={`inline-flex shrink-0 items-center rounded-md border px-2 py-0.5 text-xs font-medium ${projectCategoryStyle(project.category)}`}
        >
          {project.category}
        </span>
        <span className="shrink-0 text-xs text-faint">{formatMonth(project.dates.pushedAt)}</span>
      </div>

      <h3 className="mt-3 text-lg font-semibold leading-snug tracking-tight transition group-hover:text-accent">
        {project.title}
      </h3>

      <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-muted">
        {project.summary}
      </p>

      {project.techStack.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {project.techStack.slice(0, 5).map((tech) => (
            <TechBadge key={tech.name} name={tech.name} category={tech.category} />
          ))}
          {project.techStack.length > 5 && (
            <span className="inline-flex items-center rounded-md border border-line px-2 py-0.5 text-xs text-faint">
              +{project.techStack.length - 5}
            </span>
          )}
        </div>
      )}

      <div className="mt-4 flex items-center gap-3 border-t border-line pt-3 text-xs text-faint">
        <span className="font-mono">{project.repo}</span>
        {diagramCount > 0 && (
          <span className="ml-auto inline-flex items-center gap-1">
            <DiagramIcon />
            다이어그램 {diagramCount}
          </span>
        )}
      </div>
    </Link>
  );
}

function DiagramIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
      <path d="M10 6.5h4a3 3 0 0 1 3 3V14" />
    </svg>
  );
}
