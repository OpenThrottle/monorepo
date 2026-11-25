import { Check, ChevronsUpDown } from 'lucide-react';
import * as React from 'react';

import { cn } from '../utils/cn';
import { Button } from './Button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from './Command';
import { Popover, PopoverContent, PopoverTrigger } from './Popover';

export interface ComboboxOption {
  /**
   * Heading of the group this option is listed under. Groups render in the order their first
   * option appears, separated by a rule; options without one form an unheaded group.
   */
  readonly group?: string;
  /** Muted trailing text (e.g. a count) rendered after the label. */
  readonly hint?: string;
  /** Leading icon, shown between the selection check and the label. */
  readonly icon?: React.ReactNode;
  readonly label: string;
  readonly value: string;
}

interface ComboboxOptionGroup {
  readonly heading: string | undefined;
  readonly options: readonly ComboboxOption[];
}

export interface ComboboxProps {
  readonly className?: string;
  /**
   * Classes for the popover panel, merged last. It defaults to the trigger's width; pass e.g.
   * `w-auto min-w-(--radix-popover-trigger-width)` to let long labels widen it instead.
   */
  readonly contentClassName?: string;
  readonly disabled?: boolean;
  readonly emptyText?: string;
  /** Persistent row under the list — e.g. a "keep typing to narrow" hint. */
  readonly footer?: React.ReactNode;
  /** Id of the trigger button, so a `<label htmlFor>` can name it. */
  readonly id?: string;
  /** A search is in flight: suppresses the empty state so it cannot flash. */
  readonly loading?: boolean;
  readonly loadingText?: string;
  /** Called on every keystroke — pair with `shouldFilter={false}` to search server-side. */
  readonly onSearchChange?: (search: string) => void;
  readonly onValueChange?: (value: string) => void;
  readonly options: readonly ComboboxOption[] | readonly string[];
  /** Trigger content when nothing is selected; may carry an icon. */
  readonly placeholder?: React.ReactNode;
  readonly searchPlaceholder?: string;
  /** Controls the search input; omit to let cmdk own it. */
  readonly searchValue?: string;
  /** Let cmdk filter locally (default). `false` when the server already did. */
  readonly shouldFilter?: boolean;
  readonly value?: string;
}

function getOptionLabel(option: ComboboxOption | string): string {
  return typeof option === 'string' ? option : option.label;
}

/**
 * @description Autocomplete input with a list of suggestions. Composes Popover and Command.
 * Filters locally by default; pass `onSearchChange` + `shouldFilter={false}` to
 * drive the list from a server search instead.
 */
export const Combobox = React.forwardRef<HTMLButtonElement, ComboboxProps>(
  (props, ref): React.ReactElement => {
    const {
      className,
      contentClassName,
      disabled = false,
      emptyText = 'No results found.',
      footer,
      id,
      loading = false,
      loadingText = 'Loading…',
      onSearchChange,
      onValueChange,
      options,
      placeholder = 'Select...',
      searchPlaceholder = 'Search...',
      searchValue,
      shouldFilter = true,
      value,
    } = props;

    // Hooks
    const [open, setOpen] = React.useState(false);
    const normalizedOptions = React.useMemo(
      () =>
        options.map((opt) => {
          const isString = typeof opt === 'string';

          return isString ? { label: opt, value: opt } : opt;
        }),
      [options],
    );

    const groups = React.useMemo((): readonly ComboboxOptionGroup[] => {
      const byHeading = new Map<string | undefined, ComboboxOption[]>();
      for (const opt of normalizedOptions) {
        const bucket = byHeading.get(opt.group);
        if (bucket) {
          bucket.push(opt);
        } else {
          byHeading.set(opt.group, [opt]);
        }
      }

      return [...byHeading].map(([heading, groupOptions]) => {
        return { heading, options: groupOptions };
      });
    }, [normalizedOptions]);

    // Setup
    // Without a controlled value nothing can be checked, so drop the check column.
    const hasSelection = value !== undefined;
    const selected = normalizedOptions.find((opt) => opt.value === value);
    // Only stand in for the empty state — stale options stay visible mid-search.
    const showLoadingRow = loading && normalizedOptions.length === 0;

    // Handlers

    // Markup

    // Life Cycle

    // 🔌 Short Circuit

    return (
      <Popover onOpenChange={setOpen} open={open}>
        <PopoverTrigger asChild={true}>
          <Button
            aria-expanded={open}
            className={cn(
              'w-full justify-between font-normal',
              !value && 'text-muted-foreground',
              className,
            )}
            disabled={disabled}
            id={id}
            ref={ref}
            role="combobox"
            variant="outline"
          >
            {selected ? getOptionLabel(selected) : placeholder}
            <ChevronsUpDown
              aria-hidden="true"
              className="ml-2 h-4 w-4 shrink-0 opacity-50"
            />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className={cn(
            'w-(--radix-popover-trigger-width) p-0',
            contentClassName,
          )}
        >
          <Command shouldFilter={shouldFilter}>
            <CommandInput
              onValueChange={onSearchChange}
              placeholder={searchPlaceholder}
              value={searchValue}
            />
            <CommandList>
              {showLoadingRow && (
                <div
                  className="text-muted-foreground py-6 text-center text-sm"
                  role="status"
                >
                  {loadingText}
                </div>
              )}
              {loading ? null : <CommandEmpty>{emptyText}</CommandEmpty>}
              {groups.map((group, index) => (
                <React.Fragment key={group.heading ?? ''}>
                  {index > 0 && <CommandSeparator />}
                  <CommandGroup
                    className="[&_[cmdk-group-heading]]:px-2.5"
                    heading={group.heading}
                  >
                    {group.options.map((opt) => (
                      <CommandItem
                        className="gap-2.5 px-2.5 py-2"
                        key={opt.value}
                        onSelect={() => {
                          onValueChange?.(opt.value);
                          setOpen(false);
                        }}
                        value={opt.label}
                      >
                        {hasSelection && (
                          <Check
                            aria-hidden="true"
                            className={cn(
                              'h-4 w-4 shrink-0',
                              value === opt.value ? 'opacity-100' : 'opacity-0',
                            )}
                          />
                        )}
                        {opt.icon}
                        <span className="min-w-0 truncate" title={opt.label}>
                          {opt.label}
                        </span>
                        {opt.hint != null && (
                          <span className="text-muted-foreground ml-auto shrink-0 pl-2 text-xs tabular-nums">
                            {opt.hint}
                          </span>
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </React.Fragment>
              ))}
            </CommandList>
            {footer}
          </Command>
        </PopoverContent>
      </Popover>
    );
  },
);
Combobox.displayName = 'Combobox';
