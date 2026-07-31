import * as React from 'react';
import { Dialog as SheetPrimitive } from 'radix-ui';
import { cn } from '../../utils/cn';

export interface SheetOverlayProps extends React.ComponentPropsWithoutRef<
  typeof SheetPrimitive.Overlay
> {}

export const SheetOverlay = React.forwardRef<
  React.ComponentRef<typeof SheetPrimitive.Overlay>,
  SheetOverlayProps
>((props, ref): React.ReactElement => {
  const { className, ...rest } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <SheetPrimitive.Overlay
      className={cn(
        'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/80',
        className,
      )}
      ref={ref}
      {...rest}
    />
  );
});

SheetOverlay.displayName = SheetPrimitive.Overlay.displayName ?? 'SheetOverlay';
