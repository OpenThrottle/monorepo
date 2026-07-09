import * as React from 'react';
import clsx from 'clsx';
import { DataTable } from '@openthrottle/react-router-shadcn';
import type { RepoPersonaEntry } from '~/routing/agents/data/repo-personas-registry';
import {
  getPersonasTableRowId,
  personasTableColumns,
} from '~/routing/personas/config/personas-table-columns';
import type { PersonasTableColumnValue } from '~/routing/personas/config/personas-table-columns';

export interface PersonasTableProps {
  className?: string;
  entries?: RepoPersonaEntry[];
}

export const PersonasTable = (
  props: PersonasTableProps,
): React.ReactElement => {
  const { className, entries = [] } = props;

  const data = React.useMemo(() => [...entries], [entries]);
  const getRowId = React.useCallback(getPersonasTableRowId, []);

  return (
    <div
      className={clsx('ui-border rounded-lg border', className)}
      data-testid="PersonasTable"
    >
      <DataTable<RepoPersonaEntry, PersonasTableColumnValue>
        columns={personasTableColumns}
        data={data}
        emptyState={
          <p className="text-muted-foreground p-4 text-sm">
            No personas found under <code>.agents/personas/</code>.
          </p>
        }
        getRowId={getRowId}
      />
    </div>
  );
};
