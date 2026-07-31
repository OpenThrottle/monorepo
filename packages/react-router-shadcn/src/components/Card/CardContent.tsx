import * as React from 'react';

import { cn } from '../../utils/cn';

export interface CardContentProps extends React.ComponentProps<'div'> {}

export const CardContent = React.forwardRef<HTMLDivElement, CardContentProps>(
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
        className={cn('px-6', className)}
        data-slot="card-content"
        ref={ref}
        {...rest}
      />
    );
  },
);

CardContent.displayName = 'CardContent';
