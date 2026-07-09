// Deno mirror of src/lib/reality-check/route-engines/solicitor-flavor.ts.
// Behaviour must stay in lockstep — modify both files together.

import type { ModularPayloadFlavor } from "./_modular_payload.ts";

export type SolicitorRouteId =
  | "sqe_degree_route"
  | "solicitor_apprenticeship_route"
  | "law_degree_then_sqe_route"
  | "non_law_degree_conversion_then_sqe_route"
  | "paralegal_qwe_then_sqe_route"
  | "qualified_lawyer_transfer_route"
  | "lpc_legacy_transition_route";

export const CHARACTER_SUITABILITY_CAVEAT =
  "The SRA assesses character and suitability as part of admission. This checker does not ask for or assess those details.";

export const solicitorFlavor: ModularPayloadFlavor<SolicitorRouteId> = {
  questionLabels: {
    starting_point: "Where are you starting from?",
    highest_qualification: "Highest completed qualification",
    legal_experience: "Current legal experience",
    degree_status: "Degree status",
    lpc_or_legacy_status: "LPC or legacy legal training",
    sqe_awareness: "Familiarity with SQE and QWE",
    qwe_signal: "Qualifying Work Experience (QWE)",
    training_preference: "Preferred route shape",
    study_time_available: "Study time available",
    budget_for_training_and_exams: "Budget for training and SQE exams",
    jurisdiction_or_transfer_status: "Jurisdiction / transfer status",
    route_priorities: "Route priorities",
    checks_before_committing: "Topics to double-check",
  },
  timeCaveats: {
    sqe_degree_route: "SQE1 + SQE2 + two years QWE — provider- and employer-dependent",
    solicitor_apprenticeship_route: "Typically 5–6 years earning while training, employer-dependent",
    law_degree_then_sqe_route: "3 years law degree, then SQE + QWE",
    non_law_degree_conversion_then_sqe_route: "Conversion + SQE + QWE — typically 3+ years post-degree",
    paralegal_qwe_then_sqe_route: "Ongoing — QWE takes at least two years FTE",
    qualified_lawyer_transfer_route: "Timeline set by SRA qualified-lawyer / exemption rules",
    lpc_legacy_transition_route: "Timeline set by SRA LPC transitional-arrangements rules",
  },
  costCaveats: {
    sqe_degree_route: "SQE assessment fees and prep-course costs apply",
    solicitor_apprenticeship_route: "Paid — employer-funded via the apprenticeship levy",
    law_degree_then_sqe_route: "Loan-funded tuition; SQE fees apply after graduation",
    non_law_degree_conversion_then_sqe_route: "Conversion course costs vary; SQE fees apply on top",
    paralegal_qwe_then_sqe_route: "Paralegal work is usually paid; SQE prep and exam fees apply separately",
    qualified_lawyer_transfer_route: "Depends on jurisdiction and SRA exemptions",
    lpc_legacy_transition_route: "Depends on what you've completed and current SRA transitional rules",
  },
  patternCaveats: {
    sqe_degree_route: "Self-managed SQE prep with employer-arranged QWE",
    solicitor_apprenticeship_route: "Employer-led apprenticeship with off-the-job study",
    law_degree_then_sqe_route: "Full-time university study, then SQE prep",
    non_law_degree_conversion_then_sqe_route: "Conversion cohort, then SQE prep",
    paralegal_qwe_then_sqe_route: "Legal work alongside part-time SQE prep",
    qualified_lawyer_transfer_route: "Verification-led — SRA sets the route",
    lpc_legacy_transition_route: "Verification-led — SRA sets the transitional route",
  },
  cautionCard: {
    title: "Paying for a conversion course or SQE prep without checking SRA rules",
    fit: "Conversion courses (PGDL / equivalent) and SQE prep providers vary widely in cost and quality. Neither guarantees SQE success or SRA admission.",
    constraint: "SRA rules on SQE, QWE and admission apply regardless of what a prep provider markets. Paying for a conversion course you don't need — or a prep course with weak outcome evidence — is the most common expensive wrong turn.",
    checks: [
      "Check whether a conversion course (PGDL / equivalent) is actually required for your situation before paying.",
      "Check SQE prep-provider claims — pass-rate methodology, refund terms and outcome evidence — before committing.",
      "Confirm your QWE arrangement with an appropriate confirming solicitor or organisation before assuming the work counts.",
    ],
    nextAction: "Read the SRA SQE and QWE guidance directly before paying for a conversion course or SQE prep course.",
  },
  fitCopyRecommended: () => "This route appears structurally relevant to your answers. It is not a promise of qualification — the SRA is the authority on admission.",
  fitCopyBackup: () => "A second structurally relevant route. Compare against the recommended route and confirm SRA requirements for your situation.",
  investigateAfterCheckFit: "This is the check you need to make first. It is a verification step, not a training route — the SRA decides what applies to you.",
  mayOpenLaterFit: "A route that may become relevant once the step above is in place — not currently a confirmed route for you.",
};
