import * as React from 'react';
import { Dialog as SheetPrimitive } from 'radix-ui';
import { cn } from '../../utils/cn';

export interface SheetDescriptionProps extends React.ComponentPropsWithoutRef<
  typeof SheetPrimitive.Description
> {}

export const SheetDescription = React.forwardRef<
  React.ComponentRef<typeof SheetPrimitive.Description>,
  SheetDescriptionProps
>((props, ref) => {
  const { className, ...rest } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <SheetPrimitive.Description
      className={cn('text-sm text-muted-foreground', className)}
      ref={ref}
      {...rest}
    />
  );
});

SheetDescription.displayName = SheetPrimitive.Description.displayName ?? 'SheetDescription'; // prettier-ignore
