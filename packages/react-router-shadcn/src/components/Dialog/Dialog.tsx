import type { ComponentPropsWithoutRef } from 'react';
import { Dialog as DialogPrimitive } from 'radix-ui';

export type DialogProps = ComponentPropsWithoutRef<typeof DialogPrimitive.Root>;

export const Dialog = DialogPrimitive.Root;

export const DialogPortal = DialogPrimitive.Portal;

export const DialogClose = DialogPrimitive.Close;
