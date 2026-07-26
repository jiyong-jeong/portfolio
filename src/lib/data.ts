import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import type { Profile, Project } from "./types";

const DATA_DIR = join(process.cwd(), "data");
const PROJECTS_DIR = join(DATA_DIR, "projects");

function readJson<T>(path: string, fallback: T): T {
  if (!existsSync(path)) return fallback;
  try {
    return JSON.parse(readFileSync(path, "utf8")) as T;
  } catch {
    return fallback;
  }
}

/** 빌드 시점에 data/projects/*.json 을 모두 읽어들인다. */
export function getProjects(): Project[] {
  if (!existsSync(PROJECTS_DIR)) return [];

  const projects = readdirSync(PROJECTS_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => readJson<Project | null>(join(PROJECTS_DIR, f), null))
    .filter((p): p is Project => Boolean(p?.slug));

  return projects.sort((a, b) => {
    if (a.featured !== b.featured) return a.featured ? -1 : 1;
    return new Date(b.dates.pushedAt).getTime() - new Date(a.dates.pushedAt).getTime();
  });
}

export function getProject(slug: string): Project | undefined {
  return getProjects().find((p) => p.slug === slug);
}

export function getProfile(): Profile {
  return readJson<Profile>(join(DATA_DIR, "profile.json"), {
    name: "포트폴리오",
    role: "",
    tagline: "",
    bio: "",
    email: "",
    github: "https://github.com/jiyong-jeong",
    location: "",
  });
}

export function getMeta(): { generatedAt: string | null; owner: string; siteUrl: string } {
  return readJson(join(DATA_DIR, "meta.json"), {
    generatedAt: null,
    owner: "jiyong-jeong",
    siteUrl: "",
  });
}

export interface TechSummary {
  name: string;
  count: number;
  category: string;
  projects: string[];
}

/** 전체 프로젝트의 기술스택을 집계한다. 사용 빈도 내림차순. */
export function getTechSummary(projects: Project[]): TechSummary[] {
  const map = new Map<string, TechSummary>();

  for (const project of projects) {
    for (const tech of project.techStack) {
      const key = tech.name.toLowerCase();
      const entry = map.get(key);
      if (entry) {
        entry.count += 1;
        entry.projects.push(project.slug);
      } else {
        map.set(key, {
          name: tech.name,
          category: tech.category,
          count: 1,
          projects: [project.slug],
        });
      }
    }
  }

  return [...map.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

export function getCategories(projects: Project[]): { name: string; count: number }[] {
  const map = new Map<string, number>();
  for (const p of projects) map.set(p.category, (map.get(p.category) ?? 0) + 1);
  return [...map.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}
