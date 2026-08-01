'use client';

import * as React from 'react';
import { ToggleGroup as ToggleGroupPrimitive } from 'radix-ui';
import type { VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';
import { ToggleGroupContext } from './toggle-group-context';
import { toggleGroupItemVariants } from './toggleGroupItemVariants';

export interface ToggleGroupItemProps
  extends
    React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Item>,
    VariantProps<typeof toggleGroupItemVariants> {}

export const ToggleGroupItem = React.forwardRef<
  React.ComponentRef<typeof ToggleGroupPrimitive.Item>,
  ToggleGroupItemProps
>((props, ref): React.ReactElement => {
  const { className, size, variant, ...rest } = props;

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
      {...rest}
    />
  );
});

ToggleGroupItem.displayName = ToggleGroupPrimitive.Item.displayName;
