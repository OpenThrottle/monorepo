import * as React from 'react';
import * as AvatarPrimitive from '@radix-ui/react-avatar';
import { cn } from '../utils/cn';

export const Avatar = React.forwardRef<
  React.ComponentRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>
>(({ className, ...props }, ref) => {
  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <AvatarPrimitive.Root
      className={cn(
        'relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full',
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
Avatar.displayName = AvatarPrimitive.Root.displayName;

export const AvatarImage = React.forwardRef<
  React.ComponentRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => {
  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <AvatarPrimitive.Image
      className={cn('aspect-square h-full w-full', className)}
      ref={ref}
      {...props}
    />
  );
});
AvatarImage.displayName = AvatarPrimitive.Image.displayName;

export const AvatarFallback = React.forwardRef<
  React.ComponentRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => {
  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <AvatarPrimitive.Fallback
      className={cn(
        'flex h-full w-full items-center justify-center rounded-full bg-muted',
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName;
