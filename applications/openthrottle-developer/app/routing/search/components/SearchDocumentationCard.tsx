import * as React from 'react';
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Separator,
} from '@openthrottle/react-router-shadcn';
import type { SearchChunk } from '~/__generated__/graphql';
import { SearchWhyThisResult } from '~/routing/search/components/SearchWhyThisResult';
import type { SearchRankMeta } from '~/routing/search/types/search-rank-meta';
import { githubBlobHref } from '~/routing/search/utils/github-blob-href';

interface SearchDocumentationCardProps {
  className?: string;
  readonly defaultOpenWhy?: boolean;
  readonly rankMeta?: SearchRankMeta;
  result: SearchChunk;
}

export const SearchDocumentationCard = (
  props: SearchDocumentationCardProps,
) => {
  const { className, defaultOpenWhy, rankMeta, result } = props;

  // Hooks

  // Setup
  const hasBlobLink =
    result.sourceRepo != null &&
    result.sourceRepo !== '' &&
    result.sourcePath != null &&
    result.sourcePath !== '';

  // Handlers

  // Markup
  const sourceBadge = (
    <Badge
      data-testid="SearchDocumentationCard-sourceBadge"
      variant="secondary"
    >
      {result.source}
    </Badge>
  );

  const similarityBlock =
    result.similarity != null ? (
      <p
        className="text-xs text-muted-foreground"
        data-testid="SearchDocumentationCard-similarity"
      >
        Relevance: {Math.round(result.similarity * 100)}%
      </p>
    ) : null;

  const blobLink =
    hasBlobLink && result.sourceRepo != null && result.sourcePath != null ? (
      <a
        className="text-sm text-primary underline-offset-4 hover:underline"
        data-testid="SearchDocumentationCard-blobLink"
        href={githubBlobHref(
          result.sourceRepo,
          result.sourcePath,
          result.sourceSha,
        )}
        rel="noopener noreferrer"
        target="_blank"
      >
        {result.sourceRepo}/{result.sourcePath}
      </a>
    ) : null;

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
        {blobLink != null ? (
          <CardTitle className="text-lg leading-tight tracking-tight">
            {blobLink}
          </CardTitle>
        ) : null}
      </CardHeader>
      <Separator />
      <CardContent className="space-y-3 pt-4">
        <pre className="text-sm text-muted-foreground leading-relaxed overflow-auto line-clamp-6">
          <p className="text-sm text-muted-foreground leading-relaxed">
            {result.content}
          </p>
        </pre>
        {similarityBlock}
        <SearchWhyThisResult
          defaultOpen={defaultOpenWhy}
          rankMeta={rankMeta}
          result={result}
        />
      </CardContent>
    </Card>
  );
};
