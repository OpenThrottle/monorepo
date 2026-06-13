import * as React from 'react';
import { cn } from '../utils/cn';

export interface InputGroupTextProps extends React.HTMLAttributes<HTMLSpanElement> {}

export const InputGroupText = React.forwardRef<
  HTMLSpanElement,
  InputGroupTextProps
>((props, ref): React.ReactElement => {
  const { className, ...rest } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <span
      className={cn(
        'text-muted-foreground flex items-center gap-2 text-sm [&_svg]:pointer-events-none [&_svg:not([class*="size-"])]:size-4',
        className,
      )}
      data-slot="input-group-text"
      ref={ref}
      {...rest}
    />
  );
});

InputGroupText.displayName = 'InputGroupText';
