import { BLOG_WRITE_RESULT_KIND } from './write-result.constants.ts';
import type {
  BlogWriteCoverAltRequired,
  BlogWriteEntity,
  BlogWriteNotFound,
  BlogWriteOk,
  BlogWriteSlugConflict,
  BlogWriteStaleWrite,
} from './write-result.types.ts';
export const blogWriteOk = <T>(value: T): BlogWriteOk<T> => {
  return {
    kind: BLOG_WRITE_RESULT_KIND.OK,
    value,
  };
};

export const blogWriteNotFound = (
  entity: BlogWriteEntity,
  key: string,
): BlogWriteNotFound => {
  return {
    entity,
    key,
    kind: BLOG_WRITE_RESULT_KIND.NOT_FOUND,
  };
};

export const blogWriteSlugConflict = (slug: string): BlogWriteSlugConflict => {
  return {
    kind: BLOG_WRITE_RESULT_KIND.SLUG_CONFLICT,
    slug,
  };
};

export const blogWriteCoverAltRequired = (): BlogWriteCoverAltRequired => {
  return {
    kind: BLOG_WRITE_RESULT_KIND.COVER_ALT_REQUIRED,
  };
};

export const blogWriteStaleWrite = (
  currentUpdatedAt: Date,
): BlogWriteStaleWrite => {
  return {
    currentUpdatedAt,
    kind: BLOG_WRITE_RESULT_KIND.STALE_WRITE,
  };
};
