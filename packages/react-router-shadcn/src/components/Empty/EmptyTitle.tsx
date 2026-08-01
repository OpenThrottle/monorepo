import * as React from 'react';

import { cn } from '../../utils/cn';

export interface EmptyTitleProps extends React.ComponentProps<'h3'> {}

export const EmptyTitle = React.forwardRef<HTMLHeadingElement, EmptyTitleProps>(
  (props, ref): React.ReactElement => {
    const { className, ...rest } = props;

    // Hooks

    // Setup

    // Handlers

    // Markup

    // Life Cycle

    // 🔌 Short Circuit

    return (
      <h3
        className={cn('text-lg font-medium tracking-tight', className)}
        data-slot="empty-title"
        ref={ref}
        {...rest}
      />
    );
  },
);

EmptyTitle.displayName = 'EmptyTitle';
