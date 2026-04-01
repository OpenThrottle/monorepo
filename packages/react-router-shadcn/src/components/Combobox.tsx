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
  readonly label: string;
  readonly value: string;
}

export interface ComboboxProps {
  readonly className?: string;
  readonly disabled?: boolean;
  readonly emptyText?: string;
  readonly onValueChange?: (value: string) => void;
  readonly options: readonly ComboboxOption[] | readonly string[];
  readonly placeholder?: string;
  readonly value?: string;
}

function getOptionLabel(option: ComboboxOption | string): string {
  return typeof option === 'string' ? option : option.label;
}

/**
 * @description Autocomplete input with a list of suggestions. Composes Popover and Command.
 */
export const Combobox = React.forwardRef<HTMLButtonElement, ComboboxProps>(
  (
    {
      className,
      disabled = false,
      emptyText = 'No results found.',
      onValueChange,
      options,
      placeholder = 'Select...',
      value,
    },
    ref,
  ) => {
    const [open, setOpen] = React.useState(false);
    const normalizedOptions = React.useMemo(
      () =>
        options.map((opt) =>
          typeof opt === 'string' ? { label: opt, value: opt } : opt,
        ),
      [options],
    );
    const selected = normalizedOptions.find((opt) => opt.value === value);

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
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-[--radix-popover-trigger-width] p-0"
        >
          <Command>
            <CommandInput placeholder="Search..." />
            <CommandList>
              <CommandEmpty>{emptyText}</CommandEmpty>
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
                    {opt.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    );
  },
);
Combobox.displayName = 'Combobox';
