import * as React from 'react';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
  Skeleton,
  cn,
} from '@openthrottle/react-router-shadcn';
import type { ExportedSymbol, IdeExportsResult } from '../data/view-models';
import { groupSymbolsByPath } from '../utils/groupSymbolsByPath';
import { symbolKey } from '../utils/symbolKey';
import { SymbolRow } from './SymbolRow';

export interface ExportsListProps {
  className?: string;
  /** True while the exports fetcher is in flight. */
  loading?: boolean;
  /** Fired when a symbol is selected (the app resolves its def/references). */
  onSelectSymbol?: (symbol: ExportedSymbol) => void;
  /** The exported-symbols envelope from the symbols resource route. */
  result: IdeExportsResult;
  /** The currently selected symbol, for highlighting. */
  selectedSymbol?: ExportedSymbol;
}

/**
 * Renders a workspace's exported symbols grouped by file. A `Skeleton` while the
 * fetcher runs, an `Empty` state when there are none, otherwise {@link SymbolRow}s
 * per file. Selecting a symbol is reported via `onSelectSymbol`.
 *
 * @public
 */
export const ExportsList = (props: ExportsListProps): React.ReactElement => {
  const {
    className,
    loading = false,
    onSelectSymbol,
    result,
    selectedSymbol,
  } = props;

  // Hooks

  // Setup
  const groups = React.useMemo(
    () => groupSymbolsByPath(result.symbols),
    [result.symbols],
  );
  const selectedKey =
    selectedSymbol === undefined ? undefined : symbolKey(selectedSymbol);

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (loading) {
    return (
      <div
        className={cn('flex flex-col gap-2', className)}
        data-testid="ExportsList"
      >
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    );
  }

  if (result.symbols.length === 0) {
    return (
      <Empty className={className} data-testid="ExportsList">
        <EmptyHeader>
          <EmptyTitle>No exports</EmptyTitle>
          <EmptyDescription>
            No exported symbols were found in {result.repository.displayName}.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div
      className={cn('flex flex-col gap-4', className)}
      data-testid="ExportsList"
    >
      {groups.map((group) => (
        <div className="flex flex-col gap-0.5" key={group.path}>
          <p className="text-muted-foreground px-3 text-xs font-medium">
            {group.path}
          </p>
          {group.symbols.map((symbol) => {
            const key = symbolKey(symbol);

            return (
              <SymbolRow
                key={key}
                onSelect={onSelectSymbol}
                selected={key === selectedKey}
                symbol={symbol}
              />
            );
          })}
        </div>
      ))}
      {result.truncated ? (
        <p className="text-muted-foreground px-3 text-center text-xs">
          Symbols truncated — narrow the workspace to see more.
        </p>
      ) : null}
    </div>
  );
};
