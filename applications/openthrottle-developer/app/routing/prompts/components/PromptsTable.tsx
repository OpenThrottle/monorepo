import * as React from 'react';
import clsx from 'clsx';
import { Link } from 'react-router';
import {
  Badge,
  BadgeProps,
  DataTable,
} from '@openthrottle/react-router-shadcn';
import { Clock, FileText } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import type { PromptCardFragment } from '~/__generated__/graphql';
import { PromptsEmpty } from '~/routing/prompts/components/PromptsEmpty';
import {
  formatPromptDate,
  formatPromptType,
} from '~/routing/prompts/utils/formatters';
import { CustomPromptType } from '@openthrottle/openthrottle-developer-codegen';

export interface PromptsTableProps {
  className?: string;
  prompts: PromptCardFragment[];
  /** Search query from URL `q`; used for empty state copy when filtered. */
  search?: string;
}

export const PromptsTable = (props: PromptsTableProps): React.ReactElement => {
  const { className, prompts, search } = props;

  // Hooks

  // Setup
  const columns = React.useMemo(() => PromptsTable.buildTable(), [prompts]);

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className={clsx('ui-border rounded-lg border', className)}
      data-testid="PromptsTable"
    >
      <DataTable<PromptCardFragment, string | number | null | undefined>
        columns={columns}
        data={prompts}
        emptyState={<PromptsEmpty search={search} />}
      />
    </div>
  );
};

PromptsTable.buildTable = (): ColumnDef<
  PromptCardFragment,
  string | number | null | undefined
>[] => {
  return [
    {
      accessorKey: 'status',
      cell: ({ row }) => {
        const prompt = row.original;

        let color: BadgeProps['color'] = 'blue';

        switch (prompt.promptType) {
          case CustomPromptType.Agents:
            color = 'blue';
            break;
          case CustomPromptType.Commands:
            color = 'green';
            break;
          case CustomPromptType.Personas:
            color = 'orange';
            break;
          case CustomPromptType.Prompts:
            color = 'yellow';
            break;
          case CustomPromptType.Skills:
            color = 'red';
            break;

          default:
            break;
        }

        return (
          <div className="p-2">
            <Badge color={color} size="xs">
              {formatPromptType(prompt.promptType)}
            </Badge>
          </div>
        );
      },
      header: () => <div className="p-2">Status</div>,
    },
    {
      accessorKey: 'title',
      cell: ({ row }) => {
        const prompt = row.original;
        const promptHref = `/prompts/${prompt.id}`;
        const title = prompt.title ?? 'Untitled';
        const fileBasename = prompt.filePath
          ? prompt.filePath.split('/').pop()
          : null;
        const visibleLabels = prompt.labels.slice(0, 3);
        const overflowLabelCount = prompt.labels.length - 3;

        return (
          <div className="p-2">
            <h2 className="line-clamp-1 w-full pb-2 text-sm font-medium text-ellipsis">
              <Link
                aria-label={`View prompt: ${title}`}
                className="hover:text-primary underline underline-offset-2"
                to={promptHref}
                viewTransition={true}
              >
                {title}
              </Link>
            </h2>

            <div className="max-w-3xl">
              {prompt.description ? (
                <p className="text-muted-foreground mb-2 line-clamp-2 text-xs">
                  {prompt.description}
                </p>
              ) : null}

              {prompt.labels.length > 0 ? (
                <div className="mb-2 flex flex-wrap gap-1">
                  {visibleLabels.map((label) => (
                    <Badge size="xs">{label}</Badge>
                  ))}
                  {overflowLabelCount > 0 ? (
                    <Badge size="xs">+{overflowLabelCount}</Badge>
                  ) : null}
                </div>
              ) : null}

              <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                {fileBasename ? (
                  <span
                    className="flex items-center gap-1"
                    title={prompt.filePath ?? undefined}
                  >
                    <FileText className="h-3 w-3 shrink-0" />
                    <span className="max-w-[160px] truncate">
                      {fileBasename}
                    </span>
                  </span>
                ) : null}

                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3 shrink-0" />
                  {formatPromptDate(prompt.updatedAt)}
                </span>
              </div>

              <p className="text-muted-foreground mt-2 line-clamp-2 text-xs">
                {/* FIXME: can't use this due to server module usage */}
                {/* {extractContentAfterFrontmatter(prompt.content)} */}
                {prompt.content}
              </p>
            </div>
          </div>
        );
      },
      header: () => <div className="p-2">Prompt</div>,
    },
  ];
};
