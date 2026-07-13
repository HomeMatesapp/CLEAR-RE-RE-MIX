// Route choice with history (Increment 6, spec §14).
//
// Choices are append-only rows in route_choices: changing your mind inserts
// a new row, nothing is updated or deleted, and the current choice is the
// latest row. Each row snapshots what the result said about the route at
// the moment of choosing, so the history shows what the person actually saw.

import { supabase } from "@/integrations/supabase/client";
import type { RealityCheckResultV2 } from "@shared/career-evaluator/v1/result-v2";

export interface RouteChoice {
  id: string;
  saved_decision_id: string;
  route_id: string;
  route_title: string;
  eligibility_at_choice: string | null;
  practical_fit_at_choice: string | null;
  chosen_at: string;
}

/** History, newest first. The current choice is `history[0]`. */
export const fetchRouteChoices = async (savedDecisionId: string): Promise<RouteChoice[]> => {
  const { data, error } = await supabase
    .from("route_choices" as never)
    .select("id, saved_decision_id, route_id, route_title, eligibility_at_choice, practical_fit_at_choice, chosen_at")
    .eq("saved_decision_id", savedDecisionId)
    .order("chosen_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as RouteChoice[];
};

export const recordRouteChoice = async (
  userId: string,
  savedDecisionId: string,
  result: RealityCheckResultV2,
  routeId: string,
): Promise<RouteChoice> => {
  const route = result.routes.find((r) => r.routeId === routeId);
  if (!route) throw new Error("route_not_in_result");
  const { data, error } = await supabase
    .from("route_choices" as never)
    .insert({
      user_id: userId,
      saved_decision_id: savedDecisionId,
      route_id: route.routeId,
      route_title: route.routeTitle,
      eligibility_at_choice: route.eligibility,
      practical_fit_at_choice: route.practicalFit,
    } as never)
    .select("id, saved_decision_id, route_id, route_title, eligibility_at_choice, practical_fit_at_choice, chosen_at")
    .single();
  if (error) throw error;
  return data as unknown as RouteChoice;
};

/** Pure: newest choice per saved decision from a mixed list of rows. */
export const latestChoiceByDecision = (
  rows: readonly RouteChoice[],
): Record<string, RouteChoice> => {
  const out: Record<string, RouteChoice> = {};
  for (const row of rows) {
    const existing = out[row.saved_decision_id];
    if (!existing || row.chosen_at > existing.chosen_at) out[row.saved_decision_id] = row;
  }
  return out;
};

/** Latest choice per decision for a set of decisions, in one query. */
export const fetchLatestChoicesFor = async (
  savedDecisionIds: readonly string[],
): Promise<Record<string, RouteChoice>> => {
  if (savedDecisionIds.length === 0) return {};
  const { data, error } = await supabase
    .from("route_choices" as never)
    .select("id, saved_decision_id, route_id, route_title, eligibility_at_choice, practical_fit_at_choice, chosen_at")
    .in("saved_decision_id", savedDecisionIds as string[]);
  if (error) throw error;
  return latestChoiceByDecision((data ?? []) as unknown as RouteChoice[]);
};
