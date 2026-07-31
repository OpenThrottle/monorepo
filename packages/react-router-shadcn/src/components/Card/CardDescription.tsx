import * as React from 'react';

import { cn } from '../../utils/cn';

export interface CardDescriptionProps extends React.ComponentProps<'div'> {}

export const CardDescription = React.forwardRef<
  HTMLDivElement,
  CardDescriptionProps
>((props, ref): React.ReactElement => {
  const { className, ...rest } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className={cn('text-muted-foreground text-sm', className)}
      data-slot="card-description"
      ref={ref}
      {...rest}
    />
  );
});

CardDescription.displayName = 'CardDescription';
