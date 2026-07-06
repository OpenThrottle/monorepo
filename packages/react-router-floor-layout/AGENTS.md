# @openthrottle/react-router-floor-layout — agent notes

Engine-agnostic SVG floorplan editor (restaurant tables, stools, zones, walls): touch-first live
drag via native Pointer Events, pan/zoom, real-world units, undo/redo, zod-validated serializable
layout model.

**Consumed by:** nothing yet — no workspace consumer declares it; server-side persistence and the
consuming feature are deferred follow-up plans (see README "Scope").

## Layout

- [src/types.ts](src/types.ts) — zod schemas are the source of truth; TS types derive via `z.infer`.
- [src/components/FloorLayoutEditor.tsx](src/components/FloorLayoutEditor.tsx) — batteries-included editor (palette + canvas + property panel + toolbar), controlled or uncontrolled.
- [src/hooks/usePointerDrag.ts](src/hooks/usePointerDrag.ts) — the single drag primitive (`setPointerCapture`) all interactions build on.
- [src/utils/](src/utils/) — pure, tested world-space math (`geometry`, `viewport`, `seats`, `units`, `layout-operations`, `serialization`).

## Invariants & gotchas

- Source-first, no build target — see [packages/AGENTS.md](../AGENTS.md).
- Coordinates and sizes are canonical **inches**; `x`/`y` are the element **center**; `displayUnit` (`ft-in`/`cm`/`m`) affects labels only. `toJSON`/`fromJSON` validate and carry `schemaVersion: 1` — `fromJSON` throws on bad data or wrong version.
- Deliberately **no drag-and-drop library** (react-dnd/@dnd-kit/dragula): the requirement is live, per-frame, touch-first dragging, which their discrete drop models can't do. Don't introduce one.
- `onChange` fires once per **committed** operation (pointer-up, edit-commit, delete, undo/redo), never per animation frame.
- Two interchangeable state hooks: `useFloorLayoutHistory` (snapshot undo/redo — what `FloorLayoutEditor` uses) and `useFloorLayout` (plain `useState` wrapper, no history). Pick one per editor; don't stack them.
- Z-order is by `layer`: zones behind walls behind tables/stools, so background regions never steal pointer hits.
- Tests use [tests/setup.ts](tests/setup.ts) → `setupReactRouterTest` from `@openthrottle/react-router-testing`; its pointer-capture/ResizeObserver polyfills are required for the SVG drag tests to mount.

## Pointers

- [README.md](README.md) — model shape, keyboard/gesture table, composable primitives, v1 scope vs deferred work.
