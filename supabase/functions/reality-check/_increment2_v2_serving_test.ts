// Increment 2 — V2 serving proofs (DB-free).
//
// Drives the exported reality-check handler with fully injected deps: no
// Supabase project, no network, no production tables. What we prove:
//
//   1. The pack path serves BOTH results from one invocation: `result`
//      (V1 — byte-identical to a direct evaluateGenericPack call, so the
//      current UI's payload is untouched) and `resultV2` (validating against
//      the shared RealityCheckResultV2 Zod schema).
//   2. The issued receipt carries both snapshots with correct canonical
//      hashes, so the trusted-save pipeline persists exactly what was served.
//   3. Eligibility/practical-fit axis separation survives the serving path.
//   4. Metadata declares both schema versions.
//   5. Non-servable and hash-mismatch paths are unchanged (no V2 leakage).
//
// Runs under the standard edge test harness; requires NO env vars.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { handleRealityCheck, type ResolvedBinding } from "./index.ts";
import { evaluateGenericPack } from "./_generic_pack.ts";
import { canonicalHash } from "../_shared/career-evaluator/v1/hash.ts";
import { realityCheckResultV2 } from "../_shared/career-evaluator/v1/result-v2.ts";
import { ELIGIBILITY_STATUSES, PRACTICAL_FIT_STATUSES } from "../_shared/career-evaluator/v1/result-v2.ts";
import midwifePack from "../../../content/career-packs/midwife/1.0.0.json" with { type: "json" };

const ROLE_ID = "11111111-1111-4111-8111-111111111111";
const NOW = new Date("2026-07-12T12:00:00.000Z");

const makeBinding = async (over: Partial<ResolvedBinding> = {}): Promise<ResolvedBinding> => ({
  pack_id: "22222222-2222-4222-8222-222222222222",
  role_id: ROLE_ID,
  slug: "midwife",
  pack_version: "1.0.0",
  content_hash: await canonicalHash(midwifePack),
  content: midwifePack,
  status: "published",
  role_slug: "midwife",
  review_due_at: null,
  is_servable: true,
  geographic_scope: ["England"],
  ...over,
});

interface IssuedReceipt {
  resultV1: unknown;
  resultCanonicalHash: string;
  resultV2: unknown;
  resultV2CanonicalHash: string;
  packVersion: string;
  expiresAt: string;
  receiptHash: string;
}

const drive = async (answers: Record<string, unknown>, binding: ResolvedBinding) => {
  const issued: IssuedReceipt[] = [];
  const req = new Request("http://x/reality-check", {
    method: "POST",
    headers: { "Content-Type": "application/json", origin: "http://localhost" },
    body: JSON.stringify({ role: { id: ROLE_ID, role_slug: "midwife", role_name: "Midwife" }, answers }),
  });
  const res = await handleRealityCheck(req, {
    resolveBinding: async () => binding,
    validatePair: async () => true,
    issueReceipt: async (r) => { issued.push(r as unknown as IssuedReceipt); },
    resolveUserId: async () => null,
    ttlMinutes: 30,
    now: () => NOW,
  });
  return { res, issued };
};

const sampleAnswers = (midwifePack as { testProfiles: { answers: Record<string, unknown> }[] }).testProfiles[0].answers;

Deno.test("pack path serves V1 unchanged plus a valid V2 from one invocation", async () => {
  const binding = await makeBinding();
  const { res, issued } = await drive(sampleAnswers, binding);
  assertEquals(res.status, 200);
  const body = await res.json();

  // V1 untouched: byte-equal to a direct evaluation (modulo the clock, which
  // both paths take from the same injected `now`... V1 stamps its own clock,
  // so compare with evaluatedAt normalised).
  const direct = evaluateGenericPack(midwifePack, sampleAnswers as never) as { evaluatedAt: string };
  const served = body.result as { evaluatedAt: string };
  const norm = (r: { evaluatedAt: string }) => ({ ...r, evaluatedAt: "X" });
  assertEquals(await canonicalHash(norm(served)), await canonicalHash(norm(direct)));

  // V2 present and schema-valid.
  const parsed = realityCheckResultV2.safeParse(body.resultV2);
  assert(parsed.success, JSON.stringify(!parsed.success ? parsed.error.issues : []));
  assertEquals(body.resultV2.schemaVersion, "reality-check-result/v2");
  assertEquals(body.resultV2.sourceKind, "career_pack");
  assertEquals(body.resultV2.packVersion, "1.0.0");
  assertEquals(body.resultV2.slug, "midwife");

  // Axis integrity on every served route.
  for (const route of body.resultV2.routes) {
    assert((ELIGIBILITY_STATUSES as readonly string[]).includes(route.eligibility));
    assert((PRACTICAL_FIT_STATUSES as readonly string[]).includes(route.practicalFit));
  }

  // Metadata declares both contracts.
  assertEquals(body.packMetadata.evaluatorSchemaVersion, "reality-check-result/v1");
  assertEquals(body.packMetadata.resultV2SchemaVersion, "reality-check-result/v2");

  // Receipt carries both snapshots with matching canonical hashes.
  assertEquals(issued.length, 1);
  const r = issued[0];
  assertEquals(await canonicalHash(r.resultV1), await canonicalHash(body.result));
  assertEquals(await canonicalHash(r.resultV2), await canonicalHash(body.resultV2));
  assertEquals(r.resultCanonicalHash, await canonicalHash(r.resultV1));
  assertEquals(r.resultV2CanonicalHash, await canonicalHash(r.resultV2));
});

Deno.test("V2 answersSnapshot mirrors the submitted answers exactly", async () => {
  const binding = await makeBinding();
  const { res } = await drive(sampleAnswers, binding);
  const body = await res.json();
  assertEquals(body.resultV2.answersSnapshot, sampleAnswers);
});

Deno.test("empty answers serve insufficient_information on both axes", async () => {
  const binding = await makeBinding();
  const { res } = await drive({}, binding);
  assertEquals(res.status, 200);
  const body = await res.json();
  for (const route of body.resultV2.routes) {
    assertEquals(route.eligibility, "insufficient_information");
    assertEquals(route.practicalFit, "insufficient_information");
  }
  assertEquals(body.resultV2.strongestRouteId, null);
});

Deno.test("non-servable pack: unchanged refusal, no results, no receipt", async () => {
  const binding = await makeBinding({ is_servable: false, status: "suspended" });
  const { res, issued } = await drive(sampleAnswers, binding);
  assertEquals(res.status, 409);
  const body = await res.json();
  assertEquals(body.error, "pack_unavailable");
  assertEquals(body.result, undefined);
  assertEquals(body.resultV2, undefined);
  assertEquals(issued.length, 0);
});

Deno.test("hash mismatch: unchanged refusal, no results, no receipt", async () => {
  const binding = await makeBinding({ content_hash: "tampered" });
  const { res, issued } = await drive(sampleAnswers, binding);
  assertEquals(res.status, 500);
  const body = await res.json();
  assertEquals(body.error, "pack_hash_mismatch");
  assertEquals(body.result, undefined);
  assertEquals(body.resultV2, undefined);
  assertEquals(issued.length, 0);
});

// ── Increment 3: questionnaire mode ─────────────────────────────────────────

const driveQuestionnaire = async (binding: ResolvedBinding) => {
  const issued: IssuedReceipt[] = [];
  const req = new Request("http://x/reality-check", {
    method: "POST",
    headers: { "Content-Type": "application/json", origin: "http://localhost" },
    body: JSON.stringify({ role: { id: ROLE_ID, role_slug: "midwife", role_name: "Midwife" }, mode: "questionnaire" }),
  });
  const res = await handleRealityCheck(req, {
    resolveBinding: async () => binding,
    validatePair: async () => true,
    issueReceipt: async (r) => { issued.push(r as unknown as IssuedReceipt); },
    resolveUserId: async () => null,
    ttlMinutes: 30,
    now: () => NOW,
  });
  return { res, issued };
};

Deno.test("questionnaire mode: 1.0.0 (no render metadata) refuses with pack_not_renderable, no receipt", async () => {
  const binding = await makeBinding();
  const { res, issued } = await driveQuestionnaire(binding);
  assertEquals(res.status, 409);
  const body = await res.json();
  assertEquals(body.error, "pack_not_renderable");
  assertEquals(body.questionnaire, undefined);
  assertEquals(issued.length, 0);
});

Deno.test("questionnaire mode: 1.1.0 serves renderable questions, no evaluation, no receipt", async () => {
  const midwife110 = JSON.parse(await Deno.readTextFile(
    new URL("../../../content/career-packs/midwife/1.1.0.json", import.meta.url),
  ));
  const binding = await makeBinding({
    content: midwife110,
    pack_version: "1.1.0",
    content_hash: await canonicalHash(midwife110),
  });
  const { res, issued } = await driveQuestionnaire(binding);
  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(issued.length, 0, "questionnaire mode must not issue receipts");
  assertEquals(body.result, undefined);
  assertEquals(body.resultV2, undefined);
  const q = body.questionnaire;
  assertEquals(q.slug, "midwife");
  assertEquals(q.packVersion, "1.1.0");
  assertEquals(q.questions.length, 9);
  for (const question of q.questions) {
    assert(question.answerType, `question ${question.id} must be renderable`);
    if (question.answerType === "single_select") {
      assert(Array.isArray(question.options) && question.options.length > 0, `question ${question.id} needs options`);
      for (const o of question.options) assert(o.label && o.value);
    }
  }
  // Rules, evidence and test fixtures never travel to the client.
  assertEquals(q.rules, undefined);
  assertEquals(q.evidenceRecords, undefined);
  assertEquals(q.testProfiles, undefined);
});
