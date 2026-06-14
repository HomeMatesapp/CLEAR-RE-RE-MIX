import { ReactNode } from "react";

interface Props {
  title?: string;
  children: ReactNode;
}

export const Section = ({ title, children }: Props) => (
  <section className="py-8 border-t border-border first:border-t-0 first:pt-0">
    {title && (
      <h2 className="font-display text-xs uppercase tracking-[0.15em] text-muted-foreground mb-4">
        {title}
      </h2>
    )}
    {children}
  </section>
);
