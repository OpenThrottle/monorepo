import * as React from 'react';
import clsx from 'clsx';
import { DataTable } from '@openthrottle/react-router-shadcn';
import type { RepoSkillEntry } from '~/routing/agents/data/repo-skills-registry';
import {
  createSkillsTableColumns,
  getSkillsTableRowId,
} from '~/routing/skills/config/skills-table-columns';
import type { SkillsTableColumnValue } from '~/routing/skills/config/skills-table-columns';
import type { SkillTagVocabularyOption } from '~/routing/skills/components/SkillTagChips';
import { SkillsEmpty } from '~/routing/skills/components/SkillsEmpty';

export interface SkillsTableProps {
  className?: string;
  entries?: RepoSkillEntry[];
  /**
   * Whether a search query or source segment is narrowing the list. Forwarded
   * to the empty state so a zero-result filtered view offers "clear filters"
   * instead of new-user copy.
   */
  isFiltered?: boolean;
  onAddTag?: (slug: string, tag: string) => void;
  onRemoveOrphan?: (slug: string) => void;
  onRemoveTag?: (slug: string, tag: string) => void;
  pendingSlug?: string;
  vocabulary?: readonly SkillTagVocabularyOption[];
}

export const SkillsTable = (props: SkillsTableProps): React.ReactElement => {
  const {
    className,
    entries = [],
    isFiltered,
    onAddTag,
    onRemoveOrphan,
    onRemoveTag,
    pendingSlug,
    vocabulary,
  } = props;

  // Hooks

  // Setup
  const data = React.useMemo(() => [...entries], [entries]);
  const getRowId = React.useCallback(getSkillsTableRowId, []);
  const columns = React.useMemo(
    () =>
      createSkillsTableColumns({
        onAddTag,
        onRemoveOrphan,
        onRemoveTag,
        pendingSlug,
        vocabulary,
      }),
    [onAddTag, onRemoveOrphan, onRemoveTag, pendingSlug, vocabulary],
  );

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className={clsx('ui-border rounded-lg border', className)}
      data-testid="SkillsTable"
    >
      <DataTable<RepoSkillEntry, SkillsTableColumnValue>
        columns={columns}
        data={data}
        emptyState={<SkillsEmpty isFiltered={isFiltered} />}
        getRowId={getRowId}
      />
    </div>
  );
};
