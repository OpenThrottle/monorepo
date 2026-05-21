import type { ComponentPropsWithoutRef } from 'react';
import { cn } from '../../utils/cn';

export type PopoverTitleProps = ComponentPropsWithoutRef<'h2'>;

export function PopoverTitle({ className, ...props }: PopoverTitleProps) {
  return (
    <div
      className={cn('font-medium', className)}
      data-slot="popover-title"
      {...props}
    />
  );
}
