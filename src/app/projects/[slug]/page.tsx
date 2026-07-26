import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import LanguageBar from "@/components/LanguageBar";
import Mermaid from "@/components/Mermaid";
import { getProject, getProjects } from "@/lib/data";
import { projectCategoryStyle, techCategoryLabel, techStyle } from "@/lib/tech";

type Params = { slug: string };

export function generateStaticParams(): Params[] {
  return getProjects().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) return { title: "프로젝트를 찾을 수 없습니다" };
  return {
    title: project.title,
    description: project.summary,
    openGraph: { title: project.title, description: project.summary, type: "article" },
  };
}

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Seoul",
  }).format(d);
}

const DIAGRAM_TYPE_LABEL: Record<string, string> = {
  architecture: "아키텍처",
  dataflow: "데이터 흐름",
  sequence: "시퀀스",
  deployment: "배포",
  erd: "데이터 모델",
  state: "상태 전이",
  flow: "흐름도",
};

export default async function ProjectPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) notFound();

  const all = getProjects();
  const index = all.findIndex((p) => p.slug === slug);
  const prev = index > 0 ? all[index - 1] : null;
  const next = index < all.length - 1 ? all[index + 1] : null;

  const techByCategory = project.techStack.reduce<Record<string, typeof project.techStack>>(
    (acc, tech) => {
      (acc[tech.category] ??= []).push(tech);
      return acc;
    },
    {},
  );

  return (
    <article className="mx-auto max-w-4xl px-5 py-12">
      <Link
        href="/#projects"
        className="inline-flex items-center gap-1.5 text-sm text-muted transition hover:text-ink"
      >
        <span aria-hidden>←</span> 프로젝트 목록
      </Link>

      <header className="mt-6 border-b border-line pb-8">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${projectCategoryStyle(project.category)}`}
          >
            {project.category}
          </span>
          {project.metrics.primaryLanguage && (
            <span className="inline-flex items-center rounded-md border border-line px-2 py-0.5 text-xs text-muted">
              {project.metrics.primaryLanguage}
            </span>
          )}
          {project.degraded && (
            <span className="inline-flex items-center rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-xs text-amber-700 dark:text-amber-300">
              자동 분석 대기 중
            </span>
          )}
        </div>

        <h1 className="mt-4 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
          {project.title}
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-muted">{project.summary}</p>

        <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-faint">
          <a
            href={project.links.repo}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 font-mono text-muted transition hover:text-accent"
          >
            <GithubIcon />
            {project.repo}
          </a>
          {project.links.homepage && (
            <a
              href={project.links.homepage}
              target="_blank"
              rel="noreferrer"
              className="text-muted transition hover:text-accent"
            >
              사이트 바로가기
            </a>
          )}
          <span>최근 업데이트 {formatDate(project.dates.pushedAt)}</span>
          {project.metrics.stars > 0 && <span>★ {project.metrics.stars}</span>}
        </div>
      </header>

      <Section title="개요">
        <p className="whitespace-pre-line text-[15px] leading-[1.9] text-muted">
          {project.description}
        </p>
        {project.role && (
          <div className="mt-5 rounded-xl border border-line bg-subtle/60 p-4">
            <p className="text-xs font-semibold text-faint">담당 역할</p>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">{project.role}</p>
          </div>
        )}
      </Section>

      {project.diagrams.length > 0 && (
        <Section
          title="아키텍처 다이어그램"
          description="레포지토리 분석 결과를 바탕으로 자동 생성된 구조도입니다."
        >
          <div className="space-y-8">
            {project.diagrams.map((diagram, i) => (
              <figure key={`${diagram.title}-${i}`}>
                <figcaption className="mb-3">
                  <div className="flex items-center gap-2">
                    <span className="rounded border border-line px-1.5 py-0.5 text-[11px] text-faint">
                      {DIAGRAM_TYPE_LABEL[diagram.type] ?? "다이어그램"}
                    </span>
                    <h3 className="text-base font-semibold tracking-tight">{diagram.title}</h3>
                  </div>
                  {diagram.description && (
                    <p className="mt-1.5 text-sm leading-relaxed text-muted">
                      {diagram.description}
                    </p>
                  )}
                </figcaption>
                <Mermaid chart={diagram.mermaid} title={diagram.title} />
              </figure>
            ))}
          </div>
        </Section>
      )}

      {project.techStack.length > 0 && (
        <Section title="기술스택" description="각 기술을 이 프로젝트에서 어떤 용도로 썼는지 정리했습니다.">
          <div className="space-y-5">
            {Object.entries(techByCategory).map(([category, techs]) => (
              <div key={category}>
                <p className="text-xs font-semibold text-faint">{techCategoryLabel(category)}</p>
                <ul className="mt-2 space-y-2">
                  {techs.map((tech) => (
                    <li
                      key={tech.name}
                      className="flex flex-col gap-1.5 rounded-lg border border-line bg-elevated px-3.5 py-3 sm:flex-row sm:items-baseline sm:gap-3"
                    >
                      <span
                        className={`inline-flex w-fit shrink-0 items-center rounded-md border px-2 py-0.5 text-xs font-medium ${techStyle(tech.category)}`}
                      >
                        {tech.name}
                      </span>
                      <span className="text-sm leading-relaxed text-muted">{tech.usage}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Section>
      )}

      {project.highlights.length > 0 && (
        <Section title="핵심 포인트">
          <ul className="space-y-2.5">
            {project.highlights.map((h, i) => (
              <li key={i} className="flex gap-3 text-[15px] leading-relaxed text-muted">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
                {h}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {project.challenges.length > 0 && (
        <Section title="문제와 해결">
          <div className="space-y-3">
            {project.challenges.map((c, i) => (
              <div key={i} className="rounded-xl border border-line bg-elevated p-4">
                <p className="flex gap-2 text-sm font-medium leading-relaxed">
                  <span className="shrink-0 text-red-500/80">문제</span>
                  <span>{c.problem}</span>
                </p>
                <p className="mt-2.5 flex gap-2 border-t border-line pt-2.5 text-sm leading-relaxed text-muted">
                  <span className="shrink-0 font-medium text-accent-2">해결</span>
                  <span>{c.solution}</span>
                </p>
              </div>
            ))}
          </div>
        </Section>
      )}

      <Section title="레포지토리 정보">
        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-4">
          <Meta label="생성" value={formatDate(project.dates.createdAt)} />
          <Meta label="최근 커밋" value={formatDate(project.dates.pushedAt)} />
          <Meta label="크기" value={`${project.metrics.sizeKb.toLocaleString("ko-KR")} KB`} />
          <Meta label="라이선스" value={project.metrics.license ?? "없음"} />
        </dl>

        {Object.keys(project.metrics.languages).length > 0 && (
          <div className="mt-5">
            <p className="mb-2.5 text-xs font-semibold text-faint">언어 구성</p>
            <LanguageBar languages={project.metrics.languages} />
          </div>
        )}

        <p className="mt-5 text-xs text-faint">
          이 문서는 {formatDate(project.dates.analyzedAt)} 에 자동 분석으로 생성되었습니다.
        </p>
      </Section>

      <nav className="mt-14 grid gap-3 border-t border-line pt-8 sm:grid-cols-2">
        {prev ? (
          <Link
            href={`/projects/${prev.slug}`}
            className="rounded-xl border border-line bg-elevated p-4 transition hover:border-line-strong"
          >
            <p className="text-xs text-faint">이전 프로젝트</p>
            <p className="mt-1 text-sm font-medium">{prev.title}</p>
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link
            href={`/projects/${next.slug}`}
            className="rounded-xl border border-line bg-elevated p-4 text-right transition hover:border-line-strong"
          >
            <p className="text-xs text-faint">다음 프로젝트</p>
            <p className="mt-1 text-sm font-medium">{next.title}</p>
          </Link>
        )}
      </nav>
    </article>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-12">
      <h2 className="text-xl font-bold tracking-tight">{title}</h2>
      {description && <p className="mt-1.5 text-sm text-muted">{description}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-elevated px-3.5 py-3">
      <dt className="text-xs text-faint">{label}</dt>
      <dd className="mt-1 text-sm font-medium">{value}</dd>
    </div>
  );
}

function GithubIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <path d="M8 0a8 8 0 0 0-2.53 15.59c.4.07.55-.17.55-.38l-.01-1.34c-2.23.48-2.7-1.07-2.7-1.07-.36-.93-.89-1.18-.89-1.18-.73-.5.05-.49.05-.49.8.06 1.23.83 1.23.83.72 1.23 1.88.87 2.34.67.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.6 7.6 0 0 1 4 0c1.53-1.03 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.28.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48l-.01 2.19c0 .21.15.46.55.38A8 8 0 0 0 8 0z" />
    </svg>
  );
}
