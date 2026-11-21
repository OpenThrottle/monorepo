'use client';

import { Select as SelectPrimitive } from 'radix-ui';

export const Select = SelectPrimitive.Root;
export const SelectGroup = SelectPrimitive.Group;
/**
 * @description The trigger's selected-value slot. Pass the selected option's label as children
 * (`<SelectValue>{label}</SelectValue>`) on any server-rendered select: Radix fills the slot from
 * the matching `SelectItem`, which only mounts on the client, so a childless `SelectValue` is blank
 * in the SSR markup until hydration. The placeholder still shows while the value is empty.
 */
export const SelectValue = SelectPrimitive.Value;

export * from './SelectContent';
export * from './SelectItem';
export * from './SelectLabel';
export * from './SelectScrollDownButton';
export * from './SelectScrollUpButton';
export * from './SelectSeparator';
export * from './SelectTrigger';
