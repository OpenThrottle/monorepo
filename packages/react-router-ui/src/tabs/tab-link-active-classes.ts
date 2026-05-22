/**
 * Active-state classes for {@link OpenThrottleTabLink} using `aria-current="page"`
 * (set by React Router `NavLink`) so styles mirror Radix `data-[state=active]` on
 * {@link tabsTriggerVariants} without duplicating the full cva definition.
 */
export const tabsTriggerAriaActiveClasses = [
  'aria-[current=page]:bg-background',
  'aria-[current=page]:text-foreground',
  'dark:aria-[current=page]:border-input',
  'dark:aria-[current=page]:bg-input/30',
  'dark:aria-[current=page]:text-foreground',
  'group-data-[variant=default]/tabs-list:aria-[current=page]:shadow-sm',
  'group-data-[variant=line]/tabs-list:aria-[current=page]:shadow-none',
  'group-data-[variant=line]/tabs-list:aria-[current=page]:bg-transparent',
  'dark:group-data-[variant=line]/tabs-list:aria-[current=page]:border-transparent',
  'dark:group-data-[variant=line]/tabs-list:aria-[current=page]:bg-transparent',
  'group-data-[variant=line]/tabs-list:aria-[current=page]:after:opacity-100',
].join(' ');
