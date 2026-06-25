export interface GithubBlobHrefOptions {
  /** 1-based line to anchor (`#L{line}`). */
  line?: number;
  /** Workspace-relative path of the file. */
  path: string;
  /** `owner/repo` slug. */
  repo: string;
  /** Commit/branch ref; defaults to `main`. */
  sha?: string | null;
}

/**
 * Build a GitHub blob URL for a workspace-relative path, mirroring
 * `app/routing/search/utils/github-blob-href.ts`. Appends an `#L{line}` anchor
 * when a line is given.
 *
 * @publicApi
 */
export const githubBlobHref = (options: GithubBlobHrefOptions): string => {
  const { line, path, repo, sha } = options;
  const ref = sha != null && sha !== '' ? sha : 'main';
  const anchor = line === undefined ? '' : `#L${line}`;

  // Encode each path segment so URL-significant characters (spaces, `#`, `?`,
  // …) in legal filenames don't truncate or corrupt the link — a `#` in a
  // filename would otherwise silently anchor the URL. Preserve the `/`
  // separators by encoding segment-by-segment.
  const encodedPath = path
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');

  return `https://github.com/${repo}/blob/${ref}/${encodedPath}${anchor}`;
};
