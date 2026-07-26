import type { Metadata } from "next";
import Link from "next/link";

import { getCategories, getProfile, getProjects, getTechSummary } from "@/lib/data";
import { techCategoryLabel, techStyle } from "@/lib/tech";

export const metadata: Metadata = {
  title: "소개",
  description: "개발자 소개와 이 포트폴리오가 자동으로 갱신되는 방식",
};

export default function AboutPage() {
  const profile = getProfile();
  const projects = getProjects();
  const techs = getTechSummary(projects);
  const categories = getCategories(projects);

  const topTechs = techs.slice(0, 12);

  return (
    <div className="mx-auto max-w-3xl px-5 py-16">
      <h1 className="text-3xl font-bold tracking-tight">소개</h1>

      <section className="mt-8">
        <p className="text-lg font-medium">
          {profile.name} · {profile.role}
        </p>
        <p className="mt-4 text-[15px] leading-[1.9] text-muted">{profile.bio}</p>

        <dl className="mt-6 space-y-2 text-sm">
          {profile.location && (
            <div className="flex gap-3">
              <dt className="w-16 shrink-0 text-faint">위치</dt>
              <dd className="text-muted">{profile.location}</dd>
            </div>
          )}
          <div className="flex gap-3">
            <dt className="w-16 shrink-0 text-faint">GitHub</dt>
            <dd>
              <a
                href={profile.github}
                target="_blank"
                rel="noreferrer"
                className="text-accent hover:underline"
              >
                {profile.github.replace("https://", "")}
              </a>
            </dd>
          </div>
          {profile.email && (
            <div className="flex gap-3">
              <dt className="w-16 shrink-0 text-faint">이메일</dt>
              <dd>
                <a href={`mailto:${profile.email}`} className="text-accent hover:underline">
                  {profile.email}
                </a>
              </dd>
            </div>
          )}
        </dl>
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-bold tracking-tight">작업 분야</h2>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {categories.map((c) => (
            <li
              key={c.name}
              className="flex items-center justify-between rounded-lg border border-line bg-elevated px-3.5 py-2.5 text-sm"
            >
              <span>{c.name}</span>
              <span className="tabular-nums text-faint">{c.count}개</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-bold tracking-tight">주요 기술</h2>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {topTechs.map((tech) => (
            <span
              key={tech.name}
              title={`${techCategoryLabel(tech.category)} · ${tech.count}개 프로젝트`}
              className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-sm font-medium ${techStyle(tech.category)}`}
            >
              {tech.name}
              <span className="text-xs opacity-60">{tech.count}</span>
            </span>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-bold tracking-tight">이 사이트가 갱신되는 방식</h2>
        <p className="mt-3 text-[15px] leading-[1.9] text-muted">
          이 포트폴리오의 프로젝트 문서는 직접 작성한 것이 아니라, GitHub 레포지토리를 읽어
          자동으로 만들어집니다. 매일 한 번 스케줄러가 다음 순서로 동작합니다.
        </p>
        <ol className="mt-5 space-y-3">
          {[
            "GitHub API 로 계정의 모든 레포지토리 목록과 마지막 커밋 시각을 가져옵니다.",
            "직전에 반영한 시각과 비교해 새로 생겼거나 내용이 바뀐 레포만 골라냅니다.",
            "해당 레포의 README, 파일 트리, 매니페스트 파일을 수집합니다.",
            "Claude 가 이 정보를 읽고 기술스택·설명·아키텍처 다이어그램을 JSON 으로 정리합니다.",
            "변경분을 커밋·푸시하면 GitHub Actions 가 사이트를 다시 빌드해 배포합니다.",
          ].map((step, i) => (
            <li key={i} className="flex gap-3 text-[15px] leading-relaxed text-muted">
              <span className="grid size-6 shrink-0 place-items-center rounded-full border border-line text-xs font-medium text-faint">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      </section>

      <div className="mt-12 border-t border-line pt-8">
        <Link href="/#projects" className="text-sm text-accent hover:underline">
          프로젝트 목록 보기 →
        </Link>
      </div>
    </div>
  );
}
