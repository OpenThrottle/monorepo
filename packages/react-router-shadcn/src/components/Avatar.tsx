'use client';

import * as React from 'react';
import { Avatar as AvatarPrimitive } from 'radix-ui';

import { cn } from '../utils/cn';

export interface AvatarProps extends React.ComponentPropsWithoutRef<
  typeof AvatarPrimitive.Root
> {
  size?: 'default' | 'lg' | 'sm';
}

export const Avatar = React.forwardRef<
  React.ComponentRef<typeof AvatarPrimitive.Root>,
  AvatarProps
>((props, ref): React.ReactElement => {
  const { className, size = 'default', ...rest } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <AvatarPrimitive.Root
      className={cn(
        'group/avatar relative flex size-8 shrink-0 overflow-hidden rounded-full select-none data-[size=lg]:size-10 data-[size=sm]:size-6',
        className,
      )}
      data-size={size}
      data-slot="avatar"
      ref={ref}
      {...rest}
    />
  );
});

Avatar.displayName = 'Avatar';

export interface AvatarImageProps extends React.ComponentPropsWithoutRef<
  typeof AvatarPrimitive.Image
> {}

export const AvatarImage = React.forwardRef<
  React.ComponentRef<typeof AvatarPrimitive.Image>,
  AvatarImageProps
>((props, ref): React.ReactElement => {
  const { className, ...rest } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <AvatarPrimitive.Image
      className={cn('aspect-square size-full', className)}
      data-slot="avatar-image"
      ref={ref}
      {...rest}
    />
  );
});

AvatarImage.displayName = 'AvatarImage';

export interface AvatarFallbackProps extends React.ComponentPropsWithoutRef<
  typeof AvatarPrimitive.Fallback
> {}

export const AvatarFallback = React.forwardRef<
  React.ComponentRef<typeof AvatarPrimitive.Fallback>,
  AvatarFallbackProps
>((props, ref): React.ReactElement => {
  const { className, ...rest } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <AvatarPrimitive.Fallback
      className={cn(
        'bg-muted text-muted-foreground flex size-full items-center justify-center rounded-full text-sm group-data-[size=sm]/avatar:text-xs',
        className,
      )}
      data-slot="avatar-fallback"
      ref={ref}
      {...rest}
    />
  );
});

AvatarFallback.displayName = 'AvatarFallback';

export interface AvatarBadgeProps extends React.ComponentPropsWithoutRef<'span'> {}

export const AvatarBadge = React.forwardRef<HTMLSpanElement, AvatarBadgeProps>(
  (props, ref): React.ReactElement => {
    const { className, ...rest } = props;

    // Hooks

    // Setup

    // Handlers

    // Markup

    // Life Cycle

    // 🔌 Short Circuit

    return (
      <span
        className={cn(
          'bg-primary text-primary-foreground ring-background absolute right-0 bottom-0 z-10 inline-flex items-center justify-center rounded-full ring-2 select-none',
          'group-data-[size=sm]/avatar:size-2 group-data-[size=sm]/avatar:[&>svg]:hidden',
          'group-data-[size=default]/avatar:size-2.5 group-data-[size=default]/avatar:[&>svg]:size-2',
          'group-data-[size=lg]/avatar:size-3 group-data-[size=lg]/avatar:[&>svg]:size-2',
          className,
        )}
        data-slot="avatar-badge"
        ref={ref}
        {...rest}
      />
    );
  },
);

AvatarBadge.displayName = 'AvatarBadge';

export interface AvatarGroupProps extends React.ComponentPropsWithoutRef<'div'> {}

export const AvatarGroup = React.forwardRef<HTMLDivElement, AvatarGroupProps>(
  (props, ref): React.ReactElement => {
    const { className, ...rest } = props;

    // Hooks

    // Setup

    // Handlers

    // Markup

    // Life Cycle

    // 🔌 Short Circuit

    return (
      <div
        className={cn(
          'group/avatar-group *:data-[slot=avatar]:ring-background flex -space-x-2 *:data-[slot=avatar]:ring-2',
          className,
        )}
        data-slot="avatar-group"
        ref={ref}
        {...rest}
      />
    );
  },
);

AvatarGroup.displayName = 'AvatarGroup';

export interface AvatarGroupCountProps extends React.ComponentPropsWithoutRef<'div'> {}

export const AvatarGroupCount = React.forwardRef<
  HTMLDivElement,
  AvatarGroupCountProps
>((props, ref): React.ReactElement => {
  const { className, ...rest } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className={cn(
        'bg-muted text-muted-foreground ring-background relative flex size-8 shrink-0 items-center justify-center rounded-full text-sm ring-2 group-has-data-[size=lg]/avatar-group:size-10 group-has-data-[size=sm]/avatar-group:size-6 [&>svg]:size-4 group-has-data-[size=lg]/avatar-group:[&>svg]:size-5 group-has-data-[size=sm]/avatar-group:[&>svg]:size-3',
        className,
      )}
      data-slot="avatar-group-count"
      ref={ref}
      {...rest}
    />
  );
});

AvatarGroupCount.displayName = 'AvatarGroupCount';
