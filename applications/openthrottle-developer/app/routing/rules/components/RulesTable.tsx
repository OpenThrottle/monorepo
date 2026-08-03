import * as React from 'react';
import clsx from 'clsx';
import { Badge, Button, DataTable } from '@openthrottle/react-router-shadcn';
import { Link } from 'react-router';
import type { ColumnDef } from '@tanstack/react-table';
import type { TagActionRuleRowFragment } from '~/__generated__/graphql';
import { RULES_COPY } from '~/routing/rules/data/data.copy';
import { RulesEmpty } from '~/routing/rules/components/RulesEmpty';
import { summarizeRuleAction } from '~/routing/rules/utils/formatters';

/** Row shape for the rules table — matches the `TagActionRuleRow` GraphQL fragment. */
export type TagActionRuleRowData = TagActionRuleRowFragment;

export interface RulesTableProps {
  className?: string;
  /** When true and `rules` is empty, show filtered-empty copy via RulesEmpty. */
  isFiltered?: boolean;
  onDelete: (id: string) => void;
  onToggleEnabled: (rule: TagActionRuleRowData) => void;
  pending?: boolean;
  rules: TagActionRuleRowData[];
}

interface RulesTableColumnOptions {
  onDelete: (id: string) => void;
  onToggleEnabled: (rule: TagActionRuleRowData) => void;
  pending: boolean;
}

/**
 * @description Tag→action rules list as a sibling-aligned `bg-card` DataTable.
 * Empty UI lives in {@link RulesEmpty}; this table only wires row data and
 * toggle/delete/edit actions.
 */
export const RulesTable = (props: RulesTableProps): React.ReactElement => {
  const {
    className,
    isFiltered = false,
    onDelete,
    onToggleEnabled,
    pending = false,
    rules,
  } = props;

  // Hooks
  const columns = React.useMemo(
    () => RulesTable.buildTable({ onDelete, onToggleEnabled, pending }),
    [onDelete, onToggleEnabled, pending],
  );
  const data = React.useMemo(() => [...rules], [rules]);
  const getRowId = React.useCallback(
    (rule: TagActionRuleRowData) => rule.id,
    [],
  );

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className={clsx('bg-card ui-border rounded-lg border', className)}
      data-testid="RulesTable"
    >
      <DataTable<TagActionRuleRowData, string | number | null | undefined>
        columns={columns}
        data={data}
        emptyState={<RulesEmpty isFiltered={isFiltered} />}
        getRowId={getRowId}
      />
    </div>
  );
};

RulesTable.buildTable = (
  options: RulesTableColumnOptions,
): ColumnDef<TagActionRuleRowData, string | number | null | undefined>[] => {
  const { onDelete, onToggleEnabled, pending } = options;

  return [
    {
      accessorKey: 'title',
      cell: ({ row }) => {
        const rule = row.original;
        const editHref = `/rules/${rule.id}/edit`;

        return (
          <div className="min-w-0 space-y-2 p-2">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="line-clamp-1 text-sm font-semibold text-ellipsis">
                <Link
                  aria-label={`${RULES_COPY.editAction}: ${rule.title}`}
                  className="hover:text-primary underline underline-offset-2"
                  to={editHref}
                  viewTransition={true}
                >
                  {rule.title}
                </Link>
              </h2>
              {rule.enabled ? null : (
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
              {rule.status != null && rule.status !== '' ? (
                <span>
                  {RULES_COPY.statusLabel}: {rule.status}
                </span>
              ) : null}
              {rule.environment != null && rule.environment !== '' ? (
                <span>
                  {RULES_COPY.environmentLabel}: {rule.environment}
                </span>
              ) : null}
            </div>
          </div>
        );
      },
      header: () => <div className="p-2">{RULES_COPY.tableRuleHeader}</div>,
    },
    {
      accessorKey: 'tagAll',
      cell: ({ row }) => {
        const tags = row.original.tagAll;

        return (
          <div className="flex flex-wrap items-center gap-1.5 p-2">
            {tags.length === 0 ? (
              <span className="text-muted-foreground text-xs italic">
                {RULES_COPY.matchesEveryPlan}
              </span>
            ) : (
              tags.map((tag) => (
                <Badge className="bg-muted" key={tag}>
                  {tag}
                </Badge>
              ))
            )}
          </div>
        );
      },
      header: () => <div className="p-2">{RULES_COPY.tableMatchHeader}</div>,
    },
    {
      cell: ({ row }) => {
        const rule = row.original;

        return (
          <div className="flex flex-wrap items-center gap-2 p-2">
            <Button
              disabled={pending}
              onClick={() => onToggleEnabled(rule)}
              size="sm"
              type="button"
              variant="outline"
            >
              {rule.enabled
                ? RULES_COPY.disableAction
                : RULES_COPY.enableAction}
            </Button>
            <Button asChild={true} size="sm" type="button" variant="outline">
              <Link to={`/rules/${rule.id}/edit`} viewTransition={true}>
                {RULES_COPY.editAction}
              </Link>
            </Button>
            <Button
              disabled={pending}
              onClick={() => onDelete(rule.id)}
              size="sm"
              type="button"
              variant="destructive"
            >
              {RULES_COPY.deleteAction}
            </Button>
          </div>
        );
      },
      header: () => <div className="p-2">{RULES_COPY.tableActionsHeader}</div>,
      id: 'actions',
    },
  ];
};
