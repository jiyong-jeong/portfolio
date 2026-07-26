"use client";

import { useMemo, useState } from "react";

import ProjectCard from "./ProjectCard";
import type { Project } from "@/lib/types";

const ALL = "전체";

export default function ProjectExplorer({ projects }: { projects: Project[] }) {
  const [category, setCategory] = useState(ALL);
  const [query, setQuery] = useState("");

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of projects) counts.set(p.category, (counts.get(p.category) ?? 0) + 1);
    return [
      { name: ALL, count: projects.length },
      ...[...counts.entries()]
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
    ];
  }, [projects]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return projects.filter((p) => {
      if (category !== ALL && p.category !== category) return false;
      if (!q) return true;
      const haystack = [
        p.title,
        p.summary,
        p.description,
        p.repo,
        p.category,
        ...p.keywords,
        ...p.techStack.map((t) => t.name),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [projects, category, query]);

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {categories.map((c) => {
            const active = c.name === category;
            return (
              <button
                key={c.name}
                type="button"
                onClick={() => setCategory(c.name)}
                aria-pressed={active}
                className={`rounded-lg border px-3 py-1.5 text-sm transition ${
                  active
                    ? "border-accent bg-accent-soft font-medium text-accent"
                    : "border-line text-muted hover:border-line-strong hover:text-ink"
                }`}
              >
                {c.name}
                <span className="ml-1.5 text-xs opacity-60">{c.count}</span>
              </button>
            );
          })}
        </div>

        <div className="relative sm:w-64">
          <SearchIcon />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="기술스택·프로젝트 검색"
            aria-label="프로젝트 검색"
            className="w-full rounded-lg border border-line bg-elevated py-2 pl-9 pr-3 text-sm text-ink placeholder:text-faint focus:border-accent focus:outline-none"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="mt-10 rounded-xl border border-dashed border-line py-12 text-center text-sm text-muted">
          조건에 맞는 프로젝트가 없습니다.
        </p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((project) => (
            <ProjectCard key={project.slug} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}

function SearchIcon() {
  return (
    <svg
      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint"
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}
