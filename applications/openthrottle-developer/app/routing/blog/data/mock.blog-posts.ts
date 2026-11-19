import type {
  BlogPostListRowFragment,
  GetBlogPostEditorQuery,
} from '~/__generated__/graphql';
import { BlogPostState } from '~/__generated__/graphql';
import type { BlogEditorPost } from '~/routing/blog/types';

/** A draft last written by a person. */
export const MOCK_HUMAN_DRAFT: BlogPostListRowFragment = {
  author: {
    displayName: 'Ada Lovelace',
    slug: 'ada',
  },
  id: 'post-human',
  lastEditedBy: 'visormatt',
  publishedAt: null,
  slug: 'hand-written-draft',
  state: BlogPostState.Draft,
  title: 'A hand-written draft',
  updatedAt: '2026-10-20T15:30:00.000Z',
};

/** A draft last written by the MCP service account. */
export const MOCK_AGENT_DRAFT: BlogPostListRowFragment = {
  author: null,
  id: 'post-agent',
  lastEditedBy: 'openthrottle-mcp',
  publishedAt: null,
  slug: 'agent-drafted-release-notes',
  state: BlogPostState.Draft,
  title: 'Agent-drafted release notes',
  updatedAt: '2026-10-21T09:00:00.000Z',
};

/** A post scheduled for a future go-live time. */
export const MOCK_SCHEDULED_POST: BlogPostListRowFragment = {
  author: {
    displayName: 'Ada Lovelace',
    slug: 'ada',
  },
  id: 'post-scheduled',
  lastEditedBy: null,
  publishedAt: '2026-11-01T17:00:00.000Z',
  slug: 'launch-day',
  state: BlogPostState.Scheduled,
  title: 'Launch day',
  updatedAt: '2026-10-22T12:00:00.000Z',
};

/** Every author the editor's author select offers. */
export const MOCK_BLOG_AUTHORS: GetBlogPostEditorQuery['blogAdminAuthors'] = [
  { displayName: 'Ada Lovelace', slug: 'ada' },
  {
    displayName: 'Grace Hopper',
    slug: 'grace',
  },
];

/** Every tag the editor's tag multi-select offers. */
export const MOCK_BLOG_TAGS: GetBlogPostEditorQuery['blogAdminTags'] = [
  { name: 'Engineering', slug: 'engineering' },
  { name: 'Releases', slug: 'releases' },
];

/** A draft as the `/blog/:postId` loader returns it. */
export const MOCK_EDITOR_DRAFT: BlogEditorPost = {
  author: {
    displayName: 'Ada Lovelace',
    slug: 'ada',
  },
  bodyMarkdown: '## Hello\n\nFirst paragraph.',
  coverImageAlt: null,
  coverImageUrl: null,
  excerpt: 'A short summary.',
  id: 'post-1',
  lastEditedBy: 'visormatt',
  publishedAt: null,
  seoDescription: null,
  seoTitle: null,
  slug: 'hello-world',
  state: BlogPostState.Draft,
  tags: [{ name: 'Engineering', slug: 'engineering' }],
  title: 'Hello world',
  updatedAt: '2026-10-20T15:30:00.000Z',
};

/** The same post after it went live. */
export const MOCK_EDITOR_LIVE: BlogEditorPost = {
  ...MOCK_EDITOR_DRAFT,
  id: 'post-live',
  publishedAt: '2026-10-21T09:00:00.000Z',
  state: BlogPostState.Live,
  title: 'Already live',
};

/** The same post scheduled to go live at a future time. */
export const MOCK_EDITOR_SCHEDULED: BlogEditorPost = {
  ...MOCK_EDITOR_DRAFT,
  id: 'post-scheduled',
  publishedAt: '2026-11-01T17:00:00.000Z',
  state: BlogPostState.Scheduled,
  title: 'Launch day',
};

/** The same post after it was archived (its `publishedAt` is kept). */
export const MOCK_EDITOR_ARCHIVED: BlogEditorPost = {
  ...MOCK_EDITOR_LIVE,
  id: 'post-archived',
  state: BlogPostState.Archived,
  title: 'Old news',
};
