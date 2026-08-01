import * as React from 'react';

import { cn } from '../../utils/cn';

export interface CardHeaderProps extends React.ComponentProps<'div'> {}

export const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
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
          '@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-2 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6',
          className,
        )}
        data-slot="card-header"
        ref={ref}
        {...rest}
      />
    );
  },
);

CardHeader.displayName = 'CardHeader';
