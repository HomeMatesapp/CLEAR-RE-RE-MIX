// Solicitor role config — Design Brief v2.
//
// First deep-reviewed role in the `legal_finance_professional` family.
// Regulated-professional route, mixed-route metadata local to the engine.
//
// Design constraints (Solicitor Design Brief v2):
//   - No disclosure questions (criminal record, cautions, disciplinary,
//     health, disability, immigration, visa, nationality).
//   - `budget_for_training_and_exams` NEVER gates eligibility.
//   - `checks_before_committing` NEVER gates eligibility and never removes
//     a safety caution.
//   - Character/suitability is a check TOPIC only; the SRA assesses it,
//     this checker never does.

import type { RoleConfig } from "../types";
import { extractSolicitorSignals } from "../signals";
import {
  solicitorBudgetQuestion,
  solicitorChecksBeforeCommittingQuestion,
  solicitorDegreeStatusQuestion,
  solicitorHighestQualificationQuestion,
  solicitorJurisdictionOrTransferStatusQuestion,
  solicitorLegalExperienceQuestion,
  solicitorLpcOrLegacyStatusQuestion,
  solicitorQweSignalQuestion,
  solicitorRoutePrioritiesQuestion,
  solicitorSqeAwarenessQuestion,
  solicitorStartingPointQuestion,
  solicitorStudyTimeAvailableQuestion,
  solicitorTrainingPreferenceQuestion,
} from "../families/legal-finance-professional";

export const solicitorConfig: RoleConfig = {
  roleSlug: "solicitor",
  family: "legal-finance-professional",
  engineId: "solicitor-v1",
  questionnaireVersion: "solicitor-v1",
  scopeNote:
    "This checker compares SQE, apprenticeship, degree, conversion, paralegal/QWE, qualified-lawyer transfer and LPC transitional routes into solicitor qualification in England & Wales. The SRA is the authority — this is not legal advice and does not decide eligibility. Character and suitability is assessed by the SRA; this checker does not ask you to disclose any of it.",
  questions: [
    solicitorStartingPointQuestion,
    solicitorHighestQualificationQuestion,
    solicitorLegalExperienceQuestion,
    solicitorDegreeStatusQuestion,
    solicitorLpcOrLegacyStatusQuestion,
    solicitorSqeAwarenessQuestion,
    solicitorQweSignalQuestion,
    solicitorTrainingPreferenceQuestion,
    solicitorStudyTimeAvailableQuestion,
    solicitorBudgetQuestion,
    solicitorJurisdictionOrTransferStatusQuestion,
    solicitorRoutePrioritiesQuestion,
    solicitorChecksBeforeCommittingQuestion,
  ],
  requestBodyKey: "solicitorSignals",
  extractSignals: extractSolicitorSignals,
};
