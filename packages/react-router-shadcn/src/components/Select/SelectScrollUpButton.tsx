import * as React from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { ChevronUp } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface SelectScrollUpButtonProps extends React.ComponentPropsWithoutRef<
  typeof SelectPrimitive.ScrollUpButton
> {}

export const SelectScrollUpButton = React.forwardRef<
  React.ComponentRef<typeof SelectPrimitive.ScrollUpButton>,
  SelectScrollUpButtonProps
>((props, ref): React.ReactElement => {
  const { className, ...rest } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <SelectPrimitive.ScrollUpButton
      className={cn(
        'flex cursor-default items-center justify-center py-1',
        className,
      )}
      ref={ref}
      {...rest}
    >
      <ChevronUp className="h-4 w-4" />
    </SelectPrimitive.ScrollUpButton>
  );
});

SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName;
