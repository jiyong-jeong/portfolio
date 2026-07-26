const COLORS = [
  "#3178c6",
  "#f1e05a",
  "#e34c26",
  "#563d7c",
  "#00ADD8",
  "#701516",
  "#a97bff",
  "#89e051",
];

/** GitHub languages API 결과(바이트)를 비율 막대로 보여준다. */
export default function LanguageBar({ languages }: { languages: Record<string, number> }) {
  const entries = Object.entries(languages).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((sum, [, bytes]) => sum + bytes, 0);
  if (!total) return null;

  return (
    <div>
      <div className="flex h-2 overflow-hidden rounded-full bg-subtle" aria-hidden>
        {entries.map(([name, bytes], i) => (
          <span
            key={name}
            style={{ width: `${(bytes / total) * 100}%`, backgroundColor: COLORS[i % COLORS.length] }}
          />
        ))}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
        {entries.slice(0, 8).map(([name, bytes], i) => (
          <li key={name} className="flex items-center gap-1.5 text-xs text-muted">
            <span
              className="size-2 rounded-full"
              style={{ backgroundColor: COLORS[i % COLORS.length] }}
              aria-hidden
            />
            {name}
            <span className="tabular-nums text-faint">
              {((bytes / total) * 100).toFixed(1)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
