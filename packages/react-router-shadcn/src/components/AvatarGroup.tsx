'use client';

import * as React from 'react';

import { cn } from '../utils/cn';

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
