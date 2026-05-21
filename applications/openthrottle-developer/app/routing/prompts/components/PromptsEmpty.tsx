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

interface PromptsEmptyProps {
  className?: string;
  search?: string;
}

export const PromptsEmpty = (props: PromptsEmptyProps) => {
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
        {search ? 'No prompts match your filters' : 'No prompts yet'}
      </EmptyTitle>
      <EmptyDescription>
        {search
          ? 'Try clearing the search to see all prompts.'
          : 'Create your first prompt to get started.'}
      </EmptyDescription>
      <Button asChild={true} variant="secondary">
        {search ? (
          <Link to="/prompts">Clear filters</Link>
        ) : (
          <Link to="/prompts/create">New prompt</Link>
        )}
      </Button>
    </Empty>
  );
};
