import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { trackEvent } from "@/lib/posthog";

interface Props {
  roleSlug: string;
}

export const PersonalisationPrompt = ({ roleSlug }: Props) => {
  const dismissedKey = "cr_personalise_dismissed";
  const [dismissed, setDismissed] = useState(() =>
    typeof window !== "undefined" ? sessionStorage.getItem(dismissedKey) === "1" : false
  );

  if (dismissed) return null;

  return (
    <div className="rounded-2xl border border-border bg-muted/40 p-5 sm:p-6">
      <h3 className="font-display text-lg font-semibold text-foreground">
        Want advice based on your situation?
      </h3>
      <p className="text-sm text-muted-foreground mt-1">
        We'll show you support you may be eligible for and routes tailored to where you are.
      </p>
      <div className="flex flex-wrap gap-3 mt-4">
        <Button asChild onClick={() => trackEvent("personalisation_prompt_clicked", { role: roleSlug })}>
          <Link to={`/personalise?from=${encodeURIComponent(roleSlug)}`}>Personalise my route</Link>
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            trackEvent("personalisation_prompt_skipped", { role: roleSlug });
            sessionStorage.setItem(dismissedKey, "1");
            setDismissed(true);
          }}
        >
          Skip — not now
        </Button>
      </div>
    </div>
  );
};
