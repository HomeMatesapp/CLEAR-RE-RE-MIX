// Versioned reader for saved result snapshots.
//
// saved_decisions.result_snapshot rows exist in three generations:
//   • "legacy"                    — pre-versioned RealityCheckResult /
//                                   ModularRealityCheckPayload summaries
//                                   (no schemaVersion field). Every row saved
//                                   before Increment 1 is this shape.
//   • "reality-check-result/v1"   — generic-pack V1 results.
//   • "reality-check-result/v2"   — the standard contract (Increment 1+).
//
// Historical snapshots are IMMUTABLE and are never migrated in place. This
// module is the single dispatch point: render code asks what generation a
// snapshot is and treats absent/unknown versions as legacy, so every
// previously-saved decision keeps loading exactly as before.

import {
  realityCheckResultV2,
  type RealityCheckResultV2,
} from "@shared/career-evaluator/v1/result-v2";

export type ResultSnapshotVersion =
  | "legacy"
  | "reality-check-result/v1"
  | "reality-check-result/v2";

export interface ReadSnapshot {
  version: ResultSnapshotVersion;
  /** Present and validated only for v2 snapshots. */
  v2?: RealityCheckResultV2;
  /** The raw snapshot, untouched, for legacy/v1 render paths. */
  raw: unknown;
}

export const resultSnapshotVersion = (snapshot: unknown): ResultSnapshotVersion => {
  if (snapshot && typeof snapshot === "object") {
    const v = (snapshot as { schemaVersion?: unknown }).schemaVersion;
    if (v === "reality-check-result/v1") return "reality-check-result/v1";
    if (v === "reality-check-result/v2") return "reality-check-result/v2";
  }
  return "legacy";
};

export const isResultV2 = (snapshot: unknown): snapshot is RealityCheckResultV2 =>
  resultSnapshotVersion(snapshot) === "reality-check-result/v2" &&
  realityCheckResultV2.safeParse(snapshot).success;

/**
 * Read any saved snapshot without throwing. A v2-labelled snapshot that fails
 * validation is downgraded to "legacy" handling rather than crashing render —
 * old saved results must always remain readable.
 */
export const readResultSnapshot = (snapshot: unknown): ReadSnapshot => {
  const version = resultSnapshotVersion(snapshot);
  if (version === "reality-check-result/v2") {
    const parsed = realityCheckResultV2.safeParse(snapshot);
    if (parsed.success) return { version, v2: parsed.data as RealityCheckResultV2, raw: snapshot };
    return { version: "legacy", raw: snapshot };
  }
  return { version, raw: snapshot };
};
