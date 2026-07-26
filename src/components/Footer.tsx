import type { Profile } from "@/lib/types";

function formatDate(iso: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Seoul",
  }).format(d);
}

export default function Footer({
  profile,
  generatedAt,
}: {
  profile: Profile;
  generatedAt: string | null;
}) {
  const updated = formatDate(generatedAt);

  return (
    <footer className="mt-24 border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-10 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="font-medium text-ink">{profile.name}</p>
          <p>
            {updated ? `프로젝트 정보 마지막 갱신: ${updated}` : "프로젝트 정보 갱신 대기 중"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {profile.github && (
            <a href={profile.github} target="_blank" rel="noreferrer" className="hover:text-ink">
              GitHub
            </a>
          )}
          {profile.email && (
            <a href={`mailto:${profile.email}`} className="hover:text-ink">
              {profile.email}
            </a>
          )}
        </div>
      </div>

      <div className="border-t border-line/60">
        <p className="mx-auto max-w-6xl px-5 py-4 text-xs text-faint">
          이 페이지의 프로젝트 설명과 다이어그램은 GitHub 레포지토리를 매일 자동으로 분석해
          생성됩니다.
        </p>
      </div>
    </footer>
  );
}
