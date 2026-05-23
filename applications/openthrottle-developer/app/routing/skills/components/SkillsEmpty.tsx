import * as React from 'react';
import classnames from 'classnames';
import { Button, Empty } from '@openthrottle/react-router-shadcn';
import { Link } from 'react-router';
import { GlobalHeading } from '@openthrottle/react-router-ui-global';

export interface SkillsEmptyProps {
  className?: string;
  search?: string;
}

export const SkillsEmpty = (props: SkillsEmptyProps) => {
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
        title={
          search
            ? 'No skills found, try clearing the search to see all skills.'
            : 'No skills found, create your first skill to get started.'
        }
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
