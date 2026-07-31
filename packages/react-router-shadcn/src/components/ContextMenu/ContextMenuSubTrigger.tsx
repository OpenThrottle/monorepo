import * as React from 'react';
import { ContextMenu as ContextMenuPrimitive } from 'radix-ui';
import { ChevronRight } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface ContextMenuSubTriggerProps extends React.ComponentPropsWithoutRef<
  typeof ContextMenuPrimitive.SubTrigger
> {
  inset?: boolean;
}

export const ContextMenuSubTrigger = React.forwardRef<
  React.ComponentRef<typeof ContextMenuPrimitive.SubTrigger>,
  ContextMenuSubTriggerProps
>((props, ref): React.ReactElement => {
  const { children, className, inset = false, ...rest } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <ContextMenuPrimitive.SubTrigger
      className={cn(
        'focus:bg-accent data-[state=open]:bg-accent flex cursor-default items-center rounded-sm px-2 py-1.5 text-sm outline-none select-none',
        inset && 'pl-8',
        className,
      )}
      ref={ref}
      {...rest}
    >
      {children}
      <ChevronRight className="ml-auto h-4 w-4" />
    </ContextMenuPrimitive.SubTrigger>
  );
});

ContextMenuSubTrigger.displayName =
  ContextMenuPrimitive.SubTrigger.displayName ?? 'ContextMenuSubTrigger';
