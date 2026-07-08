// Creative / media / content family questions.
//
// Introduced with the Actor module. First deep-reviewed role in the existing
// `creative_media_content` taxonomy family.
//
// Design constraints (Actor Design Brief v3):
//   - No questions capture protected characteristics, appearance, body, gender,
//     ethnicity, disability, accent, casting-type or precise age.
//   - `performer_scope` is a scope gate, NOT a readiness signal — never used
//     to infer suitability or prospects.
//   - `highest_qualification` and `qualification_origin` are separate;
//     `unknown` and `international` are distinct values.
//   - `budget_for_training_or_materials` NEVER gates eligibility. It only
//     informs affordability/caution copy.
//   - `checks_before_committing` NEVER gates eligibility and NEVER decides
//     whether a safety caution appears.

import type { Question } from "../types";

export const actorPerformerScopeQuestion: Question = {
  id: "performer_scope",
  phase: "starting_point",
  title: "Which route are you exploring?",
  helpText:
    "Under-18 / child performer routes are out of scope for v1 — they involve licensed chaperones and local authority child performance rules.",
  whyWeAsk:
    "This is a scope gate, not a readiness signal. It never affects casting prospects or suitability.",
  controlType: "single_select",
  options: [
    { value: "adult_professional_route",   label: "Adult professional-acting routes" },
    { value: "under_18_or_child_performer", label: "Under 18 / child performer routes" },
    { value: "not_sure",                   label: "I'm not sure yet" },
  ],
};

export const actorHighestQualificationQuestion: Question = {
  id: "highest_qualification",
  phase: "qualifications",
  title: "What's your highest completed qualification?",
  whyWeAsk:
    "Acting has no statutory qualification gate, but a university drama degree route needs a Level 3 or equivalent. This never affects agent, credits or materials routes.",
  controlType: "single_select",
  options: [
    { value: "none",                        label: "No formal qualifications yet" },
    { value: "gcse",                        label: "GCSEs (or equivalent)" },
    { value: "a_level_or_level_3",          label: "A-levels, T Level, BTEC or another Level 3" },
    { value: "performing_arts_level_3",     label: "Performing Arts Level 3 (e.g. BTEC, T Level)" },
    { value: "bachelors_drama_or_acting",   label: "Bachelor's in drama, acting or performing arts" },
    { value: "bachelors_other",             label: "Bachelor's in another subject" },
    { value: "masters_plus",                label: "Master's degree or higher" },
    { value: "unknown",                     label: "I'm not sure of the level" },
  ],
};

export const actorQualificationOriginQuestion: Question = {
  id: "qualification_origin",
  phase: "qualifications",
  title: "Where was your qualification taken?",
  whyWeAsk:
    "Only matters if a university drama degree route is genuinely relevant. `Unknown` never behaves like `international`.",
  controlType: "single_select",
  options: [
    { value: "uk",             label: "UK" },
    { value: "international",  label: "Outside the UK" },
    { value: "unknown",        label: "I'm not sure" },
    { value: "not_applicable", label: "Not applicable — no formal qualification yet" },
  ],
};

export const actorTrainingBackgroundQuestion: Question = {
  id: "training_background",
  phase: "qualifications",
  title: "What acting training have you done so far?",
  whyWeAsk:
    "Prior training informs which routes are structurally relevant. Private acting courses and unaccredited training carry specific cautions — it does not disqualify or advance any route by itself.",
  controlType: "single_select",
  options: [
    { value: "no_formal_training",                       label: "No formal training yet" },
    { value: "school_or_youth_drama",                    label: "School or youth drama only" },
    { value: "short_courses_or_workshops",               label: "Short courses or workshops" },
    { value: "private_acting_course",                    label: "A private acting course" },
    { value: "accredited_conservatoire_or_drama_school", label: "Accredited conservatoire / drama school" },
    { value: "university_drama_degree",                  label: "University drama degree" },
    { value: "international_training",                   label: "Training taken outside the UK" },
    { value: "unknown_training",                         label: "I'm not sure how to categorise it" },
  ],
};

export const actorExistingCreditsQuestion: Question = {
  id: "existing_credits",
  phase: "starting_point",
  title: "What acting credits do you currently have?",
  whyWeAsk:
    "Credits are evidence — they never promise future work. This informs which route to build next.",
  controlType: "single_select",
  options: [
    { value: "none",                          label: "None yet" },
    { value: "student_or_amateur_only",       label: "Student or amateur productions only" },
    { value: "unpaid_short_or_student_films", label: "Unpaid short films or student films" },
    { value: "some_paid_credits",             label: "Some paid credits" },
    { value: "regular_paid_credits",          label: "Regular paid credits" },
  ],
};

export const actorAuditionMaterialsQuestion: Question = {
  id: "audition_materials",
  phase: "starting_point",
  title: "Which audition materials do you currently have?",
  helpText: "Select all that apply. These are evidence, not proof of paid work.",
  whyWeAsk:
    "A recognisable headshot, showreel and casting profile are usually needed before agent / casting-platform routes are worth pursuing.",
  controlType: "multi_select",
  options: [
    { value: "headshot",                        label: "Professional headshot" },
    { value: "showreel",                        label: "Showreel" },
    { value: "spotlight_or_equivalent_profile", label: "Spotlight or equivalent casting profile" },
    { value: "cv",                              label: "Acting CV" },
    { value: "none_yet",                        label: "None of these yet", exclusive: true },
  ],
};

export const actorRepresentationStatusQuestion: Question = {
  id: "representation_status",
  phase: "starting_point",
  title: "What's your current representation position?",
  whyWeAsk:
    "Signing with an agent does not promise auditions or paid work. This is used only to decide whether the agent route is worth exploring now.",
  controlType: "single_select",
  options: [
    { value: "no_agent",                 label: "I don't have an agent" },
    { value: "seeking_agent",            label: "I'm actively looking for an agent" },
    { value: "has_agent",                label: "I already have an agent" },
    { value: "unsure_what_agent_means",  label: "I'm not sure what having an agent means" },
  ],
};

export const actorRoutePrioritiesQuestion: Question = {
  id: "route_priorities",
  phase: "practical_constraints",
  title: "Which routes are you most interested in?",
  helpText: "Priorities re-rank routes only — they never open a route that isn't structurally relevant.",
  whyWeAsk:
    "Reorders the recommendable routes. Never opens a route that would otherwise be blocked.",
  controlType: "multi_select",
  options: [
    { value: "formal_training",   label: "Formal training (drama school or degree)" },
    { value: "stage_work",        label: "Stage / theatre work" },
    { value: "screen_work",       label: "Screen (TV / film) work" },
    { value: "agent_and_profile", label: "Getting an agent and casting profile" },
    { value: "build_credits",     label: "Building credits and experience" },
    { value: "unsure",            label: "I'm not sure yet", exclusive: true },
  ],
};

export const actorIncomeExpectationQuestion: Question = {
  id: "income_expectation",
  phase: "practical_constraints",
  title: "How do you expect acting income to sit in your life?",
  whyWeAsk:
    "Acting income is irregular. Most working actors do other paid work between acting jobs. This informs the income variability caveat.",
  controlType: "single_select",
  options: [
    { value: "main_income_soon",     label: "I want it to be my main income soon" },
    { value: "mixed_income_expected", label: "I expect mixed income for the foreseeable future" },
    { value: "side_income_only",     label: "Side income only — I have another main job" },
    { value: "unsure",               label: "I'm not sure yet" },
  ],
};

export const actorTimeAvailabilityQuestion: Question = {
  id: "time_availability",
  phase: "practical_constraints",
  title: "How much time can you commit to acting work / training?",
  whyWeAsk:
    "Formal training and full-time drama degrees need meaningful time. Time never gates evidence-building routes on its own.",
  controlType: "single_select",
  options: [
    { value: "full_time",              label: "Full-time" },
    { value: "part_time_flexible",     label: "Part-time with flexibility" },
    { value: "evenings_weekends_only", label: "Evenings and weekends only" },
    { value: "very_limited",           label: "Very limited" },
  ],
};

export const actorBudgetQuestion: Question = {
  id: "budget_for_training_or_materials",
  phase: "practical_constraints",
  title: "What's your realistic budget for training or materials?",
  helpText: "This never decides which routes are open to you — it only informs affordability caveats.",
  whyWeAsk:
    "Budget shapes affordability copy only. Budget never gates eligibility for any route.",
  controlType: "single_select",
  options: [
    { value: "none",         label: "None right now" },
    { value: "under_500",    label: "Under £500" },
    { value: "500_to_2000",  label: "£500–£2,000" },
    { value: "2000_plus",    label: "£2,000+" },
  ],
};

export const actorChecksBeforeCommittingQuestion: Question = {
  id: "checks_before_committing",
  phase: "practical_constraints",
  title: "Which topics do you want to double-check before committing to a route?",
  helpText:
    "This personalises the checklist we show you. It never changes which routes are open, and never removes a safety caution.",
  whyWeAsk:
    "Personalises the checks list only. Never affects eligibility or whether a safety caution appears.",
  controlType: "multi_select",
  options: [
    { value: "course_accreditation",  label: "Course / provider accreditation" },
    { value: "agent_terms_and_fees",  label: "Agent contract terms and fees" },
    { value: "casting_platform_fees", label: "Casting-platform subscription fees" },
    { value: "unpaid_work_terms",     label: "Unpaid-work terms and safety" },
    { value: "income_variability",    label: "Income variability" },
    { value: "none_of_these",         label: "None of these", exclusive: true },
  ],
};
