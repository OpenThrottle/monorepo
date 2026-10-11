/**
 * Blog copy. Every user-facing string the blog components render lives here so
 * the components stay presentational and the specs can import the same
 * constants rather than re-typing them.
 */

export const BLOG_COPY = {
  details: {
    authorHeading: 'About the author',
    backToList: 'All posts',
    updatedPrefix: 'Updated',
  },
  emptyState: {
    all: {
      actionLabel: null,
      description: 'Nothing has been published yet. Check back soon.',
      title: 'No posts yet',
    },
    notFound: {
      actionLabel: 'Browse all posts',
      description:
        'That post or tag does not exist, or it has not been published yet.',
      title: 'Not found',
    },
    tag: {
      actionLabel: 'Browse all posts',
      description: 'No published posts carry this tag yet.',
      title: 'No posts with this tag',
    },
  },
  feed: {
    description:
      'Notes from the OpenThrottle team on plans, agents and shipping software with AI.',
    language: 'en-us',
    linkTitle: 'OpenThrottle blog (RSS)',
    title: 'OpenThrottle Blog',
  },
  list: {
    ariaLabel: 'Blog posts',
  },
  meta: {
    byPrefix: 'By',
    readingTime: (minutes: number): string => `${minutes} min read`,
  },
  pagination: {
    ariaLabel: 'Blog pagination',
    newer: 'Newer posts',
    older: 'Older posts',
  },
  routes: {
    index: {
      description:
        'Notes from the OpenThrottle team on plans, agents and shipping software with AI.',
      heading: 'Blog',
      lede: 'Notes from the team on plans, agents and shipping software with AI.',
      title: 'Blog',
    },
    tag: {
      description: (name: string): string =>
        `OpenThrottle blog posts tagged ${name}.`,
      eyebrow: 'Tag',
      heading: (name: string): string => `Posts tagged ${name}`,
      title: (name: string): string => `${name} posts`,
    },
  },
  tags: {
    ariaLabel: 'Tags',
  },
} as const;
