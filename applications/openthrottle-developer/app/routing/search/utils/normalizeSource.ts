/** Source discriminator for delegating to the appropriate card component. */
export type SearchSource = 'documentation' | 'plan' | 'task';

/** Normalizes an API source string to the three supported card types. */
export const normalizeSource = (source: string): SearchSource => {
  if (source === 'task' || source === 'documentation') {
    return source;
  }
  return 'plan';
};
