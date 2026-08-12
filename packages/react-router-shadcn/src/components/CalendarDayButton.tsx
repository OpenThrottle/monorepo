'use client';

import * as React from 'react';
import { getDefaultClassNames, type DayButton } from 'react-day-picker';

import { cn } from '../utils/cn';
import { Button } from './Button';

// react-day-picker's `DayButton` custom-component contract is a plain
// function with no ref parameter, so `CalendarDayButton` is not wrapped in
// `forwardRef` — the internal `ref` below is local focus-management state,
// not a ref forwarded from a caller.
export interface CalendarDayButtonProps extends React.ComponentProps<
  typeof DayButton
> {}

export const CalendarDayButton = (
  props: CalendarDayButtonProps,
): React.ReactElement => {
  const { className, day, modifiers, ...rest } = props;

  // Hooks
  const ref = React.useRef<HTMLButtonElement>(null);
  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus();
  }, [modifiers.focused]);

  // Setup
  const defaultClassNames = getDefaultClassNames();

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Button
      className={cn(
        'group-data-[focused=true]/day:border-ring group-data-[focused=true]/day:ring-ring/50 data-[range-end=true]:bg-primary data-[range-end=true]:text-primary-foreground data-[range-middle=true]:bg-accent data-[range-middle=true]:text-accent-foreground data-[range-start=true]:bg-primary data-[range-start=true]:text-primary-foreground data-[selected-single=true]:bg-primary data-[selected-single=true]:text-primary-foreground dark:hover:text-accent-foreground flex aspect-square size-auto w-full min-w-(--cell-size) flex-col gap-1 leading-none font-normal group-data-[focused=true]/day:relative group-data-[focused=true]/day:z-10 group-data-[focused=true]/day:ring-[3px] data-[range-end=true]:rounded-md data-[range-end=true]:rounded-r-md data-[range-middle=true]:rounded-none data-[range-start=true]:rounded-md data-[range-start=true]:rounded-l-md [&>span]:text-xs [&>span]:opacity-70',
        defaultClassNames.day,
        className,
      )}
      data-day={day.date.toLocaleDateString()}
      data-range-end={modifiers.range_end}
      data-range-middle={modifiers.range_middle}
      data-range-start={modifiers.range_start}
      data-selected-single={
        modifiers.selected &&
        !modifiers.range_start &&
        !modifiers.range_end &&
        !modifiers.range_middle
      }
      ref={ref}
      size="icon"
      variant="ghost"
      {...rest}
    />
  );
};
