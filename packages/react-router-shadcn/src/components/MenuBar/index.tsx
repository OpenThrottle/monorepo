import { Menubar as MenubarPrimitive } from 'radix-ui';

// Annotate (rather than infer) so the emitted declaration names the type via
// the imported `MenubarPrimitive` instead of an un-nameable internal `Scope`.
export const MenubarMenu: typeof MenubarPrimitive.Menu = MenubarPrimitive.Menu;
export const MenubarTrigger = MenubarPrimitive.Trigger;
export const MenubarPortal = MenubarPrimitive.Portal;
export const MenubarGroup = MenubarPrimitive.Group;
export const MenubarSub = MenubarPrimitive.Sub;
export const MenubarRadioGroup = MenubarPrimitive.RadioGroup;

export * from './Menubar';
export * from './MenubarContent';
export * from './MenubarItem';
export * from './MenubarCheckboxItem';
export * from './MenubarRadioItem';
export * from './MenubarLabel';
export * from './MenubarSeparator';
export * from './MenubarShortcut';
export * from './MenubarSubTrigger';
export * from './MenubarSubContent';
