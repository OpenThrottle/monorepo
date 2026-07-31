import * as React from 'react';

import { cn } from '../../utils/cn';

export interface EmptyContentProps extends React.ComponentProps<'div'> {}

export const EmptyContent = React.forwardRef<HTMLDivElement, EmptyContentProps>(
  (props, ref): React.ReactElement => {
    const { className, ...rest } = props;

    // Hooks

    // Setup

    // Handlers

    // Markup

    // Life Cycle

    // 🔌 Short Circuit

    return (
      <div
        className={cn(
          'flex w-full max-w-sm min-w-0 flex-col items-center gap-4 text-sm text-balance',
          className,
        )}
        data-slot="empty-content"
        ref={ref}
        {...rest}
      />
    );
  },
);

EmptyContent.displayName = 'EmptyContent';
