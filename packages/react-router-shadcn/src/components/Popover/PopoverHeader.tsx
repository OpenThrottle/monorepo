import * as React from 'react';
import type { ComponentPropsWithoutRef } from 'react';
import { cn } from '../../utils/cn';

export type PopoverHeaderProps = ComponentPropsWithoutRef<'div'>;

export function PopoverHeader({ className, ...props }: PopoverHeaderProps) {
  return (
    <div
      className={cn('flex flex-col gap-1 text-sm', className)}
      data-slot="popover-header"
      {...props}
    />
  );
}
