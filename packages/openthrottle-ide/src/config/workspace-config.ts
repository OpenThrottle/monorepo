import { isAbsolute, resolve, sep } from 'node:path';

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

/**
 * Resolve a caller-supplied, workspace-relative path against `resolved.root`
 * and verify the result stays inside the root. This is the engine's FS-scoping
 * boundary: every read driven by an attacker-reachable path must route through
 * here so a traversal (`../../etc/passwd`) or an absolute segment
 * (`/etc/passwd`) cannot escape the workspace.
 *
 * Returns the contained absolute path, or `undefined` when the path is absolute
 * or escapes the root. Callers in the symbol/semantic layers treat `undefined`
 * as "nothing resolves" (their never-throw contract).
 */
export function resolveInsideRoot(
  resolved: ResolvedWorkspaceConfig,
  relativePath: string,
): string | undefined {
  if (isAbsolute(relativePath)) {
    return undefined;
  }

  const absolutePath = resolve(resolved.root, relativePath);

  if (
    absolutePath !== resolved.root &&
    !absolutePath.startsWith(resolved.root + sep)
  ) {
    return undefined;
  }

  return absolutePath;
}
