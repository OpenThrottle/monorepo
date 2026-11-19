/* eslint-disable */
/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> =
  | T
  | {
      [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never;
    };
import type { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
export type BlogPostQueryVariables = Exact<{
  slug: string;
}>;

export type BlogPostQuery = {
  blogPost: {
    bodyMarkdown: string;
    seoDescription: string | null;
    seoTitle: string | null;
    updatedAt: string;
    coverImageAlt: string | null;
    coverImageUrl: string | null;
    excerpt: string | null;
    id: string;
    publishedAt: string | null;
    readingTimeMinutes: number;
    slug: string;
    title: string;
    author: {
      bio: string | null;
      avatarUrl: string | null;
      displayName: string;
      slug: string;
    } | null;
    tags: Array<{ name: string; slug: string }>;
  } | null;
};

export type BlogIndexQueryVariables = Exact<{
  after?: string | null | undefined;
  first?: number;
}>;

export type BlogIndexQuery = {
  blogPosts: {
    endCursor: string | null;
    hasNextPage: boolean;
    items: Array<{
      coverImageAlt: string | null;
      coverImageUrl: string | null;
      excerpt: string | null;
      id: string;
      publishedAt: string | null;
      readingTimeMinutes: number;
      slug: string;
      title: string;
      author: {
        avatarUrl: string | null;
        displayName: string;
        slug: string;
      } | null;
      tags: Array<{ name: string; slug: string }>;
    }>;
  };
};

export type BlogTagQueryVariables = Exact<{
  after?: string | null | undefined;
  first?: number;
  tagSlug: string;
}>;

export type BlogTagQuery = {
  blogPosts: {
    endCursor: string | null;
    hasNextPage: boolean;
    items: Array<{
      coverImageAlt: string | null;
      coverImageUrl: string | null;
      excerpt: string | null;
      id: string;
      publishedAt: string | null;
      readingTimeMinutes: number;
      slug: string;
      title: string;
      author: {
        avatarUrl: string | null;
        displayName: string;
        slug: string;
      } | null;
      tags: Array<{ name: string; slug: string }>;
    }>;
  };
  blogTags: Array<{ description: string | null; name: string; slug: string }>;
};

export type BlogFeedQueryVariables = Exact<{
  first?: number;
}>;

export type BlogFeedQuery = {
  blogPosts: {
    items: Array<{
      excerpt: string | null;
      publishedAt: string | null;
      seoDescription: string | null;
      slug: string;
      title: string;
      updatedAt: string;
      author: { displayName: string } | null;
      tags: Array<{ name: string }>;
    }>;
  };
};

export type BlogSitemapPageQueryVariables = Exact<{
  after?: string | null | undefined;
  first?: number;
}>;

export type BlogSitemapPageQuery = {
  blogPosts: {
    endCursor: string | null;
    hasNextPage: boolean;
    items: Array<{ slug: string; updatedAt: string }>;
  };
};

export type BlogSitemapTagsQueryVariables = Exact<{ [key: string]: never }>;

export type BlogSitemapTagsQuery = { blogTags: Array<{ slug: string }> };

export type BlogPostSummaryFragment = {
  coverImageAlt: string | null;
  coverImageUrl: string | null;
  excerpt: string | null;
  id: string;
  publishedAt: string | null;
  readingTimeMinutes: number;
  slug: string;
  title: string;
  author: {
    avatarUrl: string | null;
    displayName: string;
    slug: string;
  } | null;
  tags: Array<{ name: string; slug: string }>;
};

export const BlogPostSummaryFragmentDoc = {
  kind: 'Document',
  definitions: [
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'BlogPostSummary' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'BlogPostObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'author' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'avatarUrl' } },
                { kind: 'Field', name: { kind: 'Name', value: 'displayName' } },
                { kind: 'Field', name: { kind: 'Name', value: 'slug' } },
              ],
            },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'coverImageAlt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'coverImageUrl' } },
          { kind: 'Field', name: { kind: 'Name', value: 'excerpt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'publishedAt' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'readingTimeMinutes' },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'slug' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'tags' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                { kind: 'Field', name: { kind: 'Name', value: 'slug' } },
              ],
            },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'title' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<BlogPostSummaryFragment, unknown>;
export const BlogPostDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'BlogPost' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'slug' } },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'String' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'blogPost' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'slug' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'slug' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'author' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'bio' } },
                    ],
                  },
                },
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'BlogPostSummary' },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'bodyMarkdown' },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'seoDescription' },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'seoTitle' } },
                { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'BlogPostSummary' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'BlogPostObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'author' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'avatarUrl' } },
                { kind: 'Field', name: { kind: 'Name', value: 'displayName' } },
                { kind: 'Field', name: { kind: 'Name', value: 'slug' } },
              ],
            },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'coverImageAlt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'coverImageUrl' } },
          { kind: 'Field', name: { kind: 'Name', value: 'excerpt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'publishedAt' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'readingTimeMinutes' },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'slug' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'tags' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                { kind: 'Field', name: { kind: 'Name', value: 'slug' } },
              ],
            },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'title' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<BlogPostQuery, BlogPostQueryVariables>;
export const BlogIndexDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'BlogIndex' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'after' },
          },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } },
        },
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'first' },
          },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'Int' } },
          },
          defaultValue: { kind: 'IntValue', value: '9' },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'blogPosts' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'after' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'after' },
                },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'first' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'first' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'endCursor' } },
                { kind: 'Field', name: { kind: 'Name', value: 'hasNextPage' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'items' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'FragmentSpread',
                        name: { kind: 'Name', value: 'BlogPostSummary' },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'BlogPostSummary' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'BlogPostObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'author' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'avatarUrl' } },
                { kind: 'Field', name: { kind: 'Name', value: 'displayName' } },
                { kind: 'Field', name: { kind: 'Name', value: 'slug' } },
              ],
            },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'coverImageAlt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'coverImageUrl' } },
          { kind: 'Field', name: { kind: 'Name', value: 'excerpt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'publishedAt' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'readingTimeMinutes' },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'slug' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'tags' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                { kind: 'Field', name: { kind: 'Name', value: 'slug' } },
              ],
            },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'title' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<BlogIndexQuery, BlogIndexQueryVariables>;
export const BlogTagDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'BlogTag' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'after' },
          },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } },
        },
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'first' },
          },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'Int' } },
          },
          defaultValue: { kind: 'IntValue', value: '9' },
        },
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'tagSlug' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'String' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'blogPosts' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'after' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'after' },
                },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'first' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'first' },
                },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'tagSlug' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'tagSlug' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'endCursor' } },
                { kind: 'Field', name: { kind: 'Name', value: 'hasNextPage' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'items' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'FragmentSpread',
                        name: { kind: 'Name', value: 'BlogPostSummary' },
                      },
                    ],
                  },
                },
              ],
            },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'blogTags' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'description' } },
                { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                { kind: 'Field', name: { kind: 'Name', value: 'slug' } },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'BlogPostSummary' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'BlogPostObject' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'author' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'avatarUrl' } },
                { kind: 'Field', name: { kind: 'Name', value: 'displayName' } },
                { kind: 'Field', name: { kind: 'Name', value: 'slug' } },
              ],
            },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'coverImageAlt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'coverImageUrl' } },
          { kind: 'Field', name: { kind: 'Name', value: 'excerpt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'publishedAt' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'readingTimeMinutes' },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'slug' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'tags' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                { kind: 'Field', name: { kind: 'Name', value: 'slug' } },
              ],
            },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'title' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<BlogTagQuery, BlogTagQueryVariables>;
export const BlogFeedDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'BlogFeed' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'first' },
          },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'Int' } },
          },
          defaultValue: { kind: 'IntValue', value: '20' },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'blogPosts' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'first' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'first' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'items' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'author' },
                        selectionSet: {
                          kind: 'SelectionSet',
                          selections: [
                            {
                              kind: 'Field',
                              name: { kind: 'Name', value: 'displayName' },
                            },
                          ],
                        },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'excerpt' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'publishedAt' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'seoDescription' },
                      },
                      { kind: 'Field', name: { kind: 'Name', value: 'slug' } },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'tags' },
                        selectionSet: {
                          kind: 'SelectionSet',
                          selections: [
                            {
                              kind: 'Field',
                              name: { kind: 'Name', value: 'name' },
                            },
                          ],
                        },
                      },
                      { kind: 'Field', name: { kind: 'Name', value: 'title' } },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'updatedAt' },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<BlogFeedQuery, BlogFeedQueryVariables>;
export const BlogSitemapPageDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'BlogSitemapPage' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'after' },
          },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } },
        },
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'first' },
          },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'Int' } },
          },
          defaultValue: { kind: 'IntValue', value: '200' },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'blogPosts' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'after' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'after' },
                },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'first' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'first' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'endCursor' } },
                { kind: 'Field', name: { kind: 'Name', value: 'hasNextPage' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'items' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'slug' } },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'updatedAt' },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  BlogSitemapPageQuery,
  BlogSitemapPageQueryVariables
>;
export const BlogSitemapTagsDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'BlogSitemapTags' },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'blogTags' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'slug' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  BlogSitemapTagsQuery,
  BlogSitemapTagsQueryVariables
>;
