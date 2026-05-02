import * as React from 'react';
import { cn } from '../utils/cn';

export interface InputGroupTextareaProps extends React.ComponentProps<'textarea'> {}

export const InputGroupTextarea = React.forwardRef<
  HTMLTextAreaElement,
  InputGroupTextareaProps
>((props, ref): React.ReactElement => {
  const { className, ...rest } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <textarea
      className={cn(
        'field-sizing-content flex min-h-16 w-full min-w-0 flex-1 resize-none rounded-none border-0 bg-transparent px-3 py-3 text-base shadow-none outline-none ring-0 ring-offset-0 placeholder:text-muted-foreground focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-transparent',
        className,
      )}
      data-slot="input-group-control"
      ref={ref}
      {...rest}
    />
  );
});

InputGroupTextarea.displayName = 'InputGroupTextarea';
