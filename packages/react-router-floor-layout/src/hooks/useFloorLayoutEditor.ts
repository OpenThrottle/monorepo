/**
 * useFloorLayoutEditor — the FloorLayoutEditor brain (state + handlers).
 *
 * Owns the committed snapshot history (undo/redo), the live-drag overlay
 * layout, the palette-create preview, single-selection, grid snapping, and the
 * viewport, plus every editor handler and the keyboard wiring
 * (delete/nudge/rotate via `useSelectionKeyboard`; Cmd/Ctrl+Z and
 * Cmd/Ctrl+Shift+Z undo/redo). Extracted from `FloorLayoutEditor` per
 * docs/monorepo/component-primitive-shape.md (R6/R7) so the component stays
 * UI-focused. `onChange` semantics are unchanged — it fires ONCE per committed
 * operation (drop, pointer-up move/resize/rotate, edit, delete, undo/redo),
 * never per live-drag frame.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  type FloorElement,
  type FloorElementType,
  type FloorLayout,
} from '../types';
import { isEditableTarget } from '../utils/editable-target';
import { createElementId } from '../utils/element-id';
import { createFloorElement, floorBounds } from '../utils/elements';
import {
  type Point,
  type Rect,
  clampPointToRect,
  snapValueToGrid,
} from '../utils/geometry';
import {
  type ElementPatch,
  addElement,
  createEmptyLayout,
  moveElement,
  removeElement,
  updateElement,
} from '../utils/layout-operations';
import { useFloorLayoutHistory } from './useFloorLayoutHistory';
import { useSelectionKeyboard } from './useSelectionKeyboard';
import { type UseViewportResult, useViewport } from './useViewport';

/** Rotation snap step (degrees) — mirrors SelectionHandles' handle-drag snap. */
const ROTATE_SNAP_DEGREES = 15;

/**
 * Configuration for {@link useFloorLayoutEditor}.
 *
 * @public
 */
export interface UseFloorLayoutEditorOptions {
  /** Initial layout for uncontrolled use. */
  readonly defaultValue?: FloorLayout;
  /** Fired once per committed operation with the whole layout. */
  readonly onChange?: (layout: FloorLayout) => void;
  /** Fired when the selection changes. */
  readonly onSelectionChange?: (elementId: string | null) => void;
  /**
   * Controlled layout value. Re-synced only when its object identity changes
   * from the last value emitted via `onChange` (see
   * `FloorLayoutEditorProps.value` for the full controlled contract).
   */
  readonly value?: FloorLayout;
}

/**
 * The editor state + handlers returned by {@link useFloorLayoutEditor} —
 * exactly what the FloorLayoutEditor markup needs.
 *
 * @public
 */
export interface UseFloorLayoutEditorResult {
  /** Floor rectangle (world inches) element centers are clamped into. */
  readonly bounds: Rect;
  /** Whether redo is available. */
  readonly canRedo: boolean;
  /** Whether undo is available. */
  readonly canUndo: boolean;
  /** Commit a palette-created element at the drop point. */
  readonly handleCreateCommit: (type: FloorElementType, center: Point) => void;
  /** Update (or clear) the live palette-create ghost preview. */
  readonly handleCreatePreview: (
    type: FloorElementType | null,
    center: Point | null,
  ) => void;
  /** Delete the selected element. */
  readonly handleDelete: () => void;
  /** Live element move — updates the overlay only (no commit). */
  readonly handleElementDrag: (id: string, center: Point) => void;
  /** Committed element move — fires once on pointer-up. */
  readonly handleElementDragEnd: (id: string, center: Point) => void;
  /** Commit a property-panel edit to the selected element. */
  readonly handlePanelChange: (patch: ElementPatch) => void;
  /** Redo the last undone change (emits when a snapshot is restored). */
  readonly handleRedo: () => void;
  /** Toggle grid snapping. */
  readonly handleToggleSnap: () => void;
  /** Live (`move`) + committed (`commit`) resize/rotate patches. */
  readonly handleTransform: (
    patch: ElementPatch,
    phase: 'commit' | 'move',
  ) => void;
  /** Undo the last committed change (emits when a snapshot is restored). */
  readonly handleUndo: () => void;
  /** The layout to render — the live overlay during a drag, else committed. */
  readonly layout: FloorLayout;
  /** The palette-create ghost element, if a create drag is in flight. */
  readonly preview: FloorElement | null;
  /** Set (or clear) the single selection. */
  readonly select: (id: string | null) => void;
  /** The selected element, or `null`. */
  readonly selected: FloorElement | null;
  /** The selected element id, or `null`. */
  readonly selectedId: string | null;
  /** Whether grid snapping is on. */
  readonly snapEnabled: boolean;
  /** Viewport controller (owns the viewBox + pan/zoom). */
  readonly viewport: UseViewportResult;
}

/**
 * All FloorLayoutEditor state and behavior: snapshot history, live-drag
 * overlay, create preview, selection, snapping, viewport, handlers, and
 * keyboard shortcuts. Controlled (`value` + `onChange`) AND uncontrolled
 * (`defaultValue`).
 *
 * @public
 */
export function useFloorLayoutEditor(
  options: UseFloorLayoutEditorOptions,
): UseFloorLayoutEditorResult {
  const { defaultValue, onChange, onSelectionChange, value } = options;

  const isControlled = value !== undefined;

  const initialLayout = useMemo<FloorLayout>(
    () => value ?? defaultValue ?? createEmptyLayout({ id: createElementId() }),
    // Initial only — controlled updates flow through the sync effect below.
    [],
  );

  const history = useFloorLayoutHistory(initialLayout);
  const { commit, layout: committed, redo, undo } = history;
  const lastEmitted = useRef<FloorLayout>(initialLayout);

  const [live, setLive] = useState<FloorLayout | null>(null);
  const [preview, setPreview] = useState<FloorElement | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [snapEnabled, setSnapEnabled] = useState(true);

  const layout = live ?? committed;
  const bounds = useMemo(() => floorBounds(layout), [layout]);
  const floor = useMemo(
    () => ({ height: layout.height, width: layout.width }),
    [layout.height, layout.width],
  );

  const viewport = useViewport({ floor });
  const selected =
    layout.elements.find((element) => element.id === selectedId) ?? null;

  const emit = useCallback(
    (next: FloorLayout) => {
      lastEmitted.current = next;
      onChange?.(next);
    },
    [onChange],
  );

  const select = useCallback(
    (id: string | null) => {
      setSelectedId((current) => {
        if (current !== id) onSelectionChange?.(id);
        return id;
      });
    },
    [onSelectionChange],
  );

  const commitLayout = useCallback(
    (next: FloorLayout) => {
      setLive(null);
      commit(next);
      emit(next);
    },
    [commit, emit],
  );

  const handleElementDrag = useCallback(
    (id: string, center: Point) => setLive(moveElement(layout, id, center)),
    [layout],
  );

  const handleElementDragEnd = useCallback(
    (id: string, center: Point) =>
      commitLayout(moveElement(committed, id, center)),
    [commitLayout, committed],
  );

  const handleCreatePreview = useCallback(
    (type: FloorElementType | null, center: Point | null) => {
      setPreview(
        type && center
          ? createFloorElement({ center, id: 'preview', type })
          : null,
      );
    },
    [],
  );

  const handleCreateCommit = useCallback(
    (type: FloorElementType, center: Point) => {
      const element = createFloorElement({
        center,
        id: createElementId(),
        type,
      });
      setPreview(null);
      commitLayout(addElement(committed, element));
      select(element.id);
    },
    [commitLayout, committed, select],
  );

  const handleTransform = useCallback(
    (patch: ElementPatch, phase: 'commit' | 'move') => {
      if (!selectedId) return;
      if (phase === 'move') {
        setLive(updateElement(layout, selectedId, patch));
        return;
      }
      commitLayout(updateElement(committed, selectedId, patch));
    },
    [commitLayout, committed, layout, selectedId],
  );

  const handlePanelChange = useCallback(
    (patch: ElementPatch) => {
      if (!selectedId) return;
      commitLayout(updateElement(committed, selectedId, patch));
    },
    [commitLayout, committed, selectedId],
  );

  const handleDelete = useCallback(() => {
    if (!selectedId) return;
    commitLayout(removeElement(committed, selectedId));
    select(null);
  }, [commitLayout, committed, select, selectedId]);

  const handleNudge = useCallback(
    (dx: number, dy: number) => {
      if (!selected) return;
      const next = clampPointToRect(
        { x: selected.x + dx, y: selected.y + dy },
        bounds,
      );
      commitLayout(moveElement(committed, selected.id, next));
    },
    [bounds, commitLayout, committed, selected],
  );

  const handleRotate = useCallback(
    (deltaDegrees: number) => {
      if (!selected) return;
      const normalized =
        (((selected.rotation + deltaDegrees) % 360) + 360) % 360;
      // Match SelectionHandles' 15° snap so all rotation entry points (drag
      // handle, `[`/`]` keys) share the same snapping semantics when enabled.
      const rotation = snapEnabled
        ? snapValueToGrid(normalized, ROTATE_SNAP_DEGREES)
        : normalized;
      commitLayout(updateElement(committed, selected.id, { rotation }));
    },
    [commitLayout, committed, selected, snapEnabled],
  );

  const handleUndo = useCallback(() => {
    const next = undo();
    if (next) emit(next);
  }, [emit, undo]);

  const handleRedo = useCallback(() => {
    const next = redo();
    if (next) emit(next);
  }, [emit, redo]);

  const handleToggleSnap = useCallback(
    () => setSnapEnabled((current) => !current),
    [],
  );

  useSelectionKeyboard({
    enabled: selectedId !== null,
    gridSize: layout.gridSize,
    onDelete: handleDelete,
    onDeselect: () => select(null),
    onNudge: handleNudge,
    onRotate: handleRotate,
  });

  // Fit the floor on first mount.
  useEffect(() => {
    viewport.fitToScreen();
  }, []);

  // Sync an externally-controlled value (skip our own emissions).
  useEffect(() => {
    if (isControlled && value && value !== lastEmitted.current) {
      history.reset(value);
      lastEmitted.current = value;
      setLive(null);
    }
  }, [value]);

  // Undo/redo keyboard (Cmd/Ctrl+Z, Cmd/Ctrl+Shift+Z).
  useEffect(() => {
    const handler = (event: KeyboardEvent): void => {
      const mod = event.metaKey || event.ctrlKey;
      if (!mod || event.key.toLowerCase() !== 'z') return;
      if (isEditableTarget(event.target)) return;
      event.preventDefault();
      const next = event.shiftKey ? redo() : undo();
      if (next) {
        setLive(null);
        setPreview(null);
        emit(next);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [emit, redo, undo]);

  return {
    bounds,
    canRedo: history.canRedo,
    canUndo: history.canUndo,
    handleCreateCommit,
    handleCreatePreview,
    handleDelete,
    handleElementDrag,
    handleElementDragEnd,
    handlePanelChange,
    handleRedo,
    handleToggleSnap,
    handleTransform,
    handleUndo,
    layout,
    preview,
    select,
    selected,
    selectedId,
    snapEnabled,
    viewport,
  };
}
