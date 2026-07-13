// Institutional sharing — participant side (Increment 8).
//
// Everything here is participant-initiated and revocable:
//   • joinOrganisation(code)      — connect to an organisation by join code
//   • revokeOrganisationLink(id)  — sever the connection (also severs every
//                                   decision share to that org, via RLS)
//   • shareDecision / revokeShare — per-decision grants to an organisation
//
// Advisers get read access to a saved decision ONLY while both the link and
// the specific share are active — enforced in RLS, not here.

import { supabase } from "@/integrations/supabase/client";

export interface OrgLink {
  id: string;
  organisation_id: string;
  organisation_name: string;
  revoked_at: string | null;
}

export interface DecisionShare {
  id: string;
  saved_decision_id: string;
  organisation_id: string;
  revoked_at: string | null;
}

export const joinOrganisation = async (
  joinCode: string,
): Promise<{ status: string; organisationName: string | null }> => {
  const { data, error } = await supabase.rpc("join_organisation" as never, {
    _join_code: joinCode,
  } as never);
  if (error) throw error;
  const rows = (data ?? []) as unknown;
  const row = (Array.isArray(rows) ? rows[0] : rows) as
    | { status: string; organisation_name: string | null }
    | undefined;
  return { status: row?.status ?? "unknown_code", organisationName: row?.organisation_name ?? null };
};

export const listMyOrgLinks = async (): Promise<OrgLink[]> => {
  const { data, error } = await supabase
    .from("participant_org_links" as never)
    .select("id, organisation_id, revoked_at, organisations(name)")
    .is("revoked_at", null);
  if (error) throw error;
  return ((data ?? []) as unknown as Array<{ id: string; organisation_id: string; revoked_at: string | null; organisations: { name: string } | null }>)
    .map((r) => ({
      id: r.id,
      organisation_id: r.organisation_id,
      organisation_name: r.organisations?.name ?? "Organisation",
      revoked_at: r.revoked_at,
    }));
};

export const revokeOrganisationLink = async (linkId: string): Promise<void> => {
  const { error } = await supabase
    .from("participant_org_links" as never)
    .update({ revoked_at: new Date().toISOString() } as never)
    .eq("id", linkId);
  if (error) throw error;
};

export const listSharesForDecision = async (savedDecisionId: string): Promise<DecisionShare[]> => {
  const { data, error } = await supabase
    .from("decision_shares" as never)
    .select("id, saved_decision_id, organisation_id, revoked_at")
    .eq("saved_decision_id", savedDecisionId)
    .is("revoked_at", null);
  if (error) throw error;
  return (data ?? []) as unknown as DecisionShare[];
};

export const shareDecision = async (
  userId: string,
  savedDecisionId: string,
  organisationId: string,
): Promise<void> => {
  const { error } = await supabase.from("decision_shares" as never).insert({
    saved_decision_id: savedDecisionId,
    organisation_id: organisationId,
    participant_user_id: userId,
  } as never);
  if (error) throw error;
};

export const revokeShare = async (shareId: string): Promise<void> => {
  const { error } = await supabase
    .from("decision_shares" as never)
    .update({ revoked_at: new Date().toISOString() } as never)
    .eq("id", shareId);
  if (error) throw error;
};
