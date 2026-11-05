import { Check } from 'lucide-react';
import * as React from 'react';

import { FACETED_FILTER_COPY } from '../data/data.faceted-filter';
import { cn } from '../utils/cn';
import { CommandGroup, CommandItem } from './Command';
import type { FacetedFilterOption } from './FacetedFilter';

export interface FacetedFilterGroupProps {
  readonly className?: string;
  /** Group heading; `undefined` renders the rows with no toggleable header. */
  readonly heading: string | undefined;
  readonly onToggle: (value: string) => void;
  readonly onToggleGroup: (values: readonly string[]) => void;
  readonly options: readonly FacetedFilterOption[];
  readonly selected: ReadonlySet<string>;
}

/**
 * @description One group of faceted-filter rows. A named group leads with a
 * header row that selects every option in the group, or clears them all when
 * they are already selected. Rows are a checkbox, the option's adornment, its
 * label and an optional right-aligned count. The active row uses the muted
 * highlight rather than `CommandItem`'s default accent.
 */
export const FacetedFilterGroup = (
  props: FacetedFilterGroupProps,
): React.ReactElement => {
  const { className, heading, onToggle, onToggleGroup, options, selected } =
    props;

  // Hooks

  // Setup
  const values = options.map((option) => option.value);
  const allSelected = values.every((value) => selected.has(value));
  const rowClass = `data-[selected=true]:bg-muted data-[selected=true]:text-foreground cursor-pointer gap-2`;

  const { clearGroup, selectGroup } = FACETED_FILTER_COPY;
  const toggleLabel = allSelected ? clearGroup : selectGroup;
  const checkedClass = 'bg-primary text-primary-foreground';
  const uncheckedClass = 'opacity-50 [&_svg]:invisible';

  // Handlers

  // Markup
  const groupToggle = (
    <CommandItem
      className={cn(
        rowClass,
        'text-muted-foreground justify-between text-xs font-medium',
      )}
      data-slot="faceted-group-toggle"
      keywords={options.map((option) => option.label)}
      onSelect={() => onToggleGroup(values)}
      value={`group:${heading}`}
    >
      {heading}
      <span className="text-[11px] opacity-80">{toggleLabel}</span>
    </CommandItem>
  );
  const header = heading === undefined ? null : groupToggle;

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <CommandGroup className={className}>
      {header}
      {options.map((option) => {
        const checked = selected.has(option.value);
        return (
          <CommandItem
            aria-checked={checked}
            className={rowClass}
            data-slot="faceted-option"
            key={option.value}
            onSelect={() => onToggle(option.value)}
            value={option.label}
          >
            <span
              aria-hidden={true}
              className={cn(
                'border-primary flex size-4 shrink-0 items-center justify-center rounded-sm border',
                checked ? checkedClass : uncheckedClass,
              )}
            >
              <Check className="size-3" strokeWidth={3} />
            </span>
            {option.adornment}
            <span className="truncate">{option.label}</span>
            {option.count !== undefined && (
              <span className="text-muted-foreground ml-auto pl-4 font-mono text-xs tabular-nums">
                {option.count}
              </span>
            )}
          </CommandItem>
        );
      })}
    </CommandGroup>
  );
};
