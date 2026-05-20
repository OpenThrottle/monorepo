import * as React from 'react';
import classnames from 'classnames';
import {
  Button,
  Empty,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from '@openthrottle/react-router-shadcn';
import { Link } from 'react-router';
import { SearchAlertIcon } from 'lucide-react';

interface SkillsEmptyProps {
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
      <EmptyMedia variant="icon">
        <SearchAlertIcon className="size-6" />
      </EmptyMedia>
      <EmptyTitle>
        {search ? 'No skills match your filters' : 'No skills yet'}
      </EmptyTitle>
      <EmptyDescription>
        {search
          ? 'Try clearing the search to see all skills.'
          : 'Create your first skill to get started.'}
      </EmptyDescription>
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
