import type { ComponentPropsWithoutRef } from 'react';
import { Dialog as DialogPrimitive } from 'radix-ui';

export const DialogTrigger = DialogPrimitive.Trigger;

export type DialogTriggerProps = ComponentPropsWithoutRef<
  typeof DialogPrimitive.Trigger
>;
