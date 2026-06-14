import * as React from 'react';
import { Select as SelectPrimitive } from 'radix-ui';
import { cn } from '../../utils/cn';

export interface SelectLabelProps extends React.ComponentPropsWithoutRef<
  typeof SelectPrimitive.Label
> {}

export const SelectLabel = React.forwardRef<
  React.ComponentRef<typeof SelectPrimitive.Label>,
  SelectLabelProps
>((props, ref): React.ReactElement => {
  const { className, ...rest } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <SelectPrimitive.Label
      className={cn('py-1.5 pr-2 pl-8 text-sm font-semibold', className)}
      ref={ref}
      {...rest}
    />
  );
});

SelectLabel.displayName = SelectPrimitive.Label.displayName;
