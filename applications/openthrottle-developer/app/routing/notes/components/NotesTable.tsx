import * as React from 'react';
import clsx from 'clsx';
import { DataTable } from '@openthrottle/react-router-shadcn';
import { readSearchParam } from '@openthrottle/react-router-ui-global';
import { Link, useSearchParams } from 'react-router';
import { NotesEmpty } from '~/routing/notes/components/NotesEmpty';
import {
  formatNoteDate,
  notePreviewLabel,
} from '~/routing/notes/utils/notes-table';
import type { ColumnDef } from '@tanstack/react-table';
import type { NoteCardFragment } from '~/__generated__/graphql';

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
      className={clsx('ui-border rounded-lg border', className)}
      // className={clsx('ui-border rounded-lg border [&_tbody_tr_td]:hover:py-4 [&_tbody_tr_td]:transition-all [&_tbody_tr_td]:duration-500', className)}
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

NotesTable.buildTable = (): ColumnDef<
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
                viewTransition={true}
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

        return (
          <div className="text-muted-foreground p-2 text-sm">
            {author ? (
              <span aria-label={`Author: ${author}`}>{author}</span>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </div>
        );
      },
      header: () => <div className="p-2">Author</div>,
    },
    {
      accessorKey: 'updatedAt',
      cell: ({ row }) => {
        const note = row.original;
        const updated = formatNoteDate(note.updatedAt ?? note.createdAt);
        const created = formatNoteDate(note.createdAt);

        return (
          <div className="text-muted-foreground p-2 text-xs">
            <div>
              Updated: <span aria-label={`Updated: ${updated}`}>{updated}</span>
            </div>
            <div className="mt-0.5">
              Created: <span aria-label={`Created: ${created}`}>{created}</span>
            </div>
          </div>
        );
      },
      header: () => <div className="p-2">Dates</div>,
    },
  ];
};
