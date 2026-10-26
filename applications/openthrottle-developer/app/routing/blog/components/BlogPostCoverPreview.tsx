import { ImageOffIcon } from 'lucide-react';
import * as React from 'react';

import { BLOG_EDITOR_COPY } from '~/routing/blog/data/data.copy';

export interface BlogPostCoverPreviewProps {
  readonly alt: string;
  readonly url: string;
}

/**
 * @description Thumbnail of the cover image URL. When the image fails to load
 * it shows a warning instead; render it with `key={url}` so a new URL gets a
 * fresh attempt.
 */
export const BlogPostCoverPreview = (
  props: BlogPostCoverPreviewProps,
): React.ReactElement | null => {
  const { alt, url } = props;

  // Hooks
  const [failed, setFailed] = React.useState(false);

  // Setup

  // Handlers
  const handleError = (): void => setFailed(true);

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (url.trim() === '') {
    return null;
  }

  if (failed) {
    return (
      <p
        className="text-destructive flex items-center gap-2 text-xs"
        data-testid="BlogPostCoverPreview"
        role="alert"
      >
        <ImageOffIcon aria-hidden="true" className="size-4 shrink-0" />
        {BLOG_EDITOR_COPY.coverLoadFailed}
      </p>
    );
  }

  return (
    <img
      alt={alt || BLOG_EDITOR_COPY.coverPreviewAlt}
      className="border-border bg-muted aspect-video w-40 rounded-md border object-cover"
      data-testid="BlogPostCoverPreview"
      decoding="async"
      onError={handleError}
      src={url}
    />
  );
};
