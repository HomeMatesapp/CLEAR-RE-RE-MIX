import { supabase } from "@/integrations/supabase/client";
import type { RealityCheckAnswers, RealityCheckResult, RoleContext } from "@/lib/reality-check/types";

const PENDING_KEY = "cr_pending_decision";

export interface PendingDecision {
  role: {
    id?: string;
    role_slug?: string;
    role_name: string;
  };
  answers: RealityCheckAnswers;
  result: RealityCheckResult;
  created_at: string;
}

export const stashPendingDecision = (
  role: RoleContext,
  answers: RealityCheckAnswers,
  result: RealityCheckResult,
) => {
  const payload: PendingDecision = {
    role: { id: role.id, role_slug: role.role_slug, role_name: role.role_name },
    answers,
    result,
    created_at: new Date().toISOString(),
  };
  try {
    localStorage.setItem(PENDING_KEY, JSON.stringify(payload));
  } catch {
    /* ignore */
  }
};

export const readPendingDecision = (): PendingDecision | null => {
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PendingDecision;
  } catch {
    return null;
  }
};

export const clearPendingDecision = () => {
  try {
    localStorage.removeItem(PENDING_KEY);
  } catch {
    /* ignore */
  }
};

export const saveDecision = async (
  userId: string,
  role: { id?: string; role_slug?: string; role_name: string },
  answers: RealityCheckAnswers,
  result: RealityCheckResult,
) => {
  const row = {
    user_id: userId,
    role_id: role.id ?? null,
    role_slug: role.role_slug ?? "",
    role_name: role.role_name,
    overall_verdict: result.overallVerdict ?? null,
    best_route_title: result.bestRoute?.title ?? null,
    backup_route_title: result.backupRoute?.title ?? null,
    route_to_avoid_title: result.routeToAvoid?.title ?? null,
    local_realism_rating: result.localRealism?.rating ?? null,
    first_move: result.firstMoves?.[0] ?? null,
    input_snapshot: answers as unknown as Record<string, unknown>,
    result_snapshot: result as unknown as Record<string, unknown>,
  };
  const { data, error } = await supabase
    .from("saved_decisions")
    .insert(row as never)
    .select("id")
    .single();
  if (error) throw error;
  return data;
};

// In-flight guard to prevent duplicate saves if flush is invoked twice
// concurrently (e.g. by both an auth effect and a route effect on login).
let inFlight: Promise<boolean> | null = null;

export const flushPendingDecision = async (userId: string): Promise<boolean> => {
  if (inFlight) return inFlight;
  const pending = readPendingDecision();
  if (!pending) return false;
  // Basic shape validation — malformed payloads (e.g. corrupted localStorage)
  // should be discarded silently rather than thrown into the save path.
  if (!pending.role || !pending.role.role_name || !pending.answers || !pending.result) {
    clearPendingDecision();
    return false;
  }
  // Clear immediately so a second synchronous call after the first one
  // resolves finds nothing to save.
  clearPendingDecision();
  inFlight = (async () => {
    try {
      await saveDecision(userId, pending.role, pending.answers, pending.result);
      return true;
    } catch {
      return false;
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
};

// Test-only helper to reset module-level state between tests.
export const __resetFlushGuard = () => {
  inFlight = null;
};
