import type { BlogPostSaveResult } from '~/routing/blog/types';

/**
 * @description The save failure that belongs to no field (a server error or a
 * lost post), or `null` for every other outcome.
 */
export const resolveSaveError = (
  result: BlogPostSaveResult | null,
): string | null => {
  if (result?.outcome === 'error' || result?.outcome === 'notFound') {
    return result.message;
  }

  return null;
};
