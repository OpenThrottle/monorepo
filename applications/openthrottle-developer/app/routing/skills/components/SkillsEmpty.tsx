import * as React from 'react';
import clsx from 'clsx';
import { Button, Empty } from '@openthrottle/react-router-shadcn';
import { Link } from 'react-router';
import { GlobalHeading } from '@openthrottle/react-router-ui-global';
import { SKILLS_EMPTY_COPY } from '~/routing/skills/data/data.copy';

export interface SkillsEmptyProps {
  className?: string;
  search?: string;
}

export const SkillsEmpty = (props: SkillsEmptyProps): React.ReactElement => {
  const { className, search } = props;

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
        title={search ? SKILLS_EMPTY_COPY.searchTitle : SKILLS_EMPTY_COPY.title}
      />
      {/* <EmptyMedia variant="icon">
        <SearchAlertIcon className="size-6" />
      </EmptyMedia>
      <EmptyDescription>
        {search
          ? 'Try clearing the search to see all skills.'
          : 'Create your first skill to get started.'}
      </EmptyDescription> */}
      <Button asChild={true} variant="secondary">
        {search ? (
          <Link to="/skills">Clear filters</Link>
        ) : (
          <Link to="/skills/create">New skill</Link>
        )}
      </Button>
    </Empty>
  );
};
