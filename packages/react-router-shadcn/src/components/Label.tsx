import * as React from 'react';
import { Label as LabelPrimitive } from 'radix-ui';

import { cn } from '../utils/cn';

export interface LabelProps extends React.ComponentPropsWithoutRef<
  typeof LabelPrimitive.Root
> {}

export const Label = React.forwardRef<
  React.ComponentRef<typeof LabelPrimitive.Root>,
  LabelProps
>((props, ref): React.ReactElement => {
  const { className, ...rest } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <LabelPrimitive.Root
      className={cn(
        'text-muted-foreground text-xs leading-none',
        'flex items-center gap-2 select-none',
        'group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50',
        'peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
        className,
      )}
      data-slot="label"
      ref={ref}
      {...rest}
    />
  );
});

Label.displayName = 'Label';
