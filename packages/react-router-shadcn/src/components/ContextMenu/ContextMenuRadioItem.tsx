import * as React from 'react';
import { ContextMenu as ContextMenuPrimitive } from 'radix-ui';
import { Circle } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface ContextMenuRadioItemProps extends React.ComponentPropsWithoutRef<
  typeof ContextMenuPrimitive.RadioItem
> {}

export const ContextMenuRadioItem = React.forwardRef<
  React.ComponentRef<typeof ContextMenuPrimitive.RadioItem>,
  ContextMenuRadioItemProps
>((props, ref): React.ReactElement => {
  const { children, className, ...rest } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <ContextMenuPrimitive.RadioItem
      className={cn(
        'focus:bg-accent focus:text-accent-foreground relative flex cursor-default items-center rounded-sm py-1.5 pr-2 pl-8 text-sm transition-colors outline-none select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        className,
      )}
      ref={ref}
      {...rest}
    >
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        <ContextMenuPrimitive.ItemIndicator>
          <Circle className="h-2 w-2 fill-current" />
        </ContextMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </ContextMenuPrimitive.RadioItem>
  );
});

ContextMenuRadioItem.displayName =
  ContextMenuPrimitive.RadioItem.displayName ?? 'ContextMenuRadioItem';
