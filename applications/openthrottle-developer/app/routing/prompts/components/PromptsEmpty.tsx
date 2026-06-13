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

export interface PromptsEmptyProps {
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
export const PROMPTS_EMPTY_COPY = {
  description: 'Create your first prompt to get started.',
  searchDescription: 'Try clearing the search to see all prompts.',
  searchTitle: 'No prompts match your filters',
  title: 'No prompts yet',
} as const;

export const PromptsEmpty = (props: PromptsEmptyProps): React.ReactElement => {
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
        {search ? PROMPTS_EMPTY_COPY.searchTitle : PROMPTS_EMPTY_COPY.title}
      </EmptyTitle>
      <EmptyDescription>
        {search
          ? PROMPTS_EMPTY_COPY.searchDescription
          : PROMPTS_EMPTY_COPY.description}
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
