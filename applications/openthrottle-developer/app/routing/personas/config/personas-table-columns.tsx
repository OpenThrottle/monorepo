import * as React from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import {
  GlobalPopover,
  GlobalPopoverActionsHeader,
} from '@openthrottle/react-router-ui-global';
import type { GlobalPopoverAction } from '@openthrottle/react-router-ui-global';
import type { RepoPersonaEntry } from '~/routing/agents/data/repo-personas-registry';
import { PERSONAS_ROW_ACTIONS_COPY } from '~/routing/personas/data/data.copy';

export type PersonasTableColumnValue =
  | RepoPersonaEntry['repoRelativePath']
  | RepoPersonaEntry['slug']
  | RepoPersonaEntry['summary'];

/**
 * @description Stable table row id for repository persona entries.
 */
export const getPersonasTableRowId = (
  entry: RepoPersonaEntry,
  index: number,
): string => {
  return entry.slug || entry.repoRelativePath || `persona-${index}`;
};

const copyPersonaPath = (path: string): void => {
  if (typeof navigator?.clipboard?.writeText === 'function') {
    void navigator.clipboard.writeText(path);
    return;
  }

  const textArea = document.createElement('textarea');
  textArea.value = path;
  document.body.appendChild(textArea);
  textArea.select();
  document.execCommand('copy');
  textArea.remove();
};

export const personasTableColumns: ColumnDef<
  RepoPersonaEntry,
  PersonasTableColumnValue
>[] = [
  {
    accessorKey: 'summary',
    cell: ({ row }) => (
      <div className="p-2">
        <h3 className="text-foreground mb-2 line-clamp-1">
          /{row.original.slug}
        </h3>
        <p className="text-muted-foreground line-clamp-2 text-xs">
          {row.original.summary}
        </p>
      </div>
    ),
    header: () => <div className="p-2">Summary</div>,
  },
  {
    accessorKey: 'actions',
    cell: ({ row }) => {
      const entry = row.original;
      const actions: GlobalPopoverAction[] = [
        {
          id: 'copy-path',
          kind: 'select',
          label: PERSONAS_ROW_ACTIONS_COPY.copyPath,
          onSelect: () => {
            copyPersonaPath(entry.repoRelativePath);
          },
        },
        {
          id: 'view',
          kind: 'link',
          label: PERSONAS_ROW_ACTIONS_COPY.viewPersona,
          to: `/personas/${encodeURIComponent(entry.slug)}`,
        },
      ];

      return (
        <GlobalPopover
          actions={actions}
          ariaLabel={`${PERSONAS_ROW_ACTIONS_COPY.menuAriaLabelPrefix} ${entry.slug}`}
        />
      );
    },
    header: () => <GlobalPopoverActionsHeader />,
  },
];
