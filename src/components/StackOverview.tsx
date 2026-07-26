import Link from "next/link";

import { TECH_CATEGORY_ORDER, techCategoryLabel, techStyle } from "@/lib/tech";
import type { TechSummary } from "@/lib/data";

export default function StackOverview({ techs }: { techs: TechSummary[] }) {
  const top = techs.slice(0, 10);
  const max = top[0]?.count ?? 1;

  const grouped = TECH_CATEGORY_ORDER.map((category) => ({
    category,
    items: techs.filter((t) => t.category === category),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="grid gap-8 lg:grid-cols-5">
      <div className="lg:col-span-2">
        <h3 className="text-sm font-semibold text-muted">가장 많이 쓴 기술</h3>
        <ul className="mt-4 space-y-2.5">
          {top.map((tech) => (
            <li key={tech.name} className="grid grid-cols-[minmax(0,7rem)_1fr_auto] items-center gap-3">
              <span className="truncate text-sm" title={tech.name}>
                {tech.name}
              </span>
              <span className="h-2 overflow-hidden rounded-full bg-subtle" aria-hidden>
                <span
                  className="block h-full rounded-full bg-accent/70"
                  style={{ width: `${Math.max(8, (tech.count / max) * 100)}%` }}
                />
              </span>
              <span className="text-xs tabular-nums text-faint">{tech.count}개</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="lg:col-span-3">
        <h3 className="text-sm font-semibold text-muted">분야별 기술스택</h3>
        <div className="mt-4 space-y-4">
          {grouped.map((group) => (
            <div key={group.category} className="grid gap-2 sm:grid-cols-[6rem_1fr] sm:gap-4">
              <p className="pt-0.5 text-xs font-medium text-faint">
                {techCategoryLabel(group.category)}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {group.items.map((tech) => (
                  <Link
                    key={tech.name}
                    href={`/projects/${tech.projects[0]}`}
                    title={`${tech.name} — ${tech.count}개 프로젝트에서 사용`}
                    className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium transition hover:opacity-80 ${techStyle(tech.category)}`}
                  >
                    {tech.name}
                    {tech.count > 1 && <span className="opacity-60">{tech.count}</span>}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
