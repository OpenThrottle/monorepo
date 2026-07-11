import * as React from 'react';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
  Skeleton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  cn,
} from '@openthrottle/react-router-shadcn';
import { LocationTable } from './LocationTable';
import type { IdeSymbolDetails } from '../data/view-models';

export interface DefinitionReferencesPanelProps {
  className?: string;
  /** Resolved definition + references for the selected symbol; null when none selected. */
  details?: IdeSymbolDetails | null;
  /** True while the def/references fetcher is in flight. */
  loading?: boolean;
}

/**
 * Shows the resolved definition site(s) and all references for a selected symbol,
 * split across `Definition` / `References` tabs. A `Skeleton` while the fetcher
 * runs, an `Empty` prompt when no symbol is selected. Presentational.
 *
 * @public
 */
export const DefinitionReferencesPanel = (
  props: DefinitionReferencesPanelProps,
): React.ReactElement => {
  const { className, details, loading = false } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (loading) {
    return (
      <div
        className={cn('flex flex-col gap-2', className)}
        data-testid="DefinitionReferencesPanel"
      >
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (details === undefined || details === null) {
    return (
      <Empty className={className} data-testid="DefinitionReferencesPanel">
        <EmptyHeader>
          <EmptyTitle>No symbol selected</EmptyTitle>
          <EmptyDescription>
            Select an exported symbol to see its definition and references.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div
      className={cn('flex flex-col gap-3', className)}
      data-testid="DefinitionReferencesPanel"
    >
      <p className="font-mono text-sm">
        {details.symbol.name}
        <span className="text-muted-foreground ml-2 text-xs">
          {details.symbol.path}:{details.symbol.line}
        </span>
      </p>
      <Tabs defaultValue="references">
        <TabsList>
          <TabsTrigger value="definition">
            Definition ({details.definitions.length})
          </TabsTrigger>
          <TabsTrigger value="references">
            References ({details.references.length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="definition">
          <LocationTable rows={details.definitions} />
        </TabsContent>
        <TabsContent value="references">
          <LocationTable rows={details.references} />
        </TabsContent>
      </Tabs>
    </div>
  );
};
