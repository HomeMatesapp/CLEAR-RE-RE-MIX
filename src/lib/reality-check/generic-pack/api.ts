// Generic-pack Reality Check client layer (Increment 3).
//
// The client NEVER selects or fetches a pack. Both calls go through the
// reality-check edge function, which resolves the bound pack server-side:
//   • fetchPackQuestionnaire — renderable questions only (no rules, no
//     evidence internals, no test fixtures)
//   • evaluatePackAnswers — evaluation + assessment receipt; the browser
//     never submits results, only the opaque receipt when saving.

import { supabase } from "@/integrations/supabase/client";
import { matchesCondition } from "@shared/career-evaluator/v1/evaluate";
import type { AnswerMap, CareerDecisionPackV1, ConditionNode } from "@shared/career-evaluator/v1/types";
import type { RealityCheckResultV2 } from "@shared/career-evaluator/v1/result-v2";

export interface PackQuestionOption {
  value: string;
  label: string;
  helpText?: string | null;
}

export interface PackQuestion {
  id: string;
  label: string;
  helpText: string | null;
  whyWeAsk: string | null;
  answerType: "single_select" | "multi_select" | "boolean" | "number" | "free_text";
  options: PackQuestionOption[] | null;
  visibleWhen: ConditionNode | null;
  required: boolean;
  placeholder: string | null;
  contextOnly: boolean;
}

export interface PackQuestionnaire {
  slug: string;
  roleSlug: string;
  careerTitle: string;
  packVersion: string;
  contentHash: string;
  geographicScope: string[];
  regulatoryNote: string | null;
  questions: PackQuestion[];
}

export interface PackEvaluation {
  resultV2: RealityCheckResultV2;
  assessmentReceipt: string;
  assessmentReceiptExpiresAt: string;
  packVersion: string;
}

interface RoleForCheck {
  id: string;
  role_slug: string;
  role_name: string;
}

/** Returns the questionnaire when the role has a servable, renderable pack;
 *  null when it doesn't (no binding, unavailable, or pre-metadata pack) —
 *  the caller falls back exactly as if no pack existed. Throws only on
 *  unexpected transport errors. */
export const fetchPackQuestionnaire = async (
  role: RoleForCheck,
): Promise<PackQuestionnaire | null> => {
  const { data, error } = await supabase.functions.invoke("reality-check", {
    body: { role, mode: "questionnaire" },
  });
  if (error) {
    // Edge non-2xx surfaces as FunctionsHttpError; treat the known refusal
    // statuses as "no pack for you" rather than a failure.
    return null;
  }
  const body = data as { questionnaire?: PackQuestionnaire; error?: string };
  if (body?.error || !body?.questionnaire) return null;
  return body.questionnaire;
};

export const evaluatePackAnswers = async (
  role: RoleForCheck,
  answers: AnswerMap,
): Promise<PackEvaluation> => {
  const { data, error } = await supabase.functions.invoke("reality-check", {
    body: { role, answers },
  });
  if (error) throw error;
  const body = data as {
    error?: string;
    resultV2?: RealityCheckResultV2;
    assessmentReceipt?: string;
    assessmentReceiptExpiresAt?: string;
    packMetadata?: { packVersion?: string };
  };
  if (body?.error) throw new Error(body.error);
  if (!body?.resultV2 || !body?.assessmentReceipt) {
    throw new Error("unexpected_response");
  }
  return {
    resultV2: body.resultV2,
    assessmentReceipt: body.assessmentReceipt,
    assessmentReceiptExpiresAt: body.assessmentReceiptExpiresAt ?? "",
    packVersion: body.packMetadata?.packVersion ?? body.resultV2.packVersion ?? "",
  };
};

// ── Visibility (pure; unit-tested) ──────────────────────────────────────────

/** Build the minimal pack shape matchesCondition needs: questionRefs with
 *  allowedValues derived from option order (which also defines the ordinal
 *  ordering for qual_level_gte in visibleWhen conditions). */
const pseudoPack = (questions: readonly PackQuestion[]): CareerDecisionPackV1 =>
  ({
    questionRefs: questions.map((q) => ({
      id: q.id,
      label: q.label,
      allowedValues: q.options?.map((o) => o.value),
    })),
  }) as unknown as CareerDecisionPackV1;

/** A question is visible when it has no condition, or its condition is
 *  definitively true over the answers so far. Indeterminate ⇒ hidden — we
 *  never show a question whose premise is unknown. */
export const visibleQuestions = (
  questions: readonly PackQuestion[],
  answers: AnswerMap,
): PackQuestion[] => {
  const pack = pseudoPack(questions);
  return questions.filter((q) =>
    !q.visibleWhen || matchesCondition(pack, answers, q.visibleWhen) === true,
  );
};

/** Answers to questions that are (or have become) hidden are discarded before
 *  evaluation — a hidden question must never influence a result. */
export const pruneHiddenAnswers = (
  questions: readonly PackQuestion[],
  answers: AnswerMap,
): AnswerMap => {
  const visible = new Set(visibleQuestions(questions, answers).map((q) => q.id));
  const pruned: AnswerMap = {};
  for (const [k, v] of Object.entries(answers)) if (visible.has(k)) pruned[k] = v;
  return pruned;
};
