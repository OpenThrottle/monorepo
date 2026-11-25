import {
  Button,
  cn,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@openthrottle/react-router-shadcn';
import { ChartColumnIcon, ChevronDownIcon } from 'lucide-react';
import * as React from 'react';

import { GLOBAL_STATS_TOGGLE_COPY } from '../data/copy';
import { useRouteStatsToggle } from '../hooks/useRouteStatsToggle';

export interface GlobalStatsToggleButtonProps {
  readonly className?: string;
}

/**
 * @public
 * @description Toolbar button that shows or hides the route's
 * {@link GlobalStatsPanel} by flipping `?stats=open`. It exposes
 * `aria-expanded` and points `aria-controls` at the panel. It carries its own
 * `TooltipProvider`, so toolbars rendered outside the app shell (route tests,
 * stories) need none.
 */
export const GlobalStatsToggleButton = (
  props: GlobalStatsToggleButtonProps,
): React.ReactElement => {
  const { className } = props;

  // Hooks
  const { contentId, isOpen, toggle } = useRouteStatsToggle();

  // Setup
  const label = isOpen
    ? GLOBAL_STATS_TOGGLE_COPY.hide
    : GLOBAL_STATS_TOGGLE_COPY.show;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild={true}>
          <Button
            aria-controls={contentId}
            aria-expanded={isOpen}
            aria-label={label}
            className={cn(
              'text-muted-foreground hover:text-foreground shrink-0 gap-1',
              { 'text-foreground': isOpen },
              className,
            )}
            data-testid="GlobalStatsToggleButton"
            onClick={toggle}
            size="sm"
            type="button"
            variant="ghost"
          >
            <ChartColumnIcon aria-hidden={true} className="size-4" />
            <ChevronDownIcon
              aria-hidden={true}
              className={cn(
                'size-3.5 motion-safe:transition-transform motion-safe:duration-300',
                { 'rotate-180': isOpen },
              )}
            />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
