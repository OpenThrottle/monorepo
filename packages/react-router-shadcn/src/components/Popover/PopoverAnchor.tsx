import { Popover as PopoverPrimitive } from 'radix-ui';
import type { ComponentPropsWithoutRef } from 'react';
import * as React from 'react';

export type PopoverAnchorProps = ComponentPropsWithoutRef<
  typeof PopoverPrimitive.Anchor
>;

export function PopoverAnchor(props: PopoverAnchorProps) {
  return <PopoverPrimitive.Anchor data-slot="popover-anchor" {...props} />;
}
