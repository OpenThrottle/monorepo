import {
  cn,
  Collapsible,
  CollapsibleContent,
} from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import { useRouteStatsToggle } from '../hooks/useRouteStatsToggle';

export interface GlobalStatsPanelProps extends React.PropsWithChildren {
  readonly className?: string;
}

/**
 * @public
 * @description Collapsible wrapper for a route's stat-card row, closed by
 * default and opened by `?stats=open` (see `useRouteStatsToggle`). Pair it with
 * a {@link GlobalStatsToggleButton} in the route's toolbar. The content animates
 * its height open and closed (none under `prefers-reduced-motion`) and is
 * unmounted once closed, so nothing inside is tab-reachable. The root uses
 * `display: contents`, so a closed panel adds no gap to a flex or grid parent.
 * The parent's `gap` itself never animates, so the content cancels the
 * `GlobalScreen` gap below it with a negative margin and re-adds it as
 * inner padding: the spacing then collapses with the height instead of
 * snapping away on unmount (or appearing at once on open).
 */
export const GlobalStatsPanel = (
  props: GlobalStatsPanelProps,
): React.ReactElement => {
  const { children, className } = props;

  // Hooks
  const { contentId, isOpen, setOpen } = useRouteStatsToggle();

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Collapsible className="contents" onOpenChange={setOpen} open={isOpen}>
      <CollapsibleContent
        className={cn(
          'overflow-hidden',
          '-mb-4 md:-mb-8 lg:-mb-12',
          'motion-safe:data-[state=closed]:animate-collapsible-up motion-safe:data-[state=open]:animate-collapsible-down',
          className,
        )}
        data-testid="GlobalStatsPanel"
        id={contentId}
      >
        <div className="pb-4 md:pb-8 lg:pb-12">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
};
