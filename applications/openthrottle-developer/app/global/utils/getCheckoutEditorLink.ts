import { WorkspaceEditorId } from '~/__generated__/graphql';
import { getWorkspaceEditorDeepLink } from '~/global/config/workspace-editor-deep-links';

export interface CheckoutEditorLinkSource {
  readonly filesystemPath: string;
}

/**
 * @description Open-folder deep-link for a run's checkout, in the user's
 * default editor (`null` → VS Code, the pre-preference behavior). The default
 * is honored even when it is not among the enabled editors: enabling governs
 * which buttons a group shows, while this single link is the user's explicit
 * pick (D5 warns about that mismatch on `/settings/preferences`). Null when
 * there is no checkout, so callers only build a link when a path is present.
 */
export const getCheckoutEditorLink = (
  checkout: CheckoutEditorLinkSource | null | undefined,
  defaultEditor: WorkspaceEditorId | null,
): string | null => {
  if (checkout == null) {
    return null;
  }

  const target =
    getWorkspaceEditorDeepLink(defaultEditor ?? WorkspaceEditorId.Vscode) ??
    getWorkspaceEditorDeepLink(WorkspaceEditorId.Vscode);

  return target?.buildFolderHref(checkout.filesystemPath) ?? null;
};

/**
 * @description Join a checkout root and a path into an absolute path. A path
 * that is already absolute is returned untouched.
 */
const resolveCheckoutFilePath = (
  filesystemPath: string,
  path: string,
): string => {
  if (path.startsWith('/')) {
    return path;
  }
  const root = filesystemPath.replace(/\/+$/, '');
  const relative = path.replace(/^\.\//, '');

  return `${root}/${relative}`;
};

/**
 * @description Open-one-file deep-link for a path in a checkout (given its filesystem path), in the user's
 * default editor (same resolution as {@link getCheckoutEditorLink}). An editor
 * with no file URL scheme (Claude Code opens folders only) falls back to VS
 * Code, as an unknown editor does. Null when there is no checkout path or path.
 */
export const getCheckoutFileEditorLink = (
  filesystemPath: string | null | undefined,
  defaultEditor: WorkspaceEditorId | null,
  path: string,
): string | null => {
  if (filesystemPath == null || filesystemPath === '' || path === '') {
    return null;
  }

  const absolutePath = resolveCheckoutFilePath(filesystemPath, path);
  const preferred = getWorkspaceEditorDeepLink(
    defaultEditor ?? WorkspaceEditorId.Vscode,
  );
  const fallback = getWorkspaceEditorDeepLink(WorkspaceEditorId.Vscode);

  return (
    preferred?.buildFileHref(absolutePath) ??
    fallback?.buildFileHref(absolutePath) ??
    null
  );
};
