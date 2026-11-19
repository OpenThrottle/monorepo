import type { TAG_SOURCES } from './tag-source.constants.ts';

/**
 * @description One of {@link TAG_SOURCES}: who wrote a plan, task or project tag row.
 * @public
 */
export type TagSource = (typeof TAG_SOURCES)[keyof typeof TAG_SOURCES];
