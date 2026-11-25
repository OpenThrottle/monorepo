import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
} from '@openthrottle/react-router-shadcn';
import { SearchXIcon, X } from 'lucide-react';
import * as React from 'react';

import { SEMANTIC_SEARCH_OFF_COPY } from '~/global/data/copy';
import { SEMANTIC_SEARCH_OFF_STORAGE_KEY } from '~/global/data/semantic-search-off';

export interface GlobalSemanticSearchOffNoticeProps {
  /** The search result's lexical-fallback `reason`, or null when the result is semantic. */
  readonly reason: string | null | undefined;
}

/**
 * @description Shown above search results that fell back to keyword matching because the server
 * has no embedding model (`reason: embedder_unconfigured`, OT plan 7803080c). Dismissible for the
 * browser session; it comes back in a new session while the model is still missing. Renders only
 * after mount, since the dismissal lives in sessionStorage.
 */
export const GlobalSemanticSearchOffNotice = (
  props: GlobalSemanticSearchOffNoticeProps,
): React.ReactElement | null => {
  const { reason } = props;

  // Hooks
  const [isDismissed, setIsDismissed] = React.useState<boolean | undefined>(
    undefined,
  );

  // Setup
  const isModelMissing = reason === 'embedder_unconfigured';

  // Handlers
  const handleDismiss = (): void => {
    window.sessionStorage.setItem(SEMANTIC_SEARCH_OFF_STORAGE_KEY, 'true');
    setIsDismissed(true);
  };

  // Markup

  // Life Cycle
  React.useEffect(() => {
    setIsDismissed(
      window.sessionStorage.getItem(SEMANTIC_SEARCH_OFF_STORAGE_KEY) === 'true',
    );
  }, []);

  // 🔌 Short Circuit
  if (!isModelMissing || isDismissed !== false) {
    return null;
  }

  return (
    <Alert className="pr-12" data-testid="GlobalSemanticSearchOffNotice">
      <SearchXIcon aria-hidden="true" />
      <AlertTitle>{SEMANTIC_SEARCH_OFF_COPY.title}</AlertTitle>
      <AlertDescription>
        <p>{SEMANTIC_SEARCH_OFF_COPY.description}</p>
        <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">
          {SEMANTIC_SEARCH_OFF_COPY.command}
        </code>
      </AlertDescription>
      <Button
        aria-label={SEMANTIC_SEARCH_OFF_COPY.dismissLabel}
        className="absolute top-2 right-2 size-8 p-0"
        onClick={handleDismiss}
        type="button"
        variant="ghost"
      >
        <X className="size-4" />
      </Button>
    </Alert>
  );
};
