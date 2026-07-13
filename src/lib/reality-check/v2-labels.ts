// Participant-facing labels for the V2 status axes. Shared by the result
// view and saved-decision surfaces. Language-safe: describes the current
// position, never chances of success.
import type { EligibilityStatus, PracticalFitStatus } from "@shared/career-evaluator/v1/result-v2";

export const ELIGIBILITY_LABEL: Record<EligibilityStatus, string> = {
  available_now: "Entry conditions appear in place",
  available_with_conditions: "Open, with trade-offs to weigh",
  requires_verification: "Checks needed before this is confirmed",
  not_currently_available: "Not currently open to you",
  insufficient_information: "Not enough answers to assess",
};

export const PRACTICAL_LABEL: Record<PracticalFitStatus, string> = {
  appears_manageable: "No practical constraints flagged",
  constraints_to_weigh: "Practical constraints to weigh",
  insufficient_information: "Not enough answers to comment",
};
