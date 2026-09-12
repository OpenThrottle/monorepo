import { Dialog as DialogPrimitive } from 'radix-ui';
import type { ComponentPropsWithoutRef } from 'react';

export const DialogTrigger = DialogPrimitive.Trigger;

export type DialogTriggerProps = ComponentPropsWithoutRef<
  typeof DialogPrimitive.Trigger
>;
