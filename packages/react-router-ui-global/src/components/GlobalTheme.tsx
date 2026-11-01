import { cn } from '@openthrottle/react-router-shadcn';
import * as React from 'react';

export interface GlobalThemeProps {
  readonly className?: string;
}

export const GlobalTheme = (props: GlobalThemeProps): React.ReactElement => {
  const { className } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className={cn('p-4', className)} data-testid="GlobalTheme">
      <h2>GlobalTheme</h2>

      {/* Add a button to override system vs. light/dark */}
    </div>
  );
};
