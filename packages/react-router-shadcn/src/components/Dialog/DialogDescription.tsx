import * as React from 'react';
import { Dialog as DialogPrimitive } from 'radix-ui';
import { cn } from '../../utils/cn';

export interface DialogDescriptionProps extends React.ComponentPropsWithoutRef<
  typeof DialogPrimitive.Description
> {}

export const DialogDescription = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Description>,
  DialogDescriptionProps
>((props, ref): React.ReactElement => {
  const { className, ...rest } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <DialogPrimitive.Description
      className={cn('text-muted-foreground text-sm', className)}
      ref={ref}
      {...rest}
    />
  );
});

DialogDescription.displayName =
  DialogPrimitive.Description.displayName ?? 'DialogDescription';
