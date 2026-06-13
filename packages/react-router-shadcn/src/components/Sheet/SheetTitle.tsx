import * as React from 'react';
import { Dialog as SheetPrimitive } from 'radix-ui';
import { cn } from '../../utils/cn';

export interface SheetTitleProps extends React.ComponentPropsWithoutRef<
  typeof SheetPrimitive.Title
> {}

export const SheetTitle = React.forwardRef<
  React.ComponentRef<typeof SheetPrimitive.Title>,
  SheetTitleProps
>((props, ref) => {
  const { className, ...rest } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <SheetPrimitive.Title
      className={cn('text-foreground text-lg', className)}
      ref={ref}
      {...rest}
    />
  );
});

SheetTitle.displayName = SheetPrimitive.Title.displayName ?? 'SheetTitle';
