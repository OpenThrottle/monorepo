import { Button, cn, Empty } from '@openthrottle/react-router-shadcn';
import { GlobalHeading } from '@openthrottle/react-router-ui-global';
import * as React from 'react';
import { Link } from 'react-router';

import { SKILLS_EMPTY_COPY } from '~/routing/skills/data/data.copy';

export interface SkillsEmptyProps {
  className?: string;
  /**
   * Whether *any* filter is narrowing the list — a search query or a source
   * segment. A filtered-but-empty view offers a way back out; only a genuinely
   * empty, unfiltered list points at creating a first skill.
   */
  isFiltered?: boolean;
}

export const SkillsEmpty = (props: SkillsEmptyProps): React.ReactElement => {
  const { className, isFiltered = false } = props;

  // Hooks

  // Setup
  const { searchTitle, title } = SKILLS_EMPTY_COPY;
  const emptyTitle = isFiltered ? searchTitle : title;

  // Handlers

  // Markup
  const clearFiltersLink = <Link to="/skills">Clear filters</Link>;
  const newSkillLink = <Link to="/skills/create">New skill</Link>;

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Empty className={cn('my-8', className)}>
      <GlobalHeading heading="h3" title={emptyTitle} />
      <Button asChild={true} variant="secondary">
        {isFiltered ? clearFiltersLink : newSkillLink}
      </Button>
    </Empty>
  );
};
