import Link from "next/link";

import ProjectExplorer from "@/components/ProjectExplorer";
import StackOverview from "@/components/StackOverview";
import { getProfile, getProjects, getTechSummary } from "@/lib/data";

export default function HomePage() {
  const profile = getProfile();
  const projects = getProjects();
  const techs = getTechSummary(projects);

  const diagramCount = projects.reduce((sum, p) => sum + p.diagrams.length, 0);
  const categoryCount = new Set(projects.map((p) => p.category)).size;

  return (
    <>
      <section className="relative overflow-hidden border-b border-line">
        <div className="grid-backdrop absolute inset-0" aria-hidden />
        <div className="relative mx-auto max-w-6xl px-5 pb-16 pt-20 sm:pt-24">
          <p className="inline-flex items-center gap-2 rounded-full border border-line bg-elevated px-3 py-1 text-xs text-muted">
            <span className="size-1.5 rounded-full bg-accent-2" aria-hidden />
            GitHub 레포지토리를 매일 자동 분석해 갱신됩니다
          </p>

          <h1 className="mt-6 max-w-3xl text-4xl font-bold leading-[1.15] tracking-tight sm:text-5xl">
            {profile.name}
            <span className="ml-3 align-middle text-xl font-medium text-muted sm:text-2xl">
              {profile.role}
            </span>
          </h1>

          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted">{profile.tagline}</p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="#projects"
              className="rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
            >
              프로젝트 보기
            </Link>
            <a
              href={profile.github}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-line bg-elevated px-4 py-2.5 text-sm font-medium transition hover:border-line-strong"
            >
              GitHub
            </a>
          </div>

          <dl className="mt-14 grid max-w-2xl grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-4">
            <Stat label="프로젝트" value={projects.length} />
            <Stat label="기술스택" value={techs.length} />
            <Stat label="다이어그램" value={diagramCount} />
            <Stat label="분야" value={categoryCount} />
          </dl>
        </div>
      </section>

      <section id="stack" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-16">
        <SectionHeading
          title="기술스택"
          description="전체 프로젝트에서 사용한 기술을 분야별로 집계했습니다."
        />
        {techs.length > 0 ? (
          <StackOverview techs={techs} />
        ) : (
          <EmptyState message="아직 분석된 기술스택이 없습니다. npm run sync 를 실행해 주세요." />
        )}
      </section>

      <section id="projects" className="mx-auto max-w-6xl scroll-mt-20 px-5 pb-8">
        <SectionHeading
          title="프로젝트"
          description="각 레포지토리를 분석해 기술스택, 아키텍처 다이어그램, 핵심 포인트를 정리했습니다."
        />
        {projects.length > 0 ? (
          <ProjectExplorer projects={projects} />
        ) : (
          <EmptyState message="아직 수집된 프로젝트가 없습니다. npm run sync 를 실행해 주세요." />
        )}
      </section>
    </>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-elevated px-4 py-5">
      <dt className="text-xs text-faint">{label}</dt>
      <dd className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">{value}</dd>
    </div>
  );
}

function SectionHeading({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-8">
      <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
      <p className="mt-2 text-sm text-muted">{description}</p>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <p className="rounded-xl border border-dashed border-line py-14 text-center text-sm text-muted">
      {message}
    </p>
  );
}
