import { useState } from "react";
import { GraduationCap, Repeat, Briefcase, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export type PathwayKey = "school_leaver" | "graduate" | "adjacent" | "no_background";

const cards: { key: PathwayKey; label: string; sub: string; Icon: typeof GraduationCap }[] = [
  { key: "school_leaver",  label: "School leaver",            sub: "Just finishing school",          Icon: GraduationCap },
  { key: "graduate",       label: "Graduate, different subject", sub: "Already have a degree",       Icon: Repeat },
  { key: "adjacent",       label: "Adjacent role",             sub: "Already in a related field",    Icon: Briefcase },
  { key: "no_background",  label: "No relevant background",    sub: "Starting from scratch",         Icon: Sparkles },
];

interface Props {
  content: Partial<Record<PathwayKey, string | null>>;
  onChange?: (key: PathwayKey) => void;
  initial?: PathwayKey;
}

export const PathwayCards = ({ content, onChange, initial = "school_leaver" }: Props) => {
  const [selected, setSelected] = useState<PathwayKey>(initial);
  const text = content[selected];

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        {cards.map(({ key, label, sub, Icon }) => {
          const has = !!content[key];
          const isSelected = selected === key;
          return (
            <button
              key={key}
              onClick={() => {
                setSelected(key);
                onChange?.(key);
              }}
              disabled={!has}
              className={cn(
                "text-left p-4 rounded-xl border-2 transition-all",
                isSelected
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border bg-card hover:border-muted-foreground/40",
                !has && "opacity-50 cursor-not-allowed"
              )}
            >
              <Icon className={cn("h-5 w-5 mb-2", isSelected ? "text-primary" : "text-muted-foreground")} />
              <div className="font-medium text-foreground text-sm">{label}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>
            </button>
          );
        })}
      </div>

      {text ? (
        <div className="mt-6 p-5 sm:p-6 rounded-xl bg-muted/40 border border-border whitespace-pre-line text-[15px] leading-relaxed text-foreground">
          {text}
        </div>
      ) : (
        <div className="mt-6 p-5 rounded-xl bg-muted/40 border border-dashed border-border text-sm text-muted-foreground">
          We don't have specific guidance for this starting point yet. Try one of the other paths above.
        </div>
      )}
    </div>
  );
};
