import * as React from 'react';
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from 'lucide-react';
import {
  DayButton,
  DayPicker,
  getDefaultClassNames,
  type DayPickerProps,
} from 'react-day-picker';
import { cn } from '../utils/cn';
import { Button, buttonVariants } from './Button';

export type CalendarProps = DayPickerProps & {
  readonly buttonVariant?: React.ComponentProps<typeof Button>['variant'];
};

export const Calendar = (props: CalendarProps): React.ReactElement => {
  const {
    buttonVariant = 'ghost',
    captionLayout = 'label',
    className,
    classNames,
    components,
    formatters,
    showOutsideDays = true,
    ...rest
  } = props;

  // Hooks

  // Setup
  const defaultClassNames = getDefaultClassNames();

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <DayPicker
      captionLayout={captionLayout}
      className={cn(
        'bg-background group/calendar p-3 [--cell-size:2rem] in-data-[slot=card-content]:bg-transparent in-data-[slot=popover-content]:bg-transparent',
        String.raw`rtl:**:[.rdp-button\_next>svg]:rotate-180`,
        String.raw`rtl:**:[.rdp-button\_previous>svg]:rotate-180`,
        className,
      )}
      classNames={{
        button_next: cn(
          buttonVariants({ variant: buttonVariant }),
          'h-[--cell-size] w-[--cell-size] select-none p-0 aria-disabled:opacity-50',
          defaultClassNames.button_next,
        ),
        button_previous: cn(
          buttonVariants({ variant: buttonVariant }),
          'h-[--cell-size] w-[--cell-size] select-none p-0 aria-disabled:opacity-50',
          defaultClassNames.button_previous,
        ),
        caption_label: cn(
          'select-none font-medium',
          captionLayout === 'label'
            ? 'text-sm'
            : '[&>svg]:text-muted-foreground flex h-8 items-center gap-1 rounded-md pl-2 pr-1 text-sm [&>svg]:size-3.5',
          defaultClassNames.caption_label,
        ),
        day: cn(
          'group/day relative aspect-square h-full w-full select-none p-0 text-center [&:first-child[data-selected=true]_button]:rounded-l-md [&:last-child[data-selected=true]_button]:rounded-r-md',
          defaultClassNames.day,
        ),
        disabled: cn(
          'text-muted-foreground opacity-50',
          defaultClassNames.disabled,
        ),
        dropdown: cn(
          'bg-popover absolute inset-0 opacity-0',
          defaultClassNames.dropdown,
        ),
        dropdown_root: cn(
          'has-focus:border-ring border-input shadow-xs has-focus:ring-ring/50 has-focus:ring-[3px] relative rounded-md border',
          defaultClassNames.dropdown_root,
        ),
        dropdowns: cn(
          'flex h-[--cell-size] w-full items-center justify-center gap-1.5 text-sm font-medium',
          defaultClassNames.dropdowns,
        ),
        hidden: cn('invisible', defaultClassNames.hidden),
        month: cn('flex w-full flex-col gap-4', defaultClassNames.month),
        month_caption: cn(
          'flex h-[--cell-size] w-full items-center justify-center px-[--cell-size]',
          defaultClassNames.month_caption,
        ),
        months: cn(
          'relative flex flex-col gap-4 md:flex-row',
          defaultClassNames.months,
        ),
        nav: cn(
          'absolute inset-x-0 top-0 flex w-full items-center justify-between gap-1',
          defaultClassNames.nav,
        ),
        outside: cn(
          'text-muted-foreground aria-selected:text-muted-foreground',
          defaultClassNames.outside,
        ),
        range_end: cn('bg-accent rounded-r-md', defaultClassNames.range_end),
        range_middle: cn('rounded-none', defaultClassNames.range_middle),
        range_start: cn(
          'bg-accent rounded-l-md',
          defaultClassNames.range_start,
        ),
        root: cn('w-fit', defaultClassNames.root),
        table: 'w-full border-collapse',
        today: cn(
          'bg-accent text-accent-foreground rounded-md data-[selected=true]:rounded-none',
          defaultClassNames.today,
        ),
        week: cn('mt-2 flex w-full', defaultClassNames.week),
        week_number: cn(
          'text-muted-foreground select-none text-[0.8rem]',
          defaultClassNames.week_number,
        ),
        week_number_header: cn(
          'w-[--cell-size] select-none',
          defaultClassNames.week_number_header,
        ),
        weekday: cn(
          'text-muted-foreground flex-1 select-none rounded-md text-[0.8rem] font-normal',
          defaultClassNames.weekday,
        ),
        weekdays: cn('flex', defaultClassNames.weekdays),
        ...classNames,
      }}
      components={{
        Chevron: ({
          className: chevronClassName,
          orientation,
          ...chevronProps
        }: {
          className?: string;
          orientation?: 'up' | 'down' | 'left' | 'right';
        }) => {
          if (orientation === 'left') {
            return (
              <ChevronLeftIcon
                className={cn('size-4', chevronClassName)}
                {...chevronProps}
              />
            );
          }
          if (orientation === 'right') {
            return (
              <ChevronRightIcon
                className={cn('size-4', chevronClassName)}
                {...chevronProps}
              />
            );
          }
          return (
            <ChevronDownIcon
              className={cn('size-4', chevronClassName)}
              {...chevronProps}
            />
          );
        },
        DayButton: CalendarDayButton,
        Root: ({
          className: rootClassName,
          rootRef,
          ...rootProps
        }: {
          className?: string;
          rootRef?: React.Ref<HTMLDivElement>;
        } & React.HTMLAttributes<HTMLDivElement>) => (
          <div
            className={cn(rootClassName)}
            data-slot="calendar"
            ref={rootRef}
            {...rootProps}
          />
        ),
        WeekNumber: ({
          children,
          ...weekProps
        }: {
          children?: React.ReactNode;
        }) => (
          <td {...weekProps}>
            <div className="flex size-[--cell-size] items-center justify-center text-center">
              {children}
            </div>
          </td>
        ),
        ...components,
      }}
      formatters={{
        formatMonthDropdown: (date: Date) =>
          date.toLocaleString('default', { month: 'short' }),
        ...formatters,
      }}
      showOutsideDays={showOutsideDays}
      {...rest}
    />
  );
};

Calendar.displayName = 'Calendar';

export const CalendarDayButton = (
  props: React.ComponentProps<typeof DayButton>,
): React.ReactElement => {
  const { className, day, modifiers, ...rest } = props;

  // Hooks
  const ref = React.useRef<HTMLButtonElement>(null);

  // Setup
  const defaultClassNames = getDefaultClassNames();

  // Handlers

  // Markup

  // Life Cycle
  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus();
  }, [modifiers.focused]);

  // 🔌 Short Circuit

  return (
    <Button
      className={cn(
        'data-[selected-single=true]:bg-primary data-[selected-single=true]:text-primary-foreground data-[range-middle=true]:bg-accent data-[range-middle=true]:text-accent-foreground data-[range-start=true]:bg-primary data-[range-start=true]:text-primary-foreground data-[range-end=true]:bg-primary data-[range-end=true]:text-primary-foreground group-data-[focused=true]/day:border-ring group-data-[focused=true]/day:ring-ring/50 flex aspect-square h-auto w-full min-w-[--cell-size] flex-col gap-1 font-normal leading-none data-[range-end=true]:rounded-md data-[range-middle=true]:rounded-none data-[range-start=true]:rounded-md group-data-[focused=true]/day:relative group-data-[focused=true]/day:z-10 group-data-[focused=true]/day:ring-[3px] [&>span]:text-xs [&>span]:opacity-70',
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

CalendarDayButton.displayName = 'CalendarDayButton';
