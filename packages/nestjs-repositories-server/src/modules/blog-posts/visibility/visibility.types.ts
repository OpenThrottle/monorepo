import type { BLOG_POST_STATE } from './visibility.constants.ts';
/** @public */
export type BlogPostState =
  (typeof BLOG_POST_STATE)[keyof typeof BLOG_POST_STATE];
