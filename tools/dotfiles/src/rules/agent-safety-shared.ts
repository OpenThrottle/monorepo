import { ESLintUtils } from '@typescript-eslint/utils';

/**
 * Shared plumbing for the agent-safety rules (`mcp-tool-registration`,
 * `agent-cli-spawn-chokepoint`, `disable-requires-reason`). See
 * docs/monorepo/code-style.md, "Agent-safety rules".
 */

export const createAgentSafetyRule = ESLintUtils.RuleCreator(
  () =>
    'https://github.com/OpenThrottle/monorepo/blob/main/docs/monorepo/code-style.md#agent-safety-rules',
);

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
  const normalized = filename.replaceAll('\\', '/');
  return patterns.some((pattern) => {
    const suffix = `/${pattern}`;
    return pattern.endsWith('/')
      ? normalized.includes(suffix)
      : normalized.endsWith(suffix);
  });
};
