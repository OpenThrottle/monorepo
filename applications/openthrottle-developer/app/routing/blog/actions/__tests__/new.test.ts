// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('@openthrottle/react-router-graphql', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@openthrottle/react-router-graphql')>();

  return { ...actual, executeGraphqlWithAuth: vi.fn() };
});

const { executeGraphqlWithAuth } =
  await import('@openthrottle/react-router-graphql');
const { CreateBlogPostDraftDocument } = await import('~/__generated__/graphql');
const { runBlogPostCreateAction } = await import('../new');

const mockExecute = vi.mocked(executeGraphqlWithAuth);

const request = (): Request =>
  new Request('http://localhost/blog/new', { method: 'POST' });

const conflict = {
  createBlogPost: {
    __typename: 'BlogSlugConflictError',
    message: 'taken',
    slug: 'untitled-x',
  },
};

describe('routing/blog/actions/new', () => {
  beforeEach(() => {
    mockExecute.mockReset();
  });

  test('creates an untitled DRAFT with a generated kebab-case slug', async () => {
    mockExecute.mockResolvedValueOnce({
      createBlogPost: { __typename: 'BlogPostAdminObject', id: 'post-9' },
    });

    expect(await runBlogPostCreateAction(request())).toEqual({
      error: null,
      postId: 'post-9',
    });
    expect(mockExecute).toHaveBeenCalledWith(
      expect.any(Request),
      CreateBlogPostDraftDocument,
      {
        input: {
          bodyMarkdown: '',
          slug: expect.stringMatching(/^untitled-[a-z0-9]+-[a-z0-9]{4}$/),
          title: 'Untitled post',
        },
      },
    );
  });

  test('retries once with a new slug after a conflict', async () => {
    mockExecute.mockResolvedValueOnce(conflict).mockResolvedValueOnce({
      createBlogPost: { __typename: 'BlogPostAdminObject', id: 'post-10' },
    });

    expect(await runBlogPostCreateAction(request())).toEqual({
      error: null,
      postId: 'post-10',
    });
    expect(mockExecute).toHaveBeenCalledTimes(2);
  });

  test('surfaces the conflict when the retry collides too', async () => {
    mockExecute.mockResolvedValueOnce(conflict).mockResolvedValueOnce(conflict);

    const result = await runBlogPostCreateAction(request());

    expect(result.postId).toBeNull();
    expect(result.error).toMatch(/free slug/);
    expect(mockExecute).toHaveBeenCalledTimes(2);
  });
});
