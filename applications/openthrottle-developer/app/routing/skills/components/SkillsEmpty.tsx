import * as React from 'react';
import clsx from 'clsx';
import { Button, Empty } from '@openthrottle/react-router-shadcn';
import { Link } from 'react-router';
import { GlobalHeading } from '@openthrottle/react-router-ui-global';
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

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Empty className={clsx('my-8', className)}>
      <GlobalHeading
        heading="h3"
        title={
          isFiltered ? SKILLS_EMPTY_COPY.searchTitle : SKILLS_EMPTY_COPY.title
        }
      />
      <Button asChild={true} variant="secondary">
        {isFiltered ? (
          <Link to="/skills">Clear filters</Link>
        ) : (
          <Link to="/skills/create">New skill</Link>
        )}
      </Button>
    </Empty>
  );
};
