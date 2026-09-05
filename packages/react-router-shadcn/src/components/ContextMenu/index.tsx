import type * as React from 'react';
import { ContextMenu as ContextMenuPrimitive } from 'radix-ui';

export type ContextMenuProps = React.ComponentPropsWithoutRef<
  typeof ContextMenuPrimitive.Root
>;

export const ContextMenu = ContextMenuPrimitive.Root;
export const ContextMenuTrigger = ContextMenuPrimitive.Trigger;
export const ContextMenuGroup = ContextMenuPrimitive.Group;
export const ContextMenuPortal = ContextMenuPrimitive.Portal;
export const ContextMenuSub = ContextMenuPrimitive.Sub;
export const ContextMenuRadioGroup = ContextMenuPrimitive.RadioGroup;

export * from './ContextMenuCheckboxItem';
export * from './ContextMenuContent';
export * from './ContextMenuItem';
export * from './ContextMenuLabel';
export * from './ContextMenuRadioItem';
export * from './ContextMenuSeparator';
export * from './ContextMenuShortcut';
export * from './ContextMenuSubContent';
export * from './ContextMenuSubTrigger';
