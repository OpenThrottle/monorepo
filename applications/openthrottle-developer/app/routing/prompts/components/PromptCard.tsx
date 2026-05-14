import * as React from 'react';
import classnames from 'classnames';
import { Link } from 'react-router';
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@openthrottle/react-router-shadcn';
import { FileText, Clock } from 'lucide-react';
import type { PromptCardFragment } from '~/__generated__/graphql';
import {
  formatPromptDate,
  formatPromptType,
} from '~/routing/prompts/utils/formatters';

export interface PromptCardProps {
  readonly className?: string;
  readonly prompt: PromptCardFragment;
}

export const PromptCard = (props: PromptCardProps) => {
  const { className, prompt } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Card
      className={classnames(
        'hover:shadow-md transition-shadow cursor-pointer',
        className,
      )}
      data-testid="PromptCard"
    >
      <Link className="block h-full" to={`/prompts/${prompt.id}`}>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-lg line-clamp-2">
              {prompt.title}
            </CardTitle>
            <Badge className="shrink-0" variant="secondary">
              {formatPromptType(prompt.promptType)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {prompt.description ? (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
              {prompt.description}
            </p>
          ) : null}

          {prompt.labels.length > 0 ? (
            <div className="flex flex-wrap gap-1 mb-3">
              {prompt.labels.slice(0, 3).map((label) => (
                <Badge className="text-xs" key={label} variant="outline">
                  {label}
                </Badge>
              ))}
              {prompt.labels.length > 3 ? (
                <Badge className="text-xs" variant="outline">
                  +{prompt.labels.length - 3}
                </Badge>
              ) : null}
            </div>
          ) : null}

          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            {prompt.filePath ? (
              <span className="flex items-center gap-1">
                <FileText className="h-3 w-3" />
                <span
                  className="truncate max-w-[120px]"
                  title={prompt.filePath}
                >
                  {prompt.filePath.split('/').pop()}
                </span>
              </span>
            ) : null}
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatPromptDate(prompt.updatedAt)}
            </span>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Detail page includes versioning and debug (fingerprints, JSON
            snapshot).
          </p>
        </CardContent>
      </Link>
    </Card>
  );
};
