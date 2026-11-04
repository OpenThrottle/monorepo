import {
  executeGraphqlWithAuth,
  isAuthError,
} from '@openthrottle/react-router-graphql';

import type { Route } from '@/app/routes/+types/blog.$postId';
import {
  ArchiveBlogPostEditorDocument,
  PublishBlogPostEditorDocument,
  SetBlogPostEditorTagsDocument,
  UnpublishBlogPostEditorDocument,
  UpdateBlogPostEditorDocument,
} from '~/__generated__/graphql';
import { PERMISSIONS } from '~/global/config/permissions';
import { requirePermission } from '~/global/utils/utils.permissions.server';
import { BLOG_POST_SAVE_INTENT } from '~/routing/blog/config/defaults';
import {
  BLOG_EDITOR_COPY,
  BLOG_LIFECYCLE_COPY,
} from '~/routing/blog/data/data.copy';
import type {
  BlogPostActionResult,
  BlogPostLifecycleRequest,
  BlogPostLifecycleResult,
  BlogPostSaveResult,
} from '~/routing/blog/types';
import {
  parseBlogPostSaveRequest,
  toBlogPostTagsResult,
  toBlogPostUpdateResult,
} from '~/routing/blog/utils/editor';
import {
  isBlogPostLifecycleBody,
  parseBlogPostLifecycleRequest,
  toBlogPostArchiveResult,
  toBlogPostPublishResult,
  toBlogPostUnpublishResult,
} from '~/routing/blog/utils/lifecycle';

/** Reads the JSON body; `null` when it is missing or not JSON. */
const readJsonBody = async (request: Request): Promise<unknown> => {
  try {
    return await request.json();
  } catch {
    return null;
  }
};

const runLifecycleMutation = async (
  request: Request,
  postId: string,
  body: BlogPostLifecycleRequest,
): Promise<BlogPostLifecycleResult> => {
  switch (body.intent) {
    case 'archive': {
      const { archiveBlogPost } = await executeGraphqlWithAuth(
        request,
        ArchiveBlogPostEditorDocument,
        { id: postId },
      );

      return toBlogPostArchiveResult(archiveBlogPost);
    }
    case 'publish': {
      const { publishBlogPost } = await executeGraphqlWithAuth(
        request,
        PublishBlogPostEditorDocument,
        { input: { id: postId, publishedAt: body.publishedAt } },
      );

      return toBlogPostPublishResult(publishBlogPost);
    }
    case 'unpublish': {
      const { unpublishBlogPost } = await executeGraphqlWithAuth(
        request,
        UnpublishBlogPostEditorDocument,
        { id: postId },
      );

      return toBlogPostUnpublishResult(unpublishBlogPost);
    }
  }
};

/**
 * Runs one lifecycle action (publish or schedule, unpublish, archive). Demands
 * `blog:write` before anything else: the route's own gate only asks for
 * `blog:draft`, and these actions publish.
 */
const runLifecycleAction = async (
  request: Request,
  postId: string,
  rawBody: unknown,
): Promise<BlogPostLifecycleResult> => {
  await requirePermission(request, PERMISSIONS.BLOG_WRITE);

  const body = parseBlogPostLifecycleRequest(rawBody);

  if (body === null) {
    return {
      message: BLOG_LIFECYCLE_COPY.errors.invalidRequest,
      outcome: 'lifecycleError',
    };
  }

  try {
    return await runLifecycleMutation(request, postId, body);
  } catch (error) {
    if (isAuthError(error) || !(error instanceof Error)) {
      throw error;
    }

    return { message: error.message, outcome: 'lifecycleError' };
  }
};

/**
 * Saves the editor's changes. `updateBlogPost` always runs (an empty patch
 * still performs the stale check), then `setBlogPostTags` when the tag set
 * changed.
 */
const runSaveAction = async (
  request: Request,
  postId: string,
  rawBody: unknown,
): Promise<BlogPostSaveResult> => {
  const body = parseBlogPostSaveRequest(rawBody);

  if (body === null) {
    return { message: BLOG_EDITOR_COPY.invalidRequest, outcome: 'error' };
  }

  const { changes, expectedUpdatedAt, intent, tagSlugs } = body;

  try {
    const { updateBlogPost } = await executeGraphqlWithAuth(
      request,
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
      request,
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

/**
 * @description The editor route's action. The JSON body is either a save or a
 * lifecycle action:
 *
 * - `intent: 'save'` sends the loaded `updatedAt` as `expectedUpdatedAt`, so a
 *   concurrent edit returns `staleWrite` instead of being overwritten.
 * - `intent: 'overwrite'` resends the same changes without it.
 * - `intent: 'publish' | 'unpublish' | 'archive'` runs a lifecycle action,
 *   which demands `blog:write` first.
 *
 * Every union error comes back as a typed
 * {@link import('~/routing/blog/types').BlogPostActionResult}; nothing here
 * throws for one. Auth failures still throw, so the app's auth handling sees
 * them.
 */
export const runBlogPostEditorAction = async (
  args: Route.ActionArgs,
): Promise<BlogPostActionResult> => {
  const postId = args.params.postId;
  const rawBody = await readJsonBody(args.request);

  return isBlogPostLifecycleBody(rawBody)
    ? runLifecycleAction(args.request, postId, rawBody)
    : runSaveAction(args.request, postId, rawBody);
};
