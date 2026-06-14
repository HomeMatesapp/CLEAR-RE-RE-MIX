interface Props {
  text: string;
}
export const HonestPicture = ({ text }: Props) => (
  <div className="border-l-4 border-honest pl-5 py-2 bg-honest/5 rounded-r-md">
    <p className="text-[15px] leading-relaxed text-foreground whitespace-pre-line">{text}</p>
  </div>
);
