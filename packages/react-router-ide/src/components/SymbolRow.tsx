import * as React from 'react';
import { Badge, cn } from '@openthrottle/react-router-shadcn';
import type { ExportedSymbol } from '../data/view-models';

export interface SymbolRowProps {
  className?: string;
  /** Fired with the symbol when the row is activated. */
  onSelect?: (symbol: ExportedSymbol) => void;
  /** Whether this row is the currently selected symbol. */
  selected?: boolean;
  /** The exported symbol (engine leaf type). */
  symbol: ExportedSymbol;
}

/**
 * A single exported symbol: its name, declaration kind, an optional default-export
 * indicator, and origin line. Presentational; activation is reported via `onSelect`.
 *
 * @publicApi
 */
export const SymbolRow = (props: SymbolRowProps): React.ReactElement => {
  const { className, onSelect, selected = false, symbol } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  return (
    <button
      aria-pressed={selected}
      className={cn(
        'hover:bg-muted focus-visible:bg-muted flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-left text-sm',
        selected && 'bg-muted',
        className,
      )}
      data-testid="SymbolRow"
      onClick={() => onSelect?.(symbol)}
      type="button"
    >
      <span className="flex-1 truncate font-mono">{symbol.name}</span>
      {symbol.isDefault ? <Badge color="blue">default</Badge> : null}
      <Badge color="slate" size="xs">
        {symbol.kind}
      </Badge>
      <span className="text-muted-foreground text-xs">:{symbol.line}</span>
    </button>
  );
};
