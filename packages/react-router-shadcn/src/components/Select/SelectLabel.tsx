import * as React from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
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
      className={cn('py-1.5 pl-8 pr-2 text-sm font-semibold', className)}
      ref={ref}
      {...rest}
    />
  );
});

SelectLabel.displayName = SelectPrimitive.Label.displayName;
