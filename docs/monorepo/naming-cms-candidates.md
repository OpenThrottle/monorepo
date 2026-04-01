# Candidate Names for ex-RocketCMS (CMS / product)

Brainstorm for the CMS/product side of the monorepo rename. Names should evoke **content management**, **publishing**, or **product delivery** per [naming-criteria-and-availability.md](./naming-criteria-and-availability.md). Availability checks are done in a separate task.

## Candidates (with brief rationale)

| Candidate       | Rationale |
|-----------------|-----------|
| **ContentKit**  | Directly signals “content”; “kit” suggests a product/toolkit. Easy to say and remember. |
| **PublishKit**  | Evokes publishing and product delivery; “kit” keeps a consistent pattern if we use “-kit” elsewhere. |
| **PageForge**   | “Page” = content/pages; “forge” = building/making. Strong product feel. |
| **StoryCMS**    | “Story” suggests content/narrative; “CMS” is explicit. May conflict with “one root everywhere” if we avoid “cms” in the root. |
| **Shipyard**    | Metaphor for “shipping” product/content. Memorable; less literal than “content”. |
| **Launchpad**   | Evokes launching product/content. Very product-focused; likely high contention for handles. |
| **ContentForge**| “Content” + “forge” (building). Clear purpose; slightly long. |
| **PublishForge**| Publishing + building. Aligns with PageForge/ContentForge pattern. |
| **EditKit**     | Editing is central to CMS workflows. Short; “kit” pattern. |
| **SiteKit**     | “Site” hints at websites/content. Short; “kit” pattern. Risk: “Site Kit” exists in some ecosystems. |
| **BlockForge**  | “Block” suggests block-based content (e.g. editors). Good if the product is block-oriented. |
| **CopyForge**   | “Copy” = editorial content. Niche but clear. |

## Notes

- **Availability:** Not checked here; see the “Check availability for shortlisted names” task.
- **Pattern:** Prefer one root across X, GitHub, and NPM (e.g. `contentkit` everywhere). Suffixes like `-cms` or `-hq` can be used if the bare root is taken.
- **Shortlist:** After availability checks, we’ll pick one (or one umbrella + product name) and document in “Document final naming convention and choices”.

## References

- Plan: *Ideate new names for RocketCMS and Cortex* (Cortex plan).
- Criteria: [naming-criteria-and-availability.md](./naming-criteria-and-availability.md).
