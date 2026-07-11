import { cn } from '@openthrottle/react-router-shadcn';
import {
  type ReactElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { useFloorLayoutHistory } from '../hooks/useFloorLayoutHistory';
import { useSelectionKeyboard } from '../hooks/useSelectionKeyboard';
import { useViewport } from '../hooks/useViewport';
import {
  type FloorElement,
  type FloorElementType,
  type FloorLayout,
} from '../types';
import {
  clampPointToRect,
  type Point,
  snapValueToGrid,
} from '../utils/geometry';
import { createFloorElement, floorBounds } from '../utils/elements';
import {
  type ElementPatch,
  addElement,
  createEmptyLayout,
  moveElement,
  removeElement,
  updateElement,
} from '../utils/layout-operations';
import { ElementPalette } from './ElementPalette';
import { FloorCanvas } from './FloorCanvas';
import { FloorElementView } from './FloorElementView';
import { FloorToolbar } from './FloorToolbar';
import { PropertyPanel } from './PropertyPanel';
import { SelectionHandles } from './SelectionHandles';

/** Rotation snap step (degrees) — mirrors SelectionHandles' handle-drag snap. */
const ROTATE_SNAP_DEGREES = 15;

let fallbackIdCounter = 0;

function createElementId(): string {
  const api = globalThis.crypto;
  if (api && typeof api.randomUUID === 'function') return api.randomUUID();
  fallbackIdCounter += 1;
  return `floor-element-${fallbackIdCounter}`;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    target.isContentEditable ||
    tag === 'INPUT' ||
    tag === 'SELECT' ||
    tag === 'TEXTAREA'
  );
}

/**
 * Props for {@link FloorLayoutEditor}.
 *
 * @public
 */
export interface FloorLayoutEditorProps {
  /** Class applied to the editor root. */
  readonly className?: string;
  /** Initial layout for uncontrolled use. */
  readonly defaultValue?: FloorLayout;
  /** Canvas height as a CSS length (default `480px`). */
  readonly height?: string;
  /** Fired once per committed operation with the whole layout. */
  readonly onChange?: (layout: FloorLayout) => void;
  /** Fired when the selection changes. */
  readonly onSelectionChange?: (elementId: string | null) => void;
  /**
   * Controlled layout value.
   *
   * Controlled contract: the editor re-syncs from `value` only when its object
   * **identity** changes from the last value it emitted via `onChange`. To echo
   * back a layout the editor just emitted (e.g. round-tripping through your
   * store) without re-syncing, pass the same reference. To force a re-sync —
   * including a reset back to a previously-emitted layout — always pass a **new
   * object identity** (e.g. a fresh `{ ...layout }` or a deserialized copy);
   * mutating in place or reusing a prior reference will be silently ignored.
   */
  readonly value?: FloorLayout;
}

/**
 * @description Batteries-included restaurant floorplan editor. Composes the
 * palette, SVG canvas, selection handles, property panel, and toolbar over a
 * single zod-validated {@link FloorLayout}. Controlled (`value` + `onChange`)
 * AND uncontrolled (`defaultValue`). `onChange` fires ONCE per committed
 * operation (drop, pointer-up move/resize/rotate, edit, delete, undo/redo) with
 * the whole layout — live drags update an internal overlay only, never per
 * frame. Snapshot undo/redo via Cmd/Ctrl+Z and Cmd/Ctrl+Shift+Z. Single-select.
 *
 * @public
 */
export function FloorLayoutEditor(props: FloorLayoutEditorProps): ReactElement {
  const {
    className,
    defaultValue,
    height = '480px',
    onChange,
    onSelectionChange,
    value,
  } = props;

  // Hooks
  // Setup

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

  // Handlers
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

  // Markup

  // Life Cycle
  useSelectionKeyboard({
    enabled: selectedId !== null,
    gridSize: layout.gridSize,
    onDelete: handleDelete,
    onDeselect: () => select(null),
    onNudge: handleNudge,
    onRotate: handleRotate,
  });

  // Life Cycle
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

  // 🔌 Short Circuit

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <FloorToolbar
        canRedo={history.canRedo}
        canUndo={history.canUndo}
        onFit={viewport.fitToScreen}
        onRedo={() => {
          const next = redo();
          if (next) emit(next);
        }}
        onToggleSnap={() => setSnapEnabled((current) => !current)}
        onUndo={() => {
          const next = undo();
          if (next) emit(next);
        }}
        onZoomIn={viewport.zoomIn}
        onZoomOut={viewport.zoomOut}
        snapEnabled={snapEnabled}
      />
      <div className="flex flex-col gap-3 md:flex-row">
        <ElementPalette
          bounds={bounds}
          className="md:w-40 md:flex-col"
          clientToWorld={viewport.clientToWorld}
          gridSize={layout.gridSize}
          onCreateCommit={handleCreateCommit}
          onCreatePreview={handleCreatePreview}
          snapEnabled={snapEnabled}
        />
        <div
          className="bg-background relative flex-1 overflow-hidden rounded-md border"
          style={{ height }}
        >
          <FloorCanvas
            layout={layout}
            onBackgroundPointerDown={() => select(null)}
            onElementDrag={handleElementDrag}
            onElementDragEnd={handleElementDragEnd}
            onElementPointerDown={(id) => select(id)}
            selectedId={selectedId}
            snapEnabled={snapEnabled}
            viewport={viewport}
          >
            {selected ? (
              <SelectionHandles
                element={selected}
                gridSize={layout.gridSize}
                onTransform={handleTransform}
                snapEnabled={snapEnabled}
                viewport={viewport}
              />
            ) : null}
            {preview ? (
              <g opacity={0.5} pointerEvents="none">
                <FloorElementView element={preview} />
              </g>
            ) : null}
          </FloorCanvas>
        </div>
        <PropertyPanel
          className="md:w-56"
          displayUnit={layout.displayUnit}
          element={selected}
          onChange={handlePanelChange}
          onDelete={handleDelete}
        />
      </div>
    </div>
  );
}
