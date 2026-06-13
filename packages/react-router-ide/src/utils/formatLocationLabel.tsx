export interface FormatLocationLabelOptions {
  /** 1-based column; omitted from the label when undefined. */
  column?: number;
  /** 1-based line. */
  line: number;
  /** Workspace-relative path. */
  path: string;
}

/**
 * Format a `path:line` or `path:line:column` location label. Omits the column
 * segment when `column` is undefined.
 *
 * @publicApi
 */
export const formatLocationLabel = (
  options: FormatLocationLabelOptions,
): string => {
  const { column, line, path } = options;

  return column === undefined ? `${path}:${line}` : `${path}:${line}:${column}`;
};
