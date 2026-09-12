'use client';

import { Tooltip as TooltipPrimitive } from 'radix-ui';
import type { ComponentPropsWithoutRef } from 'react';
import * as React from 'react';

export type TooltipProps = ComponentPropsWithoutRef<
  typeof TooltipPrimitive.Root
>;

export function Tooltip(props: TooltipProps) {
  return <TooltipPrimitive.Root data-slot="tooltip" {...props} />;
}
