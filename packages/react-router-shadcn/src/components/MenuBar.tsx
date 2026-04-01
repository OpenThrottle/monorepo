import * as React from 'react';
import * as MenubarPrimitive from '@radix-ui/react-menubar';
import { Check, ChevronRight, Circle } from 'lucide-react';
import { cn } from '../utils/cn';

const Menubar = React.forwardRef<
  React.ComponentRef<typeof MenubarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof MenubarPrimitive.Root>
>(({ className, ...props }, ref) => (
  <MenubarPrimitive.Root
    className={cn(
      'flex h-9 items-center space-x-1 rounded-md border bg-background p-1 shadow-sm',
      className,
    )}
    ref={ref}
    {...props}
  />
));
Menubar.displayName = MenubarPrimitive.Root.displayName;

const MenubarMenu = MenubarPrimitive.Menu as unknown as React.ComponentRef<
  typeof MenubarPrimitive.Menu
>;
const MenubarTrigger = MenubarPrimitive.Trigger;
const MenubarPortal = MenubarPrimitive.Portal;
const MenubarGroup = MenubarPrimitive.Group;
const MenubarSub = MenubarPrimitive.Sub;
const MenubarRadioGroup = MenubarPrimitive.RadioGroup;

const MenubarContent = React.forwardRef<
  React.ComponentRef<typeof MenubarPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof MenubarPrimitive.Content>
>(
  (
    { className, align = 'start', alignOffset = -4, sideOffset = 8, ...props },
    ref,
  ) => (
    <MenubarPrimitive.Portal>
      <MenubarPrimitive.Content
        align={align}
        alignOffset={alignOffset}
        className={cn(
          'z-50 min-w-[12rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md',
          'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
          className,
        )}
        ref={ref}
        sideOffset={sideOffset}
        {...props}
      />
    </MenubarPrimitive.Portal>
  ),
);
MenubarContent.displayName = MenubarPrimitive.Content.displayName;

const MenubarItem = React.forwardRef<
  React.ComponentRef<typeof MenubarPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof MenubarPrimitive.Item> & {
    inset?: boolean;
  }
>(({ className, inset = false, ...props }, ref) => (
  <MenubarPrimitive.Item
    className={cn(
      'relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      inset && 'pl-8',
      className,
    )}
    ref={ref}
    {...props}
  />
));
MenubarItem.displayName = MenubarPrimitive.Item.displayName;

const MenubarCheckboxItem = React.forwardRef<
  React.ComponentRef<typeof MenubarPrimitive.CheckboxItem>,
  React.ComponentPropsWithoutRef<typeof MenubarPrimitive.CheckboxItem>
>(({ className, children, checked, ...props }, ref) => (
  <MenubarPrimitive.CheckboxItem
    checked={checked}
    className={cn(
      'relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      className,
    )}
    ref={ref}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <MenubarPrimitive.ItemIndicator>
        <Check className="h-4 w-4" />
      </MenubarPrimitive.ItemIndicator>
    </span>
    {children}
  </MenubarPrimitive.CheckboxItem>
));
MenubarCheckboxItem.displayName = MenubarPrimitive.CheckboxItem.displayName;

const MenubarRadioItem = React.forwardRef<
  React.ComponentRef<typeof MenubarPrimitive.RadioItem>,
  React.ComponentPropsWithoutRef<typeof MenubarPrimitive.RadioItem>
>(({ className, children, ...props }, ref) => (
  <MenubarPrimitive.RadioItem
    className={cn(
      'relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      className,
    )}
    ref={ref}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <MenubarPrimitive.ItemIndicator>
        <Circle className="h-2 w-2 fill-current" />
      </MenubarPrimitive.ItemIndicator>
    </span>
    {children}
  </MenubarPrimitive.RadioItem>
));
MenubarRadioItem.displayName = MenubarPrimitive.RadioItem.displayName;

const MenubarLabel = React.forwardRef<
  React.ComponentRef<typeof MenubarPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof MenubarPrimitive.Label> & {
    inset?: boolean;
  }
>(({ className, inset = false, ...props }, ref) => (
  <MenubarPrimitive.Label
    className={cn(
      'px-2 py-1.5 text-sm font-semibold',
      inset && 'pl-8',
      className,
    )}
    ref={ref}
    {...props}
  />
));
MenubarLabel.displayName = MenubarPrimitive.Label.displayName;

const MenubarSeparator = React.forwardRef<
  React.ComponentRef<typeof MenubarPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof MenubarPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <MenubarPrimitive.Separator
    className={cn('-mx-1 my-1 h-px bg-muted', className)}
    ref={ref}
    {...props}
  />
));
MenubarSeparator.displayName = MenubarPrimitive.Separator.displayName;

const MenubarShortcut = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>): React.ReactElement => (
  <span
    className={cn('ml-auto text-xs tracking-widest opacity-60', className)}
    {...props}
  />
);
MenubarShortcut.displayName = 'MenubarShortcut';

const MenubarSubTrigger = React.forwardRef<
  React.ComponentRef<typeof MenubarPrimitive.SubTrigger>,
  React.ComponentPropsWithoutRef<typeof MenubarPrimitive.SubTrigger> & {
    inset?: boolean;
  }
>(({ className, inset = false, children, ...props }, ref) => (
  <MenubarPrimitive.SubTrigger
    className={cn(
      'flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent data-[state=open]:bg-accent',
      inset && 'pl-8',
      className,
    )}
    ref={ref}
    {...props}
  >
    {children}
    <ChevronRight className="ml-auto h-4 w-4" />
  </MenubarPrimitive.SubTrigger>
));
MenubarSubTrigger.displayName = MenubarPrimitive.SubTrigger.displayName;

const MenubarSubContent = React.forwardRef<
  React.ComponentRef<typeof MenubarPrimitive.SubContent>,
  React.ComponentPropsWithoutRef<typeof MenubarPrimitive.SubContent>
>(({ className, ...props }, ref) => (
  <MenubarPrimitive.SubContent
    className={cn(
      'z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
      className,
    )}
    ref={ref}
    {...props}
  />
));
MenubarSubContent.displayName = MenubarPrimitive.SubContent.displayName;

export {
  Menubar,
  MenubarCheckboxItem,
  MenubarContent,
  MenubarGroup,
  MenubarItem,
  MenubarLabel,
  MenubarMenu,
  MenubarPortal,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarSeparator,
  MenubarShortcut,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
};
