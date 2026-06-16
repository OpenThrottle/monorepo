import * as React from 'react';
import classnames from 'classnames';
import { Button, Input, Label } from '@openthrottle/react-router-shadcn';
import { AGENT_SEARCH_BASE_PATH } from '~/routing/agent-search/config';
import { AGENT_SEARCH_COPY } from '~/routing/agent-search/data/data.copy';
import type { AgentSearchTab } from '~/routing/agent-search/types';

export interface AgentSearchFormProps {
  className?: string;
  /** Pre-fill value for the query input (from current URL search params). */
  defaultQuery?: string;
  /** Preserve the active project scope on submit. */
  projectId?: string | null;
  /** Preserve the active tab on submit (GET resets params otherwise). */
  tab?: AgentSearchTab;
}

/**
 * @description GET search form for agent-assets search. Preserves the active tab and project
 * scope via hidden inputs so submitting a new query keeps the current view.
 */
export const AgentSearchForm = (
  props: AgentSearchFormProps,
): React.ReactElement => {
  const { className, defaultQuery = '', projectId, tab } = props;

  // Hooks
  const [query, setQuery] = React.useState(defaultQuery);

  // Setup

  // Handlers

  // Markup

  // Life Cycle
  React.useEffect(() => {
    setQuery(defaultQuery);
  }, [defaultQuery]);

  // 🔌 Short Circuit

  return (
    <form
      action={AGENT_SEARCH_BASE_PATH}
      className={classnames('p-4', className)}
      data-testid="AgentSearchForm"
      method="get"
      role="search"
    >
      {tab != null && tab !== 'all' ? (
        <input name="type" type="hidden" value={tab} />
      ) : null}
      {projectId != null && projectId !== '' ? (
        <input name="projectId" type="hidden" value={projectId} />
      ) : null}
      <Label className="sr-only" htmlFor="agent-search-query">
        Search query
      </Label>
      <Input
        id="agent-search-query"
        name="q"
        onChange={(e) => setQuery(e.target.value)}
        placeholder={AGENT_SEARCH_COPY.searchPlaceholder}
        type="search"
        value={query}
      />
      <Button type="submit">Search</Button>
    </form>
  );
};
