import {
  Button,
  cn,
  Empty,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from '@openthrottle/react-router-shadcn';
import { SearchAlertIcon } from 'lucide-react';
import * as React from 'react';
import { Link } from 'react-router';

import { PROMPTS_EMPTY_COPY } from '~/routing/prompts/data/data.copy';

export interface PromptsEmptyProps {
  className?: string;
  search?: string;
}

export const PromptsEmpty = (props: PromptsEmptyProps): React.ReactElement => {
  const { className, search } = props;

  // Hooks

  // Setup
  const { description, searchDescription, searchTitle, title } =
    PROMPTS_EMPTY_COPY;
  const isSearching = Boolean(search);
  const heading = isSearching ? searchTitle : title;
  const body = isSearching ? searchDescription : description;

  // Handlers

  // Markup
  const clearFiltersLink = <Link to="/prompts">Clear filters</Link>;
  const newPromptLink = <Link to="/prompts/create">New prompt</Link>;

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Empty className={cn('my-8', className)}>
      <EmptyMedia variant="icon">
        <SearchAlertIcon className="size-6" />
      </EmptyMedia>
      <EmptyTitle>{heading}</EmptyTitle>
      <EmptyDescription>{body}</EmptyDescription>
      <Button asChild={true} variant="secondary">
        {isSearching ? clearFiltersLink : newPromptLink}
      </Button>
    </Empty>
  );
};
