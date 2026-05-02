import type { ComponentPropsWithoutRef } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';

export type DialogProps = ComponentPropsWithoutRef<typeof DialogPrimitive.Root>;

export const Dialog = DialogPrimitive.Root;

export const DialogPortal = DialogPrimitive.Portal;

export const DialogClose = DialogPrimitive.Close;
