import * as React from 'react';

import { FACETED_FILTER_COPY } from '../data/data.faceted-filter';
import { Button } from './Button';
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandList,
  CommandSeparator,
} from './Command';
import { FacetedFilterGroup } from './FacetedFilterGroup';
import { FacetedFilterTrigger } from './FacetedFilterTrigger';
import { Popover, PopoverContent, PopoverTrigger } from './Popover';

/**
 * @public
 * @description One selectable facet value.
 */
export interface FacetedFilterOption {
  /** Leading decoration (a status dot, an icon). Never part of the search key. */
  readonly adornment: React.ReactNode | undefined;
  /** Right-aligned count, e.g. matching rows. `undefined` renders no slot. */
  readonly count: number | undefined;
  /** Group heading. Options sharing one are rendered together, in first-seen order. */
  readonly group: string | undefined;
  readonly label: string;
  readonly value: string;
}

/**
 * @public
 * @description A labelled footer button, e.g. "Reset to defaults".
 */
export interface FacetedFilterFooterAction {
  /** Disable when the action would not change anything (its state is already active). */
  readonly disabled: boolean;
  readonly label: string;
  readonly onSelect: () => void;
}

/**
 * @public
 */
export interface FacetedFilterProps {
  readonly className?: string;
  /** Rendered as a button row under the list; an empty array hides the footer. */
  readonly footerActions: readonly FacetedFilterFooterAction[];
  /** Trigger shows one badge per selection up to this many, then `N selected`. */
  readonly maxBadges: number;
  /** Receives the next selection in `options` order. */
  readonly onChange: (value: string[]) => void;
  readonly options: readonly FacetedFilterOption[];
  /** Adds a search input above the list. Off by default for short lists. */
  readonly searchable: boolean;
  readonly title: string;
  readonly value: readonly string[];
}

/**
 * @public
 * @description The shadcn data-table faceted filter: a dashed `⊕ Title | …`
 * trigger opening a grouped checkbox list with optional search and footer
 * actions. Keyboard: arrows move, Enter or Space toggles, Escape closes.
 */
export const FacetedFilter = (
  props: FacetedFilterProps,
): React.ReactElement => {
  const {
    className,
    footerActions,
    maxBadges,
    onChange,
    options,
    searchable,
    title,
    value,
  } = props;

  // Hooks
  const [open, setOpen] = React.useState(false);
  const commandRef = React.useRef<HTMLDivElement>(null);

  // Setup
  const selected = new Set(value);
  const selectedOptions = options.filter((option) =>
    selected.has(option.value),
  );
  const groups = options.reduce<Map<string | undefined, FacetedFilterOption[]>>(
    (acc, option) =>
      acc.set(option.group, [...(acc.get(option.group) ?? []), option]),
    new Map(),
  );

  // Handlers
  const emit = (next: ReadonlySet<string>): void => {
    onChange(options.map((option) => option.value).filter((v) => next.has(v)));
  };

  const handleToggle = (optionValue: string): void => {
    const next = new Set(selected);
    if (!next.delete(optionValue)) {
      next.add(optionValue);
    }
    emit(next);
  };

  const handleToggleGroup = (groupValues: readonly string[]): void => {
    const allOn = groupValues.every((v) => selected.has(v));
    const next = new Set(selected);
    groupValues.forEach((v) => (allOn ? next.delete(v) : next.add(v)));
    emit(next);
  };

  const handleOpenAutoFocus = (event: Event): void => {
    if (searchable) {
      return;
    }
    // No input to focus: put focus on the cmdk root so arrow keys navigate.
    event.preventDefault();
    commandRef.current?.focus();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
    // cmdk toggles on Enter only; Space toggles too unless typing a search.
    if (event.key !== ' ' || event.target instanceof HTMLInputElement) {
      return;
    }
    const active = commandRef.current?.querySelector<HTMLElement>(
      '[cmdk-item][data-selected="true"]',
    );
    if (active) {
      event.preventDefault();
      active.click();
    }
  };

  // Markup
  const groupNodes = [...groups.entries()].map(
    ([heading, groupOptions], index) => (
      <React.Fragment key={heading ?? '__ungrouped'}>
        {index > 0 ? <CommandSeparator /> : null}
        <FacetedFilterGroup
          heading={heading}
          onToggle={handleToggle}
          onToggleGroup={handleToggleGroup}
          options={groupOptions}
          selected={selected}
        />
      </React.Fragment>
    ),
  );

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger asChild={true}>
        <FacetedFilterTrigger
          className={className}
          maxBadges={maxBadges}
          open={open}
          options={options}
          selected={selectedOptions}
          title={title}
        />
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-auto min-w-(--radix-popover-trigger-width) p-0"
        onOpenAutoFocus={handleOpenAutoFocus}
      >
        <Command onKeyDown={handleKeyDown} ref={commandRef}>
          {searchable ? (
            <CommandInput
              placeholder={FACETED_FILTER_COPY.searchPlaceholder(title)}
            />
          ) : null}
          <CommandList aria-multiselectable={true} label={title}>
            <CommandEmpty>{FACETED_FILTER_COPY.noResults}</CommandEmpty>
            {groupNodes}
          </CommandList>
          {footerActions.length === 0 ? null : (
            <div className="flex gap-1 border-t p-1" data-slot="faceted-footer">
              {footerActions.map((action) => (
                <Button
                  className="hover:bg-muted hover:text-foreground dark:hover:bg-muted flex-1"
                  disabled={action.disabled}
                  key={action.label}
                  onClick={action.onSelect}
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  {action.label}
                </Button>
              ))}
            </div>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
};
