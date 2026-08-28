import * as React from 'react';
import { Check } from 'lucide-react';
import { cn } from '../utils/cn';
import { Badge } from './Badge';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from './Command';
import { Popover, PopoverContent, PopoverTrigger } from './Popover';

export interface MultiSelectOption {
  /**
   * Optional leading adornment — a status marker, icon or swatch — rendered before the
   * label in both the trigger tag and the option row. It is decoration only: it never
   * affects selectability, ordering, or the cmdk search key.
   */
  readonly adornment?: React.ReactNode;
  /** Optional muted suffix after the label in the option row, e.g. a status word. */
  readonly hint?: string;
  readonly label: string;
  readonly value: string;
}

export interface MultiSelectProps {
  readonly className?: string;
  readonly emptyText?: string;
  readonly onChange: (value: string[]) => void;
  readonly options: readonly MultiSelectOption[];
  readonly placeholder?: string;
  readonly searchPlaceholder?: string;
  readonly value: readonly string[];
}

/**
 * @description Multi-select dropdown built on the cmdk Command primitive (via Popover). Fully keyboard accessible: arrow keys move the active option, Enter toggles selection, Escape closes. Selected values are shown as tags in the trigger.
 */
export const MultiSelect = React.forwardRef<
  HTMLButtonElement,
  MultiSelectProps
>((props, ref): React.ReactElement => {
  const {
    className,
    emptyText = 'No options found.',
    onChange,
    options,
    placeholder = 'Select…',
    searchPlaceholder = 'Search…',
    value,
  } = props;

  // Hooks
  const [open, setOpen] = React.useState(false);

  // Setup
  const selectedOptions = options.filter((opt) => value.includes(opt.value));

  // Handlers
  const toggleOption = (optionValue: string): void => {
    const next = value.includes(optionValue)
      ? value.filter((v) => v !== optionValue)
      : [...value, optionValue];

    onChange(next);
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger asChild={true}>
        <button
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-label={placeholder}
          className={cn(
            'flex w-full flex-wrap items-center gap-2',
            'bg-background border-input border',
            'px-3 py-2 text-sm',
            'ring-offset-background rounded-md',
            'placeholder:text-muted-foreground',
            'focus:ring-ring focus:ring-2 focus:ring-offset-2 focus:outline-none',
            'disabled:cursor-not-allowed disabled:opacity-50',
            className,
          )}
          ref={ref}
          type="button"
        >
          {selectedOptions.length === 0 ? (
            <span className="text-muted-foreground">{placeholder}</span>
          ) : (
            selectedOptions.map((opt) => (
              <Badge
                className="gap-1 truncate"
                key={opt.value}
                variant="secondary"
              >
                {opt.adornment}
                {opt.label}
              </Badge>
            ))
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[--radix-popover-trigger-width] min-w-32 p-0"
      >
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((opt) => {
                const selected = value.includes(opt.value);
                return (
                  <CommandItem
                    key={opt.value}
                    onSelect={() => toggleOption(opt.value)}
                    value={opt.label}
                  >
                    <span
                      aria-hidden={true}
                      className={cn(
                        'mr-2 flex h-4 w-4 items-center justify-center rounded border',
                        selected
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-input',
                      )}
                    >
                      {selected ? <Check className="h-3 w-3" /> : null}
                    </span>
                    {/* `value` above stays the bare label: folding the hint into the
                        cmdk search key would make a shared status word match every
                        option at once. */}
                    <span className="flex items-center gap-1.5">
                      {opt.adornment}
                      {opt.label}
                      {opt.hint ? (
                        <span className="text-muted-foreground text-xs">
                          {opt.hint}
                        </span>
                      ) : null}
                    </span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
});

MultiSelect.displayName = 'MultiSelect';
