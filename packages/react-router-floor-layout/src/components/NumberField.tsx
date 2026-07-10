import { Input, Label } from '@openthrottle/react-router-shadcn';
import { type ReactElement, useState } from 'react';

export interface NumberFieldProps {
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
export function NumberField(props: NumberFieldProps): ReactElement {
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
