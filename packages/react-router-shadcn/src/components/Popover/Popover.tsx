import { Popover as PopoverPrimitive } from 'radix-ui';
import type { ComponentPropsWithoutRef } from 'react';
import * as React from 'react';

export type PopoverProps = ComponentPropsWithoutRef<
  typeof PopoverPrimitive.Root
>;

export function Popover(props: PopoverProps) {
  return <PopoverPrimitive.Root data-slot="popover" {...props} />;
}
