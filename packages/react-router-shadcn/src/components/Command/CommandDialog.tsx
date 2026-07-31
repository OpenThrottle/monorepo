import * as React from 'react';
import { CommandDialog as CmdkCommandDialog } from 'cmdk';
import { cn } from '../../utils/cn';

/** CommandDialog: Command palette inside a modal. Uses cmdk's Dialog (Radix Dialog). */
export interface CommandDialogProps extends React.ComponentPropsWithoutRef<
  typeof CmdkCommandDialog
> {}

// Annotate with the explicit forwardRef type so the emitted declaration is
// nameable (via `CmdkCommandDialog` + React) instead of referencing radix's
// internal, un-nameable `DialogProps`.
export const CommandDialog: React.ForwardRefExoticComponent<
  CommandDialogProps &
    React.RefAttributes<React.ComponentRef<typeof CmdkCommandDialog>>
> = React.forwardRef<
  React.ComponentRef<typeof CmdkCommandDialog>,
  CommandDialogProps
>((props, ref): React.ReactElement => {
  const { contentClassName, overlayClassName, ...rest } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <CmdkCommandDialog
      contentClassName={cn(
        // 'fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-center-1/2 data-[state=closed]:slide-out-to-center-[48%] data-[state=open]:slide-in-from-center-1/2 data-[state=open]:slide-in-from-center-[48%] sm:rounded-lg overflow-hidden',
        `fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 sm:rounded-lg ` +
          `bg-popover duration-300 p-0 text-popover-foreground shadow-lg ` +
          `data-[state=open]:animate-in data-[state=closed]:animate-out ` +
          `data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 ` +
          // `data-[state=open]:slide-in-from-top-[50%] data-[state=closed]:slide-out-to-center-[50%]! ` +
          `data-[state=open]:zoom-in-80 data-[state=closed]:zoom-out-80 `,
        contentClassName,
      )}
      overlayClassName={cn(
        'fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
        overlayClassName,
      )}
      ref={ref}
      {...rest}
    />
  );
});
CommandDialog.displayName = 'CommandDialog';
