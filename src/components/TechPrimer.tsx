import type { TechDoc } from "@/lib/types";

const LANGUAGE_LABEL: Record<string, string> = {
  bash: "Shell",
  yaml: "YAML",
  json: "JSON",
  javascript: "JavaScript",
  typescript: "TypeScript",
  python: "Python",
  solidity: "Solidity",
  sql: "SQL",
  go: "Go",
  java: "Java",
  dockerfile: "Dockerfile",
  hcl: "HCL",
  toml: "TOML",
  text: "예시",
};

/** 기술 페이지 상단의 학습용 개요 — 정의, 핵심 개념, 사용 시점, 예시, 함정 */
export default function TechPrimer({ doc }: { doc: TechDoc }) {
  return (
    <section className="mt-8">
      <div className="rounded-2xl border border-line bg-elevated p-6 sm:p-7">
        <div className="flex items-center gap-2">
          <BookIcon />
          <h2 className="text-sm font-semibold text-muted">이 기술은 무엇인가요?</h2>
        </div>

        <p className="mt-4 text-lg font-medium leading-relaxed">{doc.tagline}</p>
        <p className="mt-3 text-[15px] leading-[1.9] text-muted">{doc.definition}</p>

        {doc.whenToUse.length > 0 && (
          <div className="mt-6 border-t border-line pt-5">
            <h3 className="text-xs font-semibold text-faint">이럴 때 사용합니다</h3>
            <ul className="mt-3 space-y-2">
              {doc.whenToUse.map((w, i) => (
                <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-muted">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent-2" aria-hidden />
                  {w}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {doc.concepts.length > 0 && (
        <div className="mt-6">
          <h3 className="text-base font-semibold tracking-tight">핵심 개념</h3>
          <dl className="mt-3 grid gap-3 sm:grid-cols-2">
            {doc.concepts.map((c) => (
              <div key={c.term} className="rounded-xl border border-line bg-elevated p-4">
                <dt className="font-mono text-sm font-semibold text-accent">{c.term}</dt>
                <dd className="mt-1.5 text-sm leading-relaxed text-muted">{c.description}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {doc.example && (
        <div className="mt-6">
          <h3 className="text-base font-semibold tracking-tight">{doc.example.title}</h3>
          {doc.example.description && (
            <p className="mt-1.5 text-sm leading-relaxed text-muted">{doc.example.description}</p>
          )}
          <div className="mt-3 overflow-hidden rounded-xl border border-line">
            <div className="flex items-center justify-between border-b border-line bg-subtle px-4 py-2">
              <span className="text-xs font-medium text-faint">
                {LANGUAGE_LABEL[doc.example.language] ?? doc.example.language}
              </span>
            </div>
            <pre className="overflow-x-auto bg-elevated px-4 py-4 text-[13px] leading-relaxed">
              <code>{doc.example.code}</code>
            </pre>
          </div>
        </div>
      )}

      {doc.pitfalls.length > 0 && (
        <div className="mt-6 rounded-xl border border-amber-500/25 bg-amber-500/5 p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-300">
            <WarnIcon />
            처음 쓸 때 흔한 함정
          </h3>
          <ul className="mt-3 space-y-2">
            {doc.pitfalls.map((p, i) => (
              <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-muted">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-amber-500/70" aria-hidden />
                {p}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-4 text-xs leading-relaxed text-faint">
        위 개요는 기술 학습을 돕기 위해 자동 생성된 일반 설명입니다. 정확한 사양과 최신 정보는
        공식 문서를 확인하세요.
      </p>
    </section>
  );
}

function BookIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent" aria-hidden>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}

function WarnIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
      <path d="M12 9v4M12 17h.01" />
    </svg>
  );
}
