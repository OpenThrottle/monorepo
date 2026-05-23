import * as React from 'react';
import classnames from 'classnames';
import { DataTable } from '@openthrottle/react-router-shadcn';
import type { RepoSkillEntry } from '~/routing/agents/data/repo-skills-registry';
import {
  getSkillsTableRowId,
  skillsTableColumns,
} from '~/routing/skills/config/skills-table-columns';
import type { SkillsTableColumnValue } from '~/routing/skills/config/skills-table-columns';
import { SkillsEmpty } from '~/routing/skills/components/SkillsEmpty';

export interface SkillsTableProps {
  className?: string;
  entries?: RepoSkillEntry[];
}

export const SkillsTable = (props: SkillsTableProps): React.ReactElement => {
  const { className, entries = [] } = props;

  // Hooks

  // Setup
  const data = React.useMemo(() => [...entries], [entries]);
  const getRowId = React.useCallback(getSkillsTableRowId, []);

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className={classnames('border ui-border rounded-lg', className)}
      data-testid="SkillsTable"
    >
      <DataTable<RepoSkillEntry, SkillsTableColumnValue>
        columns={skillsTableColumns}
        data={data}
        emptyState={<SkillsEmpty />}
        getRowId={getRowId}
      />
    </div>
  );
};
