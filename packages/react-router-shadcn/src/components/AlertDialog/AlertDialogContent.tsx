import * as React from 'react';
import { AlertDialog as AlertDialogPrimitive } from 'radix-ui';
import { cn } from '../../utils/cn';
import { AlertDialogOverlay } from './AlertDialogOverlay';
import { AlertDialogPortal } from './index';

export interface AlertDialogContentProps extends React.ComponentPropsWithoutRef<
  typeof AlertDialogPrimitive.Content
> {}

export const AlertDialogContent = React.forwardRef<
  React.ComponentRef<typeof AlertDialogPrimitive.Content>,
  AlertDialogContentProps
>((props, ref): React.ReactElement => {
  const { className, ...rest } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <AlertDialogPortal>
      <AlertDialogOverlay />
      <AlertDialogPrimitive.Content
        className={cn(
          'fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 sm:rounded-lg',
          `data-[state=open]:animate-in data-[state=closed]:animate-out`,
          `data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0`,
          `data-[state=open]:slide-in-from-top-[50%] data-[state=closed]:slide-out-to-bottom-[50%]!`,
          `data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95`,
          className,
        )}
        ref={ref}
        {...rest}
      />
    </AlertDialogPortal>
  );
});

AlertDialogContent.displayName = AlertDialogPrimitive.Content.displayName;
