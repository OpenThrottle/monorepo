'use client';

import * as React from 'react';
import * as ToggleGroupPrimitive from '@radix-ui/react-toggle-group';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../utils/cn';

type ToggleGroupContextValue = VariantProps<typeof toggleGroupItemVariants>;

const ToggleGroupContext = React.createContext<ToggleGroupContextValue>({});

const toggleGroupItemVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-accent data-[state=on]:text-accent-foreground [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    defaultVariants: {
      size: 'default',
      variant: 'default',
    },
    variants: {
      size: {
        default: 'h-10 px-3',
        lg: 'h-11 px-5',
        sm: 'h-9 px-2.5',
        // xs: 'h-6 px-1.5 text-xs',
      },
      variant: {
        default: `bg-transparent hover:bg-accent hover:text-accent-foreground`,
        outline: `border border-input bg-transparent hover:bg-accent hover:text-accent-foreground`,
      },
    },
  },
);

const ToggleGroup = React.forwardRef<
  React.ComponentRef<typeof ToggleGroupPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Root> &
    ToggleGroupContextValue
>(({ className, children, size, variant, ...props }, ref) => {
  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  return (
    <ToggleGroupContext.Provider value={{ size, variant }}>
      <ToggleGroupPrimitive.Root
        className={cn('flex items-center gap-1', className)}
        ref={ref}
        {...props}
      >
        {children}
      </ToggleGroupPrimitive.Root>
    </ToggleGroupContext.Provider>
  );
});

ToggleGroup.displayName = ToggleGroupPrimitive.Root.displayName;

const ToggleGroupItem = React.forwardRef<
  React.ComponentRef<typeof ToggleGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Item> &
    VariantProps<typeof toggleGroupItemVariants>
>(({ className, size, variant, ...props }, ref) => {
  // Hooks
  const context = React.useContext(ToggleGroupContext);

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <ToggleGroupPrimitive.Item
      className={cn(
        toggleGroupItemVariants({
          size: context.size ?? size,
          variant: context.variant ?? variant,
        }),
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});

ToggleGroupItem.displayName = ToggleGroupPrimitive.Item.displayName;

export { ToggleGroup, ToggleGroupItem, toggleGroupItemVariants };
