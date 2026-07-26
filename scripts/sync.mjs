#!/usr/bin/env node
/**
 * GitHub 레포지토리를 읽어 포트폴리오 데이터(data/projects/*.json)를 갱신한다.
 *
 * 갱신 판단 기준
 *  - state.json 에 없는 레포        → 신규로 보고 분석
 *  - repo.pushed_at > state.pushedAt → 내용이 바뀐 것으로 보고 재분석
 *  - 프로젝트 JSON 파일이 없는 경우  → 재분석
 *  - --force 를 주면 전부 재분석
 *
 * 사용법
 *   node scripts/sync.mjs [--force] [--only <repo>] [--limit <n>] [--dry-run]
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { DATA_DIR, PROFILE_FILE, PROJECTS_DIR, ROOT, STATE_FILE, loadConfig } from "./lib/config.mjs";
import { listRepos, resolveToken } from "./lib/github.mjs";
import { collectRepoContext } from "./lib/context.mjs";
import { analyzeRepo } from "./lib/analyze.mjs";

const log = (msg = "") => console.log(msg);

function parseArgs(argv) {
  const args = { force: false, only: null, limit: Infinity, dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--force") args.force = true;
    else if (a === "--dry-run") args.dryRun = true;
    else if (a === "--only") args.only = argv[++i];
    else if (a === "--limit") args.limit = Number(argv[++i]);
    else if (a === "--help" || a === "-h") {
      log("사용법: node scripts/sync.mjs [--force] [--only <repo>] [--limit <n>] [--dry-run]");
      process.exit(0);
    }
  }
  return args;
}

function loadState() {
  if (!existsSync(STATE_FILE)) return { version: 1, repos: {} };
  try {
    const s = JSON.parse(readFileSync(STATE_FILE, "utf8"));
    return { version: 1, repos: {}, ...s };
  } catch {
    log("⚠️  state.json 을 읽을 수 없어 새로 시작합니다.");
    return { version: 1, repos: {} };
  }
}

/**
 * 내용이 실제로 달라졌을 때만 파일을 쓴다.
 * 매 실행마다 타임스탬프만 바뀌어 git diff 가 생기면 스케줄러가 빈 커밋을 만들고
 * 사이트가 불필요하게 재배포되기 때문이다.
 */
function writeJson(path, value) {
  const next = `${JSON.stringify(value, null, 2)}\n`;
  if (existsSync(path) && readFileSync(path, "utf8") === next) return false;
  writeFileSync(path, next, "utf8");
  return true;
}

function shouldAnalyze(repo, state, force) {
  if (force) return { yes: true, reason: "강제 재분석" };
  const entry = state.repos[repo.name];
  const projectFile = join(PROJECTS_DIR, `${repo.name}.json`);
  if (!entry) return { yes: true, reason: "신규 레포" };
  if (!existsSync(projectFile)) return { yes: true, reason: "데이터 파일 없음" };
  if (entry.status === "failed") return { yes: true, reason: "이전 실행 실패" };
  if (new Date(repo.pushed_at) > new Date(entry.pushedAt)) {
    return { yes: true, reason: `업데이트 감지 (${entry.pushedAt} → ${repo.pushed_at})` };
  }
  return { yes: false, reason: "변경 없음" };
}

/** 분석 실패 시에도 카드가 비지 않도록 메타데이터만으로 최소 문서를 만든다. */
function degradedProject(repo, languages = {}) {
  const now = new Date().toISOString();
  return {
    slug: repo.name,
    repo: repo.name,
    title: repo.name,
    summary: repo.description || "설명이 아직 정리되지 않은 프로젝트입니다.",
    description: repo.description || "",
    category: "기타",
    role: "",
    techStack: repo.language ? [{ name: repo.language, category: "language", usage: "주 언어" }] : [],
    highlights: [],
    challenges: [],
    diagrams: [],
    keywords: repo.topics ?? [],
    links: { repo: repo.html_url, homepage: repo.homepage || null },
    metrics: {
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      watchers: repo.subscribers_count ?? repo.watchers_count ?? 0,
      sizeKb: repo.size,
      openIssues: repo.open_issues_count,
      languages,
      topics: repo.topics ?? [],
      primaryLanguage: repo.language ?? null,
      license: repo.license?.spdx_id ?? null,
    },
    dates: {
      createdAt: repo.created_at,
      updatedAt: repo.updated_at,
      pushedAt: repo.pushed_at,
      analyzedAt: now,
    },
    featured: false,
    degraded: true,
  };
}

function buildProject(repo, ctx, analysis) {
  return {
    slug: repo.name,
    repo: repo.name,
    title: analysis.title,
    summary: analysis.summary,
    description: analysis.description,
    category: analysis.category,
    role: analysis.role,
    techStack: analysis.techStack,
    highlights: analysis.highlights,
    challenges: analysis.challenges,
    diagrams: analysis.diagrams,
    keywords: analysis.keywords,
    links: { repo: repo.html_url, homepage: repo.homepage || null },
    metrics: {
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      watchers: repo.subscribers_count ?? repo.watchers_count ?? 0,
      sizeKb: repo.size,
      openIssues: repo.open_issues_count,
      languages: ctx.languages,
      topics: repo.topics ?? [],
      primaryLanguage: repo.language ?? null,
      license: repo.license?.spdx_id ?? null,
    },
    dates: {
      createdAt: repo.created_at,
      updatedAt: repo.updated_at,
      pushedAt: repo.pushed_at,
      analyzedAt: new Date().toISOString(),
    },
    featured: analysis.featured,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const config = loadConfig();

  mkdirSync(PROJECTS_DIR, { recursive: true });

  log(`▶ 대상 계정: ${config.owner}`);
  log(`▶ 인증: ${resolveToken() ? "토큰 사용" : "비인증 (레이트리밋 60회/시간)"}`);

  const state = loadState();
  const allRepos = await listRepos(config.owner);

  const targets = allRepos.filter((r) => {
    if (r.name === config.selfRepo) return false;
    if (config.exclude.includes(r.name)) return false;
    if (r.fork && !config.includeForks) return false;
    if (r.archived && !config.includeArchived) return false;
    if (args.only && r.name !== args.only) return false;
    return true;
  });

  log(`▶ 전체 ${allRepos.length}개 중 대상 ${targets.length}개\n`);

  const plan = targets.map((repo) => ({ repo, ...shouldAnalyze(repo, state, args.force) }));
  const todo = plan.filter((p) => p.yes).slice(0, args.limit);
  const skipped = plan.filter((p) => !p.yes);

  for (const item of skipped) log(`  = ${item.repo.name}: ${item.reason}`);
  if (skipped.length) log("");

  if (!todo.length) {
    log("변경된 레포가 없습니다.");
  }

  const result = { analyzed: [], failed: [], removed: [], skipped: skipped.length };

  for (const [i, item] of todo.entries()) {
    const { repo, reason } = item;
    log(`[${i + 1}/${todo.length}] ${repo.name} — ${reason}`);

    if (args.dryRun) {
      result.analyzed.push(repo.name);
      continue;
    }

    let ctx = null;
    try {
      ctx = await collectRepoContext(config.owner, repo, config.analysis);
      log(`  · 컨텍스트 수집 완료 (파일 ${ctx.files.length}개, README ${ctx.readme.length}자)`);

      const analysis = await analyzeRepo(ctx, config.analysis, log);
      const project = buildProject(repo, ctx, analysis);
      writeJson(join(PROJECTS_DIR, `${repo.name}.json`), project);

      state.repos[repo.name] = {
        pushedAt: repo.pushed_at,
        analyzedAt: project.dates.analyzedAt,
        status: "ok",
        failures: 0,
      };
      result.analyzed.push(repo.name);
      log(`  ✓ 완료 — 기술스택 ${analysis.techStack.length}개, 다이어그램 ${analysis.diagrams.length}개`);
    } catch (err) {
      const prev = state.repos[repo.name];
      log(`  ✗ 실패: ${err.message}`);
      result.failed.push({ repo: repo.name, error: err.message });

      // 기존 문서가 없으면 메타데이터만으로라도 카드를 만들어 둔다.
      const file = join(PROJECTS_DIR, `${repo.name}.json`);
      if (!existsSync(file)) {
        writeJson(file, degradedProject(repo, ctx?.languages ?? {}));
        log("  · 메타데이터 기반 임시 문서를 생성했습니다.");
      }

      state.repos[repo.name] = {
        pushedAt: prev?.pushedAt ?? "1970-01-01T00:00:00Z",
        analyzedAt: prev?.analyzedAt ?? new Date().toISOString(),
        status: "failed",
        failures: (prev?.failures ?? 0) + 1,
        error: err.message.slice(0, 300),
      };
    }
    log("");
  }

  if (!args.dryRun && !args.only) {
    // GitHub 에서 사라졌거나 대상에서 빠진 레포의 문서를 정리한다.
    const valid = new Set(targets.map((r) => r.name));
    for (const file of readdirSync(PROJECTS_DIR).filter((f) => f.endsWith(".json"))) {
      const name = file.replace(/\.json$/, "");
      if (!valid.has(name)) {
        rmSync(join(PROJECTS_DIR, file));
        delete state.repos[name];
        result.removed.push(name);
        log(`  - ${name}: 대상에서 제외되어 문서를 삭제했습니다.`);
      }
    }

    writeJson(STATE_FILE, state);
    writeJson(PROFILE_FILE, config.profile);

    // generatedAt 은 "실행 시각"이 아니라 "데이터가 마지막으로 바뀐 시각"이다.
    // 실행할 때마다 값이 바뀌면 변경이 없어도 커밋·재배포가 발생한다.
    const projectFiles = readdirSync(PROJECTS_DIR).filter((f) => f.endsWith(".json"));
    const lastChangedAt = Object.values(state.repos)
      .map((r) => r.analyzedAt)
      .filter(Boolean)
      .sort()
      .at(-1);

    writeJson(join(DATA_DIR, "meta.json"), {
      owner: config.owner,
      siteUrl: config.siteUrl,
      generatedAt: lastChangedAt ?? null,
      totalProjects: projectFiles.length,
    });

    // 스케줄러 실행 기록은 사이트 데이터가 아니므로 커밋 대상 밖(.logs)에 남긴다.
    try {
      mkdirSync(join(ROOT, ".logs"), { recursive: true });
      writeFileSync(
        join(ROOT, ".logs", "last-run.json"),
        `${JSON.stringify({ lastRunAt: new Date().toISOString(), ...result }, null, 2)}\n`,
        "utf8",
      );
    } catch {
      // 로그 기록 실패는 동기화 결과에 영향을 주지 않는다.
    }
  }

  log("── 요약 ──");
  log(`분석: ${result.analyzed.length}개${result.analyzed.length ? ` (${result.analyzed.join(", ")})` : ""}`);
  log(`실패: ${result.failed.length}개${result.failed.length ? ` (${result.failed.map((f) => f.repo).join(", ")})` : ""}`);
  log(`삭제: ${result.removed.length}개`);
  log(`변경 없음: ${result.skipped}개`);

  if (result.failed.length && !result.analyzed.length) process.exitCode = 1;
}

main().catch((err) => {
  console.error(`\n동기화 실패: ${err.message}`);
  process.exit(1);
});
