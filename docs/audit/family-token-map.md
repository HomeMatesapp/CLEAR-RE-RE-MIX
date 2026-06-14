# Family Token Map — Standing Audit Registry

This file is the **single source of truth** for the family-contamination audit.
The human-readable sections below document intent; the fenced `AUDIT-RULES`
JSON block at the bottom is what the audit script actually consumes.

Run the audit with:

```sh
bun run audit:families
```

It scans all roles, applies the rules below, and exits non-zero on findings.

---

## Family 31 — Marketing, PR & Communications

Created 2026-06-13 from the celebrity-publicist page-read → missing-family
discovery. 28 roles routed in from fam-22.

**Expected source/pathway tokens (legitimate for fam-31):**
- `CIM` (Chartered Institute of Marketing)
- `CIPR` (Chartered Institute of Public Relations)
- `PRCA` (Public Relations and Communications Association)
- `agency` / `in-house`
- `portfolio`
- `apprenticeship` (marketing/PR/digital apprenticeship variants)
- `account executive`, `marketing assistant`, `social media coordinator`, `campaign`

**Forbidden tokens on fam-31 (contamination flags):**
- Commission-sales language: `commission or account ownership`, `field sales, account management`, `target-and-commission worlds`, `target-driven cultures`
  (fam-22 sales-family residue — exact leak this family was created to fix)
- Journalism gates: `NCTJ`, `bylines`, `editorial assistant`
  (fam-19 — Media, Journalism & Publishing)
- Political-connections gates: `ex-SpAd`, `party involvement`, `parliamentary researchers`
  (fam-27 — Reputation-Gated Careers, including lobbying)

---

## Wrong-Sector Token Map — Culture / Knowledge / Creative cluster

Added 2026-06-13 after `market-research-manager` was caught carrying
culture-cluster source content (CILIP, ARA, NRCPD) while sitting in fam-14.
A single page-read surfaced an orphan; likely 1–2 more carry the same leak.

**Tokens to sweep for outside their legitimate families:**

| Token   | Legitimate family/families                              | If found elsewhere |
|---------|---------------------------------------------------------|--------------------|
| `CILIP` | Librarians / information professionals                  | Contamination flag |
| `ARA`   | Archives & Records Association — archivists             | Contamination flag |
| `NRCPD` | Sign-language interpreters                              | Contamination flag |
| `RBSLI` | Sign-language interpreters                              | Contamination flag |

`ARA` is matched as a whole word so it doesn't false-positive on substrings
like "career" or "preparation".

---

## Family-Reassignment Open Items

Roles whose source has been corrected but whose `pathway_family` assignment
remains wrong and is pending a separate reassignment pass. Listed here so the
audit history records the known-wrong placements without re-flagging them.

> **ATOMIC-COUPLING REQUIREMENT.** Each reassignment in this table MUST be
> performed as a single change with its paired update to
> `wrong_sector_tokens[*].legitimate_families` in the JSON below. Doing one
> without the other breaks the wrong-sector-attribution gate: leaving the
> old family in `legitimate_families` makes the gate blind to a future
> contaminated role landing in that slot, while *not* adding the new family
> causes the gate to false-positive on the reassigned role's legitimate
> citation. The two writes are one change.

| Role                     | Current family               | Target shape                                      | Paired JSON update on reassignment                          |
|--------------------------|------------------------------|---------------------------------------------------|-------------------------------------------------------------|
| `archivist`              | fam-7 (academic/research)    | A records/archives profession family              | `ARA.legitimate_families`: `[7]` → `[<new>]`                |
| `librarian`              | fam-15 (public-service-grade)| An information-profession family                  | `CILIP.legitimate_families`: `[15]` → `[<new>]`             |
| `telehealth-*`           | (per prior audit notes)      | Pending                                           | none currently (no wrong_sector_tokens bound)               |
| `personalized-medicine-*`| (per prior audit notes)      | Pending                                           | none currently (no wrong_sector_tokens bound)               |

Sources for archivist and librarian were corrected on 2026-06-13 to role-specific
ARA and CILIP citations; the family slot itself still needs moving. `NRCPD` and
`RBSLI` are bound to fam-26 (sign-language-interpreter), which is its correct
current and target family — no reassignment pending.


---

## Merge-time contamination gate

The `_merge_roles` DB function previously picked field survivors with
`ORDER BY length(field) DESC LIMIT 1` — "longest wins". Long contaminated
template stamps consistently outcompeted shorter, role-specific clean strings,
which is how the culture-cluster leak spread through merges in the first place.

The function now orders by `_is_contaminated_field(field) ASC, length(field) DESC`:
clean values beat contaminated ones, and longest-wins is only the tiebreaker
among same-cleanliness candidates. `_is_contaminated_field` mirrors the audit
script's `template_leak` detector plus the fam-31 forbidden phrases, so any rule
added to the audit can be reflected here by extending that one function. When
both candidates are contaminated, behaviour is unchanged (nothing to prefer);
when neither is, behaviour is unchanged (length wins).

## Maintenance


When a new family is created or a wrong-family contamination is caught:

1. Add a human-readable section above describing it.
2. Add the corresponding entry to the `AUDIT-RULES` JSON block below.
3. Run `bun run audit:families` to confirm it picks up.

A rule in the doc but not in the JSON block does nothing. A rule in the JSON
block but not the doc is invisible to maintainers. Keep both in sync.

---

<!-- AUDIT-RULES:BEGIN -->
```json
{
  "fields_scanned": [
    "salary_source",
    "demand_source",
    "pathway_school_leaver",
    "pathway_graduate",
    "pathway_adjacent",
    "pathway_no_background",
    "short_description",
    "raw_why_text",
    "reality_check",
    "uncomfortable_truth",
    "opportunity_cost",
    "typical_backgrounds",
    "who_not_for",
    "career_regret_risk",
    "alternative_careers",
    "next_step",
    "demand",
    "competition_level",
    "typical_time_to_entry",
    "ai_impact_level",
    "ai_impact_note",
    "remote_friendly",
    "job_security",
    "progression_speed",
    "ai_safety_2040",
    "top_universities",
    "degree_required",
    "best_path",
    "second_path",
    "third_path",
    "reality_rating",
    "competition_note",
    "most_common_route",
    "pathway_source_text"
  ],
  "attribution_fields": [
    "salary_source",
    "demand_source",
    "pathway_source_text",
    "raw_why_text"
  ],
  "culture_cluster": {
    "min_token_hits": 3,
    "anchor": "sector data 20[0-9]{2}"
  },
  "family_forbidden": [
    {
      "family": 31,
      "family_name": "Marketing, PR & Communications",
      "forbidden": [
        { "label": "fam-22 sales residue", "patterns": ["commission or account ownership", "field sales, account management", "target-and-commission worlds", "target-driven cultures"] },
        { "label": "fam-19 journalism residue", "patterns": ["NCTJ", "bylines", "editorial assistant"] },
        { "label": "fam-27 political-connections residue", "patterns": ["ex-SpAd", "party involvement", "parliamentary researchers"] }
      ]
    }
  ],
  "wrong_sector_tokens": [
    { "token": "CILIP",  "legitimate_families": [15], "match": "substring", "note": "Librarians / information professionals — fam-15 pending reassignment, see open-items table" },
    { "token": "ARA",    "legitimate_families": [7],  "match": "word",      "note": "Archives & Records Association — fam-7 pending reassignment, see open-items table" },
    { "token": "NRCPD",  "legitimate_families": [26], "match": "substring", "note": "Sign-language interpreters — fam-26 is correct current+target family" },
    { "token": "RBSLI",  "legitimate_families": [26], "match": "substring", "note": "Sign-language interpreters — fam-26 is correct current+target family" }
  ]
}
```
<!-- AUDIT-RULES:END -->
