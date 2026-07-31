import * as React from 'react';

import { cn } from '../../utils/cn';

export interface CardActionProps extends React.ComponentProps<'div'> {}

export const CardAction = React.forwardRef<HTMLDivElement, CardActionProps>(
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
          'col-start-2 row-span-2 row-start-1 self-start justify-self-end',
          className,
        )}
        data-slot="card-action"
        ref={ref}
        {...rest}
      />
    );
  },
);

CardAction.displayName = 'CardAction';
