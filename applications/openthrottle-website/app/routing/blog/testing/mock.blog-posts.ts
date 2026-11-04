import type {
  BlogPostQuery,
  BlogPostSummaryFragment,
  BlogTagQuery,
} from '~/__generated__/graphql';

export const MOCK_BLOG_POST_SUMMARY: BlogPostSummaryFragment = {
  author: { avatarUrl: null, displayName: 'Ada Lovelace', slug: 'ada' },
  coverImageAlt: 'A throttle lever',
  coverImageUrl: 'https://example.test/cover.png',
  excerpt: 'How plans become commits.',
  id: 'post-1',
  publishedAt: '2026-03-04T10:00:00.000Z',
  readingTimeMinutes: 4,
  slug: 'plans-to-commits',
  tags: [
    { name: 'Agents', slug: 'agents' },
    { name: 'Git', slug: 'git' },
  ],
  title: 'From plans to commits',
};

export const MOCK_BLOG_POST_DETAIL: NonNullable<BlogPostQuery['blogPost']> = {
  ...MOCK_BLOG_POST_SUMMARY,
  author: {
    avatarUrl: null,
    bio: 'Writes about agents.',
    displayName: 'Ada Lovelace',
    slug: 'ada',
  },
  bodyMarkdown: '## Section heading\n\nBody paragraph with **bold** text.',
  seoDescription: null,
  seoTitle: null,
  updatedAt: '2026-03-06T10:00:00.000Z',
};

export const MOCK_BLOG_TAG: BlogTagQuery['blogTags'][number] = {
  description: 'Writing about agents.',
  name: 'Agents',
  slug: 'agents',
};
