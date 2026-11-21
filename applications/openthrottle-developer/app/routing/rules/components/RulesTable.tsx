import type { DataTableColumnDef } from '@openthrottle/react-router-shadcn';
import { Badge, cn } from '@openthrottle/react-router-shadcn';
import { GlobalPopoverActionsHeader } from '@openthrottle/react-router-ui-global';
import * as React from 'react';
import { Link } from 'react-router';

import type { TagActionRuleRowFragment } from '~/__generated__/graphql';
import { RulesEmpty } from '~/routing/rules/components/RulesEmpty';
import { RulesScopeBadges } from '~/routing/rules/components/RulesScopeBadges';
import { RulesTableGroup } from '~/routing/rules/components/RulesTableGroup';
import { RulesTableRowActions } from '~/routing/rules/components/RulesTableRowActions';
import { RULES_COPY } from '~/routing/rules/data/data.copy';
import {
  buildRuleScopeTrail,
  summarizeRuleAction,
} from '~/routing/rules/utils/formatters';
import type {
  RankedTagActionRule,
  RulesProjectOption,
  RulesRepositoryOption,
} from '~/routing/rules/utils/rule-groups';
import { groupRulesByRepository } from '~/routing/rules/utils/rule-groups';

export interface RulesTableProps {
  className?: string;
  /** When true and `rules` is empty, show filtered-empty copy via RulesEmpty. */
  isFiltered?: boolean;
  onToggleEnabled: (rule: TagActionRuleRowFragment) => void;
  pending?: boolean;
  projects: RulesProjectOption[];
  repositories: RulesRepositoryOption[];
  rules: RankedTagActionRule[];
}

interface RulesTableColumnOptions {
  onToggleEnabled: (rule: TagActionRuleRowFragment) => void;
  pending: boolean;
  projectNames: ReadonlyMap<string, string>;
  repositoryNames: ReadonlyMap<string, string>;
}

type RulesTableColumns = DataTableColumnDef<
  RankedTagActionRule,
  string | number | null | undefined
>[];

/**
 * @description Tag→action rules list as a `bg-card` surface grouped by scope:
 * Global first, then one group per project and per repository (narrowest rule first). Grouping
 * lives in `utils/rule-groups`; empty UI lives in {@link RulesEmpty}.
 */
export const RulesTable = (props: RulesTableProps): React.ReactElement => {
  const {
    className,
    isFiltered = false,
    onToggleEnabled,
    pending = false,
    projects,
    repositories,
    rules,
  } = props;

  // Hooks
  const repositoryNames = React.useMemo(
    () => new Map(repositories.map((repo) => [repo.id, repo.name])),
    [repositories],
  );
  const projectNames = React.useMemo(
    () => new Map(projects.map((project) => [project.id, project.name])),
    [projects],
  );
  const columns = React.useMemo(
    () =>
      RulesTable.buildTable({
        onToggleEnabled,
        pending,
        projectNames,
        repositoryNames,
      }),
    [onToggleEnabled, pending, projectNames, repositoryNames],
  );
  const groups = React.useMemo(
    () => groupRulesByRepository(rules, repositories, projects),
    [projects, repositories, rules],
  );

  // Setup

  // Handlers

  // Markup
  const groupSections = groups.map((group) => (
    <RulesTableGroup columns={columns} group={group} key={group.id} />
  ));

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className={cn('bg-card ui-border rounded-lg border', className)}
      data-testid="RulesTable"
    >
      {groups.length === 0 ? <RulesEmpty isFiltered={isFiltered} /> : null}
      {groupSections}
    </div>
  );
};

RulesTable.buildTable = (
  options: RulesTableColumnOptions,
): RulesTableColumns => {
  const { onToggleEnabled, pending, projectNames, repositoryNames } = options;

  return [
    {
      accessorKey: 'title',
      cell: ({ row }) => {
        const rule = row.original;
        const detailHref = `/rules/${rule.id}`;

        return (
          <div className="min-w-0 space-y-2 p-2">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="line-clamp-1 text-sm font-semibold text-ellipsis">
                <Link
                  aria-label={`${RULES_COPY.viewAction}: ${rule.title}`}
                  className="hover:text-primary underline underline-offset-2"
                  to={detailHref}
                >
                  {rule.title}
                </Link>
              </h3>
              {!rule.enabled && (
                <Badge className="border-amber-500/60 bg-amber-500/10">
                  {RULES_COPY.filterDisabledLabel}
                </Badge>
              )}
            </div>

            <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-xs">
              <Badge variant="secondary">{rule.actionType}</Badge>
              <span>
                {summarizeRuleAction(rule.actionType, rule.actionPayloadJson)}
              </span>
            </div>
          </div>
        );
      },
      header: () => <div className="p-2">{RULES_COPY.tableRuleHeader}</div>,
    },
    {
      cell: ({ row }) => {
        const trail = buildRuleScopeTrail(
          row.original,
          repositoryNames,
          projectNames,
        );

        return <RulesScopeBadges trail={trail} />;
      },
      header: () => <div className="p-2">{RULES_COPY.scopeHeader}</div>,
      id: 'scope',
    },
    {
      accessorKey: 'tagAll',
      cell: ({ row }) => {
        const tags = row.original.tagAll;
        const hasTags = tags.length > 0;
        const matchesEveryPlan = (
          <span className="text-muted-foreground text-xs italic">
            {RULES_COPY.matchesEveryPlan}
          </span>
        );
        const tagBadges = tags.map((tag) => (
          <Badge className="bg-muted" key={tag}>
            {tag}
          </Badge>
        ));

        return (
          <div className="flex flex-wrap items-center gap-1.5 p-2">
            {hasTags ? tagBadges : matchesEveryPlan}
          </div>
        );
      },
      header: () => <div className="p-2">{RULES_COPY.tableMatchHeader}</div>,
    },
    {
      cell: ({ row }) => {
        return (
          <div className="flex items-center justify-center">
            <RulesTableRowActions
              onToggleEnabled={onToggleEnabled}
              pending={pending}
              rule={row.original}
            />
          </div>
        );
      },
      header: () => <GlobalPopoverActionsHeader />,
      id: 'actions',
    },
  ];
};
