/**
 * @description Public, unauthenticated read API for the marketing-site blog. All visibility
 * rules (PUBLISHED, not future-dated) live in BlogPostsService / BlogTagsService; this resolver
 * only calls them and maps entities to the public objects, so a draft, archived or scheduled post
 * is unreachable here by construction. Author and tags arrive hydrated from the services, so
 * there is no per-post follow-up query.
 */

import { Args, Int, Query, Resolver } from '@nestjs/graphql';
import { Public } from '@openthrottle/nestjs-auth';
import {
  BlogPostsService,
  BlogTagsService,
} from '@openthrottle/nestjs-repositories';

import { BlogPostListResult, BlogPostObject } from './blog-post.object.ts';
import { BlogTagObject } from './blog-tag.object.ts';
import { toBlogPostObject, toBlogTagObject } from './to-blog-post-object.ts';

const DEFAULT_PAGE_SIZE = 10;

@Public()
@Resolver()
export class BlogResolver {
  constructor(
    private readonly blogPostsService: BlogPostsService,
    private readonly blogTagsService: BlogTagsService,
  ) {}

  @Query(() => BlogPostObject, {
    description: `A publicly visible blog post by slug. Null for an unknown slug and for any post that is not public (draft, archived, or scheduled in the future).`,
    nullable: true,
  })
  async blogPost(
    @Args('slug', { type: () => String }) slug: string,
  ): Promise<BlogPostObject | null> {
    const post = await this.blogPostsService.findPublishedBySlug(slug);

    return post == null ? null : toBlogPostObject(post);
  }

  @Query(() => BlogPostListResult, {
    description: `Publicly visible blog posts, newest first, with cursor pagination. Optionally filtered to one tag.`,
  })
  async blogPosts(
    @Args('first', { defaultValue: DEFAULT_PAGE_SIZE, type: () => Int })
    first: number,
    @Args('after', { nullable: true, type: () => String })
    after: string | null | undefined,
    @Args('tagSlug', { nullable: true, type: () => String })
    tagSlug: string | null | undefined,
  ): Promise<BlogPostListResult> {
    const page = await this.blogPostsService.findPublished({
      after,
      first,
      tagSlug,
    });

    return {
      endCursor: page.endCursor,
      hasNextPage: page.hasNextPage,
      items: page.items.map(toBlogPostObject),
    };
  }

  @Query(() => [BlogTagObject], {
    description: `Blog tags carried by at least one publicly visible post, ordered by name.`,
  })
  async blogTags(): Promise<BlogTagObject[]> {
    const tags = await this.blogTagsService.findVisibleTags();

    return tags.map(toBlogTagObject);
  }
}
