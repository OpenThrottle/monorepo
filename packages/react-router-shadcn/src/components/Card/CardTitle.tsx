import * as React from 'react';

import { cn } from '../../utils/cn';

export interface CardTitleProps extends React.ComponentProps<'div'> {}

export const CardTitle = React.forwardRef<HTMLDivElement, CardTitleProps>(
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
        className={cn('leading-none', className)}
        data-slot="card-title"
        ref={ref}
        {...rest}
      />
    );
  },
);

CardTitle.displayName = 'CardTitle';
