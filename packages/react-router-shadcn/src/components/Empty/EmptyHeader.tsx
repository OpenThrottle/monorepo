import * as React from 'react';

import { cn } from '../../utils/cn';

export interface EmptyHeaderProps extends React.ComponentProps<'div'> {}

export const EmptyHeader = React.forwardRef<HTMLDivElement, EmptyHeaderProps>(
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
          'flex max-w-sm flex-col items-center gap-2 text-center',
          className,
        )}
        data-slot="empty-header"
        ref={ref}
        {...rest}
      />
    );
  },
);

EmptyHeader.displayName = 'EmptyHeader';
