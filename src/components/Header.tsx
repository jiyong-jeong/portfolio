import Link from "next/link";

import ThemeToggle from "./ThemeToggle";

export default function Header({ name }: { name: string }) {
  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-bg/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Link href="/" className="group flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-lg bg-accent text-sm font-bold text-white">
            {name.slice(0, 1)}
          </span>
          <span className="text-[15px] font-semibold tracking-tight">{name}</span>
        </Link>

        <nav className="flex items-center gap-1">
          <NavLink href="/#projects">프로젝트</NavLink>
          <NavLink href="/#stack">기술스택</NavLink>
          <NavLink href="/about">소개</NavLink>
          <span className="mx-1.5 h-5 w-px bg-line" aria-hidden />
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-lg px-3 py-2 text-sm text-muted transition hover:bg-subtle hover:text-ink"
    >
      {children}
    </Link>
  );
}
