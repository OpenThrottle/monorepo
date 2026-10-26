import {
  executeGraphqlWithAuth,
  isAuthError,
} from '@openthrottle/react-router-graphql';

import {
  ArchiveBlogPostEditorDocument,
  PublishBlogPostEditorDocument,
  UnpublishBlogPostEditorDocument,
} from '~/__generated__/graphql';
import { PERMISSIONS } from '~/global/config/permissions';
import { requirePermission } from '~/global/utils/utils.permissions.server';
import type {
  BlogPostLifecycleRequest,
  BlogPostLifecycleResult,
} from '~/routing/blog/types';
import {
  parseBlogPostLifecycleRequest,
  toBlogPostArchiveResult,
  toBlogPostPublishResult,
  toBlogPostUnpublishResult,
} from '~/routing/blog/utils/lifecycle-results';

const INVALID_REQUEST =
  'The request was malformed. Reload the page and try again.';

const runMutation = async (
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
 * @description Runs one lifecycle action (publish or schedule, unpublish,
 * archive) on a post. Demands `blog:write` before anything else: the route's
 * own gate only asks for `blog:draft`, and these actions publish.
 *
 * Union errors come back as a typed {@link BlogPostLifecycleResult}; nothing
 * here throws for one. Auth failures still throw, so the app's auth handling
 * sees them.
 */
export const runBlogPostLifecycleAction = async (
  request: Request,
  postId: string,
  rawBody: unknown,
): Promise<BlogPostLifecycleResult> => {
  await requirePermission(request, PERMISSIONS.BLOG_WRITE);

  const body = parseBlogPostLifecycleRequest(rawBody);

  if (body === null) {
    return { message: INVALID_REQUEST, outcome: 'lifecycleError' };
  }

  try {
    return await runMutation(request, postId, body);
  } catch (error) {
    if (isAuthError(error) || !(error instanceof Error)) {
      throw error;
    }

    return { message: error.message, outcome: 'lifecycleError' };
  }
};
