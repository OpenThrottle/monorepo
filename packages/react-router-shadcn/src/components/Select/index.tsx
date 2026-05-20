'use client';

import { Select as SelectPrimitive } from 'radix-ui';

export const Select = SelectPrimitive.Root;
export const SelectGroup = SelectPrimitive.Group;
export const SelectValue = SelectPrimitive.Value;

export * from './SelectContent';
export * from './SelectItem';
export * from './SelectLabel';
export * from './SelectScrollDownButton';
export * from './SelectScrollUpButton';
export * from './SelectSeparator';
export * from './SelectTrigger';
