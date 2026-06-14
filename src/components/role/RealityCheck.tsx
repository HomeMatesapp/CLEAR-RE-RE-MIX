interface Props {
  text: string;
}
export const RealityCheck = ({ text }: Props) => (
  <div className="rounded-xl border border-reality/40 bg-reality/40 p-5 sm:p-6">
    <p className="text-[15px] leading-relaxed text-foreground whitespace-pre-line">{text}</p>
  </div>
);
