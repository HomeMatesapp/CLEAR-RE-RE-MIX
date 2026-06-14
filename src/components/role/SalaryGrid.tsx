interface Props {
  entry?: number | null;
  experienced?: number | null;
  senior?: number | null;
  source?: string | null;
}

const fmt = (n?: number | null) => (n ? `£${n.toLocaleString("en-GB")}` : "—");

export const SalaryGrid = ({ entry, experienced, senior, source }: Props) => (
  <div>
    <div className="grid grid-cols-3 gap-3">
      {[
        { label: "Entry", value: entry },
        { label: "Experienced", value: experienced },
        { label: "Senior", value: senior },
      ].map(({ label, value }) => (
        <div key={label} className="p-4 rounded-xl border border-border bg-card text-center">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
          <div className="font-display text-xl md:text-2xl font-semibold text-foreground mt-1">
            {fmt(value)}
          </div>
        </div>
      ))}
    </div>
    {source && (
      <div className="text-xs text-muted-foreground mt-2">Source: {source}</div>
    )}
  </div>
);
