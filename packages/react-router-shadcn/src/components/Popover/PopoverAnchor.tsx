import type { ComponentPropsWithoutRef } from 'react';
import { Popover as PopoverPrimitive } from 'radix-ui';

export type PopoverAnchorProps = ComponentPropsWithoutRef<
  typeof PopoverPrimitive.Anchor
>;

export function PopoverAnchor(props: PopoverAnchorProps) {
  return <PopoverPrimitive.Anchor data-slot="popover-anchor" {...props} />;
}
