import { Link } from "react-router-dom";
import { slugifyRole } from "@/lib/role";

interface Props {
  text?: string | null;
  related?: { role_name: string; role_slug: string }[];
}

export const AlternativeCareers = ({ text, related }: Props) => {
  // Use explicit related list if available, otherwise parse from text (comma / semicolon separated)
  const items =
    related && related.length > 0
      ? related
      : (text || "")
          .split(/[,;\n]/)
          .map((s) => s.trim())
          .filter(Boolean)
          .map((name) => ({ role_name: name, role_slug: slugifyRole(name) }));

  if (items.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((it) => (
        <Link
          key={it.role_slug + it.role_name}
          to={`/role/${it.role_slug}`}
          className="px-3 py-1.5 rounded-full text-sm border border-border bg-card hover:bg-muted text-foreground transition-colors"
        >
          {it.role_name}
        </Link>
      ))}
    </div>
  );
};
