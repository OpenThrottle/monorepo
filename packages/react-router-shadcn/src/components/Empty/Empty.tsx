import * as React from 'react';

import { cn } from '../../utils/cn';

export interface EmptyProps extends React.ComponentProps<'div'> {}

export const Empty = React.forwardRef<HTMLDivElement, EmptyProps>(
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
          'flex min-w-0 flex-1 flex-col items-center justify-center gap-6 rounded-lg border-dashed p-6 text-center text-balance md:p-12',
          className,
        )}
        data-slot="empty"
        ref={ref}
        {...rest}
      />
    );
  },
);

Empty.displayName = 'Empty';
