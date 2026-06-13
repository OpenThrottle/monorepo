import * as React from 'react';
import classnames from 'classnames';
import { ArrowRightIcon } from 'lucide-react';
import { Button, DataTable } from '@openthrottle/react-router-shadcn';
import { formatDate } from 'date-fns';
import { Link, useSearchParams } from 'react-router';
import { NotesEmpty } from '~/routing/notes/components/NotesEmpty';
import type { ColumnDef } from '@tanstack/react-table';
import type { NoteCardFragment } from '~/__generated__/graphql';

export function notePreviewLabel(content: string): string {
  const firstLine = content.split('\n')[0]?.trim() ?? '';
  const stripped = firstLine.replace(/^#+\s*/, '').trim();

  if (stripped.length > 0) {
    return stripped.length > 80 ? `${stripped.slice(0, 80)}…` : stripped;
  }

  const trimmed = content.trim();

  if (trimmed.length === 0) {
    return 'Untitled note';
  }

  return trimmed.length > 80 ? `${trimmed.slice(0, 80)}…` : trimmed;
}

export function formatNoteDate(raw: NoteCardFragment['updatedAt']): string {
  if (raw == null) {
    return '—';
  }

  try {
    const date = typeof raw === 'string' ? new Date(raw) : raw;

    return formatDate(date, 'MM/dd/yyyy');
  } catch {
    return '—';
  }
}

export interface NotesTableProps {
  className?: string;
  notes: NoteCardFragment[];
}

export const NotesTable = (props: NotesTableProps): React.ReactElement => {
  const { className, notes } = props;

  // Hooks
  const [searchParams] = useSearchParams();

  // Setup
  const search = searchParams.get('q') ?? '';
  const columns = React.useMemo(() => NotesTable.buildTable(), [notes]);

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className={classnames('ui-border rounded-lg border', className)}
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
    {
      cell: ({ row }) => {
        const noteId = row.original.id;
        const label = notePreviewLabel(row.original.content);

        return (
          <div className="flex flex-wrap items-center gap-2 p-2">
            <Button
              asChild={true}
              className="text-xs"
              size="xs"
              variant="outline"
            >
              <Link
                aria-label={`View note: ${label}`}
                to={`/notes/${noteId}`}
                viewTransition={true}
              >
                <ArrowRightIcon className="size-4" />
              </Link>
            </Button>
          </div>
        );
      },
      header: () => 'Actions',
      id: 'actions',
    },
  ];
};
