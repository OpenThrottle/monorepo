import {
  RECENT_WORKSPACE_PATHS_MAX,
  RECENT_WORKSPACE_PATHS_STORAGE_KEY,
} from '~/routing/plans/config/defaults';

/**
 * @description Client-side validation for the workspace path input. Returns an error
 * message when the path is obviously invalid, or `undefined` when it looks plausible.
 * Server-side validation (existsSync, allowlist) is authoritative.
 */
export const validateWorkspacePathClient = (
  raw: string,
): string | undefined => {
  const trimmed = raw.trim();
  if (trimmed === '') return undefined;

  if (!trimmed.startsWith('/')) {
    return 'Path must be absolute (start with /)';
  }

  if (trimmed.length > 4096) {
    return 'Path is too long (max 4096 characters)';
  }

  if (/\0/.test(trimmed)) {
    return 'Path contains invalid characters';
  }

  return undefined;
};

/**
 * @description Reads recently used workspace paths from localStorage. Returns an
 * empty array on error or when nothing is stored.
 */
export const getRecentWorkspacePaths = (): string[] => {
  try {
    const raw = localStorage.getItem(RECENT_WORKSPACE_PATHS_STORAGE_KEY);
    if (raw == null) return [];

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(
      (item): item is string => typeof item === 'string' && item.trim() !== '',
    );
  } catch {
    return [];
  }
};

/**
 * @description Adds a path to the front of the recent workspace paths list (MRU order).
 * Deduplicates and caps at {@link RECENT_WORKSPACE_PATHS_MAX}.
 */
export const addRecentWorkspacePath = (path: string): void => {
  const trimmed = path.trim();
  if (trimmed === '') return;

  try {
    const existing = [...getRecentWorkspacePaths()];
    const deduped = existing.filter((p) => p !== trimmed);
    const next = [trimmed, ...deduped].slice(0, RECENT_WORKSPACE_PATHS_MAX);

    localStorage.setItem(
      RECENT_WORKSPACE_PATHS_STORAGE_KEY,
      JSON.stringify(next),
    );
  } catch {
    // localStorage unavailable
  }
};

/**
 * @description Removes a single path from the recent workspace paths list.
 */
export const removeRecentWorkspacePath = (path: string): void => {
  const trimmed = path.trim();
  if (trimmed === '') return;

  try {
    const existing = [...getRecentWorkspacePaths()];
    const next = existing.filter((p) => p !== trimmed);

    localStorage.setItem(
      RECENT_WORKSPACE_PATHS_STORAGE_KEY,
      JSON.stringify(next),
    );
  } catch {
    // localStorage unavailable
  }
};
