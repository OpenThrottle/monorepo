import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Separator,
} from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import type { SearchChunk } from '~/__generated__/graphql';
import { SearchWhyThisResult } from '~/routing/search/components/SearchWhyThisResult';
import type { SearchRankMeta } from '~/routing/search/types/search-rank-meta';
import { githubBlobHref } from '~/routing/search/utils/github-blob-href';

export interface SearchDocumentationCardProps {
  className?: string;
  defaultOpenWhy?: boolean;
  rankMeta?: SearchRankMeta;
  result: SearchChunk;
}

export const SearchDocumentationCard = (
  props: SearchDocumentationCardProps,
): React.ReactElement => {
  const { className, defaultOpenWhy, rankMeta, result } = props;
  const { similarity, sourcePath, sourceRepo, sourceSha } = result;

  // Hooks

  // Setup
  const hasBlobLink =
    sourceRepo != null &&
    sourceRepo !== '' &&
    sourcePath != null &&
    sourcePath !== '';
  const hasSimilarity = similarity != null;
  const similarityPercent = Math.round((similarity ?? 0) * 100);

  // Handlers
  const renderBlobLink = (): React.ReactNode => {
    if (!hasBlobLink || sourceRepo == null || sourcePath == null) {
      return null;
    }

    return (
      <a
        className="text-primary text-sm underline-offset-4 hover:underline"
        data-testid="SearchDocumentationCard-blobLink"
        href={githubBlobHref(sourceRepo, sourcePath, sourceSha)}
        rel="noopener noreferrer"
        target="_blank"
      >
        {sourceRepo}/{sourcePath}
      </a>
    );
  };

  // Markup
  const sourceBadge = (
    <Badge
      data-testid="SearchDocumentationCard-sourceBadge"
      variant="secondary"
    >
      {result.source}
    </Badge>
  );

  const similarityText = (
    <p
      className="text-muted-foreground text-xs"
      data-testid="SearchDocumentationCard-similarity"
    >
      Relevance: {similarityPercent}%
    </p>
  );
  const blobLink = renderBlobLink();
  const blobTitle = (
    <CardTitle className="text-lg leading-tight tracking-tight">
      {blobLink}
    </CardTitle>
  );

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Card
      className={className}
      data-testid="SearchDocumentationCard"
      key={result.id}
    >
      <CardHeader className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">{sourceBadge}</div>
        {blobLink != null ? blobTitle : null}
      </CardHeader>
      <Separator />
      <CardContent className="space-y-3 pt-4">
        <pre className="text-muted-foreground line-clamp-6 overflow-auto text-sm leading-relaxed">
          <p className="text-muted-foreground text-sm leading-relaxed">
            {result.content}
          </p>
        </pre>
        {hasSimilarity ? similarityText : null}
        <SearchWhyThisResult
          defaultOpen={defaultOpenWhy}
          rankMeta={rankMeta}
          result={result}
        />
      </CardContent>
    </Card>
  );
};
