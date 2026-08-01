import * as React from 'react';

import { cn } from '../../utils/cn';

export interface CardFooterProps extends React.ComponentProps<'div'> {}

export const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(
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
        className={cn('flex items-center px-6 [.border-t]:pt-6', className)}
        data-slot="card-footer"
        ref={ref}
        {...rest}
      />
    );
  },
);

CardFooter.displayName = 'CardFooter';
