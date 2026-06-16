export type OpportunityType =
  | "apprenticeship"
  | "job"
  | "trainee_role"
  | "assistant_role"
  | "course"
  | "access_course"
  | "functional_skills"
  | "bootcamp"
  | "employer_programme"
  | "support_funding";

export type OpportunityStatus = "active" | "expired" | "draft" | "archived";

export interface Opportunity {
  id: string;
  title: string;
  type: OpportunityType;
  status: OpportunityStatus;
  provider_name: string | null;
  employer_name: string | null;
  role_tags: string[];
  route_tags: string[];
  description: string | null;
  location_name: string | null;
  postcode: string | null;
  outward_code: string | null;
  is_remote: boolean;
  is_online: boolean;
  radius_miles: number | null;
  cost: string | null;
  salary: string | null;
  funding_type: string | null;
  entry_requirements: string | null;
  english_maths_requirements: string | null;
  qualification_level: string | null;
  application_url: string | null;
  source_url: string | null;
  deadline: string | null;
  start_date: string | null;
  verified_at: string | null;
  is_sponsored: boolean;
  sponsor_label: string | null;
  warning_notes: string | null;
  is_seed: boolean;
  created_at: string;
  updated_at: string;
}

export type OpportunityGroup =
  | "jobs"
  | "apprenticeships"
  | "courses"
  | "support"
  | "paid_careful";

export interface ScoredOpportunity {
  opportunity: Opportunity;
  score: number;
  group: OpportunityGroup;
  reasons: string[];
  checks: string[];
}
