/**
 * Public API for `@openthrottle/react-router-floor-layout`.
 *
 * A source-first, engine-agnostic React Router floorplan editor. The supported
 * contract is the zod-validated {@link FloorLayout} model plus (added in later
 * tasks) the `FloorLayoutEditor` component and its hooks. Coordinates are
 * canonical inches; `displayUnit` only affects labels.
 */

// Model (zod schemas + derived types) — single source of truth
export * from './types';

// Hardcoded element catalog (default sizes/seats/layer + palette copy)
export * from './data/elements';
export * from './data/data.demo';

// Components (editor + canvas, grid, element views, palette, panel, handles, toolbar)
export * from './components/ElementPalette';
export * from './components/FloorCanvas';
export * from './components/FloorElementView';
export * from './components/FloorGrid';
export * from './components/FloorLayoutEditor';
export * from './components/FloorToolbar';
export * from './components/PropertyPanel';
export * from './components/SelectionHandles';

// Interaction + state hooks
export * from './hooks/useFloorLayout';
export * from './hooks/useFloorLayoutHistory';
export * from './hooks/usePointerDrag';
export * from './hooks/useSelectionKeyboard';
export * from './hooks/useViewport';

// Geometry, model operations, serialization (world-space math, inches)
export * from './utils/elements';
export * from './utils/geometry';
export * from './utils/layout-operations';
export * from './utils/seats';
export * from './utils/selection-transform';
export * from './utils/serialization';
export * from './utils/units';
export * from './utils/viewport';
