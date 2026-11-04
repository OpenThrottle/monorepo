/**
 * @description Handler tests for the draft-only blog MCP tools with mocked GraphQL: argument validation, the typed result unions (structured `__typename` + one human line), the developer-app editor link on every write, and the absence of any publish tool.
 */

import { executeGraphqlWithAuth } from '@openthrottle/nodejs-graphql';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { developerMcpToolDefinitions } from '../tool-registry.ts';
import {
  createBlogPostToolHandler,
  getBlogPostToolHandler,
  getBlogPostToolParameters,
  listBlogAuthorsToolHandler,
  listBlogPostsToolHandler,
  listBlogTagsToolHandler,
  setBlogPostTagsToolHandler,
  updateBlogPostToolHandler,
  updateBlogPostToolParameters,
} from './blog.ts';

vi.mock('@openthrottle/nodejs-graphql', () => ({
  executeGraphqlWithAuth: vi.fn(),
}));

const postId = '5e0c3a0e-6a4e-4a4b-9a55-0d9f4a0f6b11';
const editorUrl = `http://localhost:6020/blog/${postId}`;
const serviceAccountToken = 'ot_sa_test_token';
const updatedAt = new Date('2026-10-26T08:00:00.000Z');

const draftPost = {
  __typename: 'BlogPostAdminObject',
  bodyMarkdown: 'Hello',
  id: postId,
  slug: 'hello',
  state: 'DRAFT',
  status: 'DRAFT',
  title: 'Hello',
  updatedAt,
};

const firstText = (result: { content: { text: string }[] }): string =>
  result.content[0]?.text ?? '';

beforeEach(() => {
  vi.mocked(executeGraphqlWithAuth).mockReset();
  process.env.OPENTHROTTLE_MCP_AUTH_TOKEN = serviceAccountToken;
  delete process.env.OPENTHROTTLE_DEVELOPER_URL;
  delete process.env.APP_URL_DEVELOPER;
});

afterEach(() => {
  delete process.env.OPENTHROTTLE_MCP_AUTH_TOKEN;
  delete process.env.OPENTHROTTLE_DEVELOPER_URL;
});

describe('blog tool registry surface', () => {
  const names = developerMcpToolDefinitions.map((tool) => tool.name);

  it('registers exactly the seven draft-only tools', () => {
    expect(names.filter((name) => name.includes('blog')).sort()).toEqual([
      'create_blog_post',
      'get_blog_post',
      'list_blog_authors',
      'list_blog_posts',
      'list_blog_tags',
      'set_blog_post_tags',
      'update_blog_post',
    ]);
  });

  it('exposes no publish, unpublish, archive or upsert tool', () => {
    expect(
      names.filter((name) =>
        /(publish|archive|schedule|upsert).*blog|blog.*(publish|archive|schedule|upsert)/.test(
          name,
        ),
      ),
    ).toEqual([]);
  });

  it('states the draft-only boundary in every blog tool description', () => {
    for (const tool of developerMcpToolDefinitions) {
      if (!tool.name.includes('blog')) continue;
      expect(tool.description, tool.name).toMatch(/Draft-only/);
      expect(tool.description, tool.name).toMatch(/developer app/);
    }
  });
});

describe('update_blog_post parameters', () => {
  it('requires expectedUpdatedAt', () => {
    const parsed = updateBlogPostToolParameters.safeParse({
      id: postId,
      title: 'New',
    });

    expect(parsed.success).toBe(false);
  });

  it('rejects a non-ISO expectedUpdatedAt', () => {
    const parsed = updateBlogPostToolParameters.safeParse({
      expectedUpdatedAt: 'yesterday',
      id: postId,
    });

    expect(parsed.success).toBe(false);
  });

  it('accepts an ISO expectedUpdatedAt', () => {
    const parsed = updateBlogPostToolParameters.safeParse({
      expectedUpdatedAt: '2026-10-26T08:00:00.000Z',
      id: postId,
    });

    expect(parsed.success).toBe(true);
  });
});

describe('get_blog_post parameters', () => {
  it.each([
    ['neither id nor slug', {}],
    ['both id and slug', { id: postId, slug: 'hello' }],
  ])('rejects %s', (_label, input) => {
    expect(getBlogPostToolParameters.safeParse(input).success).toBe(false);
  });

  it.each([
    ['an id', { id: postId }],
    ['a slug', { slug: 'hello' }],
  ])('accepts %s', (_label, input) => {
    expect(getBlogPostToolParameters.safeParse(input).success).toBe(true);
  });
});

describe('updateBlogPostToolHandler', () => {
  const validArgs = {
    expectedUpdatedAt: '2026-10-26T08:00:00.000Z',
    id: postId,
    title: 'Renamed',
  };

  describe('when args omit expectedUpdatedAt', () => {
    it('returns an invalid-args error without calling GraphQL', async () => {
      const result = await updateBlogPostToolHandler(
        JSON.parse(`{"id":"${postId}","title":"Renamed"}`),
      );

      expect(result).toMatchObject({ isError: true });
      expect(firstText(result)).toMatch(/Invalid arguments/);
      expect(executeGraphqlWithAuth).not.toHaveBeenCalled();
    });
  });

  describe('when the update succeeds', () => {
    it('returns the post with its editor URL and sends expectedUpdatedAt through', async () => {
      vi.mocked(executeGraphqlWithAuth).mockResolvedValue({
        updateBlogPost: draftPost,
      });

      const result = await updateBlogPostToolHandler(validArgs);

      expect(result).toMatchObject({
        structuredContent: {
          editorUrl,
          result: { __typename: 'BlogPostAdminObject', id: postId },
        },
      });
      expect(firstText(result)).toContain(editorUrl);
      expect(firstText(result)).toContain('2026-10-26T08:00:00.000Z');
      expect(executeGraphqlWithAuth).toHaveBeenCalledWith(
        serviceAccountToken,
        expect.anything(),
        { input: validArgs },
      );
    });

    it('uses OPENTHROTTLE_DEVELOPER_URL for the editor link', async () => {
      process.env.OPENTHROTTLE_DEVELOPER_URL = 'https://dev.example.com/';
      vi.mocked(executeGraphqlWithAuth).mockResolvedValue({
        updateBlogPost: draftPost,
      });

      const result = await updateBlogPostToolHandler(validArgs);

      expect(result).toMatchObject({
        structuredContent: {
          editorUrl: `https://dev.example.com/blog/${postId}`,
        },
      });
    });
  });

  describe('when the post is stale', () => {
    it('keeps __typename, tells the agent to re-read, and still links the editor', async () => {
      vi.mocked(executeGraphqlWithAuth).mockResolvedValue({
        updateBlogPost: {
          __typename: 'BlogPostStaleWriteError',
          currentUpdatedAt: updatedAt,
          message: 'changed',
        },
      });

      const result = await updateBlogPostToolHandler(validArgs);

      expect(result).toMatchObject({
        structuredContent: {
          editorUrl,
          result: { __typename: 'BlogPostStaleWriteError' },
        },
      });
      expect(firstText(result)).toMatch(/re-read with get_blog_post/i);
      expect(firstText(result)).toMatch(/retry/i);
      expect(firstText(result)).toContain('2026-10-26T08:00:00.000Z');
    });
  });

  describe('when the post is not a draft', () => {
    it('says a human must edit it in the developer app', async () => {
      vi.mocked(executeGraphqlWithAuth).mockResolvedValue({
        updateBlogPost: {
          __typename: 'BlogPostPublishPermissionRequiredError',
          message: 'nope',
        },
      });

      const result = await updateBlogPostToolHandler(validArgs);

      expect(result).toMatchObject({
        structuredContent: {
          editorUrl,
          result: { __typename: 'BlogPostPublishPermissionRequiredError' },
        },
      });
      expect(firstText(result)).toMatch(/not a draft/);
      expect(firstText(result)).toMatch(
        /human must edit it in the developer app/,
      );
    });
  });

  describe('when the post does not exist', () => {
    it('omits the editor URL', async () => {
      vi.mocked(executeGraphqlWithAuth).mockResolvedValue({
        updateBlogPost: {
          __typename: 'BlogPostNotFoundError',
          message: 'Blog post not found',
        },
      });

      const result = await updateBlogPostToolHandler(validArgs);

      expect(result).toMatchObject({
        structuredContent: {
          editorUrl: null,
          result: { __typename: 'BlogPostNotFoundError' },
        },
      });
    });
  });
});

describe('createBlogPostToolHandler', () => {
  const args = { bodyMarkdown: 'Hello', slug: 'hello', title: 'Hello' };

  describe('when the draft is created', () => {
    it('returns the post, its editor URL and a note that a human publishes', async () => {
      vi.mocked(executeGraphqlWithAuth).mockResolvedValue({
        createBlogPost: draftPost,
      });

      const result = await createBlogPostToolHandler(args);

      expect(result).toMatchObject({
        structuredContent: { editorUrl, result: { id: postId } },
      });
      expect(firstText(result)).toContain(editorUrl);
      expect(firstText(result)).toMatch(/human publishes/);
      expect(executeGraphqlWithAuth).toHaveBeenCalledWith(
        serviceAccountToken,
        expect.anything(),
        { input: args },
      );
    });
  });

  describe('when the slug is taken', () => {
    it('returns the typed conflict with no editor URL', async () => {
      vi.mocked(executeGraphqlWithAuth).mockResolvedValue({
        createBlogPost: {
          __typename: 'BlogSlugConflictError',
          message: 'taken',
          slug: 'hello',
        },
      });

      const result = await createBlogPostToolHandler(args);

      expect(result).toMatchObject({
        structuredContent: {
          editorUrl: null,
          result: { __typename: 'BlogSlugConflictError', slug: 'hello' },
        },
      });
      expect(firstText(result)).toMatch(/"hello" is already taken/);
    });
  });

  describe('when the author slug is unknown', () => {
    it('points the agent at list_blog_authors', async () => {
      vi.mocked(executeGraphqlWithAuth).mockResolvedValue({
        createBlogPost: {
          __typename: 'BlogReferenceNotFoundError',
          entity: 'AUTHOR',
          key: 'ghost',
          message: 'no such author',
        },
      });

      const result = await createBlogPostToolHandler({
        ...args,
        authorSlug: 'ghost',
      });

      expect(firstText(result)).toMatch(/list_blog_authors/);
      expect(firstText(result)).toMatch(/unknown author slug "ghost"/);
    });
  });

  describe('when args are invalid', () => {
    it('rejects an empty title without calling GraphQL', async () => {
      const result = await createBlogPostToolHandler({ ...args, title: '' });

      expect(result).toMatchObject({ isError: true });
      expect(executeGraphqlWithAuth).not.toHaveBeenCalled();
    });
  });
});

describe('setBlogPostTagsToolHandler', () => {
  describe('when the tags are set', () => {
    it('returns the post and its editor URL', async () => {
      vi.mocked(executeGraphqlWithAuth).mockResolvedValue({
        setBlogPostTags: draftPost,
      });

      const result = await setBlogPostTagsToolHandler({
        postId,
        tagSlugs: ['news'],
      });

      expect(result).toMatchObject({
        structuredContent: { editorUrl, result: { id: postId } },
      });
      expect(executeGraphqlWithAuth).toHaveBeenCalledWith(
        serviceAccountToken,
        expect.anything(),
        { input: { postId, tagSlugs: ['news'] } },
      );
    });
  });

  describe('when the post is not a draft', () => {
    it('links the editor from the requested post id', async () => {
      vi.mocked(executeGraphqlWithAuth).mockResolvedValue({
        setBlogPostTags: {
          __typename: 'BlogPostPublishPermissionRequiredError',
          message: 'nope',
        },
      });

      const result = await setBlogPostTagsToolHandler({
        postId,
        tagSlugs: [],
      });

      expect(result).toMatchObject({ structuredContent: { editorUrl } });
      expect(firstText(result)).toMatch(/not a draft/);
    });
  });
});

describe('getBlogPostToolHandler', () => {
  it('passes a slug lookup through with a null id', async () => {
    vi.mocked(executeGraphqlWithAuth).mockResolvedValue({
      blogAdminPost: draftPost,
    });

    const result = await getBlogPostToolHandler({ slug: 'hello' });

    expect(result).toMatchObject({
      structuredContent: { editorUrl, result: { slug: 'hello' } },
    });
    expect(executeGraphqlWithAuth).toHaveBeenCalledWith(
      serviceAccountToken,
      expect.anything(),
      { id: null, slug: 'hello' },
    );
  });

  it('returns BlogPostNotFoundError without an editor URL', async () => {
    vi.mocked(executeGraphqlWithAuth).mockResolvedValue({
      blogAdminPost: {
        __typename: 'BlogPostNotFoundError',
        message: 'Blog post not found',
      },
    });

    const result = await getBlogPostToolHandler({ id: postId });

    expect(result).toMatchObject({
      structuredContent: {
        editorUrl: null,
        result: { __typename: 'BlogPostNotFoundError' },
      },
    });
  });

  it('rejects both id and slug without calling GraphQL', async () => {
    const result = await getBlogPostToolHandler({ id: postId, slug: 'hello' });

    expect(result).toMatchObject({ isError: true });
    expect(executeGraphqlWithAuth).not.toHaveBeenCalled();
  });
});

describe('listBlogPostsToolHandler', () => {
  it('defaults the page size, forwards filters and adds an editor URL per item', async () => {
    vi.mocked(executeGraphqlWithAuth).mockResolvedValue({
      blogAdminPosts: {
        endCursor: 'c1',
        hasNextPage: true,
        items: [{ ...draftPost, bodyMarkdown: undefined }],
      },
    });

    const result = await listBlogPostsToolHandler({
      search: 'hel',
      state: ['DRAFT'],
    });

    expect(result).toMatchObject({
      structuredContent: {
        endCursor: 'c1',
        hasNextPage: true,
        items: [{ editorUrl, id: postId }],
      },
    });
    expect(executeGraphqlWithAuth).toHaveBeenCalledWith(
      serviceAccountToken,
      expect.anything(),
      { after: null, first: 10, search: 'hel', state: ['DRAFT'] },
    );
  });

  it('reports an empty page', async () => {
    vi.mocked(executeGraphqlWithAuth).mockResolvedValue({
      blogAdminPosts: { endCursor: null, hasNextPage: false, items: [] },
    });

    const result = await listBlogPostsToolHandler({});

    expect(firstText(result)).toBe('No blog posts matched.');
  });

  it('rejects an unknown state', async () => {
    const result = await listBlogPostsToolHandler(
      JSON.parse('{"state":["PUBLISHED"]}'),
    );

    expect(result).toMatchObject({ isError: true });
  });
});

describe('listBlogTagsToolHandler / listBlogAuthorsToolHandler', () => {
  it('lists tag slugs', async () => {
    const tags = [{ description: null, name: 'News', slug: 'news' }];
    vi.mocked(executeGraphqlWithAuth).mockResolvedValue({
      blogAdminTags: tags,
    });

    const result = await listBlogTagsToolHandler({});

    expect(result).toMatchObject({ structuredContent: { tags } });
    expect(firstText(result)).toContain('news');
  });

  it('lists author slugs', async () => {
    const authors = [{ displayName: 'Ada', slug: 'ada' }];
    vi.mocked(executeGraphqlWithAuth).mockResolvedValue({
      blogAdminAuthors: authors,
    });

    const result = await listBlogAuthorsToolHandler({});

    expect(result).toMatchObject({ structuredContent: { authors } });
    expect(firstText(result)).toContain('ada (Ada)');
  });
});
