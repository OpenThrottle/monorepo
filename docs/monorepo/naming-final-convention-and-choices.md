# Final Naming Convention and Choices

This document records the **chosen product names** and **handles** for the monorepo rename (ex-RocketCMS, ex-Cortex), and restates the rule: **one coherent naming scheme everywhere** (same root across X, GitHub, and NPM). See [naming-criteria-and-availability.md](./naming-criteria-and-availability.md) for criteria and how to check availability.

## Rule: One coherent naming scheme

For each product we use **one root** across all public identities:

- **X (Twitter) handle:** `@<root>`
- **GitHub organization:** `github.com/<root>`
- **NPM scope:** `@<root>/*`

Do **not** mix roots (e.g. @foo on X, github.com/bar, @baz on NPM). Pick one root per product and use it consistently.

## Chosen names and handles

Based on [naming-availability-results.md](./naming-availability-results.md), the following roots were **GitHub-available** at check time. X and NPM should be verified manually before claiming (see [naming-criteria-and-availability.md](./naming-criteria-and-availability.md) § How to check availability).

### ex-RocketCMS (CMS / product)

| Choice      | Rationale                                                                                                   |
| ----------- | ----------------------------------------------------------------------------------------------------------- |
| **EditKit** | Short; evokes editing and content workflows. GitHub org `editkit` was available. Aligns with “kit” pattern. |

| Identity   | Value                | Verify before claim               |
| ---------- | -------------------- | --------------------------------- |
| X handle   | `@editkit`           | Manual check                      |
| GitHub org | `github.com/editkit` | Confirmed available at check time |
| NPM scope  | `@editkit/*`         | Manual check                      |

### ex-Cortex (plans / knowledge base)

| Choice        | Rationale                                                                                                                    |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **VectorKit** | Evokes embeddings and vector search (pgvector). GitHub org `vectorkit` was available. Fits the plans/knowledge-base product. |

| Identity   | Value                  | Verify before claim               |
| ---------- | ---------------------- | --------------------------------- |
| X handle   | `@vectorkit`           | Manual check                      |
| GitHub org | `github.com/vectorkit` | Confirmed available at check time |
| NPM scope  | `@vectorkit/*`         | Manual check                      |

## Summary table

| Product            | Root      | X handle   | GitHub org           | NPM scope     |
| ------------------ | --------- | ---------- | -------------------- | ------------- |
| ex-RocketCMS (CMS) | editkit   | @editkit   | github.com/editkit   | @editkit/\*   |
| ex-Cortex (plans)  | vectorkit | @vectorkit | github.com/vectorkit | @vectorkit/\* |

## Next steps

1. **Verify X and NPM** for `editkit` and `vectorkit` (see criteria doc for how to check).
2. **Claim handles** in order: create GitHub orgs and/or NPM scopes, then X handles, to avoid squatting.
3. **Rename** codebase references (packages, docs, config) from RocketCMS/Cortex to EditKit/VectorKit once handles are secured.

## References

- Plan: _Ideate new names for RocketCMS and Cortex_ (Cortex plan).
- Criteria and availability rules: [naming-criteria-and-availability.md](./naming-criteria-and-availability.md).
- Availability results: [naming-availability-results.md](./naming-availability-results.md).
- CMS candidates: [naming-cms-candidates.md](./naming-cms-candidates.md).
- Plans candidates: [naming-plans-candidates.md](./naming-plans-candidates.md).
- Round 2 (additional candidates): [naming-round-2-candidates.md](./naming-round-2-candidates.md).
- Round 3 (no Kit suffix): [naming-round-3-candidates.md](./naming-round-3-candidates.md).
