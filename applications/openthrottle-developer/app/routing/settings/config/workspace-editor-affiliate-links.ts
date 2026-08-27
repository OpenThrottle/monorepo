import { WorkspaceEditorId } from '~/__generated__/graphql';

/**
 * Affiliate / referral URLs per supported workspace editor. Value is `null`
 * when the editor has no affiliate program (e.g. Claude Code and VS Code) —
 * callers must omit the link in that case.
 *
 * Kept as static config rather than env vars: these are public referral codes,
 * not secrets, so there is nothing to protect and static values stay testable.
 */
export const WORKSPACE_EDITOR_AFFILIATE_LINKS: Readonly<
  Record<WorkspaceEditorId, string | null>
> = {
  [WorkspaceEditorId.Claude]: null,
  [WorkspaceEditorId.Cursor]: 'https://cursor.com/referral?code=TATK4GNIDWSM',
  [WorkspaceEditorId.Vscode]: null,
};

/**
 * Returns the affiliate URL for an editor, or `null` when none is configured.
 * The UI uses `null` as the signal to omit the link entirely.
 */
export const getWorkspaceEditorAffiliateUrl = (
  editor: WorkspaceEditorId,
): string | null => WORKSPACE_EDITOR_AFFILIATE_LINKS[editor] ?? null;
