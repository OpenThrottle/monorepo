import { CirclePlus } from 'lucide-react';
import * as React from 'react';

import { FACETED_FILTER_COPY } from '../data/data.faceted-filter';
import { cn } from '../utils/cn';
import { Badge } from './Badge';
import { Button } from './Button';
import type { FacetedFilterOption } from './FacetedFilter';
import { Separator } from './Separator';

export interface FacetedFilterTriggerProps extends React.ComponentProps<
  typeof Button
> {
  readonly maxBadges: number;
  readonly open: boolean;
  readonly options: readonly FacetedFilterOption[];
  readonly selected: readonly FacetedFilterOption[];
  readonly title: string;
}

const SUMMARY_BADGE_CLASS = `bg-secondary text-secondary-foreground hover:bg-secondary gap-1.5 rounded-md border-transparent px-2 py-0.5 font-medium`;

/**
 * @description The faceted-filter trigger: a dashed outline button reading
 * `⊕ <title> | <summary>`. The summary is one `All` badge when nothing or
 * everything is selected, one badge per selection up to `maxBadges`, and a
 * single `N selected` badge beyond that.
 */
export const FacetedFilterTrigger = (
  props: FacetedFilterTriggerProps,
): React.ReactElement => {
  const { className, maxBadges, open, options, selected, title, ...rest } =
    props;

  // Hooks

  // Setup
  const showsAll = selected.length === 0 || selected.length === options.length;
  const collapsed = !showsAll && selected.length > maxBadges;

  // Handlers

  // Markup
  const allBadge = (
    <Badge className={SUMMARY_BADGE_CLASS}>{FACETED_FILTER_COPY.all}</Badge>
  );
  const countBadge = (
    <Badge className={SUMMARY_BADGE_CLASS}>
      {FACETED_FILTER_COPY.selectedCount(selected.length)}
    </Badge>
  );
  const optionBadges = selected.map((option) => (
    <Badge className={SUMMARY_BADGE_CLASS} key={option.value}>
      {option.adornment}
      {option.label}
    </Badge>
  ));
  const summary = showsAll ? allBadge : collapsed ? countBadge : optionBadges;

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Button
      aria-expanded={open}
      aria-label={title}
      className={cn('border-dashed', className)}
      role="combobox"
      size="default"
      type="button"
      variant="outline"
      {...rest}
    >
      <CirclePlus aria-hidden={true} />
      {title}
      <Separator className="mx-0.5 h-4" orientation="vertical" />
      <span className="flex items-center gap-1" data-slot="faceted-summary">
        {summary}
      </span>
    </Button>
  );
};
