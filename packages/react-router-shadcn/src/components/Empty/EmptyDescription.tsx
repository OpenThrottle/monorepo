import * as React from 'react';

import { cn } from '../../utils/cn';

export interface EmptyDescriptionProps extends React.ComponentProps<'p'> {}

export const EmptyDescription = React.forwardRef<
  HTMLParagraphElement,
  EmptyDescriptionProps
>((props, ref): React.ReactElement => {
  const { className, ...rest } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <p
      className={cn(
        'text-muted-foreground [&>a:hover]:text-primary text-sm/relaxed [&>a]:underline [&>a]:underline-offset-4',
        className,
      )}
      data-slot="empty-description"
      ref={ref}
      {...rest}
    />
  );
});

EmptyDescription.displayName = 'EmptyDescription';
