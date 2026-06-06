'use client';

import * as React from 'react';
import type { ComponentPropsWithoutRef } from 'react';
import { Tooltip as TooltipPrimitive } from 'radix-ui';

export type TooltipProviderProps = ComponentPropsWithoutRef<
  typeof TooltipPrimitive.Provider
>;

export function TooltipProvider({
  delayDuration = 0,
  ...props
}: TooltipProviderProps) {
  return (
    <TooltipPrimitive.Provider
      data-slot="tooltip-provider"
      delayDuration={delayDuration}
      {...props}
    />
  );
}
