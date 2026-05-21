import * as React from 'react';
import classnames from 'classnames';
import { Link } from 'react-router';
import { Badge, DataTable } from '@openthrottle/react-router-shadcn';
import { Clock, FileText } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import type { PromptCardFragment } from '~/__generated__/graphql';
import { PromptsEmpty } from '~/routing/prompts/components/PromptsEmpty';
import {
  formatPromptDate,
  formatPromptType,
} from '~/routing/prompts/utils/formatters';

export interface PromptsTableProps {
  className?: string;
  prompts: PromptCardFragment[];
  /** Search query from URL `q`; used for empty state copy when filtered. */
  search?: string;
}

export const PromptsTable = (props: PromptsTableProps) => {
  const { className, prompts, search } = props;

  // Hooks

  // Setup
  const columns = React.useMemo(() => PromptsTable.buildTable(), []);

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (prompts.length === 0) {
    return <PromptsEmpty search={search} />;
  }

  return (
    <div
      className={classnames('border ui-border rounded-lg', className)}
      data-testid="PromptsTable"
    >
      <DataTable<PromptCardFragment, string | number | null | undefined>
        columns={columns}
        data={prompts}
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

        return (
          <div>
            <Badge variant="secondary">
              {formatPromptType(prompt.promptType)}
            </Badge>
          </div>
        );
      },
      header: () => <div className="p-2 w-12">Status</div>,
      // maxSize: 20,
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
          <div className="overflow-hidden-- flex-1 w-full p-2">
            <h2 className="mb-2 line-clamp-1 text-ellipsis text-sm font-medium">
              <Link
                aria-label={`View prompt: ${title}`}
                className="underline underline-offset-2 hover:text-primary"
                to={promptHref}
                viewTransition={true}
              >
                {title}
              </Link>
            </h2>

            {prompt.description ? (
              <p className="mb-2 line-clamp-2 text-xs text-muted-foreground">
                {prompt.description}
              </p>
            ) : null}

            {prompt.labels.length > 0 ? (
              <div className="mb-2 flex flex-wrap gap-1">
                {visibleLabels.map((label) => (
                  <Badge className="text-xs" key={label} variant="outline">
                    {label}
                  </Badge>
                ))}
                {overflowLabelCount > 0 ? (
                  <Badge className="text-xs" variant="outline">
                    +{overflowLabelCount}
                  </Badge>
                ) : null}
              </div>
            ) : null}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {fileBasename ? (
                <span
                  className="flex items-center gap-1"
                  title={prompt.filePath ?? undefined}
                >
                  <FileText className="h-3 w-3 shrink-0" />
                  <span className="max-w-[160px] truncate">{fileBasename}</span>
                </span>
              ) : null}
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3 shrink-0" />
                {formatPromptDate(prompt.updatedAt)}
              </span>
            </div>
          </div>
        );
      },

      header: () => <div className="p-2 flex-1 w-full">Prompt</div>,
    },
  ];
};
