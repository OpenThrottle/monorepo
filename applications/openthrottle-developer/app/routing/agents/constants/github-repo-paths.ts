/**
 * @description Links to the OpenThrottle monorepo on GitHub (main branch) for docs and on-disk paths.
 */
export function githubOpenThrottleMainBlob(repoRelativePath: string): string {
  const trimmed = repoRelativePath.replace(/^\//, '');
  return `https://github.com/OpenThrottle/OpenThrottle/blob/main/${trimmed}`;
}
