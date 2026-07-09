// Legal / finance / professional family questions.
//
// Introduced with the Solicitor module. First deep-reviewed role in the
// `legal_finance_professional` taxonomy family.
//
// Design constraints (Solicitor Design Brief v2):
//   - No question asks the user to disclose criminal record, cautions,
//     disciplinary history, health, disability, immigration, visa or
//     nationality.
//   - `budget_for_training_and_exams` NEVER gates eligibility.
//   - `checks_before_committing` NEVER gates eligibility and never removes
//     a safety caution. `character_and_suitability_process` is a check
//     TOPIC, not a disclosure.
//   - `lpc_or_legacy_status` MUST always be visible so legacy learners are
//     never silently ignored.

import type { Question } from "../types";

export const solicitorStartingPointQuestion: Question = {
  id: "starting_point",
  phase: "starting_point",
  title: "Where are you starting from?",
  helpText: "Pick the option that best describes you right now.",
  whyWeAsk:
    "Your starting point affects which solicitor route may be structurally relevant. It never decides eligibility on its own.",
  controlType: "single_select",
  options: [
    { value: "school_leaver",                                    label: "I'm at or leaving school / college" },
    { value: "current_student",                                  label: "I'm a current student" },
    { value: "graduate_law",                                     label: "I've completed a law degree" },
    { value: "graduate_non_law",                                 label: "I've completed a non-law degree" },
    { value: "paralegal_or_legal_support",                       label: "I work in a paralegal or legal support role" },
    { value: "apprentice_or_legal_admin",                        label: "I'm an apprentice or in legal admin" },
    { value: "qualified_lawyer_overseas_or_other_jurisdiction",  label: "I'm a qualified lawyer from another jurisdiction" },
    { value: "career_changer",                                   label: "I'm changing career" },
    { value: "not_sure",                                         label: "I'm not sure yet" },
  ],
};

export const solicitorHighestQualificationQuestion: Question = {
  id: "highest_qualification",
  phase: "qualifications",
  title: "What's your highest completed qualification?",
  whyWeAsk:
    "Route logic uses your qualification level to compare SQE, apprenticeship, degree and conversion routes. Final SRA admission decisions are made by the SRA, not by this checker.",
  controlType: "single_select",
  options: [
    { value: "none",                                    label: "No formal qualifications yet" },
    { value: "gcse",                                    label: "GCSEs (or equivalent)" },
    { value: "a_level_or_level_3",                      label: "A-levels, BTEC, T Level or another Level 3" },
    { value: "bachelors_law",                           label: "Bachelor's degree in law" },
    { value: "bachelors_non_law",                       label: "Bachelor's degree in another subject" },
    { value: "masters_or_postgraduate",                 label: "Master's degree or other postgraduate qualification" },
    { value: "international_degree_or_qualification",   label: "A degree or qualification from outside the UK" },
    { value: "professional_legal_qualification",        label: "A professional legal qualification from another jurisdiction" },
    { value: "unknown",                                 label: "I'm not sure of the level" },
  ],
};

export const solicitorLegalExperienceQuestion: Question = {
  id: "legal_experience",
  phase: "starting_point",
  title: "What legal experience do you currently have?",
  whyWeAsk:
    "Legal experience shapes which route may be structurally relevant. It never confirms QWE — SRA rules on QWE apply.",
  controlType: "single_select",
  options: [
    { value: "none",                                     label: "None" },
    { value: "school_or_virtual_work_experience",        label: "School or virtual work-experience only" },
    { value: "legal_admin",                              label: "Legal admin" },
    { value: "paralegal",                                label: "Paralegal work" },
    { value: "trainee_or_apprentice_legal_role",         label: "Trainee or apprentice legal role" },
    { value: "qualified_lawyer_outside_england_wales",   label: "Qualified lawyer outside England & Wales" },
    { value: "other_professional_client_work",           label: "Other professional client-facing work" },
    { value: "not_sure",                                 label: "I'm not sure" },
  ],
};

export const solicitorDegreeStatusQuestion: Question = {
  id: "degree_status",
  phase: "qualifications",
  title: "What's your degree status?",
  whyWeAsk:
    "Used to compare law-degree, non-law-degree/conversion and international-degree routes into SQE.",
  controlType: "single_select",
  options: [
    { value: "no_degree",                    label: "No degree" },
    { value: "studying_law_degree",          label: "Studying a law degree" },
    { value: "studying_non_law_degree",      label: "Studying a non-law degree" },
    { value: "completed_law_degree",         label: "Completed a law degree" },
    { value: "completed_non_law_degree",     label: "Completed a non-law degree" },
    { value: "international_degree",         label: "Degree from outside the UK" },
    { value: "unknown",                      label: "I'm not sure" },
  ],
};

export const solicitorLpcOrLegacyStatusQuestion: Question = {
  id: "lpc_or_legacy_status",
  phase: "qualifications",
  title: "Have you done any legacy legal training (LPC, GDL, PGDL or period of recognised training)?",
  helpText:
    "The LPC route is transitional and time-limited. This question is always asked so legacy learners are never silently routed to the standard SQE beginner path.",
  whyWeAsk:
    "If you've done LPC or legacy legal training, this checker treats the route as verification-led. It never asserts your LPC counts — the SRA decides.",
  controlType: "single_select",
  options: [
    { value: "not_started_legal_training",                                label: "I haven't started any legal training yet" },
    { value: "started_or_completed_law_degree_before_sqe_transition",     label: "Started or completed a law degree before the SQE transition" },
    { value: "completed_gdl_or_pgdl",                                     label: "Completed a GDL or PGDL conversion" },
    { value: "completed_lpc",                                             label: "Completed the LPC" },
    { value: "started_period_of_recognised_training",                     label: "Started a period of recognised training (training contract)" },
    { value: "not_sure",                                                  label: "I'm not sure" },
  ],
};

export const solicitorSqeAwarenessQuestion: Question = {
  id: "sqe_awareness",
  phase: "qualifications",
  title: "How familiar are you with SQE and QWE?",
  whyWeAsk:
    "Used only to tailor first-move copy. It never gates eligibility.",
  controlType: "single_select",
  options: [
    { value: "understand_sqe_and_qwe", label: "I understand both SQE and QWE" },
    { value: "heard_of_sqe_not_qwe",   label: "I've heard of SQE but not QWE" },
    { value: "heard_of_qwe_not_sqe",   label: "I've heard of QWE but not SQE" },
    { value: "not_sure",               label: "I'm not sure" },
  ],
};

export const solicitorQweSignalQuestion: Question = {
  id: "qwe_signal",
  phase: "starting_point",
  title: "Do you have (or expect to have) Qualifying Work Experience (QWE)?",
  helpText:
    "QWE is a specific SRA-defined form of experience. This checker never asserts your QWE is accepted — the SRA and your confirming solicitor decide.",
  whyWeAsk:
    "May shape whether the paralegal / QWE route is structurally relevant. Never asserts QWE counts.",
  controlType: "single_select",
  options: [
    { value: "none",                       label: "No — none yet" },
    { value: "may_have_some_legal_work",   label: "I may have some legal work that could count" },
    { value: "employer_can_confirm_qwe",   label: "An employer has said they can confirm QWE" },
    { value: "already_confirmed_qwe",      label: "I already have QWE confirmed by an appropriate person" },
    { value: "not_sure",                   label: "I'm not sure" },
  ],
};

export const solicitorTrainingPreferenceQuestion: Question = {
  id: "training_preference",
  phase: "practical_constraints",
  title: "Which route shape would suit you best?",
  whyWeAsk:
    "Preference reorders eligible routes only — it never opens a route that isn't structurally available.",
  controlType: "single_select",
  options: [
    { value: "earn_while_training",           label: "Earn a wage while I train" },
    { value: "university_first",              label: "Complete a degree first, then SQE" },
    { value: "shortest_structural_route",     label: "The shortest structural route to SQE" },
    { value: "build_legal_experience_first",  label: "Build legal experience first" },
    { value: "not_sure",                      label: "I'm not sure yet" },
  ],
};

export const solicitorStudyTimeAvailableQuestion: Question = {
  id: "study_time_available",
  phase: "practical_constraints",
  title: "What study time can you commit to?",
  whyWeAsk:
    "Different routes assume different study patterns. Time never gates eligibility on its own.",
  controlType: "single_select",
  options: [
    { value: "full_time_study_possible", label: "Full-time study is possible" },
    { value: "part_time_study_possible", label: "Part-time study is possible" },
    { value: "evenings_weekends_only",   label: "Evenings and weekends only" },
    { value: "need_to_keep_earning",     label: "I need to keep earning throughout" },
    { value: "not_sure",                 label: "I'm not sure yet" },
  ],
};

export const solicitorBudgetQuestion: Question = {
  id: "budget_for_training_and_exams",
  phase: "practical_constraints",
  title: "What's your realistic budget for training and SQE exam fees?",
  helpText:
    "Budget never decides which routes are open to you — it only informs cost-risk caveats.",
  whyWeAsk:
    "Cost-risk caveat only. Budget never gates eligibility for any route.",
  controlType: "single_select",
  options: [
    { value: "no_budget",                     label: "No budget right now" },
    { value: "under_1000",                    label: "Under £1,000" },
    { value: "1000_to_5000",                  label: "£1,000–£5,000" },
    { value: "5000_plus",                     label: "£5,000+" },
    { value: "employer_or_sponsor_may_pay",   label: "An employer or sponsor may pay" },
    { value: "not_sure",                      label: "I'm not sure" },
  ],
};

export const solicitorJurisdictionOrTransferStatusQuestion: Question = {
  id: "jurisdiction_or_transfer_status",
  phase: "qualifications",
  title: "What's your jurisdiction / transfer status?",
  whyWeAsk:
    "Already-qualified lawyers from other jurisdictions go through a verification-led route. This checker points you at the SRA — it does not decide the route.",
  controlType: "single_select",
  options: [
    { value: "england_wales_beginner",                     label: "England & Wales beginner" },
    { value: "already_qualified_outside_england_wales",    label: "Already qualified outside England & Wales" },
    { value: "international_qualification_not_sure",       label: "I have an international qualification and I'm not sure" },
    { value: "not_sure",                                   label: "I'm not sure" },
  ],
};

export const solicitorRoutePrioritiesQuestion: Question = {
  id: "route_priorities",
  phase: "practical_constraints",
  title: "Which route priorities matter most to you?",
  helpText: "Priorities reorder eligible routes only — they never open a route that isn't structurally relevant.",
  whyWeAsk:
    "Reorders eligible routes. Never opens a route that would otherwise be blocked.",
  controlType: "multi_select",
  maxSelections: 3,
  options: [
    { value: "avoid_debt",                 label: "Avoid debt" },
    { value: "earn_while_training",        label: "Earn while training" },
    { value: "qualify_as_fast_as_possible", label: "Qualify as fast as possible" },
    { value: "build_legal_experience",     label: "Build legal experience" },
    { value: "academic_law_route",         label: "An academic law route" },
    { value: "flexible_part_time_route",   label: "Flexible / part-time route" },
    { value: "not_sure",                   label: "I'm not sure yet", exclusive: true },
  ],
};

export const solicitorChecksBeforeCommittingQuestion: Question = {
  id: "checks_before_committing",
  phase: "practical_constraints",
  title: "Which topics do you want to double-check before committing?",
  helpText:
    "These are topics to look up — they are not disclosures. They never change which routes are open to you.",
  whyWeAsk:
    "Personalises the checks list only. Never affects eligibility. `Character and suitability` here is a process topic — this checker does not ask you to disclose anything about it.",
  controlType: "multi_select",
  maxSelections: 4,
  options: [
    { value: "sqe_costs_and_exam_requirements",         label: "SQE costs and exam requirements" },
    { value: "qwe_confirmation",                        label: "How QWE is confirmed" },
    { value: "apprenticeship_availability",             label: "Solicitor apprenticeship availability" },
    { value: "course_provider_claims",                  label: "SQE prep-provider claims" },
    { value: "qualified_lawyer_transfer_requirements",  label: "Qualified-lawyer transfer requirements" },
    { value: "lpc_transitional_rules",                  label: "LPC transitional rules" },
    { value: "character_and_suitability_process",       label: "The SRA character and suitability process" },
    { value: "none_of_these",                           label: "None of these", exclusive: true },
  ],
};
