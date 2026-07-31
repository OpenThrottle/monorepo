import * as React from 'react';
import { HoverCard as HoverCardPrimitive } from 'radix-ui';
import { cn } from '../utils/cn';

// HoverCardPrimitive.Root is a plain React.FC (no ref forwarding) — leaving
// this as a direct alias rather than wrapping it in `forwardRef`, which would
// change runtime behavior (React would warn on any `ref` passed through).
export const HoverCard = HoverCardPrimitive.Root;

export interface HoverCardTriggerProps extends React.ComponentPropsWithoutRef<
  typeof HoverCardPrimitive.Trigger
> {}

export const HoverCardTrigger = React.forwardRef<
  React.ComponentRef<typeof HoverCardPrimitive.Trigger>,
  HoverCardTriggerProps
>((props, ref): React.ReactElement => {
  const { ...rest } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return <HoverCardPrimitive.Trigger ref={ref} {...rest} />;
});

HoverCardTrigger.displayName = HoverCardPrimitive.Trigger.displayName;

export interface HoverCardContentProps extends React.ComponentPropsWithoutRef<
  typeof HoverCardPrimitive.Content
> {}

export const HoverCardContent = React.forwardRef<
  React.ComponentRef<typeof HoverCardPrimitive.Content>,
  HoverCardContentProps
>((props, ref): React.ReactElement => {
  const { align = 'center', className, sideOffset = 4, ...rest } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <HoverCardPrimitive.Portal>
      <HoverCardPrimitive.Content
        align={align}
        className={cn(
          'bg-popover text-popover-foreground data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 z-50 w-64 origin-(--radix-hover-card-content-transform-origin) rounded-md border p-4 shadow-md outline-hidden',
          className,
        )}
        data-slot="hover-card-content"
        ref={ref}
        sideOffset={sideOffset}
        {...rest}
      />
    </HoverCardPrimitive.Portal>
  );
});

HoverCardContent.displayName = HoverCardPrimitive.Content.displayName;
