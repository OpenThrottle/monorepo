'use client';

import type { ComponentPropsWithoutRef } from 'react';
import { Tooltip as TooltipPrimitive } from 'radix-ui';

export type TooltipTriggerProps = ComponentPropsWithoutRef<
  typeof TooltipPrimitive.Trigger
>;

export function TooltipTrigger(props: TooltipTriggerProps) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />;
}
