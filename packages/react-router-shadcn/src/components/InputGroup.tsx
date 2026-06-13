import * as React from 'react';
import { cn } from '../utils/cn';

export interface InputGroupProps extends React.HTMLAttributes<HTMLDivElement> {}

export const InputGroup = React.forwardRef<HTMLDivElement, InputGroupProps>(
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
          'group/input-group border-input dark:bg-input/30 relative flex h-9 w-full min-w-0 items-center rounded-md border shadow-xs transition-[color,box-shadow] outline-none',
          'has-[>textarea]:h-auto',

          // Variants based on alignment.
          'has-[>[data-align=inline-start]]:[&>input]:pl-2',
          'has-[>[data-align=inline-end]]:[&>input]:pr-2',
          'has-[>[data-align=block-start]]:h-auto has-[>[data-align=block-start]]:flex-col has-[>[data-align=block-start]]:[&>input]:pb-3',
          'has-[>[data-align=block-end]]:h-auto has-[>[data-align=block-end]]:flex-col has-[>[data-align=block-end]]:[&>input]:pt-3',

          // Focus state.
          'has-[[data-slot=input-group-control]:focus-visible]:border-ring has-[[data-slot=input-group-control]:focus-visible]:ring-ring/50 has-[[data-slot=input-group-control]:focus-visible]:ring-[3px]',

          // Error state.
          'has-[[data-slot][aria-invalid=true]]:border-destructive has-[[data-slot][aria-invalid=true]]:ring-destructive/20 dark:has-[[data-slot][aria-invalid=true]]:ring-destructive/40',

          className,
        )}
        data-slot="input-group"
        ref={ref}
        role="group"
        {...rest}
      />
    );
  },
);

InputGroup.displayName = 'InputGroup';
