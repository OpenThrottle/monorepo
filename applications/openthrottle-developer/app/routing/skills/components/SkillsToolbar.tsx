import * as React from 'react';
import clsx from 'clsx';
import { Link } from 'react-router';
import {
  Button,
  Input,
  ToggleGroup,
  ToggleGroupItem,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@openthrottle/react-router-shadcn';
import { FilePlusIcon, SlidersHorizontalIcon } from 'lucide-react';
import {
  SKILL_AVAILABILITY_COPY,
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
      <div className="flex gap-2">
        <Input placeholder="Filter by slug, path, or summary" />
        <Button type="submit" variant="outline">
          Search
        </Button>
      </div>

      <ToggleGroup
        aria-label={SKILLS_SOURCE_COPY.filterGroupLabel}
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
      </ToggleGroup>

      <div className="flex-1" />

      <Button asChild={true} variant="outline">
        <Link to="/skills/availability">
          <SlidersHorizontalIcon className="size-4" />
          {SKILL_AVAILABILITY_COPY.manageLink}
        </Link>
      </Button>

      <Tooltip delayDuration={1_000}>
        <TooltipTrigger asChild={true}>
          <Button
            aria-label="Toggle sidebar (Cmd/Ctrl+B)"
            type="submit"
            variant="outline"
          >
            <FilePlusIcon className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">Create new skill</TooltipContent>
      </Tooltip>
    </div>
  );
};
