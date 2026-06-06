import * as React from 'react';
import type { ComponentPropsWithoutRef } from 'react';
import { Popover as PopoverPrimitive } from 'radix-ui';

export type PopoverTriggerProps = ComponentPropsWithoutRef<
  typeof PopoverPrimitive.Trigger
>;

export function PopoverTrigger(props: PopoverTriggerProps) {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />;
}
