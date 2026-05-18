import { Dialog as SheetPrimitive } from 'radix-ui';

export const Sheet = SheetPrimitive.Root;
export const SheetTrigger = SheetPrimitive.Trigger;
export const SheetClose = SheetPrimitive.Close;
export const SheetPortal = SheetPrimitive.Portal;

export * from './SheetContent';
export * from './SheetDescription';
export * from './SheetFooter';
export * from './SheetHeader';
export * from './SheetOverlay';
export * from './SheetTitle';
