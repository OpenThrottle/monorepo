import * as React from 'react';
import { cn } from '../utils/cn';

export interface InputGroupInputProps extends React.ComponentProps<'input'> {}

export const InputGroupInput = React.forwardRef<
  HTMLInputElement,
  InputGroupInputProps
>((props, ref): React.ReactElement => {
  const { className, type = 'text', ...rest } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <input
      className={cn(
        'flex h-9 min-w-0 flex-1 rounded-none border-0 bg-transparent px-3 py-1 text-base shadow-none outline-none ring-0 ring-offset-0 transition-[color,box-shadow] selection:bg-primary selection:text-primary-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:ring-0 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-transparent',
        className,
      )}
      data-slot="input-group-control"
      ref={ref}
      type={type}
      {...rest}
    />
  );
});

InputGroupInput.displayName = 'InputGroupInput';
