/* eslint-disable */
import * as types from './graphql';
import type { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';

/**
 * Map of all GraphQL operations in the project.
 *
 * This map has several performance disadvantages:
 * 1. It is not tree-shakeable, so it will include all operations in the project.
 * 2. It is not minifiable, so the string of a GraphQL query will be multiple times inside the bundle.
 * 3. It does not support dead code elimination, so it will add unused operations.
 *
 * Therefore it is highly recommended to use the babel or swc plugin for production.
 * Learn more about it here: https://the-guild.dev/graphql/codegen/plugins/presets/preset-client#reducing-bundle-size
 */
type Documents = {
  'query BlogPost($slug: String!) {\n  blogPost(slug: $slug) {\n    ...BlogPostDetail\n  }\n}': typeof types.BlogPostDocument;
  'query BlogIndex($after: String, $first: Int! = 9) {\n  blogPosts(after: $after, first: $first) {\n    ...BlogPostSummaryPage\n  }\n}': typeof types.BlogIndexDocument;
  'query BlogTag($after: String, $first: Int! = 9, $tagSlug: String!) {\n  blogPosts(after: $after, first: $first, tagSlug: $tagSlug) {\n    ...BlogPostSummaryPage\n  }\n  blogTags {\n    ...BlogTagDetail\n  }\n}': typeof types.BlogTagDocument;
  'fragment BlogFeedPost on BlogPostObject {\n  author {\n    displayName\n  }\n  excerpt\n  publishedAt\n  seoDescription\n  slug\n  tags {\n    name\n  }\n  title\n  updatedAt\n}\n\nquery BlogFeed($first: Int! = 20) {\n  blogPosts(first: $first) {\n    items {\n      ...BlogFeedPost\n    }\n  }\n}\n\nquery BlogSitemapPage($after: String, $first: Int! = 200) {\n  blogPosts(after: $after, first: $first) {\n    endCursor\n    hasNextPage\n    items {\n      slug\n      updatedAt\n    }\n  }\n}\n\nquery BlogSitemapTags {\n  blogTags {\n    slug\n  }\n}': typeof types.BlogFeedPostFragmentDoc;
  'fragment BlogAuthorSummary on BlogAuthorObject {\n  avatarUrl\n  displayName\n  slug\n}\n\nfragment BlogTagChip on BlogTagObject {\n  name\n  slug\n}\n\nfragment BlogPostSummary on BlogPostObject {\n  author {\n    ...BlogAuthorSummary\n  }\n  coverImageAlt\n  coverImageUrl\n  excerpt\n  id\n  publishedAt\n  readingTimeMinutes\n  slug\n  tags {\n    ...BlogTagChip\n  }\n  title\n}\n\nfragment BlogPostDetail on BlogPostObject {\n  author {\n    bio\n  }\n  ...BlogPostSummary\n  bodyMarkdown\n  seoDescription\n  seoTitle\n  updatedAt\n}\n\nfragment BlogPostSummaryPage on BlogPostListResult {\n  endCursor\n  hasNextPage\n  items {\n    ...BlogPostSummary\n  }\n}\n\nfragment BlogTagDetail on BlogTagObject {\n  description\n  name\n  slug\n}': typeof types.BlogAuthorSummaryFragmentDoc;
};
const documents: Documents = {
  'query BlogPost($slug: String!) {\n  blogPost(slug: $slug) {\n    ...BlogPostDetail\n  }\n}':
    types.BlogPostDocument,
  'query BlogIndex($after: String, $first: Int! = 9) {\n  blogPosts(after: $after, first: $first) {\n    ...BlogPostSummaryPage\n  }\n}':
    types.BlogIndexDocument,
  'query BlogTag($after: String, $first: Int! = 9, $tagSlug: String!) {\n  blogPosts(after: $after, first: $first, tagSlug: $tagSlug) {\n    ...BlogPostSummaryPage\n  }\n  blogTags {\n    ...BlogTagDetail\n  }\n}':
    types.BlogTagDocument,
  'fragment BlogFeedPost on BlogPostObject {\n  author {\n    displayName\n  }\n  excerpt\n  publishedAt\n  seoDescription\n  slug\n  tags {\n    name\n  }\n  title\n  updatedAt\n}\n\nquery BlogFeed($first: Int! = 20) {\n  blogPosts(first: $first) {\n    items {\n      ...BlogFeedPost\n    }\n  }\n}\n\nquery BlogSitemapPage($after: String, $first: Int! = 200) {\n  blogPosts(after: $after, first: $first) {\n    endCursor\n    hasNextPage\n    items {\n      slug\n      updatedAt\n    }\n  }\n}\n\nquery BlogSitemapTags {\n  blogTags {\n    slug\n  }\n}':
    types.BlogFeedPostFragmentDoc,
  'fragment BlogAuthorSummary on BlogAuthorObject {\n  avatarUrl\n  displayName\n  slug\n}\n\nfragment BlogTagChip on BlogTagObject {\n  name\n  slug\n}\n\nfragment BlogPostSummary on BlogPostObject {\n  author {\n    ...BlogAuthorSummary\n  }\n  coverImageAlt\n  coverImageUrl\n  excerpt\n  id\n  publishedAt\n  readingTimeMinutes\n  slug\n  tags {\n    ...BlogTagChip\n  }\n  title\n}\n\nfragment BlogPostDetail on BlogPostObject {\n  author {\n    bio\n  }\n  ...BlogPostSummary\n  bodyMarkdown\n  seoDescription\n  seoTitle\n  updatedAt\n}\n\nfragment BlogPostSummaryPage on BlogPostListResult {\n  endCursor\n  hasNextPage\n  items {\n    ...BlogPostSummary\n  }\n}\n\nfragment BlogTagDetail on BlogTagObject {\n  description\n  name\n  slug\n}':
    types.BlogAuthorSummaryFragmentDoc,
};

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 *
 *
 * @example
 * ```ts
 * const query = graphql(`query GetUser($id: ID!) { user(id: $id) { name } }`);
 * ```
 *
 * The query argument is unknown!
 * Please regenerate the types.
 */
export function graphql(source: string): unknown;

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: 'query BlogPost($slug: String!) {\n  blogPost(slug: $slug) {\n    ...BlogPostDetail\n  }\n}',
): (typeof documents)['query BlogPost($slug: String!) {\n  blogPost(slug: $slug) {\n    ...BlogPostDetail\n  }\n}'];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: 'query BlogIndex($after: String, $first: Int! = 9) {\n  blogPosts(after: $after, first: $first) {\n    ...BlogPostSummaryPage\n  }\n}',
): (typeof documents)['query BlogIndex($after: String, $first: Int! = 9) {\n  blogPosts(after: $after, first: $first) {\n    ...BlogPostSummaryPage\n  }\n}'];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: 'query BlogTag($after: String, $first: Int! = 9, $tagSlug: String!) {\n  blogPosts(after: $after, first: $first, tagSlug: $tagSlug) {\n    ...BlogPostSummaryPage\n  }\n  blogTags {\n    ...BlogTagDetail\n  }\n}',
): (typeof documents)['query BlogTag($after: String, $first: Int! = 9, $tagSlug: String!) {\n  blogPosts(after: $after, first: $first, tagSlug: $tagSlug) {\n    ...BlogPostSummaryPage\n  }\n  blogTags {\n    ...BlogTagDetail\n  }\n}'];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: 'fragment BlogFeedPost on BlogPostObject {\n  author {\n    displayName\n  }\n  excerpt\n  publishedAt\n  seoDescription\n  slug\n  tags {\n    name\n  }\n  title\n  updatedAt\n}\n\nquery BlogFeed($first: Int! = 20) {\n  blogPosts(first: $first) {\n    items {\n      ...BlogFeedPost\n    }\n  }\n}\n\nquery BlogSitemapPage($after: String, $first: Int! = 200) {\n  blogPosts(after: $after, first: $first) {\n    endCursor\n    hasNextPage\n    items {\n      slug\n      updatedAt\n    }\n  }\n}\n\nquery BlogSitemapTags {\n  blogTags {\n    slug\n  }\n}',
): (typeof documents)['fragment BlogFeedPost on BlogPostObject {\n  author {\n    displayName\n  }\n  excerpt\n  publishedAt\n  seoDescription\n  slug\n  tags {\n    name\n  }\n  title\n  updatedAt\n}\n\nquery BlogFeed($first: Int! = 20) {\n  blogPosts(first: $first) {\n    items {\n      ...BlogFeedPost\n    }\n  }\n}\n\nquery BlogSitemapPage($after: String, $first: Int! = 200) {\n  blogPosts(after: $after, first: $first) {\n    endCursor\n    hasNextPage\n    items {\n      slug\n      updatedAt\n    }\n  }\n}\n\nquery BlogSitemapTags {\n  blogTags {\n    slug\n  }\n}'];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: 'fragment BlogAuthorSummary on BlogAuthorObject {\n  avatarUrl\n  displayName\n  slug\n}\n\nfragment BlogTagChip on BlogTagObject {\n  name\n  slug\n}\n\nfragment BlogPostSummary on BlogPostObject {\n  author {\n    ...BlogAuthorSummary\n  }\n  coverImageAlt\n  coverImageUrl\n  excerpt\n  id\n  publishedAt\n  readingTimeMinutes\n  slug\n  tags {\n    ...BlogTagChip\n  }\n  title\n}\n\nfragment BlogPostDetail on BlogPostObject {\n  author {\n    bio\n  }\n  ...BlogPostSummary\n  bodyMarkdown\n  seoDescription\n  seoTitle\n  updatedAt\n}\n\nfragment BlogPostSummaryPage on BlogPostListResult {\n  endCursor\n  hasNextPage\n  items {\n    ...BlogPostSummary\n  }\n}\n\nfragment BlogTagDetail on BlogTagObject {\n  description\n  name\n  slug\n}',
): (typeof documents)['fragment BlogAuthorSummary on BlogAuthorObject {\n  avatarUrl\n  displayName\n  slug\n}\n\nfragment BlogTagChip on BlogTagObject {\n  name\n  slug\n}\n\nfragment BlogPostSummary on BlogPostObject {\n  author {\n    ...BlogAuthorSummary\n  }\n  coverImageAlt\n  coverImageUrl\n  excerpt\n  id\n  publishedAt\n  readingTimeMinutes\n  slug\n  tags {\n    ...BlogTagChip\n  }\n  title\n}\n\nfragment BlogPostDetail on BlogPostObject {\n  author {\n    bio\n  }\n  ...BlogPostSummary\n  bodyMarkdown\n  seoDescription\n  seoTitle\n  updatedAt\n}\n\nfragment BlogPostSummaryPage on BlogPostListResult {\n  endCursor\n  hasNextPage\n  items {\n    ...BlogPostSummary\n  }\n}\n\nfragment BlogTagDetail on BlogTagObject {\n  description\n  name\n  slug\n}'];

export function graphql(source: string) {
  return (documents as any)[source] ?? {};
}

export type DocumentType<TDocumentNode extends DocumentNode<any, any>> =
  TDocumentNode extends DocumentNode<infer TType, any> ? TType : never;
