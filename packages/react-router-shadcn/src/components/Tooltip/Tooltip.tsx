'use client';

import * as React from 'react';
import type { ComponentPropsWithoutRef } from 'react';
import { Tooltip as TooltipPrimitive } from 'radix-ui';

export type TooltipProps = ComponentPropsWithoutRef<
  typeof TooltipPrimitive.Root
>;

export function Tooltip(props: TooltipProps) {
  return <TooltipPrimitive.Root data-slot="tooltip" {...props} />;
}
