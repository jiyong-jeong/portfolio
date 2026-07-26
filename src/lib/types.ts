/** 분석 파이프라인(scripts/sync.mjs)이 생성하는 데이터의 타입 정의. */

export type TechCategory =
  | "language"
  | "framework"
  | "backend"
  | "frontend"
  | "database"
  | "infra"
  | "devops"
  | "blockchain"
  | "data"
  | "testing"
  | "tool";

export type DiagramType =
  | "architecture"
  | "dataflow"
  | "sequence"
  | "deployment"
  | "erd"
  | "state"
  | "flow";

export interface Tech {
  name: string;
  category: TechCategory;
  /** 이 프로젝트에서 어떤 역할로 썼는지 한 줄 설명 */
  usage: string;
}

export interface Diagram {
  title: string;
  /** 다이어그램이 무엇을 보여주는지에 대한 설명 */
  description: string;
  type: DiagramType;
  /** Mermaid 소스. 사이트에서 클라이언트 렌더링된다. */
  mermaid: string;
}

export interface Challenge {
  problem: string;
  solution: string;
}

export interface ProjectMetrics {
  stars: number;
  forks: number;
  watchers: number;
  sizeKb: number;
  openIssues: number;
  /** GitHub languages API 결과 (바이트 수) */
  languages: Record<string, number>;
  topics: string[];
  primaryLanguage: string | null;
  license: string | null;
}

export interface ProjectDates {
  createdAt: string;
  updatedAt: string;
  pushedAt: string;
  /** 이 문서가 마지막으로 분석된 시각 */
  analyzedAt: string;
}

export interface Project {
  /** 레포 이름 = URL slug */
  slug: string;
  repo: string;
  /** 사람이 읽기 좋은 한국어 제목 */
  title: string;
  /** 카드에 노출되는 한 줄 요약 */
  summary: string;
  /** 3~5문장 상세 설명 */
  description: string;
  /** 분류: 백엔드 / 인프라 / 프론트엔드 / Web3 / 자동화 / 학습 */
  category: string;
  /** 담당 역할 및 기여 */
  role: string;
  techStack: Tech[];
  highlights: string[];
  challenges: Challenge[];
  diagrams: Diagram[];
  /** 검색/필터용 키워드 */
  keywords: string[];
  links: {
    repo: string;
    homepage: string | null;
  };
  metrics: ProjectMetrics;
  dates: ProjectDates;
  /** 대표 프로젝트로 상단 고정할지 여부 */
  featured: boolean;
  /** 분석에 실패해 메타데이터만으로 만든 문서인지 */
  degraded?: boolean;
}

/** 기술 자체를 학습할 수 있도록 자동 생성한 설명 (레포 내용과 무관한 일반 지식) */
export interface TechDoc {
  slug: string;
  name: string;
  category: string;
  /** 한 문장 정의 */
  tagline: string;
  /** 무엇이고 어떤 문제를 푸는지 2~4문장 */
  definition: string;
  concepts: { term: string; description: string }[];
  /** 언제/왜 선택하는지 */
  whenToUse: string[];
  example: {
    title: string;
    language: string;
    code: string;
    description: string;
  } | null;
  /** 처음 쓸 때 흔한 함정 */
  pitfalls: string[];
  generatedAt: string;
}

export interface Profile {
  name: string;
  role: string;
  tagline: string;
  bio: string;
  email: string;
  github: string;
  location: string;
}

/** 스케줄러가 관리하는 동기화 상태. 레포별 마지막 반영 시각을 기록한다. */
export interface SyncStateEntry {
  /** 마지막으로 분석에 반영한 레포의 pushed_at */
  pushedAt: string;
  analyzedAt: string;
  status: "ok" | "failed";
  /** 연속 실패 횟수 (재시도 백오프용) */
  failures?: number;
  error?: string;
}

export interface SyncState {
  version: number;
  repos: Record<string, SyncStateEntry>;
}
