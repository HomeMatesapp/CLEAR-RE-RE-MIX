interface Props {
  text: string | null | undefined;
}
export const OpportunityCost = ({ text }: Props) => {
  if (!text) return null;
  return (
    <div className="rounded-xl border border-border bg-card p-5 sm:p-6">
      <p className="text-[15px] leading-relaxed text-foreground whitespace-pre-line">{text}</p>
    </div>
  );
};
