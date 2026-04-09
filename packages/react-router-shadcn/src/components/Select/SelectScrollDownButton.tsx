import * as React from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface SelectScrollDownButtonProps extends React.ComponentPropsWithoutRef<
  typeof SelectPrimitive.ScrollDownButton
> {}

export const SelectScrollDownButton = React.forwardRef<
  React.ComponentRef<typeof SelectPrimitive.ScrollDownButton>,
  SelectScrollDownButtonProps
>((props, ref): React.ReactElement => {
  const { className, ...rest } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <SelectPrimitive.ScrollDownButton
      className={cn(
        'flex cursor-default items-center justify-center py-1',
        className,
      )}
      ref={ref}
      {...rest}
    >
      <ChevronDown className="h-4 w-4" />
    </SelectPrimitive.ScrollDownButton>
  );
});

SelectScrollDownButton.displayName = SelectPrimitive.ScrollDownButton.displayName; // prettier-ignore
