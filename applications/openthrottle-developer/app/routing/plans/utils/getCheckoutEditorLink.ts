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
