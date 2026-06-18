# @openthrottle/react-router-floor-layout

A source-first React Router library for arranging a **virtual restaurant
floorplan** — a draggable SVG canvas of tables, stools, zones, and walls with
live, touch-first dragging, pan/zoom, real-world dimensions, undo/redo,
single-select editing, and a zod-validated serializable layout model. Themed to
sit next to shadcn/Tailwind tokens.

## Native Pointer Events, not react-dnd

This package deliberately does **not** use react-dnd (or @dnd-kit / dragula).
react-dnd's HTML5 backend is a discrete drag-source/drop-target model: it gives
you a ghost image and coordinates only on drop, and has no touch support. The
requirement here is **live, real-time, touch-first dragging on tablets**, so all
interaction is built on a single `usePointerDrag` hook over the native
[Pointer Events API](https://developer.mozilla.org/docs/Web/API/Pointer_events)
(`setPointerCapture`), which unifies mouse, touch, and pen into one stream with
live world coordinates every frame.

## Features

- **Batteries-included** `<FloorLayoutEditor>` — palette, canvas, property
  panel, and toolbar, controlled or uncontrolled.
- **Live touch-first dragging** via native Pointer Events (no drag-and-drop
  library). Create, move, resize, and rotate all stream live coordinates.
- **SVG canvas** with a world-space `viewBox`: pinch-to-zoom, wheel zoom,
  drag-empty-canvas pan, and toolbar zoom/fit.
- **Real-world units** — the model stores canonical **inches**; a `displayUnit`
  (`'ft-in' | 'cm' | 'm'`) controls labels only. 1-foot (12-inch) snap grid.
- **Hybrid seating** — `seats` is a table attribute auto-rendered as chair
  glyphs around the perimeter; standalone stools are their own element.
- **Z-order layers** — zones render behind walls, which render behind
  tables/stools, so background regions never steal pointer hits.
- **Free overlap** — no collision detection; a soft bounds-clamp keeps every
  element's center on the floor so nothing is lost off-canvas.
- **Undo/redo** — snapshot history with Cmd/Ctrl+Z and Cmd/Ctrl+Shift+Z.
- **zod is the source of truth** — the `FloorLayout` model is a zod schema; TS
  types are derived via `z.infer` so runtime and static types can't drift.
  `toJSON`/`fromJSON` validate and carry `schemaVersion: 1` for migrations.
- **Source-first**: no build step — consuming apps' Vite transpiles `src`.

## Installation

Internal to the OpenThrottle monorepo, consumed via the workspace:

```jsonc
// applications/<app>/package.json
{
  "dependencies": {
    "@openthrottle/react-router-floor-layout": "workspace:^",
  },
}
```

Then `pnpm install` and `pnpm nx sync` to wire the TypeScript project reference.

## Quick start

Uncontrolled — pass a `defaultValue` (or omit it for a blank floor) and read
committed changes via `onChange`:

```tsx
import {
  FloorLayoutEditor,
  createEmptyLayout,
} from '@openthrottle/react-router-floor-layout';
import type { FloorLayout } from '@openthrottle/react-router-floor-layout';

export function FloorPlanner() {
  return (
    <FloorLayoutEditor
      defaultValue={createEmptyLayout({ id: 'main', name: 'Main floor' })}
      onChange={(layout: FloorLayout) => console.log('committed', layout)}
      onSelectionChange={(id) => console.log('selected', id)}
    />
  );
}
```

Controlled — own the layout and feed it back through `value`:

```tsx
const [layout, setLayout] = useState<FloorLayout>(initialLayout);

return <FloorLayoutEditor value={layout} onChange={setLayout} />;
```

`onChange` fires **once per committed operation** (drop, pointer-up
move/resize/rotate, edit-commit, delete, undo/redo) with the whole layout — live
drags update internal state only, never per animation frame.

## The `FloorLayout` model

All coordinates and sizes are **inches**. `x`/`y` are the element **center**.

```ts
type FloorLayout = {
  id: string;
  name: string;
  schemaVersion: 1;
  width: number; // floor width, inches
  height: number; // floor height, inches
  gridSize: number; // snap grid, inches (default 12 = 1 ft)
  displayUnit: 'ft-in' | 'cm' | 'm'; // labels only
  elements: FloorElement[];
};
```

`FloorElement` is a discriminated union on `type`
(`table-round` | `table-square` | `table-rectangle` | `stool` | `wall` | `zone`):
tables carry a `seats` count, zones carry a required `label`, and every element
carries `x`, `y`, `width`, `height`, `rotation` (degrees), and a `layer`
(z-order). Build elements with `createFloorElement({ type, center, id })`, which
applies the catalog defaults.

## Pan/zoom and keyboard shortcuts

| Gesture / key                 | Action                                 |
| ----------------------------- | -------------------------------------- |
| Drag empty canvas             | Pan                                    |
| Pinch (two pointers) / wheel  | Zoom                                   |
| Toolbar `+` / `−` / `Fit`     | Zoom in / out / fit floor              |
| Drag an element               | Move (snaps to grid, clamped to floor) |
| Drag resize/rotate handle     | Resize / rotate the selection          |
| Click element / empty         | Select / deselect                      |
| `Delete` / `Backspace`        | Delete the selection                   |
| Arrow keys (Shift = larger)   | Nudge the selection by one grid step   |
| `[` / `]`                     | Rotate the selection by 15°            |
| `Escape`                      | Deselect                               |
| Cmd/Ctrl+Z / Cmd/Ctrl+Shift+Z | Undo / redo                            |

## Serialization

```ts
import { toJSON, fromJSON } from '@openthrottle/react-router-floor-layout';

const json = toJSON(layout); // validates, returns a JSON string
const restored = fromJSON(json); // validates + throws on bad data / bad schemaVersion
```

## Composable primitives

For custom layouts, compose the pieces directly: `<FloorCanvas>`,
`<ElementPalette>`, `<PropertyPanel>`, `<FloorToolbar>`, `<SelectionHandles>`,
and the `useViewport`, `usePointerDrag`, `useFloorLayout`,
`useFloorLayoutHistory`, and `useSelectionKeyboard` hooks. All world-space math
lives in pure, tested helpers (`utils/geometry`, `utils/viewport`,
`utils/seats`, `utils/units`).

## Scope (v1) and deferred work

**In v1:** tables/stools/zones/walls, live drag + pan/zoom, real-world units,
single-select editing, undo/redo, zod serialization, pragmatic keyboard +
best-effort SVG a11y (`role`/`aria-label`/`<title>`).

**Deferred to follow-up plans:** server-side persistence / GraphQL schema for
saved layouts; reservation/seating-assignment logic; multi-select + group
transforms; walkway/ADA clearance warnings, a measuring ruler, and total
square-footage readouts; full screen-reader-operable canvas editing.

## Validation

```bash
pnpm nx run @openthrottle/react-router-floor-layout:lint
pnpm nx run @openthrottle/react-router-floor-layout:typecheck
pnpm nx run @openthrottle/react-router-floor-layout:typecheck-tests
pnpm nx run @openthrottle/react-router-floor-layout:test
```

Run them sequentially — Nx targets share a cache and shouldn't be parallelized.
As a source-first package there is no build of its own; the integration check is
to import `FloorLayoutEditor` into a consumer app (e.g. `openthrottle-developer`)
and run that app's `dev`/`build`.
