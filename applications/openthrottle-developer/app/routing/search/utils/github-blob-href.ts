/**
 * @description Builds a GitHub blob URL for ingested documentation (owner/repo, path, optional sha).
 */
export function githubBlobHref(
  repo: string,
  path: string,
  sha?: string | null,
): string {
  const ref = sha != null && sha !== '' ? sha : 'main';
  return `https://github.com/${repo}/blob/${ref}/${path}`;
}
