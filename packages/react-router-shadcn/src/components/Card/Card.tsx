import * as React from 'react';

import { cn } from '../../utils/cn';

export interface CardProps extends React.ComponentProps<'div'> {}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
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
          'bg-card text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm',
          className,
        )}
        data-slot="card"
        ref={ref}
        {...rest}
      />
    );
  },
);

Card.displayName = 'Card';
