import { isAbsolute, resolve } from 'node:path';

/**
 * Describes a code workspace to be scanned. This is the single configuration
 * object threaded through the enumeration, hashing, and search layers so that
 * an agent only has to declare the workspace once.
 *
 * @publicApi
 */
export interface WorkspaceConfig {
  /**
   * Additional ripgrep glob patterns to exclude, on top of `.gitignore`.
   * Use ripgrep glob syntax, e.g. `dist`, `*.snap`, `**\/__generated__`.
   */
  exclude?: string[];
  /**
   * Follow symlinks while traversing. Defaults to `false` to avoid cycles and
   * escaping the workspace root.
   */
  followSymlinks?: boolean;
  /**
   * Honor `.gitignore`/`.ignore` files (and hidden-file rules). Defaults to
   * `true`, matching how an IDE scopes a project.
   */
  respectGitignore?: boolean;
  /** Absolute path to the workspace root. Relative paths are resolved from cwd. */
  root: string;
}

/**
 * A {@link WorkspaceConfig} with all optional fields filled in and `root`
 * normalized to an absolute path. Produced by {@link resolveWorkspaceConfig}.
 *
 * @publicApi
 */
export interface ResolvedWorkspaceConfig {
  exclude: string[];
  followSymlinks: boolean;
  respectGitignore: boolean;
  root: string;
}

/** Default exclude globs applied to every workspace, regardless of `.gitignore`. */
export const DEFAULT_EXCLUDE_GLOBS: readonly string[] = ['.git'];

/**
 * Normalize a {@link WorkspaceConfig} into a {@link ResolvedWorkspaceConfig},
 * resolving `root` to an absolute path and applying defaults.
 *
 * @publicApi
 */
export function resolveWorkspaceConfig(
  config: WorkspaceConfig,
): ResolvedWorkspaceConfig {
  return {
    exclude: [...DEFAULT_EXCLUDE_GLOBS, ...(config.exclude ?? [])],
    followSymlinks: config.followSymlinks ?? false,
    respectGitignore: config.respectGitignore ?? true,
    root: isAbsolute(config.root) ? config.root : resolve(config.root),
  };
}
