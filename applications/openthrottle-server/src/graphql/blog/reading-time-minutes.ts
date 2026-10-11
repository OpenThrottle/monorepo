/**
 * @description Pure reading-time estimate for a blog post body.
 */

const WORDS_PER_MINUTE = 200;

/**
 * @description Whole minutes to read `markdown` at ~200 words per minute, rounded up, never
 * less than 1 (an empty body still reads as a one-minute post).
 */
export const readingTimeMinutes = (markdown: string): number => {
  const words = markdown.split(/\s+/).filter((word) => word !== '').length;

  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
};
