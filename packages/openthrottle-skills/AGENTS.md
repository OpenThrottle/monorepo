# @openthrottle/openthrottle-skills — agent notes

Parsers, Zod schemas, and validation for `.agents/` skill/rule/persona frontmatter, plus
on-disk walking and mapping of those assets into ingest records for the OpenThrottle knowledge
base.

**Consumed by:** `openthrottle-developer` only.

## Layout

- `src/schemas/agent-asset-frontmatter.schemas.ts` — Zod schemas + `AgentAssetKind`.
- `src/frontmatter/frontmatter.ts` — YAML frontmatter extraction/parsing primitives.
- `src/agent-asset-frontmatter.ts` — per-kind parsers (skill / persona) + validation.
- `src/agent-assets-disk.ts` — filesystem
  walk + validation entrypoints.
- `src/agent-assets-ingest.ts` — shape
  assets into ingest records (`AGENT_ASSET_INGEST_PATH_PREFIXES`).

## Invariants & gotchas

- Source-first (`__build` / `__build-package` placeholders, no `build`) — see
  [../AGENTS.md](../AGENTS.md). Validate with `lint`/`typecheck`/`test`.
- Exports are the package public API; each is tagged `@public` in `src/index.ts` so Knip
  keeps it. Add the tag when exporting new symbols.

## Pointers

- [README.md](./README.md) — placeholder only; this file is the current reference.
