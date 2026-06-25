import * as React from 'react';
import { Dialog as DialogPrimitive } from 'radix-ui';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn';
import { DialogOverlay } from './DialogOverlay';
import { DialogPortal } from './Dialog';

export interface DialogContentProps extends React.ComponentPropsWithoutRef<
  typeof DialogPrimitive.Content
> {
  readonly showClose?: boolean;
}

export const DialogContent = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Content>,
  DialogContentProps
>((props, ref): React.ReactElement => {
  const { children, className, showClose = true, ...rest } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        className={cn(
          `fixed top-[50%] left-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 sm:rounded-lg ` +
            `bg-background border p-6 shadow-lg duration-300 ` +
            `data-[state=open]:animate-in data-[state=closed]:animate-out ` +
            `data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 ` +
            `data-[state=open]:slide-in-from-top-[50%] data-[state=closed]:slide-out-to-bottom-[50%]! ` +
            `data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95`,
          className,
        )}
        ref={ref}
        {...rest}
      >
        {children}
        {showClose ? (
          <DialogPrimitive.Close className="ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute top-4 right-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-none disabled:pointer-events-none">
            <X aria-hidden="true" className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        ) : null}
      </DialogPrimitive.Content>
    </DialogPortal>
  );
});

DialogContent.displayName =
  DialogPrimitive.Content.displayName ?? 'DialogContent';
