import * as React from 'react';
import clsx from 'clsx';
import { Link } from 'react-router';
import {
  Button,
  ToggleGroup,
  ToggleGroupItem,
} from '@openthrottle/react-router-shadcn';
import { GlobalToolbarSearch } from '@openthrottle/react-router-ui-global';
import { SlidersHorizontalIcon, TagsIcon } from 'lucide-react';
import {
  SKILL_AVAILABILITY_COPY,
  SKILL_VOCABULARY_COPY,
  SKILLS_SEARCH_COPY,
  SKILLS_SOURCE_COPY,
} from '~/routing/skills/data/data.copy';
import {
  isSkillSourceFilter,
  type SkillSourceFilter,
} from '~/routing/skills/utils/filter-skills-by-source';

export interface SkillsToolbarProps {
  className?: string;
  onSourceFilterChange?: (filter: SkillSourceFilter) => void;
  sourceFilter?: SkillSourceFilter;
}

export const SkillsToolbar = (
  props: SkillsToolbarProps,
): React.ReactElement => {
  const { className, onSourceFilterChange, sourceFilter = 'all' } = props;

  // Hooks

  // Setup

  // Handlers
  const handleSourceFilterChange = (value: string): void => {
    // Radix single toggle emits '' when the active item is clicked again;
    // keep the current selection instead of clearing the filter.
    if (isSkillSourceFilter(value)) {
      onSourceFilterChange?.(value);
    }
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className={clsx('flex gap-2', className)} data-testid="SkillsToolbar">
      {/* GlobalToolbarSearch owns its own <form role="search">; the source
          filter and CTAs stay siblings outside it so no forms nest. It commits
          to `?search=` and resets `?page` so a new query lands on page 1. */}
      <GlobalToolbarSearch
        aria-label={SKILLS_SEARCH_COPY.ariaLabel}
        placeholder={SKILLS_SEARCH_COPY.placeholder}
        transformCommittedParams={(next) => next.delete('page')}
      />

      <ToggleGroup
        aria-label={SKILLS_SOURCE_COPY.filterGroupLabel}
        attached={true}
        data-testid="skills-source-filter"
        onValueChange={handleSourceFilterChange}
        type="single"
        value={sourceFilter}
        variant="outline"
      >
        <ToggleGroupItem value="all">
          {SKILLS_SOURCE_COPY.filterAllLabel}
        </ToggleGroupItem>
        <ToggleGroupItem value="openthrottle">
          {SKILLS_SOURCE_COPY.filterOpenThrottleLabel}
        </ToggleGroupItem>
        <ToggleGroupItem value="external">
          {SKILLS_SOURCE_COPY.filterExternalLabel}
        </ToggleGroupItem>
        <ToggleGroupItem value="personal">
          {SKILLS_SOURCE_COPY.filterPersonalLabel}
        </ToggleGroupItem>
      </ToggleGroup>

      <div className="flex-1" />

      <Button asChild={true} variant="outline">
        <Link to="/skills/availability">
          <SlidersHorizontalIcon className="size-4" />
          {SKILL_AVAILABILITY_COPY.manageLink}
        </Link>
      </Button>

      <Button asChild={true} variant="outline">
        <Link to="/skills/vocabulary">
          <TagsIcon className="size-4" />
          {SKILL_VOCABULARY_COPY.manageLink}
        </Link>
      </Button>
    </div>
  );
};
