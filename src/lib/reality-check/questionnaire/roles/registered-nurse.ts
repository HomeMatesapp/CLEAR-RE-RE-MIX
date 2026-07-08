// Registered Nurse role config.
//
// First reviewed modular Reality Check in the `healthcare_clinical` family.
// Proves regulated-healthcare route logic: NMC-approved programme requirement,
// degree vs apprenticeship symmetry, clinical placement reality, nursing-
// associate progression, overseas-trained verification, return to practice,
// and the non-approved-course risk warning.
//
// Contract highlights (see route-engines/registered-nurse.ts for the full
// engine contract):
//   - Six recommendable routes, four outcome statuses. Never claims a user
//     is eligible to register with the NMC.
//   - Verification-led statuses (`qualification_verification_required`)
//     never render a `recommended` or `backup` card. Enforced in the adapter.
//   - Overseas-trained users receive the overseas route as the primary
//     verification card; UK routes may appear only as `may_open_later`.
//   - No question asks the user to disclose health, disability, pregnancy,
//     criminal record, DBS status, occupational-health status, or
//     immigration status.

import type { RoleConfig } from "../types";
import { extractRegisteredNurseSignals } from "../signals";
import {
  currentHealthcareEmploymentQuestion,
  degreeBackgroundSubjectQuestion,
  employerSupportQuestion,
  mathsEnglishScienceStatusQuestion,
  nurseHighestQualificationQuestion,
  nurseStartingPointQuestion,
  nursingRoutePrioritiesQuestion,
  registrationBackgroundQuestion,
  studyPatternAvailableQuestion,
  targetNursingFieldQuestion,
} from "../families/healthcare-clinical";

export const registeredNurseConfig: RoleConfig = {
  roleSlug: "registered-nurse",
  family: "healthcare-clinical",
  engineId: "registered-nurse-v1",
  questionnaireVersion: "registered-nurse-v1",
  scopeNote:
    "This checker covers UK Registered Nurse routes only. It does not cover midwifery, health visiting, SCPHN, advanced practice or prescribing. Only NMC-approved programmes lead to registration — we do not name or endorse specific providers.",
  questions: [
    nurseStartingPointQuestion,
    targetNursingFieldQuestion,
    nurseHighestQualificationQuestion,
    degreeBackgroundSubjectQuestion,
    registrationBackgroundQuestion,
    mathsEnglishScienceStatusQuestion,
    currentHealthcareEmploymentQuestion,
    employerSupportQuestion,
    studyPatternAvailableQuestion,
    nursingRoutePrioritiesQuestion,
  ],
  requestBodyKey: "registeredNurseSignals",
  extractSignals: extractRegisteredNurseSignals,
};
