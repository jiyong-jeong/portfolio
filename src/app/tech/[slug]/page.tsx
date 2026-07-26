import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import TechPrimer from "@/components/TechPrimer";
import { getTechDetail, getTechDetails, getTechDoc } from "@/lib/data";
import { projectCategoryStyle, techCategoryLabel, techStyle } from "@/lib/tech";

type Params = { slug: string };

export function generateStaticParams(): Params[] {
  return getTechDetails().map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const tech = getTechDetail(slug);
  if (!tech) return { title: "기술을 찾을 수 없습니다" };

  const doc = getTechDoc(slug);
  const description =
    doc?.tagline ?? `${tech.name} 활용 사례 — 프로젝트 ${tech.count}개에서의 사용 방식 정리`;
  return {
    title: `${tech.name} 활용 사례`,
    description,
    openGraph: { title: `${tech.name} 활용 사례`, description, type: "article" },
  };
}

function formatMonth(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "short",
    timeZone: "Asia/Seoul",
  }).format(d);
}

export default async function TechPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const tech = getTechDetail(slug);
  if (!tech) notFound();

  const doc = getTechDoc(slug);

  return (
    <div className="mx-auto max-w-4xl px-5 py-12">
      <Link
        href="/#stack"
        className="inline-flex items-center gap-1.5 text-sm text-muted transition hover:text-ink"
      >
        <span aria-hidden>←</span> 기술스택 목록
      </Link>

      <header className="mt-6 border-b border-line pb-8">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${techStyle(tech.category)}`}
          >
            {techCategoryLabel(tech.category)}
          </span>
        </div>

        <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">{tech.name}</h1>
        <p className="mt-3 text-lg text-muted">
          프로젝트 <strong className="font-semibold text-ink">{tech.count}개</strong>에서
          사용했습니다. 각 프로젝트에서 어떤 역할로 썼는지 아래에 정리했습니다.
        </p>

        <nav className="mt-5 flex flex-wrap gap-2 text-sm">
          {doc && (
            <a
              href="#overview"
              className="rounded-lg border border-line bg-elevated px-3 py-1.5 text-muted transition hover:border-line-strong hover:text-ink"
            >
              기술 개요
            </a>
          )}
          <a
            href="#usage"
            className="rounded-lg border border-line bg-elevated px-3 py-1.5 text-muted transition hover:border-line-strong hover:text-ink"
          >
            프로젝트별 활용 {tech.count}
          </a>
        </nav>
      </header>

      {doc && (
        <div id="overview" className="scroll-mt-20">
          <TechPrimer doc={doc} />
        </div>
      )}

      <section id="usage" className="mt-12 scroll-mt-20">
        <h2 className="text-xl font-bold tracking-tight">프로젝트별 활용 방식</h2>
        <p className="mt-1.5 text-sm text-muted">
          위 개념이 실제 프로젝트에서 어떻게 쓰였는지 보여줍니다.
        </p>

        <ol className="mt-6 space-y-4">
          {tech.usages.map(({ project, usage }, i) => (
            <li key={project.slug}>
              <article className="rounded-2xl border border-line bg-elevated p-5 transition hover:border-line-strong">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-faint">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${projectCategoryStyle(project.category)}`}
                    >
                      {project.category}
                    </span>
                  </div>
                  <span className="shrink-0 text-xs text-faint">
                    {formatMonth(project.dates.pushedAt)}
                  </span>
                </div>

                <h3 className="mt-3 text-lg font-semibold tracking-tight">
                  <Link href={`/projects/${project.slug}`} className="transition hover:text-accent">
                    {project.title}
                  </Link>
                </h3>

                <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted">
                  {project.summary}
                </p>

                <div className="mt-4 rounded-xl border border-accent/25 bg-accent-soft/50 p-4">
                  <p className="text-xs font-semibold text-accent">
                    이 프로젝트에서의 {tech.name} 활용
                  </p>
                  <p className="mt-1.5 text-[15px] leading-relaxed text-ink">{usage}</p>
                </div>

                <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-3">
                  <span className="truncate font-mono text-xs text-faint">{project.repo}</span>
                  <Link
                    href={`/projects/${project.slug}`}
                    className="shrink-0 text-xs text-accent transition hover:underline"
                  >
                    프로젝트 자세히 보기 →
                  </Link>
                </div>
              </article>
            </li>
          ))}
        </ol>
      </section>

      {tech.related.length > 0 && (
        <section className="mt-12 border-t border-line pt-8">
          <h2 className="text-xl font-bold tracking-tight">함께 사용한 기술</h2>
          <p className="mt-1.5 text-sm text-muted">
            위 프로젝트들에서 같이 쓰인 다른 기술입니다.
          </p>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {tech.related.map((r) => (
              <Link
                key={r.slug}
                href={`/tech/${r.slug}`}
                title={`${r.name} — 같은 프로젝트 ${r.count}개에서 함께 사용`}
                className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-sm font-medium transition hover:opacity-80 ${techStyle(r.category)}`}
              >
                {r.name}
                {r.count > 1 && <span className="text-xs opacity-60">{r.count}</span>}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
