import * as React from 'react';
import { Select as SelectPrimitive } from 'radix-ui';
import { cn } from '../../utils/cn';

export interface SelectSeparatorProps extends React.ComponentPropsWithoutRef<
  typeof SelectPrimitive.Separator
> {}

export const SelectSeparator = React.forwardRef<
  React.ComponentRef<typeof SelectPrimitive.Separator>,
  SelectSeparatorProps
>((props, ref): React.ReactElement => {
  const { className, ...rest } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <SelectPrimitive.Separator
      className={cn('bg-muted -mx-1 my-1 h-px', className)}
      ref={ref}
      {...rest}
    />
  );
});

SelectSeparator.displayName = SelectPrimitive.Separator.displayName;
