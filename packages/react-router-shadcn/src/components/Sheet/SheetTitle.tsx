import * as React from 'react';
import * as SheetPrimitive from '@radix-ui/react-dialog';
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
      className={cn('text-lg font-semibold text-foreground', className)}
      ref={ref}
      {...rest}
    />
  );
});

SheetTitle.displayName = SheetPrimitive.Title.displayName ?? 'SheetTitle';
