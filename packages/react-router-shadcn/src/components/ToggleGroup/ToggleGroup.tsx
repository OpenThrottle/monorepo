'use client';

import * as React from 'react';
import { ToggleGroup as ToggleGroupPrimitive } from 'radix-ui';
import { cn } from '../../utils/cn';
import { ToggleGroupContext } from './toggle-group-context';
import type { ToggleGroupContextValue } from './toggle-group-context';

// `ToggleGroupPrimitive.Root` props are a union (single vs multiple), which an
// `interface` cannot `extend` — so this props contract is an exported `type`
// (VR1 accepts an exported `type <Part>Props` for union-props primitives).
export type ToggleGroupProps = React.ComponentPropsWithoutRef<
  typeof ToggleGroupPrimitive.Root
> &
  ToggleGroupContextValue & {
    /**
     * Render the items as one segmented control: seams collapse so adjacent
     * items share a single border and only the outer corners stay rounded.
     * Opt-in — the spaced default is deliberate for most consumers.
     */
    readonly attached?: boolean;
  };

/**
 * Seam-collapsing rules for `attached`, mirroring the horizontal orientation of
 * `ButtonGroup` so the two controls read identically when placed side by side.
 */
const attachedClassName =
  'gap-0 ' +
  '[&>*:not(:first-child)]:rounded-l-none [&>*:not(:first-child)]:border-l-0 [&>*:not(:last-child)]:rounded-r-none ' +
  '[&>*]:focus-visible:relative [&>*]:focus-visible:z-10';

export const ToggleGroup = React.forwardRef<
  React.ComponentRef<typeof ToggleGroupPrimitive.Root>,
  ToggleGroupProps
>((props, ref): React.ReactElement => {
  const {
    attached = false,
    className,
    children,
    size,
    variant,
    ...rest
  } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <ToggleGroupContext.Provider value={{ size, variant }}>
      <ToggleGroupPrimitive.Root
        className={cn(
          'flex items-center',
          attached ? attachedClassName : 'gap-1',
          className,
        )}
        ref={ref}
        {...rest}
      >
        {children}
      </ToggleGroupPrimitive.Root>
    </ToggleGroupContext.Provider>
  );
});

ToggleGroup.displayName = ToggleGroupPrimitive.Root.displayName;
