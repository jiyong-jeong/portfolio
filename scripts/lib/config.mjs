import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

export const ROOT = join(here, "..", "..");
export const DATA_DIR = join(ROOT, "data");
export const PROJECTS_DIR = join(DATA_DIR, "projects");
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
  timeoutMs: 300000,
  maxAttempts: 2,
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
    analysis: { ...DEFAULT_ANALYSIS, ...(raw.analysis ?? {}) },
  };
}
