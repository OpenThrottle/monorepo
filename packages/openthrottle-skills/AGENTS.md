# @openthrottle/openthrottle-skills — agent notes

Parsers, Zod schemas, and validation for `.agents/` skill/rule/persona frontmatter, plus
on-disk walking and mapping of those assets into ingest records for the Cortex knowledge
base.

**Consumed by:** `openthrottle-developer` only.

## Layout

- `src/schemas/agent-asset-frontmatter.schemas.ts` — Zod schemas + `AgentAssetKind`.
- `src/frontmatter/*` — YAML frontmatter extraction/parsing primitives.
- `src/parse-*-frontmatter.ts` — per-kind parsers (skill / rule / persona).
- `src/walk-agent-assets-on-disk.ts` / `src/validate-agent-assets-on-disk.ts` — filesystem
  walk + validation entrypoints.
- `src/map-agent-assets-for-ingest.ts` / `src/collect-agent-assets-for-ingest.ts` — shape
  assets into ingest records (`AGENT_ASSET_INGEST_PATH_PREFIXES`).

## Invariants & gotchas

- Source-first (`__build` / `__build-package` placeholders, no `build`) — see
  [../AGENTS.md](../AGENTS.md). Validate with `lint`/`typecheck`/`typecheck-tests`/`test`.
- Exports are the package public API; each is tagged `@publicApi` in `src/index.ts` so Knip
  keeps it. Add the tag when exporting new symbols.

## Pointers

- [README.md](./README.md) — placeholder only; this file is the current reference.
