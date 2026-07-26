import { techStyle } from "@/lib/tech";

export default function TechBadge({
  name,
  category,
  title,
}: {
  name: string;
  category: string;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${techStyle(category)}`}
    >
      {name}
    </span>
  );
}
