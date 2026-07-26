import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { checkMermaid } from "./mermaid-check.mjs";

const TECH_CATEGORIES = [
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

const DIAGRAM_TYPES = [
  "architecture",
  "dataflow",
  "sequence",
  "deployment",
  "erd",
  "state",
  "flow",
];

const MERMAID_HEADERS = [
  "flowchart",
  "graph",
  "sequenceDiagram",
  "classDiagram",
  "stateDiagram",
  "stateDiagram-v2",
  "erDiagram",
  "journey",
  "gantt",
  "mindmap",
  "timeline",
  "block-beta",
  "architecture-beta",
];

const SYSTEM_PROMPT = `당신은 개발자 포트폴리오를 작성하는 기술 문서 전문가입니다.
주어진 GitHub 레포지토리 정보를 읽고, 방문자가 이 프로젝트를 빠르게 이해할 수 있도록
한국어로 정리한 구조화된 JSON 을 만듭니다.
반드시 JSON 객체 하나만 출력하며, 그 앞뒤에 설명·인사말·코드펜스를 붙이지 않습니다.`;

function buildPrompt(ctx) {
  const filesBlock = ctx.files.length
    ? ctx.files
        .map((f) => `--- 파일: ${f.path} ---\n${f.content}`)
        .join("\n\n")
    : "(수집된 매니페스트/문서 파일 없음)";

  return `아래는 GitHub 레포지토리 "${ctx.meta.fullName}" 에서 수집한 정보입니다.
이 정보만으로 포트폴리오용 프로젝트 문서를 JSON 으로 작성하세요.

## 레포 메타데이터
${JSON.stringify(ctx.meta, null, 2)}

## 언어 통계 (bytes)
${JSON.stringify(ctx.languages, null, 2)}

## 파일 트리 (총 ${ctx.tree.total}개${ctx.tree.truncated ? ", 일부 생략됨" : ""})
${ctx.tree.paths.join("\n") || "(없음)"}

## README
${ctx.readme || "(README 없음)"}

## 주요 파일 내용
${filesBlock}

## 출력할 JSON 스키마
{
  "title": "한국어 프로젝트 제목 (30자 이내, 레포 이름을 그대로 쓰지 말고 무엇을 하는 프로젝트인지 드러낼 것)",
  "summary": "카드에 들어갈 한 줄 요약 (60~90자)",
  "description": "3~5문장 상세 설명. 무엇을 해결하는 프로젝트인지, 어떻게 동작하는지 서술",
  "category": "다음 중 하나: 백엔드 | 프론트엔드 | 인프라 | Web3 | 자동화 | 데이터 | 학습",
  "role": "이 프로젝트에서 개발자가 맡은 역할과 기여 (1~2문장)",
  "techStack": [
    { "name": "기술명", "category": "${TECH_CATEGORIES.join(" | ")}", "usage": "이 프로젝트에서 어떤 용도로 썼는지 한 줄" }
  ],
  "highlights": ["기술적으로 의미 있는 포인트 3~5개, 각 40~80자"],
  "challenges": [
    { "problem": "마주친 문제/제약", "solution": "해결 방식" }
  ],
  "diagrams": [
    {
      "title": "다이어그램 제목",
      "description": "이 다이어그램이 무엇을 보여주는지 1~2문장",
      "type": "${DIAGRAM_TYPES.join(" | ")}",
      "mermaid": "Mermaid 소스 문자열"
    }
  ],
  "keywords": ["검색/필터용 키워드 5~10개 (영문 소문자 권장)"],
  "featured": true 또는 false
}

## 작성 규칙
1. 근거 없는 내용을 지어내지 마세요. 수집된 정보에서 확인되는 내용만 쓰고,
   정보가 부족하면 항목을 짧게 쓰거나 빈 배열로 두세요.
2. techStack 은 3~12개. 실제로 코드/설정에서 확인되는 기술만 넣으세요.
   버전 번호는 붙이지 말고 기술명만 씁니다(예: "PostgreSQL", "Kubernetes", "NestJS").
3. challenges 는 0~3개. README 나 코드에서 근거를 찾을 수 있을 때만 작성하세요.
4. diagrams 는 1~3개를 만듭니다. 반드시 1개 이상은 전체 구조를 보여주는
   type "architecture" 또는 "dataflow" 로 만드세요.
   문서 정리(-docs) 성격의 레포라면 개념/흐름을 정리한 다이어그램을 만들면 됩니다.
5. Mermaid 작성 규칙 (매우 중요 — 문법 오류가 나면 사이트에서 렌더링되지 않습니다):
   - 첫 줄은 다이어그램 선언으로 시작합니다: "flowchart TD", "flowchart LR",
     "sequenceDiagram", "erDiagram", "stateDiagram-v2" 중 하나를 쓰세요.
   - 노드 라벨은 반드시 큰따옴표로 감쌉니다: A["API 서버"] 처럼.
   - 라벨 안에서 큰따옴표, 세미콜론, 백틱, 꺾쇠(<, >)를 쓰지 마세요.
     괄호는 따옴표로 감싼 라벨 안에서만 허용됩니다.
   - 노드 ID 는 영문/숫자/언더스코어만 사용합니다(한글 ID 금지).
   - 화살표는 -->, -.->, ==> 만 사용합니다.
   - subgraph 사용 시 subgraph ID["제목"] 형식으로 쓰고 end 로 닫으세요.
   - 노드 12개 이내로 간결하게, 흐름이 한눈에 보이게 만드세요.
   - CSS 스타일 지정(style, classDef, linkStyle)은 넣지 마세요. 사이트 테마가 적용됩니다.
6. featured 는 규모가 크거나 대표성이 있는 프로젝트일 때만 true 로 하세요.
7. 모든 서술은 한국어로, 과장 없이 담백한 기술 문서 톤으로 작성하세요.

JSON 객체 하나만 출력하세요.`;
}

function extractJson(text) {
  if (!text) return null;
  let s = text.trim();

  // ```json ... ``` 코드펜스 제거
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) s = fence[1].trim();

  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;

  const candidate = s.slice(start, end + 1);
  try {
    return JSON.parse(candidate);
  } catch {
    return null;
  }
}

function runClaude(prompt, { model, timeoutMs }) {
  // CLAUDE.md/AGENTS.md 등 프로젝트 컨텍스트가 섞이지 않도록 빈 임시 디렉토리에서 실행한다.
  const workdir = mkdtempSync(join(tmpdir(), "portfolio-analyze-"));

  const args = [
    "-p",
    "--output-format",
    "json",
    "--model",
    model,
    "--system-prompt",
    SYSTEM_PROMPT,
    "--strict-mcp-config",
    "--disallowed-tools",
    "Bash Edit Write Read Glob Grep WebFetch WebSearch Task NotebookEdit TodoWrite",
  ];

  return new Promise((resolve, reject) => {
    const child = spawn("claude", args, {
      cwd: workdir,
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: "1" },
    });

    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`claude 호출 시간 초과 (${timeoutMs}ms)`));
    }, timeoutMs);

    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));
    child.on("error", (err) => {
      clearTimeout(timer);
      rmSync(workdir, { recursive: true, force: true });
      reject(new Error(`claude 실행 실패: ${err.message}`));
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      rmSync(workdir, { recursive: true, force: true });
      if (code !== 0) {
        reject(new Error(`claude 종료 코드 ${code}\n${stderr.slice(0, 800)}`));
        return;
      }
      resolve(stdout);
    });

    child.stdin.write(prompt);
    child.stdin.end();
  });
}

function parseClaudeOutput(stdout) {
  let payload;
  try {
    payload = JSON.parse(stdout);
  } catch {
    // --output-format json 이 아닌 형태로 나온 경우 원문에서 직접 추출 시도
    return extractJson(stdout);
  }
  if (payload?.is_error) {
    throw new Error(`claude 응답 오류: ${String(payload.result).slice(0, 400)}`);
  }
  const text = typeof payload?.result === "string" ? payload.result : stdout;
  return extractJson(text);
}

function sanitizeMermaid(src) {
  if (typeof src !== "string") return null;
  let s = src.trim();

  const fence = s.match(/```(?:mermaid)?\s*([\s\S]*?)```/);
  if (fence) s = fence[1].trim();

  s = s.replace(/\r\n/g, "\n");
  // 테마와 충돌하는 스타일 지시문 제거
  s = s
    .split("\n")
    .filter((line) => !/^\s*(style|linkStyle|classDef)\s/.test(line))
    .join("\n")
    .trim();

  const firstLine = s.split("\n")[0]?.trim() ?? "";
  const ok = MERMAID_HEADERS.some((h) => firstLine.startsWith(h));
  if (!ok) return null;
  if (s.length > 6000) return null;
  return s;
}

const str = (v, fallback = "") => (typeof v === "string" ? v.trim() : fallback);
const arr = (v) => (Array.isArray(v) ? v : []);

/** 모델 출력이 스키마에 맞는지 검증하고 정규화한다. 실패하면 null. */
export function normalizeAnalysis(raw) {
  if (!raw || typeof raw !== "object") return null;

  const title = str(raw.title);
  const summary = str(raw.summary);
  if (!title || !summary) return null;

  const techStack = arr(raw.techStack)
    .map((t) => ({
      name: str(t?.name),
      category: TECH_CATEGORIES.includes(t?.category) ? t.category : "tool",
      usage: str(t?.usage),
    }))
    .filter((t) => t.name)
    .slice(0, 14);

  const diagrams = arr(raw.diagrams)
    .map((d) => {
      const mermaid = sanitizeMermaid(d?.mermaid);
      if (!mermaid) return null;
      return {
        title: str(d?.title, "다이어그램"),
        description: str(d?.description),
        type: DIAGRAM_TYPES.includes(d?.type) ? d.type : "flow",
        mermaid,
      };
    })
    .filter(Boolean)
    .slice(0, 4);

  return {
    title,
    summary,
    description: str(raw.description, summary),
    category: str(raw.category, "기타"),
    role: str(raw.role),
    techStack,
    highlights: arr(raw.highlights).map((h) => str(h)).filter(Boolean).slice(0, 6),
    challenges: arr(raw.challenges)
      .map((c) => ({ problem: str(c?.problem), solution: str(c?.solution) }))
      .filter((c) => c.problem && c.solution)
      .slice(0, 4),
    diagrams,
    keywords: arr(raw.keywords).map((k) => str(k).toLowerCase()).filter(Boolean).slice(0, 12),
    featured: raw.featured === true,
  };
}

/** Mermaid 파서를 실제로 돌려 문법 오류가 있는 다이어그램은 버린다. */
async function dropUnparseableDiagrams(analysis, log) {
  const kept = [];
  for (const diagram of analysis.diagrams) {
    const error = await checkMermaid(diagram.mermaid);
    if (error) {
      log(`  · 다이어그램 "${diagram.title}" 문법 오류로 제외: ${error}`);
      continue;
    }
    kept.push(diagram);
  }
  return { ...analysis, diagrams: kept };
}

/** 레포 컨텍스트를 claude 로 분석해 정규화된 결과를 돌려준다. */
export async function analyzeRepo(ctx, analysis, log = () => {}) {
  const prompt = buildPrompt(ctx);
  let lastError = null;

  for (let attempt = 1; attempt <= analysis.maxAttempts; attempt++) {
    try {
      const stdout = await runClaude(prompt, {
        model: analysis.model,
        timeoutMs: analysis.timeoutMs,
      });
      const parsed = parseClaudeOutput(stdout);
      const normalized = normalizeAnalysis(parsed);
      if (normalized) return await dropUnparseableDiagrams(normalized, log);
      lastError = new Error("모델 출력이 스키마 검증을 통과하지 못했습니다.");
    } catch (err) {
      lastError = err;
    }
    log(`  · 분석 재시도 ${attempt}/${analysis.maxAttempts}: ${lastError.message}`);
  }

  throw lastError ?? new Error("분석 실패");
}
