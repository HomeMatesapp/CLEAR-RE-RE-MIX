// GenericPackWizard — renders a career pack's questionRefs one step at a
// time (Increment 3). Fully driven by the questionnaire payload served by
// the reality-check edge function; nothing role-specific is compiled in.
//
// Design rules honoured here:
//   • Blanks are allowed unless a question is `required` — the evaluator's
//     unknown-answer semantics report honest "requires verification" rather
//     than guessing, so skipping is a legitimate answer.
//   • Questions with visibleWhen appear only when their condition is
//     definitively true; answers to questions that become hidden again are
//     pruned before submission.
//   • No probability language anywhere.

import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AnswerMap, AnswerValue } from "@shared/career-evaluator/v1/types";
import {
  pruneHiddenAnswers,
  visibleQuestions,
  type PackQuestion,
  type PackQuestionnaire,
} from "@/lib/reality-check/generic-pack/api";

interface Props {
  questionnaire: PackQuestionnaire;
  submitting: boolean;
  onSubmit: (answers: AnswerMap) => void;
  onCancel?: () => void;
}

const isAnswered = (v: AnswerValue | undefined): boolean =>
  v !== undefined && v !== null && v !== "" && !(Array.isArray(v) && v.length === 0);

const QuestionInput = ({
  question,
  value,
  onChange,
}: {
  question: PackQuestion;
  value: AnswerValue | undefined;
  onChange: (v: AnswerValue) => void;
}) => {
  switch (question.answerType) {
    case "single_select":
      return (
        <div className="flex flex-col gap-2" role="radiogroup" aria-label={question.label}>
          {(question.options ?? []).map((opt) => {
            const selected = value === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => onChange(opt.value)}
                className={`text-left rounded-lg border px-4 py-3 transition-colors ${
                  selected ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                }`}
              >
                <span className="font-medium">{opt.label}</span>
                {opt.helpText ? (
                  <span className="block text-sm text-muted-foreground mt-0.5">{opt.helpText}</span>
                ) : null}
              </button>
            );
          })}
        </div>
      );
    case "multi_select": {
      const current = Array.isArray(value) ? value : [];
      const toggle = (v: string) =>
        onChange(current.includes(v) ? current.filter((x) => x !== v) : [...current, v]);
      return (
        <div className="flex flex-col gap-2" role="group" aria-label={question.label}>
          {(question.options ?? []).map((opt) => {
            const selected = current.includes(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                role="checkbox"
                aria-checked={selected}
                onClick={() => toggle(opt.value)}
                className={`text-left rounded-lg border px-4 py-3 transition-colors ${
                  selected ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                }`}
              >
                <span className="font-medium">{opt.label}</span>
                {opt.helpText ? (
                  <span className="block text-sm text-muted-foreground mt-0.5">{opt.helpText}</span>
                ) : null}
              </button>
            );
          })}
        </div>
      );
    }
    case "boolean":
      return (
        <div className="flex gap-3" role="radiogroup" aria-label={question.label}>
          {[{ v: true, l: "Yes" }, { v: false, l: "No" }].map(({ v, l }) => (
            <button
              key={l}
              type="button"
              role="radio"
              aria-checked={value === v}
              onClick={() => onChange(v)}
              className={`flex-1 rounded-lg border px-4 py-3 font-medium transition-colors ${
                value === v ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      );
    case "number":
      return (
        <input
          type="number"
          inputMode="numeric"
          className="w-full rounded-lg border border-border px-4 py-3 bg-background"
          aria-label={question.label}
          placeholder={question.placeholder ?? ""}
          value={typeof value === "number" ? value : ""}
          onChange={(e) => {
            const n = e.target.value === "" ? null : Number(e.target.value);
            onChange(n !== null && Number.isFinite(n) ? n : null);
          }}
        />
      );
    case "free_text":
    default:
      return (
        <textarea
          className="w-full rounded-lg border border-border px-4 py-3 bg-background min-h-24"
          aria-label={question.label}
          placeholder={question.placeholder ?? ""}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
        />
      );
  }
};

export const GenericPackWizard = ({ questionnaire, submitting, onSubmit, onCancel }: Props) => {
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [stepIndex, setStepIndex] = useState(0);

  const steps = useMemo(
    () => visibleQuestions(questionnaire.questions, answers),
    [questionnaire.questions, answers],
  );
  const clampedIndex = Math.min(stepIndex, Math.max(steps.length - 1, 0));
  const question = steps[clampedIndex];
  const isLast = clampedIndex === steps.length - 1;
  const answer = question ? answers[question.id] : undefined;
  const canContinue = !question?.required || isAnswered(answer);

  const setAnswer = (v: AnswerValue) => {
    if (!question) return;
    setAnswers((prev) => ({ ...prev, [question.id]: v }));
  };

  const next = () => {
    if (isLast) {
      onSubmit(pruneHiddenAnswers(questionnaire.questions, answers));
      return;
    }
    setStepIndex((i) => Math.min(i + 1, steps.length - 1));
  };
  const back = () => setStepIndex((i) => Math.max(i - 1, 0));

  if (!question) return null;

  return (
    <div className="max-w-2xl mx-auto w-full">
      <div className="mb-6">
        <div className="text-sm text-muted-foreground mb-2">
          Question {clampedIndex + 1} of {steps.length}
        </div>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden" aria-hidden>
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${((clampedIndex + 1) / steps.length) * 100}%` }}
          />
        </div>
      </div>

      <h2 className="text-xl font-semibold mb-1">{question.label}</h2>
      {question.helpText ? (
        <p className="text-muted-foreground mb-3">{question.helpText}</p>
      ) : null}
      {question.whyWeAsk ? (
        <p className="flex items-start gap-2 text-sm text-muted-foreground mb-4">
          <HelpCircle className="h-4 w-4 mt-0.5 shrink-0" aria-hidden />
          <span>{question.whyWeAsk}</span>
        </p>
      ) : null}

      <QuestionInput question={question} value={answer} onChange={setAnswer} />

      {!question.required ? (
        <p className="text-xs text-muted-foreground mt-3">
          Not sure? You can leave this blank — your result will say what still needs checking.
        </p>
      ) : null}

      <div className="flex justify-between mt-8">
        {clampedIndex > 0 ? (
          <Button variant="outline" onClick={back} disabled={submitting}>
            <ArrowLeft className="h-4 w-4 mr-1" aria-hidden /> Back
          </Button>
        ) : onCancel ? (
          <Button variant="outline" onClick={onCancel} disabled={submitting}>
            <ArrowLeft className="h-4 w-4 mr-1" aria-hidden /> Cancel
          </Button>
        ) : <span />}
        <Button onClick={next} disabled={!canContinue || submitting}>
          {isLast ? (submitting ? "Checking…" : "See my result") : "Continue"}
          {!isLast ? <ArrowRight className="h-4 w-4 ml-1" aria-hidden /> : null}
        </Button>
      </div>
    </div>
  );
};
