import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const colours: Record<string, string> = {
  Low:      "bg-emerald-100 text-emerald-900 border-emerald-300",
  Moderate: "bg-emerald-100 text-emerald-900 border-emerald-300",
  High:     "bg-amber-100 text-amber-900 border-amber-300",
  Extreme:  "bg-destructive/10 text-destructive border-destructive/30",
};

export const CompetitionBadge = ({ competition }: { competition: string | null | undefined }) => {
  if (!competition) return null;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border cursor-help whitespace-nowrap ${colours[competition] || colours.Moderate}`}>
          {competition} competition
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs text-xs">
        Competition measures how many qualified candidates apply for each opening — different from demand.
      </TooltipContent>
    </Tooltip>
  );
};

export const DemandBadge = ({ demand }: { demand: string | null | undefined }) => {
  if (!demand) return null;
  const positive = ["High", "Growing"].includes(demand);
  const negative = ["Low", "Declining", "Competitive"].includes(demand);
  const cls = positive
    ? "bg-emerald-100 text-emerald-900 border-emerald-300"
    : negative
      ? "bg-destructive/10 text-destructive border-destructive/30"
      : "bg-amber-100 text-amber-900 border-amber-300";
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border whitespace-nowrap ${cls}`}>
      {demand} demand
    </span>
  );
};
