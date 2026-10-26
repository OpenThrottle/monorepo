import {
  executeGraphqlWithAuth,
  isAuthError,
} from '@openthrottle/react-router-graphql';

import type { Route } from '@/app/routes/+types/blog.$postId';
import {
  SetBlogPostEditorTagsDocument,
  UpdateBlogPostEditorDocument,
} from '~/__generated__/graphql';
import { runBlogPostLifecycleAction } from '~/routing/blog/actions/lifecycle';
import { BLOG_POST_SAVE_INTENT } from '~/routing/blog/config/defaults';
import type { BlogPostActionResult } from '~/routing/blog/types';
import { isBlogPostLifecycleBody } from '~/routing/blog/utils/lifecycle-results';
import {
  parseBlogPostSaveRequest,
  toBlogPostTagsResult,
  toBlogPostUpdateResult,
} from '~/routing/blog/utils/save-results';

const INVALID_REQUEST = 'The save request was malformed. Reload and try again.';

/** Reads the JSON body; `null` when it is missing or not JSON. */
const readJsonBody = async (request: Request): Promise<unknown> => {
  try {
    return await request.json();
  } catch {
    return null;
  }
};

/**
 * @description Saves the editor's changes to one post. The body is the JSON
 * {@link import('~/routing/blog/types').BlogPostSaveRequest}:
 *
 * - `intent: 'save'` sends the loaded `updatedAt` as `expectedUpdatedAt`, so a
 *   concurrent edit returns `staleWrite` instead of being overwritten.
 * - `intent: 'overwrite'` resends the same changes without it.
 *
 * `updateBlogPost` always runs (an empty patch still performs the stale check),
 * then `setBlogPostTags` when the tag set changed. Every union error comes back
 * as a typed {@link import('~/routing/blog/types').BlogPostSaveResult}; nothing here throws for one. Auth
 * failures still throw, so the app's auth handling sees them.
 *
 * A body whose `intent` is `publish`, `unpublish` or `archive` is a lifecycle
 * action instead, handed to {@link runBlogPostLifecycleAction} (which demands
 * `blog:write`).
 */
export const runBlogPostEditorAction = async (
  args: Route.ActionArgs,
): Promise<BlogPostActionResult> => {
  const postId = args.params.postId;
  const rawBody = await readJsonBody(args.request);

  if (isBlogPostLifecycleBody(rawBody)) {
    return runBlogPostLifecycleAction(args.request, postId, rawBody);
  }

  const body = parseBlogPostSaveRequest(rawBody);

  if (body === null) {
    return { message: INVALID_REQUEST, outcome: 'error' };
  }

  const { changes, expectedUpdatedAt, intent, tagSlugs } = body;

  try {
    const { updateBlogPost } = await executeGraphqlWithAuth(
      args.request,
      UpdateBlogPostEditorDocument,
      {
        input: {
          ...changes,
          ...(intent === BLOG_POST_SAVE_INTENT.SAVE && { expectedUpdatedAt }),
          id: postId,
        },
      },
    );
    const updated = toBlogPostUpdateResult(updateBlogPost);

    if (updated.outcome !== 'saved' || tagSlugs === null) {
      return updated;
    }

    const { setBlogPostTags } = await executeGraphqlWithAuth(
      args.request,
      SetBlogPostEditorTagsDocument,
      { input: { postId, tagSlugs } },
    );

    return toBlogPostTagsResult(setBlogPostTags);
  } catch (error) {
    if (isAuthError(error) || !(error instanceof Error)) {
      throw error;
    }

    return { message: error.message, outcome: 'error' };
  }
};
