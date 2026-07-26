import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

export const ROOT = join(here, "..", "..");
export const DATA_DIR = join(ROOT, "data");
export const PROJECTS_DIR = join(DATA_DIR, "projects");
export const TECH_DIR = join(DATA_DIR, "tech");
export const STATE_FILE = join(DATA_DIR, "state.json");
export const PROFILE_FILE = join(DATA_DIR, "profile.json");
export const CONFIG_FILE = join(ROOT, "portfolio.config.json");

const DEFAULT_ANALYSIS = {
  model: "sonnet",
  maxReadmeChars: 24000,
  maxDocChars: 6000,
  maxDocFiles: 6,
  maxManifestChars: 4000,
  maxTreeEntries: 250,
  // 분석에 도움이 되지 않는 생성물·의존성 경로는 파일 트리에서 제외한다.
  excludePaths: ["node_modules/", ".next/", "out/", "dist/", "build/"],
  timeoutMs: 300000,
  maxAttempts: 2,
  // 기술 설명 생성은 서로 독립적이라 동시에 실행한다.
  techDocConcurrency: 4,
};

export function loadConfig() {
  if (!existsSync(CONFIG_FILE)) {
    throw new Error(`설정 파일을 찾을 수 없습니다: ${CONFIG_FILE}`);
  }
  const raw = JSON.parse(readFileSync(CONFIG_FILE, "utf8"));
  if (!raw.owner) throw new Error("portfolio.config.json 에 owner 가 필요합니다.");
  return {
    ...raw,
    exclude: raw.exclude ?? [],
    includeForks: raw.includeForks ?? false,
    includeArchived: raw.includeArchived ?? true,
    syncBotName: raw.syncBotName ?? "portfolio-sync",
    analysis: { ...DEFAULT_ANALYSIS, ...(raw.analysis ?? {}) },
  };
}
