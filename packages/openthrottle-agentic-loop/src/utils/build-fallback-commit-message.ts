import type { LoopTask } from '../contract/index.ts';
import {
  COMMIT_HEADER_MAX_CHARS,
  FALLBACK_COMMIT_TYPE,
  FALLBACK_COMMIT_TYPES,
} from '../data/data.git.ts';

const lowerFirst = (text: string): string => {
  return `${text.charAt(0).toLowerCase()}${text.slice(1)}`;
};

/**
 * @description `<type>: <task title>` fallback header (§ 7): type from the category, subject's
 * first character lower-cased, header capped at 100 characters.
 * @public
 */
export const buildFallbackCommitMessage = (
  task: Pick<LoopTask, 'category' | 'title'>,
): string => {
  const category = (task.category ?? '').trim().toLowerCase();
  const type = Object.hasOwn(FALLBACK_COMMIT_TYPES, category)
    ? (FALLBACK_COMMIT_TYPES[category] ?? FALLBACK_COMMIT_TYPE)
    : FALLBACK_COMMIT_TYPE;
  const subject = lowerFirst(task.title.replace(/\s+/g, ' ').trim());

  return `${type}: ${subject}`.slice(0, COMMIT_HEADER_MAX_CHARS).trimEnd();
};
