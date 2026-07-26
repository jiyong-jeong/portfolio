import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center px-5 py-32 text-center">
      <p className="font-mono text-sm text-faint">404</p>
      <h1 className="mt-3 text-2xl font-bold tracking-tight">페이지를 찾을 수 없습니다</h1>
      <p className="mt-3 text-sm text-muted">
        주소가 바뀌었거나, 해당 프로젝트가 더 이상 목록에 없을 수 있습니다.
      </p>
      <Link
        href="/"
        className="mt-8 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
      >
        홈으로 가기
      </Link>
    </div>
  );
}
