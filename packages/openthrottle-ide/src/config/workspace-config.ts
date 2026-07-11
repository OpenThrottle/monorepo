import { realpath } from 'node:fs/promises';
import { isAbsolute, resolve, sep } from 'node:path';

/**
 * Describes a code workspace to be scanned. This is the single configuration
 * object threaded through the enumeration, hashing, and search layers so that
 * an agent only has to declare the workspace once.
 *
 * @public
 */
export interface WorkspaceConfig {
  /**
   * Additional ripgrep glob patterns to exclude, on top of `.gitignore`.
   * Use ripgrep glob syntax, e.g. `dist`, `*.snap`, `**\/__generated__`.
   */
  exclude?: string[];
  /**
   * Follow symlinks while traversing. Defaults to `false` to avoid cycles and
   * escaping the workspace root. When enabled, the enumeration layers
   * `realpath` each followed entry and drop any whose canonical target resolves
   * outside `root`, so a symlink in the tree cannot be used to read files out
   * of the workspace. Residual risk: the check is best-effort against TOCTOU —
   * a target relocated between the check and a later read could still escape
   * (acceptable for this read-only indexer).
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
 * @public
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
 * @public
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

/**
 * Resolve every symlink in `absolutePath` (and in `root`) and verify the real,
 * canonical target still lives inside the workspace root.
 *
 * {@link resolveInsideRoot} only guards *lexical* traversal (`../`, absolute
 * segments); it cannot see through a symlink whose name stays inside the tree
 * but whose target points elsewhere. When `followSymlinks` is enabled,
 * `rg --follow` will happily enumerate such a path, so this check is the
 * boundary that stops a symlinked file from being read out of the workspace.
 *
 * Returns `true` when the path is contained, `false` when it escapes the root
 * or cannot be `realpath`'d (e.g. a broken/dangling symlink). Residual risk:
 * a target can still be relocated between this check and a later read (TOCTOU);
 * for a read-only indexer that window is acceptable, but consumers performing
 * privileged writes must not rely on this alone.
 */
export async function isRealPathInsideRoot(
  resolved: ResolvedWorkspaceConfig,
  absolutePath: string,
): Promise<boolean> {
  try {
    const [realRoot, realTarget] = await Promise.all([
      realpath(resolved.root),
      realpath(absolutePath),
    ]);

    return realTarget === realRoot || realTarget.startsWith(realRoot + sep);
  } catch {
    return false;
  }
}

/**
 * Filter a list of workspace-relative paths down to those whose canonical
 * (`realpath`-resolved) location stays inside `resolved.root`, dropping any
 * symlink that escapes. Used by the enumeration layers when `followSymlinks`
 * is enabled — see {@link isRealPathInsideRoot} for the per-path check and its
 * residual-risk caveats.
 */
export async function filterRealPathsInsideRoot(
  resolved: ResolvedWorkspaceConfig,
  relativePaths: string[],
): Promise<string[]> {
  const contained = await Promise.all(
    relativePaths.map((relativePath) =>
      isRealPathInsideRoot(resolved, resolve(resolved.root, relativePath)),
    ),
  );

  return relativePaths.filter((_relativePath, index) => contained[index]);
}
