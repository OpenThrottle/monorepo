import * as React from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '../utils/cn';
import { Button } from './Button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from './Command';
import { Popover, PopoverContent, PopoverTrigger } from './Popover';

export interface ComboboxOption {
  /** Muted trailing text (e.g. a count) rendered after the label. */
  readonly hint?: string;
  readonly label: string;
  readonly value: string;
}

export interface ComboboxProps {
  readonly className?: string;
  readonly disabled?: boolean;
  readonly emptyText?: string;
  /** Persistent row under the list — e.g. a "keep typing to narrow" hint. */
  readonly footer?: React.ReactNode;
  /** A search is in flight: suppresses the empty state so it cannot flash. */
  readonly loading?: boolean;
  readonly loadingText?: string;
  /** Called on every keystroke — pair with `shouldFilter={false}` to search server-side. */
  readonly onSearchChange?: (search: string) => void;
  readonly onValueChange?: (value: string) => void;
  readonly options: readonly ComboboxOption[] | readonly string[];
  readonly placeholder?: string;
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
      disabled = false,
      emptyText = 'No results found.',
      footer,
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

    // Setup
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
          className="w-[--radix-popover-trigger-width] p-0"
        >
          <Command shouldFilter={shouldFilter}>
            <CommandInput
              onValueChange={onSearchChange}
              placeholder={searchPlaceholder}
              value={searchValue}
            />
            <CommandList>
              {showLoadingRow ? (
                <div
                  className="text-muted-foreground py-6 text-center text-sm"
                  role="status"
                >
                  {loadingText}
                </div>
              ) : null}
              {loading ? null : <CommandEmpty>{emptyText}</CommandEmpty>}
              <CommandGroup>
                {normalizedOptions.map((opt) => (
                  <CommandItem
                    key={opt.value}
                    onSelect={() => {
                      onValueChange?.(opt.value);
                      setOpen(false);
                    }}
                    value={opt.label}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        value === opt.value ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                    <span className="truncate">{opt.label}</span>
                    {opt.hint == null ? null : (
                      <span className="text-muted-foreground ml-auto pl-2 text-xs tabular-nums">
                        {opt.hint}
                      </span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
            {footer}
          </Command>
        </PopoverContent>
      </Popover>
    );
  },
);
Combobox.displayName = 'Combobox';
