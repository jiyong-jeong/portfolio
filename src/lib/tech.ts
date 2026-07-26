import type { TechCategory } from "./types";

/** 기술 분류별 배지 색상. 라이트/다크 모두에서 대비를 유지한다. */
const CATEGORY_STYLE: Record<TechCategory, string> = {
  language: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  framework: "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300",
  backend: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  frontend: "border-pink-500/30 bg-pink-500/10 text-pink-700 dark:text-pink-300",
  database: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  infra: "border-cyan-500/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300",
  devops: "border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-300",
  blockchain: "border-yellow-500/30 bg-yellow-500/10 text-yellow-700 dark:text-yellow-300",
  data: "border-teal-500/30 bg-teal-500/10 text-teal-700 dark:text-teal-300",
  testing: "border-lime-500/30 bg-lime-500/10 text-lime-700 dark:text-lime-300",
  tool: "border-slate-500/30 bg-slate-500/10 text-slate-700 dark:text-slate-300",
};

const CATEGORY_LABEL: Record<TechCategory, string> = {
  language: "언어",
  framework: "프레임워크",
  backend: "백엔드",
  frontend: "프론트엔드",
  database: "데이터베이스",
  infra: "인프라",
  devops: "DevOps",
  blockchain: "블록체인",
  data: "데이터",
  testing: "테스트",
  tool: "도구",
};

/** 기술명을 URL slug 로 바꾼다. (예: "Node.js" → "node-js") */
export function techSlug(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  // 영문/숫자가 하나도 없는 이름을 위한 대비책
  return slug || encodeURIComponent(name.trim().toLowerCase());
}

export function techStyle(category: string): string {
  return CATEGORY_STYLE[category as TechCategory] ?? CATEGORY_STYLE.tool;
}

export function techCategoryLabel(category: string): string {
  return CATEGORY_LABEL[category as TechCategory] ?? "기타";
}

export const TECH_CATEGORY_ORDER: TechCategory[] = [
  "language",
  "framework",
  "backend",
  "frontend",
  "database",
  "infra",
  "devops",
  "blockchain",
  "data",
  "testing",
  "tool",
];

/** 프로젝트 카테고리(한국어) 배지 색상 */
export function projectCategoryStyle(category: string): string {
  switch (category) {
    case "백엔드":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
    case "프론트엔드":
      return "border-pink-500/30 bg-pink-500/10 text-pink-700 dark:text-pink-300";
    case "인프라":
      return "border-cyan-500/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300";
    case "Web3":
      return "border-yellow-500/30 bg-yellow-500/10 text-yellow-700 dark:text-yellow-300";
    case "자동화":
      return "border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-300";
    case "데이터":
      return "border-teal-500/30 bg-teal-500/10 text-teal-700 dark:text-teal-300";
    case "학습":
      return "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300";
    default:
      return "border-slate-500/30 bg-slate-500/10 text-slate-700 dark:text-slate-300";
  }
}
