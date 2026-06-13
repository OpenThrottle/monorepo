import * as React from 'react';
import classnames from 'classnames';
import { Button, Empty } from '@openthrottle/react-router-shadcn';
import { Link } from 'react-router';
import { GlobalHeading } from '@openthrottle/react-router-ui-global';

export interface SkillsEmptyProps {
  className?: string;
  search?: string;
}

/**
 * User-facing copy for the empty/filtered-empty states, single-sourced so a
 * wording change updates the rendered string and its spec in one place (specs
 * import this instead of duplicating the literal).
 *
 * @publicApi
 */
export const SKILLS_EMPTY_COPY = {
  searchTitle: 'No skills found, try clearing the search to see all skills.',
  title: 'No skills found, create your first skill to get started.',
} as const;

export const SkillsEmpty = (props: SkillsEmptyProps): React.ReactElement => {
  const { className, search } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Empty className={classnames('my-8', className)}>
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
