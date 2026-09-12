'use client';

import { Tooltip as TooltipPrimitive } from 'radix-ui';
import type { ComponentPropsWithoutRef } from 'react';
import * as React from 'react';

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
