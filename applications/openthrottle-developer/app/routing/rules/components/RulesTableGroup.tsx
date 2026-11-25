import type { DataTableColumnDef } from '@openthrottle/react-router-shadcn';
import { DataTable } from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import { RULES_COPY } from '~/routing/rules/data/copy';
import type {
  RankedTagActionRule,
  RuleGroup,
} from '~/routing/rules/utils/rule-groups';

export interface RulesTableGroupProps {
  readonly columns: DataTableColumnDef<
    RankedTagActionRule,
    string | number | null | undefined
  >[];
  readonly group: RuleGroup<RankedTagActionRule>;
}

/**
 * @description One hierarchy rung of the rules list: a heading (Global, a
 * project or repository name, or Unknown repository) over its narrowest-first rows.
 */
export const RulesTableGroup = (
  props: RulesTableGroupProps,
): React.ReactElement => {
  const { columns, group } = props;

  // Hooks
  const headingId = React.useId();
  const getRowId = React.useCallback(
    (rule: RankedTagActionRule): string => rule.id,
    [],
  );

  // Setup
  const titles = {
    global: RULES_COPY.scopeGlobalLabel,
    project: group.projectName ?? '',
    repository: group.repositoryName ?? '',
    unknown: RULES_COPY.scopeUnknownRepositoryLabel,
  };
  const title = titles[group.kind];
  const data = React.useMemo(() => [...group.rules], [group.rules]);

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <section
      aria-labelledby={headingId}
      data-group-kind={group.kind}
      data-testid="RulesTableGroup"
    >
      <h2
        className="text-muted-foreground bg-muted/40 ui-border border-b px-4 py-2 text-xs font-semibold tracking-wide uppercase"
        id={headingId}
      >
        {title}
        <span className="ml-2 font-normal">{group.rules.length}</span>
      </h2>
      <DataTable<RankedTagActionRule, string | number | null | undefined>
        columns={columns}
        data={data}
        getRowId={getRowId}
      />
    </section>
  );
};
