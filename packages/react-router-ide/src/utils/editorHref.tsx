export interface EditorHrefOptions {
  /** Absolute filesystem path (the caller supplies it; this util never resolves one). */
  absolutePath: string;
  /** 1-based column. */
  column?: number;
  /** 1-based line. */
  line?: number;
  /** Editor URL scheme; defaults to `vscode`. */
  scheme?: string;
}

/**
 * Build an "open in editor" deep link for an absolute filesystem path, e.g.
 * `vscode://file/abs/path:line:column`.
 *
 * @publicApi
 */
export const editorHref = (options: EditorHrefOptions): string => {
  const { absolutePath, column, line, scheme = 'vscode' } = options;
  const lineSuffix = line === undefined ? '' : `:${line}`;
  const columnSuffix =
    line === undefined || column === undefined ? '' : `:${column}`;

  // Encode each path segment so URL-significant characters (spaces, `#`, `?`,
  // …) in legal filenames don't truncate or corrupt the deep link; preserve the
  // `/` separators by encoding segment-by-segment.
  const encodedPath = absolutePath
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');

  return `${scheme}://file${encodedPath}${lineSuffix}${columnSuffix}`;
};
