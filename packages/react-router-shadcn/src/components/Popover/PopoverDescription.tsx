import * as React from 'react';
import type { ComponentPropsWithoutRef } from 'react';
import { cn } from '../../utils/cn';

export type PopoverDescriptionProps = ComponentPropsWithoutRef<'p'>;

export function PopoverDescription({
  className,
  ...props
}: PopoverDescriptionProps) {
  return (
    <p
      className={cn('text-muted-foreground', className)}
      data-slot="popover-description"
      {...props}
    />
  );
}
