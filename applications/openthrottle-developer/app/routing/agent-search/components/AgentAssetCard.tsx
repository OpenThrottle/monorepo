import * as React from 'react';
import { Link } from 'react-router';
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@openthrottle/react-router-shadcn';
import type {
  AgentAssetPromptType,
  AgentAssetResult,
} from '~/routing/agent-search/types';

export interface AgentAssetCardProps {
  className?: string;
  result: AgentAssetResult;
}

const TITLE_CLASS = 'text-lg leading-tight tracking-tight';

/** Disk-backed list surface per prompt type (null when no in-app page exists yet). */
const LIST_HREF_BY_TYPE: Readonly<Record<AgentAssetPromptType, string | null>> =
  {
    personas: '/personas',
    rules: null,
    skills: '/skills',
  };

const PROMPT_TYPE_LABEL: Readonly<Record<AgentAssetPromptType, string>> = {
  personas: 'Persona',
  rules: 'Rule',
  skills: 'Skill',
};

/**
 * @description Read-only result card for an agent asset (skill, rule, or persona). Shows the
 * source (db/disk), prompt type, similarity (DB only), labels, a content snippet, and a link to
 * the disk-backed surface when one exists.
 */
export const AgentAssetCard = (
  props: AgentAssetCardProps,
): React.ReactElement => {
  const { className, result } = props;

  // Hooks

  // Setup
  const listHref = LIST_HREF_BY_TYPE[result.promptType];

  // Handlers

  // Markup
  const similarityBlock =
    result.similarity != null ? (
      <p
        className="text-muted-foreground text-xs"
        data-testid="AgentAssetCard-similarity"
      >
        Relevance: {Math.round(result.similarity * 100)}%
      </p>
    ) : null;

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Card className={className} data-testid="AgentAssetCard" key={result.id}>
      <CardHeader className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge color="blue" data-testid="AgentAssetCard-typeBadge" size="xs">
            {PROMPT_TYPE_LABEL[result.promptType]}
          </Badge>
          <Badge
            color={result.source === 'db' ? 'green' : 'slate'}
            data-testid="AgentAssetCard-sourceBadge"
            size="xs"
          >
            {result.source === 'db' ? 'indexed' : 'on disk'}
          </Badge>
          {result.labels.map((label) => (
            <Badge color="slate" key={label} size="xs">
              {label}
            </Badge>
          ))}
        </div>
        <CardTitle className={TITLE_CLASS}>
          {listHref != null ? (
            <Link
              className="underline-offset-4 hover:underline"
              data-testid="AgentAssetCard-link"
              to={listHref}
            >
              {result.title}
            </Link>
          ) : (
            <h3 className={TITLE_CLASS}>{result.title}</h3>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-4">
        {result.content !== '' ? (
          <p className="text-muted-foreground text-sm leading-relaxed">
            {result.content}
          </p>
        ) : null}
        {result.filePath != null ? (
          <p
            className="text-muted-foreground font-mono text-xs"
            data-testid="AgentAssetCard-filePath"
          >
            {result.filePath}
          </p>
        ) : null}
        {similarityBlock}
      </CardContent>
    </Card>
  );
};
