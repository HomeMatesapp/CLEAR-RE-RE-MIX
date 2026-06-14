type Level = "Very High" | "High" | "Moderate" | "Low" | "Minimal";

const colours: Record<Level, string> = {
  "Very High": "bg-destructive/10 text-destructive border-destructive/30",
  "High":      "bg-orange-100 text-orange-900 border-orange-300",
  "Moderate":  "bg-yellow-100 text-yellow-900 border-yellow-300",
  "Low":       "bg-emerald-100 text-emerald-900 border-emerald-300",
  "Minimal":   "bg-sky-100 text-sky-900 border-sky-300",
};

interface Props {
  level: string | null | undefined;
}

export const AIImpactBadge = ({ level }: Props) => {
  if (!level) return null;
  const colour = colours[level as Level] ?? colours.Moderate;
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border whitespace-nowrap ${colour}`}>
      {level} AI impact
    </span>
  );
};
