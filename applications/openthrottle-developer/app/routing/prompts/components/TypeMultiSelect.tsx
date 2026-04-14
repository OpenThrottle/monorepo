import * as React from 'react';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import {
  Badge,
  Button,
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
  Label,
  Popover,
  PopoverContent,
  PopoverTrigger,
  cn,
} from '@openthrottle/react-router-shadcn';
import { PROMPTS_TYPE_FILTER_OPTIONS } from '~/routing/prompts/utils/parsers';

export interface TypeMultiSelectProps {
  readonly compact?: boolean;
  readonly 'data-testid'?: string;
  readonly onChange: (value: string[]) => void;
  readonly value: readonly string[];
}

/**
 * @description Multi-select dropdown to filter prompts by type. Shows "Type…" or "Type (n)" when compact; selected items as Badges below unless compact.
 */
export function TypeMultiSelect(
  props: TypeMultiSelectProps,
): React.JSX.Element {
  const { compact = false, 'data-testid': dataTestId, onChange, value } = props;

  // Hooks
  const [open, setOpen] = React.useState(false);

  // Setup
  const triggerLabel =
    compact && value.length > 0 ? `Type (${value.length})` : 'Type…';

  // Handlers
  const selectOptions = React.useMemo(
    () =>
      PROMPTS_TYPE_FILTER_OPTIONS.map((opt) => ({
        label: opt.label,
        value: opt.value,
      })),
    [],
  );

  const toggle = React.useCallback(
    (optValue: string) => {
      const next = value.includes(optValue)
        ? value.filter((v) => v !== optValue)
        : [...value, optValue];
      onChange(next);
    },
    [onChange, value],
  );

  const remove = React.useCallback(
    (optValue: string) => {
      onChange(value.filter((v) => v !== optValue));
    },
    [onChange, value],
  );

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Label
      className={cn(
        'flex flex-col gap-1',
        compact ? 'min-w-0 shrink-0' : 'min-w-40',
      )}
      data-testid={dataTestId}
    >
      <span className="hidden">Type</span>
      <Popover onOpenChange={setOpen} open={open}>
        <PopoverTrigger asChild={true}>
          <Button
            aria-expanded={open}
            className={cn(
              'justify-between font-normal text-muted-foreground',
              compact ? 'min-w-20 sshrink-0' : 'w-full min-w-40',
            )}
            role="combobox"
            type="button"
            variant="outline"
          >
            {triggerLabel}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>

        <PopoverContent
          align="start"
          className="w-[--radix-popover-trigger-width] p-0"
        >
          <Command>
            <CommandList>
              <CommandGroup>
                {selectOptions.map((opt) => {
                  const selected = value.includes(opt.value);

                  return (
                    <CommandItem
                      className="pr-4! pl-4! py-2! h-auto!"
                      key={opt.value}
                      onSelect={() => toggle(opt.value)}
                      value={opt.label}
                    >
                      <Check
                        className={cn(selected ? 'opacity-100' : 'opacity-0')}
                      />
                      {opt.label}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {!compact && value.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {value.map((v) => {
            const opt = selectOptions.find((o) => o.value === v);
            const label = opt?.label ?? v;
            return (
              <Badge
                className="inline-flex cursor-default items-center gap-0.5 pr-1"
                key={v}
                variant="secondary"
              >
                <span className="inline-flex items-center gap-0.5">
                  {label}
                  <button
                    aria-label={`Remove ${label}`}
                    className="rounded-full p-0.5 hover:bg-muted-foreground/20 focus:outline-none focus:ring-2 focus:ring-ring"
                    onClick={(e) => {
                      e.preventDefault();
                      remove(v);
                    }}
                    type="button"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              </Badge>
            );
          })}
        </div>
      ) : null}
    </Label>
  );
}
