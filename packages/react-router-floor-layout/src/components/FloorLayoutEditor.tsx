import { cn } from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import { useFloorLayoutEditor } from '../hooks/useFloorLayoutEditor';
import { type FloorLayout } from '../types';
import { ElementPalette } from './ElementPalette';
import { FloorCanvas } from './FloorCanvas';
import { FloorElementView } from './FloorElementView';
import { FloorToolbar } from './FloorToolbar';
import { PropertyPanel } from './PropertyPanel';
import { SelectionHandles } from './SelectionHandles';

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
 * All state + behavior lives in {@link useFloorLayoutEditor}.
 *
 * @public
 */
export const FloorLayoutEditor = (
  props: FloorLayoutEditorProps,
): React.ReactElement => {
  const {
    className,
    defaultValue,
    height = '480px',
    onChange,
    onSelectionChange,
    value,
  } = props;

  // Hooks
  const {
    bounds,
    canRedo,
    canUndo,
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
  } = useFloorLayoutEditor({
    defaultValue,
    onChange,
    onSelectionChange,
    value,
  });

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <FloorToolbar
        canRedo={canRedo}
        canUndo={canUndo}
        onFit={viewport.fitToScreen}
        onRedo={handleRedo}
        onToggleSnap={handleToggleSnap}
        onUndo={handleUndo}
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
};
