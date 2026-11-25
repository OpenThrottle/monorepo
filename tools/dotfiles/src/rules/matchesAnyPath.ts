/**
 * @description Whether `filename` is one of the sanctioned locations. A
 * pattern ending in `/` is a directory and matches anything beneath it; any
 * other pattern matches a file path ending in it. Matching is on the absolute
 * path ESLint reports, because `nx run <project>:lint` runs with cwd at the
 * project, where a repo-relative `files` glob can never match.
 */
export const matchesAnyPath = (
  filename: string,
  patterns: readonly string[],
): boolean => {
  const normalized = filename.replace(/\\/g, '/');
  return patterns.some((pattern) => {
    const suffix = `/${pattern}`;
    return pattern.endsWith('/')
      ? normalized.includes(suffix)
      : normalized.endsWith(suffix);
  });
};
