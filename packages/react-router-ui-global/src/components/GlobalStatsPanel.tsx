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
          'motion-safe:data-[state=closed]:animate-collapsible-up motion-safe:data-[state=open]:animate-collapsible-down',
          className,
        )}
        data-testid="GlobalStatsPanel"
        id={contentId}
      >
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
};
