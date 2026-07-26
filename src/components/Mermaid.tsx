"use client";

import { useEffect, useId, useState } from "react";

import { useHydrated, useIsDark } from "@/hooks/useIsDark";

let renderCounter = 0;

/** CSS 변수에서 현재 테마 색상을 읽어 Mermaid themeVariables 로 변환한다. */
function themeVariables() {
  const s = getComputedStyle(document.documentElement);
  const v = (name: string, fallback: string) => s.getPropertyValue(name).trim() || fallback;

  const bg = v("--bg-elevated", "#ffffff");
  const subtle = v("--bg-subtle", "#f2f4f8");
  const line = v("--border-strong", "#cbd3df");
  const text = v("--text", "#12151c");
  const muted = v("--text-muted", "#5b6677");
  const accent = v("--accent", "#2563eb");
  const accentSoft = v("--accent-soft", "#dbe6ff");

  return {
    background: bg,
    primaryColor: accentSoft,
    primaryTextColor: text,
    primaryBorderColor: accent,
    secondaryColor: subtle,
    secondaryTextColor: text,
    secondaryBorderColor: line,
    tertiaryColor: subtle,
    tertiaryTextColor: muted,
    tertiaryBorderColor: line,
    lineColor: line,
    textColor: text,
    mainBkg: subtle,
    nodeBorder: line,
    clusterBkg: "transparent",
    clusterBorder: line,
    edgeLabelBackground: bg,
    titleColor: text,
    // sequence diagram
    actorBkg: accentSoft,
    actorBorder: accent,
    actorTextColor: text,
    actorLineColor: line,
    signalColor: text,
    signalTextColor: text,
    labelBoxBkgColor: subtle,
    labelBoxBorderColor: line,
    labelTextColor: text,
    loopTextColor: text,
    noteBkgColor: subtle,
    noteTextColor: text,
    noteBorderColor: line,
    // state / er
    attributeBackgroundColorOdd: bg,
    attributeBackgroundColorEven: subtle,
  };
}

export default function Mermaid({ chart, title }: { chart: string; title?: string }) {
  const rawId = useId();
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSource, setShowSource] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  // 테마가 바뀌면 다이어그램 색상도 다시 그려야 하므로 dark 클래스를 구독한다.
  const isDark = useIsDark();
  const hydrated = useHydrated();

  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;

    (async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "strict",
          theme: "base",
          themeVariables: themeVariables(),
          fontFamily:
            '"Pretendard Variable", Pretendard, -apple-system, "Apple SD Gothic Neo", system-ui, sans-serif',
          flowchart: { curve: "basis", padding: 16, useMaxWidth: true, htmlLabels: true },
          sequence: { useMaxWidth: true, actorMargin: 60, wrap: true },
          er: { useMaxWidth: true },
        });

        const id = `mermaid-${rawId.replace(/[^a-zA-Z0-9]/g, "")}-${renderCounter++}`;
        const { svg: rendered } = await mermaid.render(id, chart);
        if (cancelled) return;
        setSvg(rendered);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "다이어그램을 그릴 수 없습니다.");
        setSvg(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [chart, isDark, hydrated, rawId]);

  // 확대 보기에서 ESC 로 닫기
  useEffect(() => {
    if (!zoomed) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setZoomed(false);
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [zoomed]);

  if (error) {
    return (
      <div className="rounded-xl border border-line bg-subtle p-4">
        <p className="text-sm text-muted">
          다이어그램을 렌더링하지 못했습니다. 아래 Mermaid 소스를 확인하세요.
        </p>
        <pre className="mt-3 overflow-x-auto rounded-lg border border-line bg-elevated p-3 text-xs leading-relaxed text-muted">
          <code>{chart}</code>
        </pre>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-line bg-elevated">
        {svg ? (
          <div
            className="overflow-x-auto px-4 py-6 [&_svg]:mx-auto [&_svg]:h-auto [&_svg]:max-w-full"
            // mermaid.render 는 securityLevel:"strict" 로 정화된 SVG 를 돌려준다.
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        ) : (
          <div className="flex h-40 items-center justify-center text-sm text-faint">
            다이어그램을 그리는 중…
          </div>
        )}

        <div className="flex items-center justify-end gap-1 border-t border-line bg-subtle/60 px-3 py-2">
          <button
            type="button"
            onClick={() => setShowSource((v) => !v)}
            className="rounded-md px-2.5 py-1 text-xs text-muted transition hover:bg-elevated hover:text-ink"
          >
            {showSource ? "소스 닫기" : "소스 보기"}
          </button>
          <button
            type="button"
            onClick={() => setZoomed(true)}
            disabled={!svg}
            className="rounded-md px-2.5 py-1 text-xs text-muted transition hover:bg-elevated hover:text-ink disabled:opacity-40"
          >
            크게 보기
          </button>
        </div>

        {showSource && (
          <pre className="overflow-x-auto border-t border-line bg-subtle px-4 py-3 text-xs leading-relaxed text-muted">
            <code>{chart}</code>
          </pre>
        )}
      </div>

      {zoomed && svg && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={title ? `${title} 확대 보기` : "다이어그램 확대 보기"}
          className="fixed inset-0 z-50 flex flex-col bg-bg/95 backdrop-blur-sm"
          onClick={() => setZoomed(false)}
        >
          <div className="flex items-center justify-between border-b border-line px-5 py-3">
            <p className="text-sm font-medium">{title ?? "다이어그램"}</p>
            <button
              type="button"
              onClick={() => setZoomed(false)}
              className="rounded-lg border border-line px-3 py-1.5 text-sm text-muted transition hover:text-ink"
            >
              닫기 (Esc)
            </button>
          </div>
          <div
            className="flex-1 overflow-auto p-6 [&_svg]:mx-auto [&_svg]:h-auto [&_svg]:w-full [&_svg]:max-w-5xl"
            onClick={(e) => e.stopPropagation()}
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        </div>
      )}
    </>
  );
}
