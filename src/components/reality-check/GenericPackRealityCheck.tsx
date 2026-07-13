// GenericPackRealityCheck — orchestrates the pack-backed Reality Check flow
// (Increment 3): questionnaire → wizard → server evaluation → V2 result →
// trusted save via assessment receipt.
//
// The browser never submits results. Saving hands the opaque receipt to the
// save-decision edge function (signed in), or stashes it as the pending
// decision so the existing auth flow flushes it after sign-in.

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bookmark, CheckCircle2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { AnswerMap } from "@shared/career-evaluator/v1/types";
import type { RealityCheckAnswers, RealityCheckResult } from "@/lib/reality-check/types";
import {
  evaluatePackAnswers,
  fetchPackQuestionnaire,
  type PackQuestionnaire,
} from "@/lib/reality-check/generic-pack/api";
import type { RealityCheckResultV2 } from "@shared/career-evaluator/v1/result-v2";
import { GenericPackWizard } from "@/components/reality-check/GenericPackWizard";
import { ResultV2View } from "@/components/reality-check/ResultV2View";
import { saveGenericPackDecision, stashPendingDecision } from "@/lib/saved-decisions";
import { trackEvent } from "@/lib/posthog";

interface RoleForCheck {
  id: string;
  role_slug: string;
  role_name: string;
}

type SaveState = "idle" | "saving" | "saved" | "stashed" | "failed";

interface Props {
  role: RoleForCheck;
  questionnaire: PackQuestionnaire;
}

export const GenericPackRealityCheck = ({ role, questionnaire }: Props) => {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RealityCheckResultV2 | null>(null);
  const [receipt, setReceipt] = useState<{ token: string; expiresAt: string } | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [wizardKey, setWizardKey] = useState(0);

  const submit = async (answers: AnswerMap) => {
    setSubmitting(true);
    setError(null);
    trackEvent("reality_check_submitted", { role: role.role_name, source: "generic_pack" });
    try {
      const evaluation = await evaluatePackAnswers(role, answers);
      setResult(evaluation.resultV2);
      setReceipt({ token: evaluation.assessmentReceipt, expiresAt: evaluation.assessmentReceiptExpiresAt });
      trackEvent("reality_check_result", {
        role: role.role_name,
        source: "generic_pack",
        pack_version: evaluation.packVersion,
      });
    } catch (e) {
      setError((e as Error).message || "Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const save = async () => {
    if (!receipt) return;
    setSaveState("saving");
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      try {
        await saveGenericPackDecision(receipt.token);
        setSaveState("saved");
      } catch {
        setSaveState("failed");
      }
      return;
    }
    // Not signed in: stash the receipt; useAuth flushes it after sign-in
    // through the trusted-save path. The empty answers/result satisfy the
    // pending-decision shape without persisting anything client-authored.
    stashPendingDecision(
      role,
      {} as RealityCheckAnswers,
      {} as unknown as RealityCheckResult,
      undefined,
      { assessmentReceipt: receipt.token, assessmentReceiptExpiresAt: receipt.expiresAt },
    );
    setSaveState("stashed");
  };

  if (result) {
    return (
      <div className="px-4 py-8">
        <ResultV2View result={result} />
        <div className="max-w-3xl mx-auto w-full mt-6 flex flex-wrap gap-3 items-center">
          <Button onClick={save} disabled={saveState === "saving" || saveState === "saved"}>
            <Bookmark className="h-4 w-4 mr-1" aria-hidden />
            {saveState === "saved" ? "Saved" : saveState === "saving" ? "Saving…" : "Save this result"}
          </Button>
          <Button
            variant="outline"
            onClick={() => { setResult(null); setReceipt(null); setSaveState("idle"); setWizardKey((k) => k + 1); }}
          >
            <Pencil className="h-4 w-4 mr-1" aria-hidden /> Start again
          </Button>
          {saveState === "saved" ? (
            <span className="flex items-center gap-1 text-sm text-emerald-700">
              <CheckCircle2 className="h-4 w-4" aria-hidden /> Saved to <Link className="underline" to="/my-route">My Route</Link>
            </span>
          ) : null}
          {saveState === "stashed" ? (
            <span className="text-sm text-muted-foreground">
              <Link className="underline" to="/auth">Sign in</Link> to finish saving — we'll keep it ready.
            </span>
          ) : null}
          {saveState === "failed" ? (
            <span className="text-sm text-red-700">
              Saving didn't work — the result may have expired. You can run the check again.
            </span>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-8">
      {error ? (
        <div className="max-w-2xl mx-auto w-full mb-4 rounded-lg border border-red-200 bg-red-50 text-red-800 px-4 py-3 text-sm" role="alert">
          {error}
        </div>
      ) : null}
      <GenericPackWizard
        key={wizardKey}
        questionnaire={questionnaire}
        submitting={submitting}
        onSubmit={submit}
      />
    </div>
  );
};

/** Hook: resolve whether a role has a servable, renderable pack. `undefined`
 *  while loading, `null` when there is none (caller falls back). */
export const usePackQuestionnaire = (role: RoleForCheck | null) => {
  const [state, setState] = useState<PackQuestionnaire | null | undefined>(undefined);
  useEffect(() => {
    let cancelled = false;
    if (!role) { setState(null); return; }
    setState(undefined);
    fetchPackQuestionnaire(role)
      .then((q) => { if (!cancelled) setState(q); })
      .catch(() => { if (!cancelled) setState(null); });
    return () => { cancelled = true; };
  }, [role?.id, role?.role_slug]);
  return state;
};
