import * as React from 'react';
import { ContextMenu as ContextMenuPrimitive } from 'radix-ui';
import { cn } from '../../utils/cn';

export interface ContextMenuSeparatorProps extends React.ComponentPropsWithoutRef<
  typeof ContextMenuPrimitive.Separator
> {}

export const ContextMenuSeparator = React.forwardRef<
  React.ComponentRef<typeof ContextMenuPrimitive.Separator>,
  ContextMenuSeparatorProps
>((props, ref): React.ReactElement => {
  const { className, ...rest } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <ContextMenuPrimitive.Separator
      className={cn('bg-muted -mx-1 my-1 h-px', className)}
      ref={ref}
      {...rest}
    />
  );
});

ContextMenuSeparator.displayName =
  ContextMenuPrimitive.Separator.displayName ?? 'ContextMenuSeparator';
