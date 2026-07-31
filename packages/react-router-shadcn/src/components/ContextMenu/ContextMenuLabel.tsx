import * as React from 'react';
import { ContextMenu as ContextMenuPrimitive } from 'radix-ui';
import { cn } from '../../utils/cn';

export interface ContextMenuLabelProps extends React.ComponentPropsWithoutRef<
  typeof ContextMenuPrimitive.Label
> {
  inset?: boolean;
}

export const ContextMenuLabel = React.forwardRef<
  React.ComponentRef<typeof ContextMenuPrimitive.Label>,
  ContextMenuLabelProps
>((props, ref): React.ReactElement => {
  const { className, inset = false, ...rest } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <ContextMenuPrimitive.Label
      className={cn(
        'px-2 py-1.5 text-sm font-semibold',
        inset && 'pl-8',
        className,
      )}
      ref={ref}
      {...rest}
    />
  );
});

ContextMenuLabel.displayName =
  ContextMenuPrimitive.Label.displayName ?? 'ContextMenuLabel';
