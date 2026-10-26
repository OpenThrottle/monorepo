/**
 * @description Draft-only blog authoring tool handlers + schemas: list_blog_posts, get_blog_post, create_blog_post, update_blog_post, set_blog_post_tags, list_blog_tags, list_blog_authors. Wired up via the shared `developerMcpToolDefinitions` registry and the Nest surface.
 *
 * The boundary is deliberate: there is no publish / unpublish / archive / schedule tool and no tag or author upsert. Those need `blog:write` and stay with a human in the developer app. The server enforces the same line (a `blog:draft`-only caller editing a non-draft gets `BlogPostPublishPermissionRequiredError`), so this file never has to.
 *
 * Every write returns the server's typed result union as `structuredContent.result` (each member carries `__typename`) plus `structuredContent.editorUrl`, the developer-app link a human follows to review or publish.
 */

import { executeGraphqlWithAuth } from '@openthrottle/nodejs-graphql';
// zod/v3 to match the generated *InputSchema (src/__generated__/schemas.ts imports
// from zod/v3): `.extend` on a generated schema only keeps its type in the same major.
import { z } from 'zod/v3';

import {
  CreateBlogPostDocument,
  type CreateBlogPostMutation,
  GetBlogPostDocument,
  type GetBlogPostQuery,
  ListBlogAuthorsDocument,
  type ListBlogAuthorsQuery,
  ListBlogPostsDocument,
  type ListBlogPostsQuery,
  ListBlogTagsDocument,
  type ListBlogTagsQuery,
  SetBlogPostTagsDocument,
  type SetBlogPostTagsMutation,
  UpdateBlogPostDocument,
  type UpdateBlogPostInput,
  type UpdateBlogPostMutation,
} from '../__generated__/graphql.js';
import {
  BlogPostStateSchema,
  CreateBlogPostInputSchema,
  SetBlogPostTagsInputSchema,
  UpdateBlogPostInputSchema,
} from '../__generated__/schemas.ts';
import { getAuthToken } from '../auth/get-auth-token.ts';
import { getBlogPostEditorUrl } from '../config/developer-app-url.ts';
import type { GenericResult } from '../types/index.ts';
import { invalidArgsContent } from '../utils/errors.ts';
import { runTool } from '../utils/tool-result.ts';

const LIST_DEFAULT_FIRST = 10;
const LIST_MAX_FIRST = 50;

type BlogPostWriteOutcome =
  | CreateBlogPostMutation['createBlogPost']
  | SetBlogPostTagsMutation['setBlogPostTags']
  | UpdateBlogPostMutation['updateBlogPost'];

type CreateBlogPostResult = GenericResult<{
  editorUrl: string | null;
  result: CreateBlogPostMutation['createBlogPost'];
}>;

type GetBlogPostResult = GenericResult<{
  editorUrl: string | null;
  result: GetBlogPostQuery['blogAdminPost'];
}>;

type ListBlogAuthorsResult = GenericResult<{
  authors: ListBlogAuthorsQuery['blogAdminAuthors'];
}>;

type ListBlogPostsResult = GenericResult<{
  endCursor: string | null;
  hasNextPage: boolean;
  items: Array<
    ListBlogPostsQuery['blogAdminPosts']['items'][number] & {
      editorUrl: string;
    }
  >;
}>;

type ListBlogTagsResult = GenericResult<{
  tags: ListBlogTagsQuery['blogAdminTags'];
}>;

type SetBlogPostTagsResult = GenericResult<{
  editorUrl: string | null;
  result: SetBlogPostTagsMutation['setBlogPostTags'];
}>;

type UpdateBlogPostResult = GenericResult<{
  editorUrl: string | null;
  result: UpdateBlogPostMutation['updateBlogPost'];
}>;

// ── shared copy + helpers ────────────────────────────────────────────────────

const DRAFT_ONLY_BOUNDARY = `Draft-only: this MCP cannot publish, schedule, unpublish or archive a post, and cannot create or edit blog tags or authors; there is no tool for any of that. A human does those in the developer app at /blog. Editing a post that is not a DRAFT is refused with BlogPostPublishPermissionRequiredError.`;

const toIsoString = (value: unknown): string =>
  value instanceof Date ? value.toISOString() : String(value);

const withEditorLink = (text: string, editorUrl: string | null): string =>
  editorUrl === null ? text : `${text} Editor: ${editorUrl}`;

const describeMissingReference = (entity: string, key: string): string =>
  entity === 'AUTHOR'
    ? `unknown author slug "${key}". See list_blog_authors; a human creates authors in the developer app.`
    : `unknown tag slug "${key}". See list_blog_tags; a human creates tags in the developer app.`;

/**
 * The editor link for a write outcome: the saved post's own id, else the id the caller passed
 * (a stale or refused write still points at a real post), and nothing for an unknown post.
 */
const resolveEditorUrl = (
  outcome: BlogPostWriteOutcome,
  requestedPostId: string | null,
): string | null => {
  if (outcome.__typename === 'BlogPostAdminObject') {
    return getBlogPostEditorUrl(outcome.id);
  }

  if (outcome.__typename === 'BlogPostNotFoundError') {
    return null;
  }

  return requestedPostId === null
    ? null
    : getBlogPostEditorUrl(requestedPostId);
};

/** The one human-readable line for any write outcome; tells the agent what to do next. */
const describeWriteOutcome = (
  verb: string,
  outcome: BlogPostWriteOutcome,
  editorUrl: string | null,
): string => {
  switch (outcome.__typename) {
    case 'BlogCoverAltRequiredError':
      return `Nothing was written: ${outcome.message} Set coverImageAlt alongside coverImageUrl and retry.`;
    case 'BlogPostAdminObject':
      return withEditorLink(
        `${verb} blog post "${outcome.title}" (${outcome.id}, slug ${outcome.slug}), state ${outcome.state}, updatedAt ${toIsoString(outcome.updatedAt)}. A human publishes it from the developer app.`,
        editorUrl,
      );
    case 'BlogPostNotFoundError':
      return `Nothing was written: ${outcome.message} Check the post id with list_blog_posts.`;
    case 'BlogPostPublishPermissionRequiredError':
      return withEditorLink(
        `Nothing was written: the post is not a draft, so a human must edit it in the developer app (this MCP only edits drafts).`,
        editorUrl,
      );
    case 'BlogPostStaleWriteError':
      return withEditorLink(
        `Nothing was written: the post changed since you read it (its updatedAt is now ${toIsoString(outcome.currentUpdatedAt)}). Re-read with get_blog_post, then retry with the fresh updatedAt as expectedUpdatedAt.`,
        editorUrl,
      );
    case 'BlogReferenceNotFoundError':
      return `Nothing was written: ${describeMissingReference(outcome.entity, outcome.key)}`;
    case 'BlogSlugConflictError':
      return `Nothing was written: the slug "${outcome.slug}" is already taken. Choose a different slug.`;
  }
};

const toWriteResult = <TOutcome extends BlogPostWriteOutcome>(
  verb: string,
  outcome: TOutcome,
  requestedPostId: string | null,
): {
  structuredContent: { editorUrl: string | null; result: TOutcome };
  text: string;
} => {
  const editorUrl = resolveEditorUrl(outcome, requestedPostId);

  return {
    structuredContent: { editorUrl, result: outcome },
    text: describeWriteOutcome(verb, outcome, editorUrl),
  };
};

// ── list_blog_posts ──────────────────────────────────────────────────────────

export const listBlogPostsToolParameters = z
  .object({
    after: z
      .string()
      .min(1)
      .optional()
      .describe("Cursor from a previous page's endCursor."),
    first: z
      .number()
      .int()
      .min(1)
      .max(LIST_MAX_FIRST)
      .optional()
      .describe(
        `Page size, 1-${LIST_MAX_FIRST} (default ${LIST_DEFAULT_FIRST}).`,
      ),
    search: z
      .string()
      .min(1)
      .optional()
      .describe('Case-insensitive match on title or slug.'),
    state: z
      .array(BlogPostStateSchema)
      .min(1)
      .optional()
      .describe('Only these states: DRAFT, SCHEDULED, LIVE, ARCHIVED.'),
  })
  .strict();

export const listBlogPostsToolDescription = `List blog posts in any state, most recently edited first, with cursor pagination (pass endCursor as after). Optional state filter and title/slug search. Summaries only (no body): use get_blog_post for the full post. Each item carries its developer-app editorUrl. ${DRAFT_ONLY_BOUNDARY}`;

export async function listBlogPostsToolHandler(
  args: z.infer<typeof listBlogPostsToolParameters>,
): Promise<ListBlogPostsResult> {
  const parsed = listBlogPostsToolParameters.safeParse(args);
  if (!parsed.success) {
    return invalidArgsContent(parsed.error);
  }

  return runTool<{
    endCursor: string | null;
    hasNextPage: boolean;
    items: Array<
      ListBlogPostsQuery['blogAdminPosts']['items'][number] & {
        editorUrl: string;
      }
    >;
  }>('list_blog_posts', async () => {
    const token = getAuthToken();
    const result = await executeGraphqlWithAuth(token, ListBlogPostsDocument, {
      after: parsed.data.after ?? null,
      first: parsed.data.first ?? LIST_DEFAULT_FIRST,
      search: parsed.data.search ?? null,
      state: parsed.data.state ?? null,
    });

    const page = result?.blogAdminPosts;
    if (!page) return null;

    const items = page.items.map((item) => ({
      ...item,
      editorUrl: getBlogPostEditorUrl(item.id),
    }));
    const lines = items.map(
      (item) =>
        `- [${item.state}] ${item.title} (${item.id}, slug ${item.slug}), updatedAt ${toIsoString(item.updatedAt)}`,
    );
    const text =
      items.length === 0
        ? 'No blog posts matched.'
        : `Blog posts (${items.length}${page.hasNextPage ? ', more available: pass endCursor as after' : ''}):\n${lines.join('\n')}`;

    return {
      structuredContent: {
        endCursor: page.endCursor ?? null,
        hasNextPage: page.hasNextPage,
        items,
      },
      text,
    };
  });
}

// ── get_blog_post ────────────────────────────────────────────────────────────

export const getBlogPostToolParameters = z
  .object({
    id: z.string().min(1).optional().describe('The post id (UUID).'),
    slug: z.string().min(1).optional().describe('The post slug.'),
  })
  .strict()
  .refine((data) => (data.id === undefined) !== (data.slug === undefined), {
    message: 'Provide exactly one of id or slug',
  });

export const getBlogPostToolDescription = `Fetch one blog post in any state by id or by slug (exactly one of the two), including its markdown body, tags, author and updatedAt. Read it before update_blog_post: send its updatedAt back as expectedUpdatedAt. Returns the BlogPostAdminObject or BlogPostNotFoundError (see __typename) plus the developer-app editorUrl. ${DRAFT_ONLY_BOUNDARY}`;

export async function getBlogPostToolHandler(
  args: z.infer<typeof getBlogPostToolParameters>,
): Promise<GetBlogPostResult> {
  const parsed = getBlogPostToolParameters.safeParse(args);
  if (!parsed.success) {
    return invalidArgsContent(parsed.error);
  }

  return runTool<{
    editorUrl: string | null;
    result: GetBlogPostQuery['blogAdminPost'];
  }>('get_blog_post', async () => {
    const token = getAuthToken();
    const result = await executeGraphqlWithAuth(token, GetBlogPostDocument, {
      id: parsed.data.id ?? null,
      slug: parsed.data.slug ?? null,
    });

    const post = result?.blogAdminPost;
    if (!post) return null;

    if (post.__typename === 'BlogPostNotFoundError') {
      return {
        structuredContent: { editorUrl: null, result: post },
        text: `${post.message} Use list_blog_posts to find the post.`,
      };
    }

    const editorUrl = getBlogPostEditorUrl(post.id);
    return {
      structuredContent: { editorUrl, result: post },
      text: withEditorLink(
        `Blog post "${post.title}" (${post.id}, slug ${post.slug}), state ${post.state}, updatedAt ${toIsoString(post.updatedAt)}.\n${JSON.stringify(post, null, 2)}\n`,
        editorUrl,
      ),
    };
  });
}

// ── create_blog_post ─────────────────────────────────────────────────────────

export const createBlogPostToolParameters =
  CreateBlogPostInputSchema().strict();

export const createBlogPostToolDescription = `Create a blog post as a DRAFT. Requires slug (lowercase letters, digits, single hyphens), title and bodyMarkdown; optional excerpt, seoTitle, seoDescription, coverImageUrl (needs coverImageAlt) and authorSlug (an existing author: see list_blog_authors). Returns the new post or a typed error (BlogSlugConflictError, BlogCoverAltRequiredError, BlogReferenceNotFoundError) plus the developer-app editorUrl a human opens to review and publish. ${DRAFT_ONLY_BOUNDARY}`;

export async function createBlogPostToolHandler(
  args: z.infer<typeof createBlogPostToolParameters>,
): Promise<CreateBlogPostResult> {
  const parsed = createBlogPostToolParameters.safeParse(args);
  if (!parsed.success) {
    return invalidArgsContent(parsed.error);
  }

  return runTool<{
    editorUrl: string | null;
    result: CreateBlogPostMutation['createBlogPost'];
  }>('create_blog_post', async () => {
    const token = getAuthToken();
    const result = await executeGraphqlWithAuth(token, CreateBlogPostDocument, {
      input: parsed.data,
    });

    const outcome = result?.createBlogPost;
    if (!outcome) return null;

    return toWriteResult('Created', outcome, null);
  });
}

// ── update_blog_post ─────────────────────────────────────────────────────────

/**
 * `expectedUpdatedAt` is optional in GraphQL (omitting it skips the check) but required here: an
 * agent that never read the post must not be able to overwrite a human's concurrent edit.
 */
export const updateBlogPostToolParameters = UpdateBlogPostInputSchema()
  .extend({
    expectedUpdatedAt: z
      .string()
      .datetime({ offset: true })
      .describe(
        "The post's updatedAt exactly as get_blog_post returned it (ISO 8601). If the post changed since, nothing is written and BlogPostStaleWriteError is returned.",
      ),
  })
  .strict();

export const updateBlogPostToolDescription = `Partially update a DRAFT blog post by id: send only the fields to change (title, slug, bodyMarkdown, excerpt, seoTitle, seoDescription, coverImageUrl/coverImageAlt, authorSlug; null clears a nullable field). expectedUpdatedAt is REQUIRED: pass the updatedAt from your latest get_blog_post. On BlogPostStaleWriteError nothing was written: re-read with get_blog_post, then retry. Returns the updated post or a typed error plus the developer-app editorUrl. ${DRAFT_ONLY_BOUNDARY}`;

export async function updateBlogPostToolHandler(
  args: z.infer<typeof updateBlogPostToolParameters>,
): Promise<UpdateBlogPostResult> {
  const parsed = updateBlogPostToolParameters.safeParse(args);
  if (!parsed.success) {
    return invalidArgsContent(parsed.error);
  }

  const input: UpdateBlogPostInput = parsed.data;

  return runTool<{
    editorUrl: string | null;
    result: UpdateBlogPostMutation['updateBlogPost'];
  }>('update_blog_post', async () => {
    const token = getAuthToken();
    const result = await executeGraphqlWithAuth(token, UpdateBlogPostDocument, {
      input,
    });

    const outcome = result?.updateBlogPost;
    if (!outcome) return null;

    return toWriteResult('Updated', outcome, input.id);
  });
}

// ── set_blog_post_tags ───────────────────────────────────────────────────────

export const setBlogPostTagsToolParameters =
  SetBlogPostTagsInputSchema().strict();

export const setBlogPostTagsToolDescription = `Replace the full tag set of a DRAFT blog post by tag slug (postId + tagSlugs; an empty list removes every tag). Tags must already exist: see list_blog_tags; this MCP cannot create tags. Returns the post or a typed error (BlogReferenceNotFoundError for an unknown tag slug) plus the developer-app editorUrl. ${DRAFT_ONLY_BOUNDARY}`;

export async function setBlogPostTagsToolHandler(
  args: z.infer<typeof setBlogPostTagsToolParameters>,
): Promise<SetBlogPostTagsResult> {
  const parsed = setBlogPostTagsToolParameters.safeParse(args);
  if (!parsed.success) {
    return invalidArgsContent(parsed.error);
  }

  return runTool<{
    editorUrl: string | null;
    result: SetBlogPostTagsMutation['setBlogPostTags'];
  }>('set_blog_post_tags', async () => {
    const token = getAuthToken();
    const result = await executeGraphqlWithAuth(
      token,
      SetBlogPostTagsDocument,
      { input: parsed.data },
    );

    const outcome = result?.setBlogPostTags;
    if (!outcome) return null;

    return toWriteResult('Tagged', outcome, parsed.data.postId);
  });
}

// ── list_blog_tags ───────────────────────────────────────────────────────────

export const listBlogTagsToolParameters = z.object({}).strict();

export const listBlogTagsToolDescription = `List every blog tag (slug, name, description), including tags no live post carries yet. Use the slugs with set_blog_post_tags. ${DRAFT_ONLY_BOUNDARY}`;

export async function listBlogTagsToolHandler(
  _args: z.infer<typeof listBlogTagsToolParameters>,
): Promise<ListBlogTagsResult> {
  return runTool<{ tags: ListBlogTagsQuery['blogAdminTags'] }>(
    'list_blog_tags',
    async () => {
      const token = getAuthToken();
      const result = await executeGraphqlWithAuth(
        token,
        ListBlogTagsDocument,
        {},
      );

      const tags = result?.blogAdminTags;
      if (!tags) return null;

      const text =
        tags.length === 0
          ? 'No blog tags exist yet. A human creates tags in the developer app.'
          : `Blog tags (${tags.length}): ${tags.map((tag) => tag.slug).join(', ')}`;

      return { structuredContent: { tags }, text };
    },
  );
}

// ── list_blog_authors ────────────────────────────────────────────────────────

export const listBlogAuthorsToolParameters = z.object({}).strict();

export const listBlogAuthorsToolDescription = `List every blog author (slug, displayName, bio, avatarUrl). Use the slugs as authorSlug in create_blog_post / update_blog_post. ${DRAFT_ONLY_BOUNDARY}`;

export async function listBlogAuthorsToolHandler(
  _args: z.infer<typeof listBlogAuthorsToolParameters>,
): Promise<ListBlogAuthorsResult> {
  return runTool<{ authors: ListBlogAuthorsQuery['blogAdminAuthors'] }>(
    'list_blog_authors',
    async () => {
      const token = getAuthToken();
      const result = await executeGraphqlWithAuth(
        token,
        ListBlogAuthorsDocument,
        {},
      );

      const authors = result?.blogAdminAuthors;
      if (!authors) return null;

      const text =
        authors.length === 0
          ? 'No blog authors exist yet. A human creates authors in the developer app.'
          : `Blog authors (${authors.length}): ${authors
              .map((author) => `${author.slug} (${author.displayName})`)
              .join(', ')}`;

      return { structuredContent: { authors }, text };
    },
  );
}
