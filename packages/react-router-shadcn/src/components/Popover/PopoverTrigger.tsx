import { Popover as PopoverPrimitive } from 'radix-ui';
import type { ComponentPropsWithoutRef } from 'react';
import * as React from 'react';

export type PopoverTriggerProps = ComponentPropsWithoutRef<
  typeof PopoverPrimitive.Trigger
>;

export function PopoverTrigger(props: PopoverTriggerProps) {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />;
}
