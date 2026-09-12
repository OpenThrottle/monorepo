'use client';

import { Tooltip as TooltipPrimitive } from 'radix-ui';
import type { ComponentPropsWithoutRef } from 'react';
import * as React from 'react';

export type TooltipTriggerProps = ComponentPropsWithoutRef<
  typeof TooltipPrimitive.Trigger
>;

export function TooltipTrigger(props: TooltipTriggerProps) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />;
}
