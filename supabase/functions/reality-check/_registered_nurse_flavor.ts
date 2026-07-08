// Deno mirror of src/lib/reality-check/route-engines/registered-nurse-flavor.ts.
import type { ModularPayloadFlavor } from "./_modular_payload.ts";

export const registeredNurseFlavor: ModularPayloadFlavor<string> = {
  questionLabels: {
    starting_point: "Where are you starting from?",
    target_nursing_field: "Which field of nursing are you thinking about?",
    highest_qualification: "What's your highest completed qualification?",
    degree_background_subject: "What subject is your degree in?",
    registration_background: "Which best describes your NMC registration situation?",
    maths_english_science_status: "GCSE maths, English and science",
    current_healthcare_employment: "Are you currently working in healthcare?",
    employer_support: "Would your employer support you onto a nursing training route?",
    study_pattern_available: "What study pattern could you commit to?",
    nursing_route_priorities: "What matters most when choosing your nursing route?",
  },
  timeCaveats: {
    pre_registration_nursing_degree: "Usually 3 years full-time (approx. half on clinical placement)",
    registered_nurse_degree_apprenticeship: "Typically 3–4 years, employer-paid",
    nursing_associate_to_registered_nurse: "Top-up length varies by provider — often ~2 years",
    graduate_shortened_nursing_degree: "Typically ~2 years (MSc / PgDip route)",
    overseas_trained_nurse_registration: "Timeline set by the NMC — depends on evidence and Test of Competence",
    return_to_practice: "Length set by NMC-approved programme and how long you've been off the register",
  },
  costCaveats: {
    pre_registration_nursing_degree: "Tuition and living-cost support via student finance for eligible students",
    registered_nurse_degree_apprenticeship: "Paid — you earn a wage; tuition is employer-funded via the apprenticeship levy",
    nursing_associate_to_registered_nurse: "Usually employer-funded; confirm with your employer and provider",
    graduate_shortened_nursing_degree: "Postgraduate tuition varies; some students access student finance — confirm with the provider",
    overseas_trained_nurse_registration: "NMC application, CBT and OSCE fees apply — check current NMC fees",
    return_to_practice: "Often free or subsidised via NHS employers or Health Education — availability varies",
  },
  patternCaveats: {
    pre_registration_nursing_degree: "University-led, structured semesters with clinical placement blocks",
    registered_nurse_degree_apprenticeship: "Employer-led, work-based with off-the-job study",
    nursing_associate_to_registered_nurse: "Provider- and employer-specific top-up pattern",
    graduate_shortened_nursing_degree: "Intensive, usually full-time",
    overseas_trained_nurse_registration: "Verification-led — no UK training component unless NMC requires it",
    return_to_practice: "NMC-approved programme, often blended study + supervised practice",
  },
  cautionCard: {
    title: 'A non-NMC-approved "nursing diploma" course',
    fit: 'Some providers market courses using the word "nursing" that are not on the NMC approved-programmes list.',
    constraint: "Only NMC-approved programmes lead to registration as a nurse in the UK. Non-approved courses do not lead to NMC registration, regardless of the course name or marketing.",
    checks: [
      "Check the NMC approved-programmes list before paying any fees.",
      "Ask the provider to name the NMC field of practice (adult, child, mental health, learning disability) the course leads to.",
      "If the provider cannot confirm NMC approval in writing, do not enrol.",
    ],
    nextAction: "Confirm the course is on the NMC approved-programmes list before committing time or money.",
  },
  fitCopyRecommended: () => "This route appears structurally relevant to your situation. It is not a promise of NMC registration — confirm entry requirements with the specific NMC-approved provider or employer.",
  fitCopyBackup: () => "A second structurally relevant route. Compare against the recommended route and confirm entry requirements with the provider or employer.",
  investigateAfterCheckFit: "This is the check you need to make first. It is a verification step, not a training route — the outcome decides which routes may be open to you.",
  mayOpenLaterFit: "A UK training route that may become relevant after the verification step above — not currently a confirmed route for you.",
};
