import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@openthrottle/react-router-shadcn';
import * as React from 'react';
import { Link } from 'react-router';

import {
  AGENT_ASSET_LIST_HREF_BY_TYPE,
  AGENT_ASSET_PROMPT_TYPE_LABEL,
} from '~/routing/agent-search/data/data.agent-asset-card';
import type { AgentAssetResult } from '~/routing/agent-search/types';

export interface AgentAssetCardProps {
  className?: string;
  result: AgentAssetResult;
}

const TITLE_CLASS = 'text-lg leading-tight tracking-tight';

/**
 * @description Read-only result card for an agent asset (skill or persona). Shows the
 * source (db/disk), prompt type, similarity (DB only), labels, a content snippet, and a link to
 * the disk-backed surface when one exists.
 */
export const AgentAssetCard = (
  props: AgentAssetCardProps,
): React.ReactElement => {
  const { className, result } = props;

  // Hooks

  // Setup
  const listHref = AGENT_ASSET_LIST_HREF_BY_TYPE[result.promptType];
  const isDbSource = result.source === 'db';
  const sourceColor = isDbSource ? 'green' : 'slate';
  const sourceLabel = isDbSource ? 'indexed' : 'on disk';
  const hasSimilarity = result.similarity != null;
  const similarityPercent = Math.round((result.similarity ?? 0) * 100);
  const hasContent = result.content !== '';
  const hasFilePath = result.filePath != null;

  // Handlers
  const renderTitle = (): React.ReactElement => {
    if (listHref != null) {
      return (
        <Link
          className="underline-offset-4 hover:underline"
          data-testid="AgentAssetCard-link"
          to={listHref}
        >
          {result.title}
        </Link>
      );
    }
    return <h3 className={TITLE_CLASS}>{result.title}</h3>;
  };

  // Markup
  const similarityBlock = (
    <p
      className="text-muted-foreground text-xs"
      data-testid="AgentAssetCard-similarity"
    >
      Relevance: {similarityPercent}%
    </p>
  );
  const contentBlock = (
    <p className="text-muted-foreground text-sm leading-relaxed">
      {result.content}
    </p>
  );
  const filePathBlock = (
    <p
      className="text-muted-foreground font-mono text-xs"
      data-testid="AgentAssetCard-filePath"
    >
      {result.filePath}
    </p>
  );

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Card className={className} data-testid="AgentAssetCard" key={result.id}>
      <CardHeader className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge color="blue" data-testid="AgentAssetCard-typeBadge" size="xs">
            {AGENT_ASSET_PROMPT_TYPE_LABEL[result.promptType]}
          </Badge>
          <Badge
            color={sourceColor}
            data-testid="AgentAssetCard-sourceBadge"
            size="xs"
          >
            {sourceLabel}
          </Badge>
          {result.labels.map((label) => (
            <Badge color="slate" key={label} size="xs">
              {label}
            </Badge>
          ))}
        </div>
        <CardTitle className={TITLE_CLASS}>{renderTitle()}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-4">
        {hasContent ? contentBlock : null}
        {hasFilePath ? filePathBlock : null}
        {hasSimilarity ? similarityBlock : null}
      </CardContent>
    </Card>
  );
};
