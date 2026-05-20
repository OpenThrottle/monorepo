'use client';

import * as React from 'react';
import { ToggleGroup as ToggleGroupPrimitive } from 'radix-ui';
import { cn } from '../../utils/cn';
import { ToggleGroupContext } from './toggle-group-context';
import type { ToggleGroupContextValue } from './toggle-group-context';

export type ToggleGroupProps = React.ComponentPropsWithoutRef<
  typeof ToggleGroupPrimitive.Root
> &
  ToggleGroupContextValue;

export const ToggleGroup = React.forwardRef<
  React.ComponentRef<typeof ToggleGroupPrimitive.Root>,
  ToggleGroupProps
>((props, ref) => {
  const { className, children, size, variant, ...rest } = props;

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
        {...rest}
      >
        {children}
      </ToggleGroupPrimitive.Root>
    </ToggleGroupContext.Provider>
  );
});

ToggleGroup.displayName = ToggleGroupPrimitive.Root.displayName;
