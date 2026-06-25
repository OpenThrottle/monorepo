import { Button, Input, Label, cn } from '@openthrottle/react-router-shadcn';
import { type ReactElement, useId, useState } from 'react';

import { type DisplayUnit, type FloorElement } from '../types';
import { formatDimensions } from '../utils/units';

/**
 * The editable fields surfaced by {@link PropertyPanel}.
 *
 * @publicApi
 */
export interface ElementEditPatch {
  readonly label?: string;
  readonly rotation?: number;
  readonly seats?: number;
}

/**
 * Props for {@link PropertyPanel}.
 *
 * @publicApi
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

interface NumberFieldProps {
  readonly id: string;
  /** Round committed values to a whole number (e.g. seat counts). */
  readonly integer?: boolean;
  readonly label: string;
  readonly min?: number;
  /** Commit a parsed numeric value (empty/invalid input is never committed). */
  readonly onCommit: (value: number) => void;
  /** Canonical numeric value reflected when the field is not being edited. */
  readonly value: number;
}

/**
 * @description Number input that holds a local string draft while focused so the
 * field can be cleared and retyped freely. The draft is committed on every valid
 * parse and reconciled to the canonical `value` on blur; empty/intermediate input
 * is allowed transiently and never committed.
 */
function NumberField(props: NumberFieldProps): ReactElement {
  // Setup
  const { id, integer, label, min, onCommit, value } = props;

  // Hooks
  const [draft, setDraft] = useState<string | null>(null);

  // Markup
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        min={min}
        onBlur={() => setDraft(null)}
        onChange={(event) => {
          const raw = event.target.value;
          setDraft(raw);
          const parsed = Number.parseFloat(raw);
          if (Number.isNaN(parsed)) return;
          const rounded = integer === true ? Math.round(parsed) : parsed;
          onCommit(min === undefined ? rounded : Math.max(min, rounded));
        }}
        type="number"
        value={draft ?? String(value)}
      />
    </div>
  );
}

/**
 * @description shadcn property panel for the single selected element: edit its
 * label, seat count (tables only), and explicit rotation; see its width ×
 * height in the configured display unit; and delete it. Renders an empty-state
 * hint when nothing is selected. All edits flow up via `onChange` — nothing is
 * mutated in place.
 *
 * @publicApi
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
