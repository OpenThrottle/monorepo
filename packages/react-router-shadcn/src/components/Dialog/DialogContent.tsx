import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
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
          `fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 sm:rounded-lg ` +
            `border bg-background duration-300 p-6 shadow-lg ` +
            `data-[state=open]:animate-in data-[state=closed]:animate-out ` +
            `data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 ` +
            `data-[state=open]:slide-in-from-top-[50%] data-[state=closed]:slide-out-to-bottom-[50%]! ` +
            `data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95 `,
          className,
        )}
        ref={ref}
        {...rest}
      >
        {children}
        {showClose ? (
          <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        ) : null}
      </DialogPrimitive.Content>
    </DialogPortal>
  );
});

DialogContent.displayName =
  DialogPrimitive.Content.displayName ?? 'DialogContent';
