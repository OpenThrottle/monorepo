# @openthrottle/openthrottle-product — agent notes

The positioning canon and the feature registry, as typed `as const` data. Every public description of OpenThrottle is built from it; see [README.md](README.md) for the entry shape and consumers.

## Layout

- [src/data/data.positioning.ts](src/data/data.positioning.ts) — `PRODUCT_POSITIONING`. Owner-approved wording; do not reword it without the owner.
- [src/data/data.features.ts](src/data/data.features.ts) — `PRODUCT_FEATURES`, grouped by pillar, in display order.
- [src/types/product.ts](src/types/product.ts) — the discriminated union and copy types.
- [src/utils/features.ts](src/utils/features.ts) — selectors and `getFeatureLink`.
- [src/utils/render.ts](src/utils/render.ts) — pure renderers for the README section, org profile and LinkedIn block.
- [src/scripts/generate-surfaces.ts](src/scripts/generate-surfaces.ts) — the `generate-surfaces` target: gathers stats, writes the README section and `out/`.
- [tests/registry.test.ts](tests/registry.test.ts) — length, id and pillar invariants over the real data.

## Invariants & gotchas

- Source-first, with no runtime dependencies (the generator script's workspace imports are devDependencies). Icons and repo URLs belong to the consumer (`getFeatureLink` takes the repo URL as a parameter); do not add a dependency to fix that.
- Never add Markdown as a source, and never copy an entry into a consumer. A surface that needs different wording gets it from the canon's three lengths.
- Flip `public` to `true` only for entries the owner approved. `in-flight` / `planned` entries are the public roadmap, so they need an approval of their own.
- A `shipped` entry's `prs` must be merged `OpenThrottle/monorepo` PRs; an `in-flight` / `planned` entry's `planIds` must be live (not `CANCELED`) OT plans.

## Pointers

- [../AGENTS.md](../AGENTS.md) — package-family conventions.
- OT plan `7b95b826` — the plan that introduced this package.
- The root README section is generated: edit the registry and rerun `generate-surfaces`, never the README between the markers. It carries no stats or dates on purpose, so `--check` stays deterministic.
