import * as React from 'react';
import classnames from 'classnames';
import { Link } from 'react-router';
import { Badge } from '@openthrottle/react-router-shadcn';
import { Clock, FileText } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import type { PromptCardFragment } from '~/__generated__/graphql';
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
  const { className, prompts: _prompts, search: _search } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className={classnames('p-4', className)} data-testid="PromptsTable">
      <h2>PromptsTable</h2>
    </div>
  );
};

PromptsTable.buildTable = (): ColumnDef<
  PromptCardFragment,
  string | number | null | undefined
>[] => {
  return [
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
          <div className="overflow-hidden p-2">
            <div className="mb-2 flex items-start justify-between gap-2">
              <h2 className="mb-0 line-clamp-1 text-ellipsis text-sm font-medium">
                <Link
                  aria-label={`View prompt: ${title}`}
                  className="underline underline-offset-2 hover:text-primary"
                  to={promptHref}
                  viewTransition={true}
                >
                  {title}
                </Link>
              </h2>
              <Badge className="shrink-0" variant="secondary">
                {formatPromptType(prompt.promptType)}
              </Badge>
            </div>
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
      header: () => <div className="p-2">Prompt</div>,
    },
  ];
};
