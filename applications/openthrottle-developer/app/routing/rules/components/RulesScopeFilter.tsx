import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import { RULES_COPY } from '~/routing/rules/data/copy';
import {
  RULES_SCOPE_ALL,
  RULES_SCOPE_GLOBAL,
} from '~/routing/rules/utils/parsers';
import type { RulesRepositoryOption } from '~/routing/rules/utils/rule-groups';

export interface RulesScopeFilterProps {
  readonly onChange: (value: string) => void;
  readonly repositories: readonly RulesRepositoryOption[];
  readonly value: string;
}

/**
 * @description Scope select for the rules toolbar: All, Global, or one
 * repository. State lives in the URL; the toolbar owns the write.
 */
export const RulesScopeFilter = (
  props: RulesScopeFilterProps,
): React.ReactElement => {
  const { onChange, repositories, value } = props;

  // Hooks

  // Setup
  // Radix renders SelectValue empty during SSR until the items mount, so the
  // trigger is given the selected label explicitly.
  const selectedRepository = repositories.find((repo) => {
    return repo.id === value;
  });
  const isGlobal = value === RULES_SCOPE_GLOBAL;
  const globalOrAll = isGlobal
    ? RULES_COPY.scopeGlobalLabel
    : RULES_COPY.scopeAllOption;
  const selectedLabel = selectedRepository?.name ?? globalOrAll;

  // Handlers

  // Markup
  const repositoryItems = repositories.map((repo) => (
    <SelectItem key={repo.id} value={repo.id}>
      {repo.name}
    </SelectItem>
  ));

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Select onValueChange={onChange} value={value}>
      <SelectTrigger
        aria-label={RULES_COPY.scopeFilterLabel}
        className="w-56"
        data-testid="RulesToolbar-scope-filter"
      >
        <SelectValue>{selectedLabel}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={RULES_SCOPE_ALL}>
          {RULES_COPY.scopeAllOption}
        </SelectItem>
        <SelectItem value={RULES_SCOPE_GLOBAL}>
          {RULES_COPY.scopeGlobalLabel}
        </SelectItem>
        {repositoryItems}
      </SelectContent>
    </Select>
  );
};
