import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { ROOT } from "./config.mjs";

/**
 * 로컬 레포(회사 코드 등)를 분석 프롬프트에 넣기 전에 민감정보를 가린다.
 *
 * 여기에는 어느 레포에나 통하는 범용 규칙만 둔다. 고객사명·사내 도메인 같은 고유명사는
 * 이 파일이 공개 레포에 올라가므로 적으면 그 자체가 노출이다. 그런 값은 커밋하지 않는
 * portfolio.redact.local.json 에 둔다.
 */
export const LOCAL_RULES_FILE = join(ROOT, "portfolio.redact.local.json");

const GENERIC_RULES = [
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g, "[REDACTED_KEY]"],
  [/AKIA[0-9A-Z]{16}/g, "[REDACTED]"],
  [/AIza[0-9A-Za-z_-]{35}/g, "[REDACTED]"],
  [/\bgh[pousr]_[A-Za-z0-9]{36,}\b/g, "[REDACTED]"],
  [/\bxox[bpoa]-[A-Za-z0-9-]{10,}/g, "[REDACTED]"],
  [/\bsk-[A-Za-z0-9_-]{20,}/g, "[REDACTED]"],
  [
    /((?:secret|password|passwd|token|api_?key|access_?key)[A-Za-z_]*["']?\s*[:=]\s*["'])(?!\$|\{|CHANGE_ME)[^"'\s]{8,}(["'])/gi,
    "$1[REDACTED]$2",
  ],
  // 접속 문자열의 비밀번호. 템플릿 변수({cfg.password}, ${PW})는 값이 아니므로 둔다.
  [/((?:postgres|postgresql|mysql|redis|amqp|mongodb(?:\+srv)?):\/\/[^:/\s"'@`]+:)(?![{$])[^@\s"'`]+@/g, "$1[REDACTED]@"],
  [/\b01[016789]-?\d{3,4}-?\d{4}\b/g, "010-0000-0000"],
  [/\b(?:10\.\d{1,3}|192\.168|172\.(?:1[6-9]|2\d|3[01]))\.\d{1,3}\.\d{1,3}\b/g, "10.0.0.0"],
  [/\b\d{3}-\d{2}-\d{5}\b/g, "000-00-00000"],
];

const ALLOWED_EMAIL_DOMAINS = /@(example\.(com|org|net)|test(\.local)?|localhost|users\.noreply\.github\.com)$/i;
const EMAIL = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * 로컬 규칙 파일 형식
 * {
 *   "replace": { "고객사명": "고객사A", "customer.co.kr": "example.com" },
 *   "deny": ["고객사명", "customer.co.kr"]
 * }
 * replace 의 키는 대소문자를 구분하지 않고 바뀐다. deny 는 분석 결과에 남으면 안 되는 단어다.
 * replace 의 키는 자동으로 deny 에도 포함된다.
 */
export function loadLocalRules(file = LOCAL_RULES_FILE) {
  if (!existsSync(file)) return { replace: {}, deny: [] };
  const raw = JSON.parse(readFileSync(file, "utf8"));
  const replace = raw.replace ?? {};
  const deny = [...new Set([...(raw.deny ?? []), ...Object.keys(replace)])];
  return { replace, deny };
}

export function createRedactor(rules = { replace: {}, deny: [] }) {
  // 긴 키부터 바꿔야 "foo.co.kr" 보다 "api.foo.co.kr" 같은 상위 문자열이 먼저 처리된다.
  const custom = Object.entries(rules.replace)
    .sort((a, b) => b[0].length - a[0].length)
    .map(([from, to]) => [new RegExp(escapeRegExp(from), "gi"), to]);

  return function redact(text) {
    if (!text) return text;
    let out = text;
    for (const [re, to] of custom) out = out.replace(re, to);
    for (const [re, to] of GENERIC_RULES) out = out.replace(re, to);
    out = out.replace(EMAIL, (m) => (ALLOWED_EMAIL_DOMAINS.test(m) ? m : "user@example.com"));
    return out;
  };
}

/** 분석 결과(JSON 직렬화 가능한 값)에 금지어가 남아 있으면 그 단어들을 돌려준다. */
export function findDenied(value, deny) {
  if (!deny.length) return [];
  const text = JSON.stringify(value).toLowerCase();
  return deny.filter((word) => text.includes(word.toLowerCase()));
}
