// Increment 9 — Institutional sharing RLS: hostile matrix.
//
// Increment 8 put the consent model into RLS policies; this file makes that
// model EXECUTABLE. It exercises the real database (organisations,
// organisation_members, participant_org_links, decision_shares,
// saved_decisions) with multiple simulated identities, following the PR-3a
// harness conventions. It lives next to the save-decision tests because the
// decisions being shared are the trusted-save rows.
//
// Run in the standard edge test harness (SUPABASE_URL / SERVICE_ROLE_KEY /
// ANON_KEY). What we prove:
//
//   1.  An adviser sees NOTHING unshared — not the decision, not by id.
//   2.  join_organisation: valid code joins; bogus code returns unknown_code
//       and creates nothing; rejoin after revocation reactivates the link.
//   3.  Sharing grants the adviser EXACTLY one decision — the shared one;
//       the participant's other decisions stay invisible.
//   4.  A participant cannot share someone else's decision.
//   5.  A participant cannot share to an organisation without an active link.
//   6.  Revoking the SHARE severs adviser access.
//   7.  Revoking the LINK severs adviser access even while the share row
//       remains active.
//   8.  An adviser cannot UPDATE or DELETE a shared decision (read-only).
//   9.  An adviser cannot create shares on a participant's behalf.
//   10. A stranger (authenticated, unrelated) sees no organisations, links
//       or shares belonging to others.
//   11. Advisers of a DIFFERENT organisation gain nothing from someone
//       else's share.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

const URL_ = Deno.env.get("SUPABASE_URL")!;
const SVC = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")
  ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")
  ?? Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;
if (!URL_ || !SVC || !ANON) throw new Error("SUPABASE_URL / SERVICE_ROLE_KEY / ANON_KEY required");

const svc = createClient(URL_, SVC, { auth: { persistSession: false } });
const uniq = () => crypto.randomUUID().slice(0, 8);

const createUser = async (): Promise<{ id: string; email: string; password: string }> => {
  const email = `inst-${uniq()}@example.test`;
  const password = `Pw!${crypto.randomUUID()}`;
  const { data, error } = await svc.auth.admin.createUser({ email, password, email_confirm: true });
  assert(!error, `createUser: ${error?.message}`);
  return { id: data.user!.id, email, password };
};

const clientFor = async (email: string, password: string) => {
  const c = createClient(URL_, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await c.auth.signInWithPassword({ email, password });
  assert(!error, `signIn: ${error?.message}`);
  return c;
};

interface World {
  org: { id: string; name: string; code: string };
  otherOrg: { id: string; code: string };
  adviser: Awaited<ReturnType<typeof createUser>>;
  otherAdviser: Awaited<ReturnType<typeof createUser>>;
  participant: Awaited<ReturnType<typeof createUser>>;
  stranger: Awaited<ReturnType<typeof createUser>>;
  decisionA: string;
  decisionB: string;
}

/** Two orgs with one adviser each; a participant with two legacy-style saved
 *  decisions; an unrelated authenticated stranger. All service-role built. */
const setupWorld = async (): Promise<World> => {
  const mkOrg = async (label: string) => {
    const code = `CODE-${uniq().toUpperCase()}`;
    const { data, error } = await svc.from("organisations")
      .insert({ name: `Inst Test ${label} ${uniq()}`, join_code: code })
      .select("id, name").single();
    assert(!error, `org insert: ${error?.message}`);
    return { id: data.id as string, name: data.name as string, code };
  };
  const org = await mkOrg("A");
  const otherOrg = await mkOrg("B");

  const [adviser, otherAdviser, participant, stranger] = await Promise.all([
    createUser(), createUser(), createUser(), createUser(),
  ]);
  for (const [o, u] of [[org, adviser], [otherOrg, otherAdviser]] as const) {
    const { error } = await svc.from("organisation_members")
      .insert({ organisation_id: o.id, user_id: u.id, member_role: "adviser" });
    assert(!error, `member insert: ${error?.message}`);
  }

  const mkDecision = async (slugSuffix: string) => {
    const { data: role, error: rErr } = await svc.from("roles").insert({
      role_name: `Inst Role ${slugSuffix}`, role_slug: `inst-role-${slugSuffix}-${uniq()}`,
    }).select("id, role_slug, role_name").single();
    assert(!rErr, `role insert: ${rErr?.message}`);
    const { data, error } = await svc.from("saved_decisions").insert({
      user_id: participant.id,
      role_id: role.id, role_slug: role.role_slug, role_name: role.role_name,
      evaluation_source: "legacy_engine",
    }).select("id").single();
    assert(!error, `decision insert: ${error?.message}`);
    return data.id as string;
  };
  const decisionA = await mkDecision("a");
  const decisionB = await mkDecision("b");

  return { org, otherOrg, adviser, otherAdviser, participant, stranger, decisionA, decisionB };
};

const T = (name: string, fn: () => Promise<void>) =>
  Deno.test({ name, sanitizeOps: false, sanitizeResources: false, fn });

T("inst-1: adviser sees nothing unshared, even by id", async () => {
  const w = await setupWorld();
  const adviser = await clientFor(w.adviser.email, w.adviser.password);
  const { data } = await adviser.from("saved_decisions").select("id").eq("id", w.decisionA);
  assertEquals(data ?? [], []);
});

T("inst-2: join_organisation joins on a valid code, refuses a bogus one, and reactivates after revocation", async () => {
  const w = await setupWorld();
  const p = await clientFor(w.participant.email, w.participant.password);

  const bogus = await p.rpc("join_organisation", { _join_code: "NOT-A-CODE" });
  assertEquals((bogus.data as { status: string }[])[0].status, "unknown_code");

  const joined = await p.rpc("join_organisation", { _join_code: w.org.code });
  assertEquals((joined.data as { status: string }[])[0].status, "joined");

  const { data: links } = await p.from("participant_org_links").select("id, revoked_at");
  assertEquals(links!.length, 1);

  // Revoke, then rejoin — the same row reactivates.
  await p.from("participant_org_links").update({ revoked_at: new Date().toISOString() }).eq("id", links![0].id);
  const rejoined = await p.rpc("join_organisation", { _join_code: w.org.code });
  assertEquals((rejoined.data as { status: string }[])[0].status, "joined");
  const { data: after } = await p.from("participant_org_links").select("revoked_at");
  assertEquals(after![0].revoked_at, null);
});

T("inst-3: a share grants the adviser exactly the shared decision, nothing else", async () => {
  const w = await setupWorld();
  const p = await clientFor(w.participant.email, w.participant.password);
  await p.rpc("join_organisation", { _join_code: w.org.code });
  const ins = await p.from("decision_shares").insert({
    saved_decision_id: w.decisionA, organisation_id: w.org.id, participant_user_id: w.participant.id,
  });
  assert(!ins.error, `share insert: ${ins.error?.message}`);

  const adviser = await clientFor(w.adviser.email, w.adviser.password);
  const { data: visible } = await adviser.from("saved_decisions").select("id")
    .in("id", [w.decisionA, w.decisionB]);
  assertEquals((visible ?? []).map((r) => r.id), [w.decisionA]);
});

T("inst-4: a participant cannot share someone else's decision", async () => {
  const w = await setupWorld();
  const s = await clientFor(w.stranger.email, w.stranger.password);
  await s.rpc("join_organisation", { _join_code: w.org.code });
  const ins = await s.from("decision_shares").insert({
    saved_decision_id: w.decisionA, organisation_id: w.org.id, participant_user_id: w.stranger.id,
  });
  assert(ins.error, "insert should be rejected by RLS");
});

T("inst-5: sharing requires an ACTIVE link to that organisation", async () => {
  const w = await setupWorld();
  const p = await clientFor(w.participant.email, w.participant.password);
  // No link at all:
  const noLink = await p.from("decision_shares").insert({
    saved_decision_id: w.decisionA, organisation_id: w.org.id, participant_user_id: w.participant.id,
  });
  assert(noLink.error, "insert without a link should be rejected");
  // Revoked link:
  await p.rpc("join_organisation", { _join_code: w.org.code });
  const { data: links } = await p.from("participant_org_links").select("id");
  await p.from("participant_org_links").update({ revoked_at: new Date().toISOString() }).eq("id", links![0].id);
  const revokedLink = await p.from("decision_shares").insert({
    saved_decision_id: w.decisionA, organisation_id: w.org.id, participant_user_id: w.participant.id,
  });
  assert(revokedLink.error, "insert against a revoked link should be rejected");
});

T("inst-6: revoking the share severs adviser access", async () => {
  const w = await setupWorld();
  const p = await clientFor(w.participant.email, w.participant.password);
  await p.rpc("join_organisation", { _join_code: w.org.code });
  await p.from("decision_shares").insert({
    saved_decision_id: w.decisionA, organisation_id: w.org.id, participant_user_id: w.participant.id,
  });
  const { data: shares } = await p.from("decision_shares").select("id");
  await p.from("decision_shares").update({ revoked_at: new Date().toISOString() }).eq("id", shares![0].id);

  const adviser = await clientFor(w.adviser.email, w.adviser.password);
  const { data } = await adviser.from("saved_decisions").select("id").eq("id", w.decisionA);
  assertEquals(data ?? [], []);
});

T("inst-7: revoking the LINK severs adviser access even while the share row stays active", async () => {
  const w = await setupWorld();
  const p = await clientFor(w.participant.email, w.participant.password);
  await p.rpc("join_organisation", { _join_code: w.org.code });
  await p.from("decision_shares").insert({
    saved_decision_id: w.decisionA, organisation_id: w.org.id, participant_user_id: w.participant.id,
  });
  const { data: links } = await p.from("participant_org_links").select("id");
  await p.from("participant_org_links").update({ revoked_at: new Date().toISOString() }).eq("id", links![0].id);

  const adviser = await clientFor(w.adviser.email, w.adviser.password);
  const { data } = await adviser.from("saved_decisions").select("id").eq("id", w.decisionA);
  assertEquals(data ?? [], [], "share row is active but the link is revoked — access must be severed");
});

T("inst-8: adviser access is read-only — updates and deletes do nothing", async () => {
  const w = await setupWorld();
  const p = await clientFor(w.participant.email, w.participant.password);
  await p.rpc("join_organisation", { _join_code: w.org.code });
  await p.from("decision_shares").insert({
    saved_decision_id: w.decisionA, organisation_id: w.org.id, participant_user_id: w.participant.id,
  });

  const adviser = await clientFor(w.adviser.email, w.adviser.password);
  await adviser.from("saved_decisions").update({ label: "tampered" }).eq("id", w.decisionA);
  await adviser.from("saved_decisions").delete().eq("id", w.decisionA);
  const { data: row } = await svc.from("saved_decisions").select("id, label").eq("id", w.decisionA).single();
  assert(row, "row must still exist");
  assert(row!.label !== "tampered", "adviser update must not apply");
});

T("inst-9: an adviser cannot create shares on a participant's behalf", async () => {
  const w = await setupWorld();
  const p = await clientFor(w.participant.email, w.participant.password);
  await p.rpc("join_organisation", { _join_code: w.org.code });

  const adviser = await clientFor(w.adviser.email, w.adviser.password);
  const ins = await adviser.from("decision_shares").insert({
    saved_decision_id: w.decisionA, organisation_id: w.org.id, participant_user_id: w.participant.id,
  });
  assert(ins.error, "adviser-created share should be rejected by RLS");
});

T("inst-10: a stranger sees no organisations, links or shares belonging to others", async () => {
  const w = await setupWorld();
  const p = await clientFor(w.participant.email, w.participant.password);
  await p.rpc("join_organisation", { _join_code: w.org.code });
  await p.from("decision_shares").insert({
    saved_decision_id: w.decisionA, organisation_id: w.org.id, participant_user_id: w.participant.id,
  });

  const s = await clientFor(w.stranger.email, w.stranger.password);
  const { data: orgs } = await s.from("organisations").select("id").eq("id", w.org.id);
  assertEquals(orgs ?? [], []);
  const { data: links } = await s.from("participant_org_links").select("id");
  assertEquals(links ?? [], []);
  const { data: shares } = await s.from("decision_shares").select("id");
  assertEquals(shares ?? [], []);
});

T("inst-11: an adviser of a different organisation gains nothing from someone else's share", async () => {
  const w = await setupWorld();
  const p = await clientFor(w.participant.email, w.participant.password);
  await p.rpc("join_organisation", { _join_code: w.org.code });
  await p.from("decision_shares").insert({
    saved_decision_id: w.decisionA, organisation_id: w.org.id, participant_user_id: w.participant.id,
  });

  const otherAdviser = await clientFor(w.otherAdviser.email, w.otherAdviser.password);
  const { data } = await otherAdviser.from("saved_decisions").select("id").eq("id", w.decisionA);
  assertEquals(data ?? [], []);
});
