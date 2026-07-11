import { Button, Input, Label, cn } from '@openthrottle/react-router-shadcn';
import { type ReactElement, useId } from 'react';

import { NumberField } from './NumberField';
import { type DisplayUnit, type FloorElement } from '../types';
import { formatDimensions } from '../utils/units';

/**
 * The editable fields surfaced by {@link PropertyPanel}.
 *
 * @public
 */
export interface ElementEditPatch {
  readonly label?: string;
  readonly rotation?: number;
  readonly seats?: number;
}

/**
 * Props for {@link PropertyPanel}.
 *
 * @public
 */
export interface PropertyPanelProps {
  /** Class applied to the panel root. */
  readonly className?: string;
  /** Unit used to render the dimensions readout. */
  readonly displayUnit: DisplayUnit;
  /** The selected element, or `null` when nothing is selected. */
  readonly element: FloorElement | null;
  /** Commit an edit to the selected element (fires once per change). */
  readonly onChange: (patch: ElementEditPatch) => void;
  /** Delete the selected element. */
  readonly onDelete: () => void;
}

/**
 * @description shadcn property panel for the single selected element: edit its
 * label, seat count (tables only), and explicit rotation; see its width ×
 * height in the configured display unit; and delete it. Renders an empty-state
 * hint when nothing is selected. All edits flow up via `onChange` — nothing is
 * mutated in place.
 *
 * @public
 */
export function PropertyPanel(props: PropertyPanelProps): ReactElement {
  // Setup
  const { className, displayUnit, element, onChange, onDelete } = props;

  // Hooks
  const fieldId = useId();

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (!element) {
    return (
      <div className={cn('text-muted-foreground text-sm', className)}>
        Select an element to edit it.
      </div>
    );
  }

  // Setup
  const isTable = 'seats' in element;
  const kind = element.type.replace(/-/g, ' ');

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <p className="text-sm font-medium capitalize">{kind}</p>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${fieldId}-label`}>Label</Label>
        <Input
          id={`${fieldId}-label`}
          onChange={(event) => onChange({ label: event.target.value })}
          value={element.label ?? ''}
        />
      </div>

      {isTable ? (
        <NumberField
          id={`${fieldId}-seats`}
          integer={true}
          key={`${element.id}-seats`}
          label="Seats"
          min={0}
          onCommit={(value) => onChange({ seats: value })}
          value={element.seats}
        />
      ) : null}

      <NumberField
        id={`${fieldId}-rotation`}
        key={`${element.id}-rotation`}
        label="Rotation (°)"
        onCommit={(value) => onChange({ rotation: value })}
        value={Math.round(element.rotation)}
      />

      <div className="flex flex-col gap-1">
        <span className="text-muted-foreground text-xs font-medium">
          Dimensions
        </span>
        <span className="text-sm tabular-nums">
          {formatDimensions(element.width, element.height, displayUnit)}
        </span>
      </div>

      <Button onClick={onDelete} type="button" variant="destructive">
        Delete
      </Button>
    </div>
  );
}
