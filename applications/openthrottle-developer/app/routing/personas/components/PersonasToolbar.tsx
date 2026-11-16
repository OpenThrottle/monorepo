import { cn } from '@openthrottle/react-router-shadcn';
import { GlobalStatsToggleButton } from '@openthrottle/react-router-ui-global';
import * as React from 'react';

export interface PersonasToolbarProps {
  className?: string;
}

export const PersonasToolbar = (
  props: PersonasToolbarProps,
): React.ReactElement => {
  const { className } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className={cn('flex w-full flex-wrap items-center gap-2', className)}
      data-testid="PersonasToolbar"
    >
      <p className="text-muted-foreground min-w-0 flex-1 text-sm">
        Personas are read from <code>.agents/personas/</code> on disk. Edit
        files in git — no in-app writes in phase 1.
      </p>
      <GlobalStatsToggleButton />
    </div>
  );
};
