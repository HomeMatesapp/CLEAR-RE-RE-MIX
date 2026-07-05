// Increment 1b — versioned richer answer model.
//
// Introduces a generic answer envelope (RichAnswer) and a versioned container
// (RealityCheckAnswerSnapshotV2) that preserves raw input, the option the user
// selected, any future AI-proposed interpretation, and — separately — the
// canonical value trusted by downstream rules.
//
// The deterministic engine is NOT taught to read RichAnswer directly. Instead
// this module ships a single adapter, `toLegacyRealityCheckAnswers`, that
// projects a V2 snapshot back down to the existing RealityCheckAnswers enum
// shape. Only `confirmedCanonicalValue` is trusted; raw text, unresolved
// answers, and candidate values are ignored.

import {
  BUDGETS,
  COMMUTE_FLEX,
  ENGLISH_COMFORT,
  ENGLISH_MATHS,
  INCOME_NEEDS,
  QUALIFICATION_LEVELS,
  SCIENCE_SUBJECTS,
  STARTING_POINTS,
  WEEKLY_HOURS,
  type Budget,
  type CommuteFlex,
  type EnglishComfort,
  type EnglishMaths,
  type IncomeNeed,
  type QualificationLevel,
  type RealityCheckAnswers,
  type ScienceSubjects,
  type StartingPoint,
  type WeeklyHours,
} from "./types";
import { REGIONS, type Region } from "./regions";

// ── Versions ──────────────────────────────────────────────────────────────────

// How the answer data is structured. Bumped when the RichAnswer shape or
// snapshot container changes in a way that requires migration.
export const ANSWER_SCHEMA_VERSION = 2 as const;

// Which questions and wording produced this snapshot. Bumped when the
// questionnaire content changes (added/removed questions, reworded options).
// Not a timestamp — a stable identifier so historical results can be
// reproduced or reinterpreted deterministically.
export const QUESTIONNAIRE_VERSION = "core-2026-07-v1";

// ── Envelope types ────────────────────────────────────────────────────────────

export type AnswerResolutionStatus = "resolved" | "unresolved" | "not_applicable";

export type ConfirmationSource =
  | "structured_option"
  | "user_confirmed"
  | "deterministic_match"
  | "verified_dataset";

export type InterpretationConfidence = "high" | "medium" | "low";

export interface RichAnswer {
  questionId: string;
  // Preserve exactly what the user supplied.
  rawValue?: string | string[] | number | boolean;
  rawText?: string;
  // Value chosen from an existing controlled UI option.
  selectedValue?: string | string[];
  // Reserved for later AI interpretation work (Increment 2).
  candidateCanonicalValue?: string | string[];
  confidence?: InterpretationConfidence;
  clarificationQuestion?: string;
  // The ONLY interpreted value trusted by downstream rules.
  confirmedCanonicalValue?: string | string[];
  confirmationSource?: ConfirmationSource;
  resolutionStatus: AnswerResolutionStatus;
  answeredAt?: string;
  updatedAt?: string;
}

export interface RealityCheckAnswerSnapshotV2 {
  schemaVersion: 2;
  roleSlug: string;
  questionnaireVersion: string;
  answers: Record<string, RichAnswer>;
  createdAt: string;
  updatedAt: string;
}

// Structured qualification type reserved for future increments. Not yet
// populated from the current broad enum — see Increment 1b requirements.
export interface QualificationRecord {
  id: string;
  rawTitle: string;
  canonicalTitle?: string;
  level?: string;
  subject?: string;
  awardingBody?: string;
  country?: string;
  completionStatus?: "completed" | "in_progress" | "not_completed";
  yearCompleted?: number;
  confirmationSource?: ConfirmationSource;
}

// ── Question IDs ──────────────────────────────────────────────────────────────

export const QUESTION_IDS = {
  startingPoint: "starting_point",
  relevantBackground: "relevant_background",
  qualificationLevel: "qualification_level",
  englishMaths: "english_maths",
  scienceSubjects: "science_subjects",
  englishComfort: "english_comfort",
  incomeNeed: "income_need",
  weeklyHours: "weekly_hours",
  budget: "budget",
  region: "region",
  area: "area",
  commuteFlex: "commute_flex",
  notes: "notes",
} as const;

export type KnownQuestionId = (typeof QUESTION_IDS)[keyof typeof QUESTION_IDS];

// Allow-lists so an unsupported canonical value from a future or malformed
// snapshot is rejected rather than blindly cast.
const enumValues = <T extends string>(opts: { value: T }[]): readonly T[] =>
  opts.map((o) => o.value);

const STARTING_POINT_VALUES = enumValues(STARTING_POINTS);
const QUALIFICATION_LEVEL_VALUES = enumValues(QUALIFICATION_LEVELS);
const ENGLISH_MATHS_VALUES = enumValues(ENGLISH_MATHS);
const SCIENCE_SUBJECTS_VALUES = enumValues(SCIENCE_SUBJECTS);
const ENGLISH_COMFORT_VALUES = enumValues(ENGLISH_COMFORT);
const INCOME_NEED_VALUES = enumValues(INCOME_NEEDS);
const WEEKLY_HOURS_VALUES = enumValues(WEEKLY_HOURS);
const BUDGET_VALUES = enumValues(BUDGETS);
const COMMUTE_FLEX_VALUES = enumValues(COMMUTE_FLEX);
const REGION_VALUES = REGIONS.map((r) => r.value) as readonly Region[];

const scalarConfirmed = (ans: RichAnswer | undefined): string | null => {
  if (!ans) return null;
  if (ans.resolutionStatus !== "resolved") return null;
  const v = ans.confirmedCanonicalValue;
  if (typeof v !== "string") return null;
  return v;
};

const pickEnum = <T extends string>(
  ans: RichAnswer | undefined,
  allow: readonly T[],
): T | null => {
  const v = scalarConfirmed(ans);
  if (v == null) return null;
  return (allow as readonly string[]).includes(v) ? (v as T) : null;
};

// ── Build a V2 snapshot from a legacy answers object ──────────────────────────
//
// Every current answer is represented. Structured choices resolve immediately;
// the free-text `relevantBackground`, `area`, and `notes` are stored as
// rawText — never elevated to a canonical value in this increment.

interface BuildSnapshotOptions {
  roleSlug: string;
  // If the starting-point question was answered unresolved ("Not sure" /
  // "Something else"), the caller passes the status so the snapshot can
  // record it correctly. Free text (if any) is stored in rawText.
  startingPointUnresolved?:
    | { status: "unresolved_not_sure" }
    | { status: "unresolved_other"; rawText: string }
    | null;
  now?: () => string;
}

const structured = (
  questionId: string,
  value: string | null,
  now: string,
): RichAnswer | null => {
  if (!value) return null;
  return {
    questionId,
    selectedValue: value,
    confirmedCanonicalValue: value,
    confirmationSource: "structured_option",
    resolutionStatus: "resolved",
    answeredAt: now,
    updatedAt: now,
  };
};

const rawTextAnswer = (
  questionId: string,
  text: string,
  now: string,
): RichAnswer | null => {
  const trimmed = text.trim();
  if (!trimmed) return null;
  return {
    questionId,
    rawText: trimmed,
    // Free text isn't a canonical value yet — later increments may lift it
    // into confirmedCanonicalValue via AI interpretation + user confirmation.
    resolutionStatus: "unresolved",
    answeredAt: now,
    updatedAt: now,
  };
};

export const buildSnapshotFromLegacy = (
  answers: RealityCheckAnswers,
  opts: BuildSnapshotOptions,
): RealityCheckAnswerSnapshotV2 => {
  const now = (opts.now ?? (() => new Date().toISOString()))();
  const out: Record<string, RichAnswer> = {};

  // Starting point — either resolved from a structured option, or explicitly
  // unresolved ("Not sure" / "Something else").
  if (answers.startingPoint) {
    const a = structured(QUESTION_IDS.startingPoint, answers.startingPoint, now);
    if (a) out[QUESTION_IDS.startingPoint] = a;
  } else if (opts.startingPointUnresolved) {
    const u = opts.startingPointUnresolved;
    out[QUESTION_IDS.startingPoint] = {
      questionId: QUESTION_IDS.startingPoint,
      selectedValue: u.status === "unresolved_not_sure" ? "not_sure" : "other",
      rawText: u.status === "unresolved_other" ? u.rawText.trim() : undefined,
      resolutionStatus: "unresolved",
      answeredAt: now,
      updatedAt: now,
    };
  }

  const put = (id: string, a: RichAnswer | null) => {
    if (a) out[id] = a;
  };

  put(
    QUESTION_IDS.relevantBackground,
    rawTextAnswer(QUESTION_IDS.relevantBackground, answers.relevantBackground, now),
  );
  put(QUESTION_IDS.qualificationLevel, structured(QUESTION_IDS.qualificationLevel, answers.qualificationLevel, now));
  put(QUESTION_IDS.englishMaths, structured(QUESTION_IDS.englishMaths, answers.englishMaths, now));
  put(QUESTION_IDS.scienceSubjects, structured(QUESTION_IDS.scienceSubjects, answers.scienceSubjects, now));
  put(QUESTION_IDS.englishComfort, structured(QUESTION_IDS.englishComfort, answers.englishComfort, now));
  put(QUESTION_IDS.incomeNeed, structured(QUESTION_IDS.incomeNeed, answers.incomeNeed, now));
  put(QUESTION_IDS.weeklyHours, structured(QUESTION_IDS.weeklyHours, answers.weeklyHours, now));
  put(QUESTION_IDS.budget, structured(QUESTION_IDS.budget, answers.budget, now));
  put(QUESTION_IDS.region, structured(QUESTION_IDS.region, answers.region, now));
  put(QUESTION_IDS.area, rawTextAnswer(QUESTION_IDS.area, answers.area, now));
  put(QUESTION_IDS.commuteFlex, structured(QUESTION_IDS.commuteFlex, answers.commuteFlex, now));
  put(QUESTION_IDS.notes, rawTextAnswer(QUESTION_IDS.notes, answers.notes, now));

  return {
    schemaVersion: ANSWER_SCHEMA_VERSION,
    roleSlug: opts.roleSlug,
    questionnaireVersion: QUESTIONNAIRE_VERSION,
    answers: out,
    createdAt: now,
    updatedAt: now,
  };
};

// ── Legacy adapter ────────────────────────────────────────────────────────────
//
// Reads ONLY confirmedCanonicalValue. Ignores candidateCanonicalValue and
// unresolved raw text. Unknown question IDs are silently ignored (do not
// crash). Values not in the allow-list are rejected (null), never blindly
// cast.

const emptyLegacyAnswers: RealityCheckAnswers = {
  startingPoint: null,
  relevantBackground: "",
  englishMaths: null,
  scienceSubjects: null,
  qualificationLevel: null,
  englishComfort: null,
  incomeNeed: null,
  weeklyHours: null,
  budget: null,
  region: null,
  area: "",
  commuteFlex: null,
  notes: "",
};

export const toLegacyRealityCheckAnswers = (
  snapshot: RealityCheckAnswerSnapshotV2,
): RealityCheckAnswers => {
  const a = snapshot.answers ?? {};
  const getConfirmed = (id: string): RichAnswer | undefined => {
    const r = a[id];
    if (!r) return undefined;
    // Defence in depth: only trust confirmed values.
    if (r.confirmedCanonicalValue === undefined) return undefined;
    return r;
  };

  return {
    ...emptyLegacyAnswers,
    startingPoint: pickEnum<StartingPoint>(getConfirmed(QUESTION_IDS.startingPoint), STARTING_POINT_VALUES),
    // Free-text answers do not reach the engine as text. All the engine
    // wants to know is whether related experience was declared — mirror the
    // "Provided" sentinel already used by sanitiseDecisionAnswers so the
    // deterministic rules see equivalent input.
    relevantBackground: a[QUESTION_IDS.relevantBackground]?.rawText?.trim() ? "Provided" : "",
    qualificationLevel: pickEnum<QualificationLevel>(
      getConfirmed(QUESTION_IDS.qualificationLevel),
      QUALIFICATION_LEVEL_VALUES,
    ),
    englishMaths: pickEnum<EnglishMaths>(getConfirmed(QUESTION_IDS.englishMaths), ENGLISH_MATHS_VALUES),
    scienceSubjects: pickEnum<ScienceSubjects>(
      getConfirmed(QUESTION_IDS.scienceSubjects),
      SCIENCE_SUBJECTS_VALUES,
    ),
    englishComfort: pickEnum<EnglishComfort>(getConfirmed(QUESTION_IDS.englishComfort), ENGLISH_COMFORT_VALUES),
    incomeNeed: pickEnum<IncomeNeed>(getConfirmed(QUESTION_IDS.incomeNeed), INCOME_NEED_VALUES),
    weeklyHours: pickEnum<WeeklyHours>(getConfirmed(QUESTION_IDS.weeklyHours), WEEKLY_HOURS_VALUES),
    budget: pickEnum<Budget>(getConfirmed(QUESTION_IDS.budget), BUDGET_VALUES),
    region: pickEnum<Region>(getConfirmed(QUESTION_IDS.region), REGION_VALUES),
    // `area` is free-text collected alongside the region. Trim and cap.
    area: (a[QUESTION_IDS.area]?.rawText ?? "").trim().slice(0, 80),
    commuteFlex: pickEnum<CommuteFlex>(getConfirmed(QUESTION_IDS.commuteFlex), COMMUTE_FLEX_VALUES),
    // `notes` is deliberately dropped — never reaches the engine.
    notes: "",
  };
};

// Safe type guard for snapshots read back from JSONB.
export const isSnapshotV2 = (v: unknown): v is RealityCheckAnswerSnapshotV2 => {
  if (!v || typeof v !== "object") return false;
  const r = v as Record<string, unknown>;
  return (
    r.schemaVersion === ANSWER_SCHEMA_VERSION &&
    typeof r.roleSlug === "string" &&
    typeof r.questionnaireVersion === "string" &&
    !!r.answers &&
    typeof r.answers === "object"
  );
};
