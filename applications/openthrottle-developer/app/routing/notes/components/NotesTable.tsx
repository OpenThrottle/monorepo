import type { DataTableColumnDef } from '@openthrottle/react-router-shadcn';
import { cn, DataTable } from '@openthrottle/react-router-shadcn';
import {
  GlobalPopoverActionsHeader,
  readSearchParam,
} from '@openthrottle/react-router-ui-global';
import * as React from 'react';
import { Link, useSearchParams } from 'react-router';

import type { NoteCardFragment } from '~/__generated__/graphql';
import { NotesEmpty } from '~/routing/notes/components/NotesEmpty';
import { NotesTableRowActions } from '~/routing/notes/components/NotesTableRowActions';
import { notePreviewLabel } from '~/routing/notes/utils/notePreviewLabel';

export interface NotesTableProps {
  className?: string;
  notes: NoteCardFragment[];
}

export const NotesTable = (props: NotesTableProps): React.ReactElement => {
  const { className, notes } = props;

  // Hooks
  const [searchParams] = useSearchParams();

  // Setup
  const search = readSearchParam(searchParams);
  const columns = React.useMemo(() => NotesTable.buildTable(), [notes]);

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className={cn('ui-border rounded-lg border', className)}
      // className={cn('ui-border rounded-lg border [&_tbody_tr_td]:hover:py-4 [&_tbody_tr_td]:transition-all [&_tbody_tr_td]:duration-500', className)}
      data-testid="NotesTable"
    >
      <DataTable<NoteCardFragment, string | number | null | undefined>
        columns={columns}
        data={notes}
        emptyState={<NotesEmpty search={search} />}
      />
    </div>
  );
};

NotesTable.buildTable = (): DataTableColumnDef<
  NoteCardFragment,
  string | number | null | undefined
>[] => {
  return [
    {
      accessorKey: 'content',
      cell: ({ row }) => {
        const note = row.original;
        const noteHref = `/notes/${note.id}`;
        const label = notePreviewLabel(note.content);

        return (
          <div className="overflow-hidden p-2">
            <h2 className="mb-2 line-clamp-1 text-sm font-medium text-ellipsis">
              <Link
                aria-label={`View note: ${label}`}
                className="hover:text-primary underline underline-offset-2"
                to={noteHref}
              >
                {label}
              </Link>
            </h2>
            <p className="text-muted-foreground line-clamp-2 text-xs">
              {note.content.trim() || '—'}
            </p>
          </div>
        );
      },
      header: () => <div className="p-2">Content</div>,
    },
    {
      accessorKey: 'author',
      cell: ({ row }) => {
        const author = row.original.author?.trim();
        const authorMarkup = (
          <span aria-label={`Author: ${author}`}>{author}</span>
        );
        const emptyAuthorMarkup = (
          <span className="text-muted-foreground">—</span>
        );

        return (
          <div className="text-muted-foreground p-2 text-sm">
            {author ? authorMarkup : emptyAuthorMarkup}
          </div>
        );
      },
      header: () => <div className="p-2">Author</div>,
    },
    {
      cell: ({ row }) => {
        return (
          <div className="flex items-center justify-center">
            <NotesTableRowActions note={row.original} />
          </div>
        );
      },
      header: () => <GlobalPopoverActionsHeader />,
      id: 'actions',
    },
  ];
};
