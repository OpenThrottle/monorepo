import * as React from 'react';
import type { ComponentPropsWithoutRef } from 'react';
import { Popover as PopoverPrimitive } from 'radix-ui';

export type PopoverProps = ComponentPropsWithoutRef<
  typeof PopoverPrimitive.Root
>;

export function Popover(props: PopoverProps) {
  return <PopoverPrimitive.Root data-slot="popover" {...props} />;
}
