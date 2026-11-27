/**
 * @description A path split at its last slash.
 */
export interface SplitPath {
  /** The parent directory including its trailing slash; empty when there is none. */
  readonly directory: string;
  /** The final segment. */
  readonly name: string;
}

/**
 * @description Split a path into its directory (with trailing slash) and file name,
 * so rows can show the name first and the directory muted after it.
 */
export const splitPath = (path: string): SplitPath => {
  const slash = path.lastIndexOf('/');

  return { directory: path.slice(0, slash + 1), name: path.slice(slash + 1) };
};
