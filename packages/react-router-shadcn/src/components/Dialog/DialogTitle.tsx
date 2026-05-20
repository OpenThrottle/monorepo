import * as React from 'react';
import { Dialog as DialogPrimitive } from 'radix-ui';
import { cn } from '../../utils/cn';

export interface DialogTitleProps extends React.ComponentPropsWithoutRef<
  typeof DialogPrimitive.Title
> {}

export const DialogTitle = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Title>,
  DialogTitleProps
>((props, ref): React.ReactElement => {
  const { className, ...rest } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <DialogPrimitive.Title
      className={cn('text-lg leading-none tracking-tight', className)}
      ref={ref}
      {...rest}
    />
  );
});

DialogTitle.displayName = DialogPrimitive.Title.displayName ?? 'DialogTitle';
