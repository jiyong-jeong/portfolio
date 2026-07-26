import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const SYSTEM_PROMPT = `당신은 개발자에게 기술을 설명하는 기술 교육 문서 작성자입니다.
주어진 기술에 대해, 처음 접하는 사람도 개념을 잡을 수 있는 한국어 학습 자료를
구조화된 JSON 으로 작성합니다.
반드시 JSON 객체 하나만 출력하며, 그 앞뒤에 설명·인사말·코드펜스를 붙이지 않습니다.`;

const LANGUAGES = [
  "bash",
  "yaml",
  "json",
  "javascript",
  "typescript",
  "python",
  "solidity",
  "sql",
  "go",
  "java",
  "dockerfile",
  "hcl",
  "toml",
  "text",
];

function buildPrompt(tech) {
  const usageLines = tech.usages
    .map((u) => `- ${u.projectTitle}: ${u.usage}`)
    .join("\n");

  return `기술 이름: ${tech.name}
분류: ${tech.category}

이 기술은 아래 프로젝트들에서 다음과 같은 용도로 사용되었습니다.
${usageLines}

위 사용 맥락을 참고하되, 특정 프로젝트에 국한되지 않는 **일반적인 기술 설명**을 작성하세요.
방문자가 이 페이지만 읽고도 "이 기술이 무엇이고, 왜 쓰고, 어떻게 생겼는지" 이해할 수 있어야 합니다.

## 출력할 JSON 스키마
{
  "tagline": "이 기술을 한 문장으로 정의 (40~70자, '~하는 도구/플랫폼/라이브러리' 형태)",
  "definition": "무엇인지 설명하는 2~4문장. 어떤 문제를 해결하려고 만들어졌는지를 포함",
  "concepts": [
    { "term": "핵심 개념 이름", "description": "그 개념이 무엇인지 1~2문장 설명" }
  ],
  "whenToUse": ["이 기술을 선택하는 이유나 적합한 상황 2~4개, 각 30~70자"],
  "example": {
    "title": "예시 제목",
    "language": "${LANGUAGES.join(" | ")}",
    "code": "가장 기본적인 형태를 보여주는 짧은 코드/설정 (5~20줄)",
    "description": "이 예시가 무엇을 하는지 1~2문장"
  },
  "pitfalls": ["처음 쓸 때 흔히 겪는 함정이나 오해 0~3개, 각 30~80자"]
}

## 작성 규칙
1. concepts 는 3~6개. 이 기술을 이해하는 데 반드시 필요한 핵심 용어만 고르세요.
   용어는 원어(영문)를 그대로 쓰고, 설명만 한국어로 작성합니다.
2. 버전에 따라 달라지는 내용, 최신 릴리스 정보, 구체적인 수치·벤치마크는 쓰지 마세요.
   시간이 지나도 크게 변하지 않는 개념 수준의 설명만 작성합니다.
3. 확실하지 않은 내용은 쓰지 마세요. 항목을 줄이는 편이 낫습니다.
4. example.code 는 실제로 동작하는 최소 예시여야 합니다. 주석으로 설명을 덧붙여도 좋습니다.
   해당 기술이 코드가 아닌 개념/서비스라면, 설정 파일이나 CLI 명령 예시를 쓰세요.
5. URL, 링크, 참고 문서 주소는 넣지 마세요.
6. 과장 없이 담백한 기술 문서 톤으로, 한국어로 작성하세요.

JSON 객체 하나만 출력하세요.`;
}

function extractJson(text) {
  if (!text) return null;
  let s = text.trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) s = fence[1].trim();
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(s.slice(start, end + 1));
  } catch {
    return null;
  }
}

function runClaude(prompt, { model, timeoutMs }) {
  const workdir = mkdtempSync(join(tmpdir(), "portfolio-techdoc-"));
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
        reject(new Error(`claude 종료 코드 ${code}\n${stderr.slice(0, 500)}`));
        return;
      }
      resolve(stdout);
    });

    child.stdin.write(prompt);
    child.stdin.end();
  });
}

function parseOutput(stdout) {
  let payload;
  try {
    payload = JSON.parse(stdout);
  } catch {
    return extractJson(stdout);
  }
  if (payload?.is_error) {
    throw new Error(`claude 응답 오류: ${String(payload.result).slice(0, 300)}`);
  }
  return extractJson(typeof payload?.result === "string" ? payload.result : stdout);
}

const str = (v, fallback = "") => (typeof v === "string" ? v.trim() : fallback);
const arr = (v) => (Array.isArray(v) ? v : []);

export function normalizeTechDoc(raw) {
  if (!raw || typeof raw !== "object") return null;

  const tagline = str(raw.tagline);
  const definition = str(raw.definition);
  if (!tagline || !definition) return null;

  const concepts = arr(raw.concepts)
    .map((c) => ({ term: str(c?.term), description: str(c?.description) }))
    .filter((c) => c.term && c.description)
    .slice(0, 6);

  if (concepts.length === 0) return null;

  const rawExample = raw.example ?? {};
  const code = str(rawExample.code);
  const example = code
    ? {
        title: str(rawExample.title, "기본 예시"),
        language: LANGUAGES.includes(rawExample.language) ? rawExample.language : "text",
        // 코드 안의 링크는 제거 대상이 아니지만, 지나치게 긴 예시는 자른다.
        code: code.length > 2000 ? `${code.slice(0, 2000)}\n...` : code,
        description: str(rawExample.description),
      }
    : null;

  return {
    tagline,
    definition,
    concepts,
    whenToUse: arr(raw.whenToUse).map((w) => str(w)).filter(Boolean).slice(0, 5),
    example,
    pitfalls: arr(raw.pitfalls).map((p) => str(p)).filter(Boolean).slice(0, 4),
  };
}

/** 기술 하나에 대한 학습용 설명을 생성한다. */
export async function generateTechDoc(tech, analysis, log = () => {}) {
  const prompt = buildPrompt(tech);
  let lastError = null;

  for (let attempt = 1; attempt <= analysis.maxAttempts; attempt++) {
    try {
      const stdout = await runClaude(prompt, {
        model: analysis.model,
        timeoutMs: analysis.timeoutMs,
      });
      const normalized = normalizeTechDoc(parseOutput(stdout));
      if (normalized) return normalized;
      lastError = new Error("출력이 스키마 검증을 통과하지 못했습니다.");
    } catch (err) {
      lastError = err;
    }
    log(`  · ${tech.name} 재시도 ${attempt}/${analysis.maxAttempts}: ${lastError.message}`);
  }

  throw lastError ?? new Error("기술 설명 생성 실패");
}
