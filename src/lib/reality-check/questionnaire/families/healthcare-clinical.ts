// Healthcare / clinical family questions.
//
// Introduced with the Registered Nurse module. This family is meaningfully
// different from the trades and digital families because eligibility is
// gated by a statutory regulator (the NMC) and by employer/provider
// verification, not by budget or portfolio evidence. As a result:
//
//   - `highest_qualification` accepts an `overseas_nursing_qualification`
//     value that NEVER counts as a UK Level 3 signal (see engine helper
//     `hasLevel3Signal`). Overseas qualifications trigger verification.
//   - `maths_english_science_status` is nursing-specific because GCSE science
//     is a distinct entry criterion; the trades family
//     `maths_english_status` question is NOT reused.
//   - `nursing_route_priorities` is a distinct question id from
//     `route_priorities` and `digital_route_priorities` so this family does
//     not mutate the existing reviewed trades or digital priority questions.
//
// This family DELIBERATELY contains no question that asks the user to
// disclose health conditions, disability, pregnancy, criminal record, DBS
// status, occupational-health status, or immigration/visa status. Those
// items belong to the employer/provider/NMC — not to the checker.

import type { Question } from "../types";

// Nursing-augmented starting-point question. Built as its own object so the
// universal `starting_point` question is not mutated.
export const nurseStartingPointQuestion: Question = {
  id: "starting_point",
  phase: "starting_point",
  title: "Where are you starting from?",
  helpText: "Choose the option that best describes you right now.",
  whyWeAsk:
    "Your starting point affects which nursing routes may be structurally relevant. Overseas-trained and previously-registered nurses go through verification-led routes, not standard UK education routes.",
  controlType: "single_select",
  options: [
    { value: "complete_beginner",                    label: "I'm new to healthcare" },
    { value: "some_health_or_care_experience",       label: "I have some health or care experience" },
    { value: "currently_healthcare_support_worker",  label: "I currently work as a healthcare support worker" },
    { value: "nursing_associate_or_assistant_practitioner", label: "I'm a nursing associate or assistant practitioner" },
    { value: "graduate_non_nursing",                 label: "I'm a graduate in a non-nursing subject" },
    { value: "trained_as_nurse_outside_uk",          label: "I trained as a nurse outside the UK" },
    { value: "previously_registered_nurse",          label: "I was previously a registered nurse in the UK" },
    { value: "already_registered_nurse_other_field", label: "I'm currently NMC-registered in another field" },
    { value: "not_sure",                             label: "I'm not sure yet" },
  ],
};

export const targetNursingFieldQuestion: Question = {
  id: "target_nursing_field",
  phase: "starting_point",
  title: "Which field of nursing are you thinking about?",
  whyWeAsk:
    "UK pre-registration nursing programmes are usually field-specific. This is captured for caveat copy only — it does not affect which routes are structurally relevant.",
  controlType: "single_select",
  options: [
    { value: "adult",              label: "Adult nursing" },
    { value: "child",              label: "Children's nursing" },
    { value: "mental_health",      label: "Mental health nursing" },
    { value: "learning_disability", label: "Learning disability nursing" },
    { value: "not_sure",           label: "I'm not sure yet" },
  ],
};

export const nurseHighestQualificationQuestion: Question = {
  id: "highest_qualification",
  phase: "qualifications",
  title: "What's your highest completed qualification?",
  whyWeAsk:
    "Different nursing routes have different starting points. Your qualification level affects which routes are structurally open now and which may need verification or a bridging step first.",
  controlType: "single_select",
  options: [
    { value: "none",                              label: "No formal qualifications yet" },
    { value: "gcse",                              label: "GCSEs (or equivalent)" },
    { value: "a_level",                           label: "A-levels (or equivalent)" },
    { value: "l3_vocational",                     label: "Level 3 apprenticeship, BTEC or T Level" },
    { value: "access_to_he_health_science",       label: "Access to HE Diploma (Nursing / Health / Science)" },
    { value: "bachelors_health_related",          label: "Bachelor's degree in a health-related subject" },
    { value: "bachelors_other",                   label: "Bachelor's degree in another subject" },
    { value: "nursing_associate_foundation_degree", label: "Nursing Associate foundation degree" },
    { value: "overseas_nursing_qualification",    label: "A nursing qualification from outside the UK" },
    { value: "unknown",                           label: "I'm not sure of the level" },
  ],
};

export const mathsEnglishScienceStatusQuestion: Question = {
  id: "maths_english_science_status",
  phase: "qualifications",
  title: "Which best describes your GCSE maths, English and science?",
  whyWeAsk:
    "UK nursing programmes usually expect GCSE maths, English and science (or accepted equivalents). Missing science can often be topped up; missing maths or English is a more common bridging step.",
  controlType: "single_select",
  options: [
    { value: "english_maths_science_gcse_met", label: "I have all three (or accepted equivalents)" },
    { value: "english_maths_met_science_missing", label: "I have English and maths but not science" },
    { value: "maths_or_english_missing",        label: "I'm missing maths, English, or both" },
    { value: "unsure",                          label: "I'm not sure what I have" },
  ],
};

export const currentHealthcareEmploymentQuestion: Question = {
  id: "current_healthcare_employment",
  phase: "practical_constraints",
  title: "Are you currently working in healthcare?",
  whyWeAsk:
    "Some routes (nursing degree apprenticeship, nursing-associate progression) depend on being in a healthcare role with a supporting employer.",
  controlType: "single_select",
  options: [
    { value: "not_currently_employed_in_healthcare", label: "Not currently working in healthcare" },
    { value: "employed_healthcare_support_role",     label: "Healthcare support worker or care assistant" },
    { value: "employed_nursing_associate",           label: "Nursing associate" },
    { value: "employed_assistant_practitioner",      label: "Assistant practitioner" },
    { value: "employed_other_healthcare",            label: "Other healthcare role" },
    { value: "not_sure",                             label: "I'm not sure" },
  ],
};

export const employerSupportQuestion: Question = {
  id: "employer_support",
  phase: "practical_constraints",
  title: "Would your employer support you onto a nursing training route?",
  whyWeAsk:
    "Degree apprenticeships and internal progression routes require employer sponsorship. This is checked here but availability of vacancies is still an employer decision.",
  controlType: "single_select",
  visibleWhen: {
    questionId: "current_healthcare_employment",
    valueIn: [
      "employed_healthcare_support_role",
      "employed_nursing_associate",
      "employed_assistant_practitioner",
      "employed_other_healthcare",
    ],
  },
  options: [
    { value: "employer_support_confirmed", label: "Yes — confirmed with my employer" },
    { value: "employer_support_possible",  label: "Possibly — I have not asked yet, but they support similar routes" },
    { value: "no_employer_support",        label: "No — my employer does not support this" },
    { value: "not_discussed_yet",          label: "I have not discussed this yet" },
  ],
};

export const degreeBackgroundSubjectQuestion: Question = {
  id: "degree_background_subject",
  phase: "qualifications",
  title: "What subject is your degree in?",
  whyWeAsk:
    "A shortened graduate-entry nursing route may accept a related degree. Whether your specific degree qualifies is a provider decision — we surface it as a verification step rather than assuming.",
  controlType: "single_select",
  visibleWhen: {
    questionId: "highest_qualification",
    valueIn: ["bachelors_health_related", "bachelors_other"],
  },
  options: [
    { value: "health_related",  label: "Health-related (nursing associate, health science, biomedical)" },
    { value: "psychology",      label: "Psychology" },
    { value: "life_sciences",   label: "Life sciences (biology, biochemistry, physiology)" },
    { value: "social_work",     label: "Social work" },
    { value: "other_subject",   label: "Another subject" },
    { value: "unsure",          label: "I'm not sure how it would be classified" },
  ],
};

export const registrationBackgroundQuestion: Question = {
  id: "registration_background",
  phase: "qualifications",
  title: "Which best describes your NMC registration situation?",
  whyWeAsk:
    "Overseas-trained, lapsed, and other-field NMC cases go through a verification-led route rather than a standard UK education route.",
  controlType: "single_select",
  visibleWhen: {
    questionId: "starting_point",
    valueIn: [
      "trained_as_nurse_outside_uk",
      "previously_registered_nurse",
      "already_registered_nurse_other_field",
    ],
  },
  options: [
    { value: "overseas_trained_not_on_nmc_register", label: "Trained overseas and not on the NMC register" },
    { value: "previous_nmc_registration_lapsed",     label: "Previously NMC-registered, registration has lapsed" },
    { value: "current_nmc_registration_other_field", label: "Currently NMC-registered in another field" },
    { value: "unsure",                               label: "I'm not sure" },
  ],
};

export const studyPatternAvailableQuestion: Question = {
  id: "study_pattern_available",
  phase: "practical_constraints",
  title: "What study pattern could you commit to?",
  whyWeAsk:
    "Full-time university, employer-led apprenticeship and part-time patterns each open different routes.",
  controlType: "single_select",
  options: [
    { value: "full_time_university_possible", label: "Full-time university is possible" },
    { value: "part_time_only",                label: "Part-time only" },
    { value: "employer_led_only",             label: "Employer-led (apprenticeship / on-the-job) only" },
    { value: "need_to_keep_earning",          label: "I need to keep earning throughout" },
    { value: "not_sure",                      label: "I'm not sure yet" },
  ],
};

/**
 * Healthcare-family route priorities. Distinct question id from
 * `route_priorities` (trades) and `digital_route_priorities` (software) so
 * enabling this family does NOT mutate either reviewed priority question.
 * Priorities reorder eligible routes only — they never change eligibility.
 */
export const nursingRoutePrioritiesQuestion: Question = {
  id: "nursing_route_priorities",
  phase: "practical_constraints",
  title: "What matters most when choosing your nursing route?",
  helpText: "Choose up to three.",
  whyWeAsk:
    "Several routes may be structurally relevant. Your priorities re-rank the eligible ones — they never make an ineligible route eligible.",
  controlType: "multi_select",
  maxSelections: 3,
  options: [
    { value: "fastest_route",                    label: "Reaching registration as quickly as realistic" },
    { value: "lowest_cost",                      label: "Keeping training costs low" },
    { value: "keep_earning",                     label: "Being able to keep earning throughout" },
    { value: "employer_supported",               label: "Being supported by an employer" },
    { value: "university_route",                 label: "A traditional university route" },
    { value: "patient_contact",                  label: "Direct patient contact as early as possible" },
    { value: "mental_health_or_community_focus", label: "Mental health or community-focused work" },
    { value: "not_sure",                         label: "I'm not sure yet", exclusive: true },
  ],
};
