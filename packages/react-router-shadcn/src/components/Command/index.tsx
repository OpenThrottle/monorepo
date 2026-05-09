import * as React from 'react';
import {
  Command as CmdkCommand,
  CommandDialog as CmdkCommandDialog,
  CommandEmpty as CmdkCommandEmpty,
  CommandGroup as CmdkCommandGroup,
  CommandInput as CmdkCommandInput,
  CommandItem as CmdkCommandItem,
  CommandList as CmdkCommandList,
  CommandSeparator as CmdkCommandSeparator,
} from 'cmdk';
import { cn } from '../../utils/cn';
import { Kbd } from '../Kbd';

const Command = React.forwardRef<
  React.ComponentRef<typeof CmdkCommand>,
  React.ComponentPropsWithoutRef<typeof CmdkCommand>
>(({ className, ...props }, ref) => (
  <CmdkCommand
    className={cn(
      'flex h-full w-full flex-col overflow-hidden rounded-md bg-popover text-popover-foreground',
      className,
    )}
    ref={ref}
    {...props}
  />
));
Command.displayName = 'Command';

const CommandInput = React.forwardRef<
  React.ComponentRef<typeof CmdkCommandInput>,
  React.ComponentPropsWithoutRef<typeof CmdkCommandInput>
>(({ className, ...props }, ref) => (
  <CmdkCommandInput
    className={cn(
      'flex w-full rounded-md border border-input bg-background text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50',
      className,
    )}
    ref={ref}
    {...props}
  />
));
CommandInput.displayName = 'CommandInput';

const CommandList = React.forwardRef<
  React.ComponentRef<typeof CmdkCommandList>,
  React.ComponentPropsWithoutRef<typeof CmdkCommandList>
>(({ className, ...props }, ref) => (
  <CmdkCommandList
    className={cn('max-h-[300px] overflow-y-auto overflow-x-hidden', className)}
    ref={ref}
    {...props}
  />
));
CommandList.displayName = 'CommandList';

const CommandEmpty = React.forwardRef<
  React.ComponentRef<typeof CmdkCommandEmpty>,
  React.ComponentPropsWithoutRef<typeof CmdkCommandEmpty>
>((props, ref) => (
  <CmdkCommandEmpty className="py-6 text-center text-sm" ref={ref} {...props} />
));
CommandEmpty.displayName = 'CommandEmpty';

const CommandGroup = React.forwardRef<
  React.ComponentRef<typeof CmdkCommandGroup>,
  React.ComponentPropsWithoutRef<typeof CmdkCommandGroup>
>(({ className, ...props }, ref) => (
  <CmdkCommandGroup
    className={cn(
      'overflow-hidden p-1 text-foreground [&_[data-slot=command-group-heading]]:px-2 [&_[data-slot=command-group-heading]]:py-1.5 [&_[data-slot=command-group-heading]]:text-md [&_[data-slot=command-group-heading]]:font-extrabold [&_[data-slot=command-group-heading]]:text-muted-foreground',
      className,
    )}
    ref={ref}
    {...props}
  />
));
CommandGroup.displayName = 'CommandGroup';

const CommandItem = React.forwardRef<
  React.ComponentRef<typeof CmdkCommandItem>,
  React.ComponentPropsWithoutRef<typeof CmdkCommandItem>
>(({ className, ...props }, ref) => (
  <CmdkCommandItem
    className={cn(
      'relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none data-[disabled=true]:pointer-events-none data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground data-[disabled=true]:opacity-50',
      className,
    )}
    ref={ref}
    {...props}
  />
));
CommandItem.displayName = 'CommandItem';

const CommandSeparator = React.forwardRef<
  React.ComponentRef<typeof CmdkCommandSeparator>,
  React.ComponentPropsWithoutRef<typeof CmdkCommandSeparator>
>(({ className, ...props }, ref) => (
  <CmdkCommandSeparator
    className={cn('-mx-1 h-px bg-border', className)}
    ref={ref}
    {...props}
  />
));
CommandSeparator.displayName = 'CommandSeparator';

/** CommandDialog: Command palette inside a modal. Uses cmdk's Dialog (Radix Dialog). */
const CommandDialog = React.forwardRef<
  React.ComponentRef<typeof CmdkCommandDialog>,
  React.ComponentPropsWithoutRef<typeof CmdkCommandDialog>
>(({ contentClassName, overlayClassName, ...props }, ref) => (
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
    {...props}
  />
));
CommandDialog.displayName = 'CommandDialog';

/**
 * @description Displays a keyboard shortcut next to a command item (e.g. ⌘K). Use inside CommandItem; typically with ml-auto.
 */
const CommandShortcut = React.forwardRef<
  React.ComponentRef<typeof Kbd>,
  React.ComponentPropsWithoutRef<typeof Kbd>
>(({ className, ...props }, ref) => (
  <Kbd
    className={cn('ml-auto size-3.5 shrink-0 opacity-50', className)}
    ref={ref}
    {...props}
  />
));
CommandShortcut.displayName = 'CommandShortcut';

export {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
};
