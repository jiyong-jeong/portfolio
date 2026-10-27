import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { basename, extname } from "node:path";

import { pickDocs, pickManifests, truncate } from "./context.mjs";

/**
 * GitHub 에 올리지 않는 로컬 레포를 분석 대상으로 삼는다.
 *
 * 작업 트리가 아니라 지정한 ref 의 커밋에서 읽는다. 다른 세션이 같은 디렉터리에서
 * 작업 중이어도 미커밋 변경을 끌어들이지 않고, 체크아웃이나 fetch 도 하지 않는다.
 * 소스는 프롬프트에만 쓰이고 레포 링크는 비워 둔다.
 */

const LANGUAGE_BY_EXT = {
  ".go": "Go",
  ".ts": "TypeScript",
  ".tsx": "TypeScript",
  ".js": "JavaScript",
  ".jsx": "JavaScript",
  ".mjs": "JavaScript",
  ".py": "Python",
  ".java": "Java",
  ".kt": "Kotlin",
  ".rs": "Rust",
  ".sol": "Solidity",
  ".sql": "SQL",
  ".sh": "Shell",
  ".ps1": "PowerShell",
  ".css": "CSS",
  ".scss": "SCSS",
  ".html": "HTML",
  ".hcl": "HCL",
  ".tf": "HCL",
};

export function expandHome(path) {
  return path.startsWith("~/") ? `${homedir()}${path.slice(1)}` : path;
}

function git(dir, args) {
  return execFileSync("git", ["-C", dir, ...args], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    stdio: ["ignore", "pipe", "ignore"],
  });
}

/** `git ls-tree -r -l` 출력 → [{ path, size }] */
export function parseLsTree(output) {
  return output
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [meta, path] = line.split("\t");
      const size = Number(meta.trim().split(/\s+/)[3]);
      return { path, size: Number.isFinite(size) ? size : 0 };
    });
}

export function languageBytes(entries) {
  const bytes = {};
  for (const { path, size } of entries) {
    const lang = LANGUAGE_BY_EXT[extname(path).toLowerCase()];
    if (lang) bytes[lang] = (bytes[lang] ?? 0) + size;
  }
  return Object.fromEntries(Object.entries(bytes).sort((a, b) => b[1] - a[1]));
}

/** 설정의 localProjects 항목을 sync 가 쓰는 repo 객체 모양으로 만든다. */
export function resolveLocalRepo(project) {
  const dir = expandHome(project.path);
  if (!existsSync(dir)) throw new Error(`로컬 경로가 없습니다: ${project.path}`);
  const ref = project.ref ?? "HEAD";
  const name = project.name ?? basename(dir);
  const lastCommit = git(dir, ["log", "-1", "--format=%cI", ref]).trim();
  const firstCommit = git(dir, ["log", "--reverse", "--format=%cI", ref]).split("\n")[0].trim();

  return {
    local: true,
    dir,
    ref,
    name,
    full_name: name,
    description: project.description ?? null,
    homepage: null,
    html_url: null,
    topics: [],
    language: null,
    license: null,
    fork: false,
    archived: false,
    created_at: firstCommit || lastCommit,
    updated_at: lastCommit,
    pushed_at: lastCommit,
    stargazers_count: 0,
    forks_count: 0,
    subscribers_count: 0,
    open_issues_count: 0,
    size: 0,
    default_branch: ref,
  };
}

export function collectLocalContext(repo, analysis, redact) {
  const entries = parseLsTree(git(repo.dir, ["ls-tree", "-r", "-l", repo.ref]));
  const excludePaths = analysis.excludePaths ?? [];
  const kept = entries.filter((e) => !excludePaths.some((prefix) => e.path.startsWith(prefix)));
  const paths = kept.map((e) => e.path);

  const show = (path) => {
    try {
      return git(repo.dir, ["show", `${repo.ref}:${path}`]);
    } catch {
      return null;
    }
  };

  const readmePath = paths.find((p) => /^readme(\.mdx?)?$/i.test(p));
  const readme = readmePath ? show(readmePath) : null;

  const files = [];
  for (const path of [...pickManifests(paths), ...pickDocs(paths, analysis.maxDocFiles)]) {
    const content = show(path);
    if (!content) continue;
    const isDoc = /\.mdx?$/i.test(path);
    files.push({
      path,
      content: redact(truncate(content, isDoc ? analysis.maxDocChars : analysis.maxManifestChars)),
    });
  }

  const languages = languageBytes(kept);
  repo.language = Object.keys(languages)[0] ?? null;
  repo.size = Math.round(kept.reduce((sum, e) => sum + e.size, 0) / 1024);

  return {
    meta: {
      name: repo.name,
      fullName: repo.name,
      description: repo.description,
      homepage: null,
      topics: [],
      primaryLanguage: repo.language,
      license: null,
      isFork: false,
      isArchived: false,
      createdAt: repo.created_at,
      updatedAt: repo.updated_at,
      pushedAt: repo.pushed_at,
      stars: 0,
      forks: 0,
      watchers: 0,
      openIssues: 0,
      sizeKb: repo.size,
      defaultBranch: repo.ref,
      url: null,
      visibility: "private (소스 비공개, 요약만 게시)",
    },
    languages,
    tree: {
      truncated: false,
      total: paths.length,
      paths: paths.slice(0, analysis.maxTreeEntries).map(redact),
    },
    readme: redact(truncate(readme ?? "", analysis.maxReadmeChars, "README 생략")),
    files,
  };
}
