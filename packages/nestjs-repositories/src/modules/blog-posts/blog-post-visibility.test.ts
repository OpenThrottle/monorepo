import { createMock } from '@golevelup/ts-vitest';
import type { SelectQueryBuilder } from 'typeorm';
import { describe, expect, it, vi } from 'vitest';

import { BLOG_POST_STATUS } from './blog-post.constants.ts';
import type { BlogPost } from './blog-post.entity.ts';
import { applyBlogPostVisibility } from './blog-post-visibility.ts';

describe('applyBlogPostVisibility', () => {
  const andWhere = vi.fn();
  const queryBuilder = createMock<SelectQueryBuilder<BlogPost>>({
    andWhere: andWhere.mockReturnThis(),
  });

  it('restricts to PUBLISHED posts whose published_at is not in the future', () => {
    applyBlogPostVisibility(queryBuilder, 'p');

    expect(andWhere).toHaveBeenNthCalledWith(
      1,
      'p.status = :blogPostPublishedStatus',
      { blogPostPublishedStatus: BLOG_POST_STATUS.PUBLISHED },
    );
    expect(andWhere).toHaveBeenNthCalledWith(2, 'p.publishedAt <= NOW()');
    expect(andWhere).toHaveBeenCalledTimes(2);
  });
});
