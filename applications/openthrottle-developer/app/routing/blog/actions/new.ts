import {
  executeGraphqlWithAuth,
  redirectOnAuthError,
} from '@openthrottle/react-router-graphql';

import type { CreateBlogPostOutcomeFragment } from '~/__generated__/graphql';
import { CreateBlogPostDraftDocument } from '~/__generated__/graphql';
import { BLOG_DRAFT_SLUG_ATTEMPTS } from '~/routing/blog/config/defaults';
import { BLOG_NEW_COPY } from '~/routing/blog/data/copy';
import type { BlogPostCreateResult } from '~/routing/blog/types';
import { generateBlogDraftSlug } from '~/routing/blog/utils/posts';

const createDraft = async (
  request: Request,
  slug: string,
): Promise<CreateBlogPostOutcomeFragment> => {
  const { createBlogPost } = await executeGraphqlWithAuth(
    request,
    CreateBlogPostDraftDocument,
    {
      input: {
        bodyMarkdown: '',
        slug,
        title: BLOG_NEW_COPY.untitledTitle,
      },
    },
  );

  return createBlogPost;
};

/** Tries one slug per attempt, sequentially, until one is free. */
const createWithFreshSlug = async (
  request: Request,
  attemptsLeft: number,
): Promise<CreateBlogPostOutcomeFragment> => {
  const result = await createDraft(
    request,
    generateBlogDraftSlug(Date.now(), Math.random),
  );

  if (result.__typename !== 'BlogSlugConflictError' || attemptsLeft <= 1) {
    return result;
  }

  return createWithFreshSlug(request, attemptsLeft - 1);
};

/**
 * @description Creates an empty DRAFT with the placeholder title and a generated
 * slug. A slug conflict retries once with a new slug before it is reported;
 * the other union branches cannot happen for this input but are still mapped
 * to a message instead of thrown.
 */
export const runBlogPostCreateAction = async (
  request: Request,
): Promise<BlogPostCreateResult> => {
  try {
    const result = await createWithFreshSlug(request, BLOG_DRAFT_SLUG_ATTEMPTS);

    switch (result.__typename) {
      case 'BlogPostAdminObject':
        return { error: null, postId: result.id };
      case 'BlogSlugConflictError':
        return { error: BLOG_NEW_COPY.slugConflict, postId: null };
      case 'BlogCoverAltRequiredError':
      case 'BlogReferenceNotFoundError':
        return { error: result.message, postId: null };
    }
  } catch (error) {
    redirectOnAuthError(error);

    if (!(error instanceof Error)) {
      throw error;
    }

    return { error: `${BLOG_NEW_COPY.failed} ${error.message}`, postId: null };
  }
};
