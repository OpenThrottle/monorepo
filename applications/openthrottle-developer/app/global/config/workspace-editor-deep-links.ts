import { editorHref } from '@openthrottle/react-router-ide';

import { WorkspaceEditorId } from '~/__generated__/graphql';

export interface WorkspaceEditorLaunchInput {
  /** Plan the prompt should run; omitted from folder-only links. */
  readonly planId: string;
  /** Absolute host path to open. Empty string means "unresolved". */
  readonly workingDirectory: string;
}

export interface WorkspaceEditorDeepLink {
  /**
   * Open-folder link, no prompt. `null` when no working directory resolved —
   * callers skip the button rather than render a dead link.
   */
  readonly buildFolderHref: (workingDirectory: string) => string | null;
  /**
   * Open-with-prompt link for a specific plan. `null` when the editor cannot
   * carry a prompt, or when a folder-based editor has no working directory.
   */
  readonly buildPlanHref: (input: WorkspaceEditorLaunchInput) => string | null;
  /** Button copy identifying the editor ("Open in {label}"). */
  readonly label: string;
  /**
   * True when the editor's prompt link cannot also target a folder, so the
   * prompt lands in whatever window is already focused. The UI must say so.
   */
  readonly promptTargetsFocusedWindow: boolean;
}

/**
 * `URLSearchParams` form-encodes spaces as `+`. That is legal in a query
 * string, but a handler that reads the value with `decodeURIComponent` gets a
 * literal `+` back. Percent-encoding is unambiguous under both readings, so
 * normalize after building — never hand-roll the encoding itself.
 */
const toQueryString = (params: URLSearchParams): string =>
  params.toString().replaceAll('+', '%20');

const buildClaudeHref = (params: URLSearchParams): string =>
  `claude://code/new?${toQueryString(params)}`;

/**
 * Deep-link metadata per supported editor. Exhaustive over `WorkspaceEditorId`
 * on purpose: adding an editor to the schema fails typecheck here until its
 * link shape is declared, rather than silently rendering a dead link.
 *
 * The three editors do not share a URL shape, so this models capability rather
 * than a single scheme string:
 *
 * - **Claude Code** — `claude://code/new?folder=…&q=…`. Both a folder and a
 *   prompt; Claude always shows a confirmation dialog for a link-supplied
 *   folder, so the link cannot silently open an unexpected checkout.
 * - **Cursor** — `cursor://anysphere.cursor-deeplink/prompt?text=…` carries a
 *   prompt but *no* folder, so it lands in the focused Cursor window. We ship
 *   the button anyway (it is still the fastest path when Cursor is already
 *   open on the right checkout) with `promptTargetsFocusedWindow` set so the
 *   UI can state that in a tooltip. Its folder link stays `cursor://file…`.
 * - **VS Code** — `vscode://file…`, open-folder only. There is no stable
 *   prompt parameter (microsoft/vscode#279701 is still open); do not invent
 *   one.
 */
export const WORKSPACE_EDITOR_DEEP_LINKS: Record<
  WorkspaceEditorId,
  WorkspaceEditorDeepLink
> = {
  [WorkspaceEditorId.Claude]: {
    buildFolderHref: (workingDirectory) =>
      workingDirectory === ''
        ? null
        : buildClaudeHref(
            new URLSearchParams({
              folder: workingDirectory,
            }),
          ),
    buildPlanHref: ({ planId, workingDirectory }) =>
      workingDirectory === ''
        ? null
        : buildClaudeHref(
            new URLSearchParams({
              folder: `${workingDirectory}/`,
              q: `/ot-loop ${planId}`,
            }),
          ),
    label: 'Claude Code',
    promptTargetsFocusedWindow: false,
  },
  [WorkspaceEditorId.Cursor]: {
    buildFolderHref: (workingDirectory) =>
      workingDirectory === ''
        ? null
        : editorHref({ absolutePath: workingDirectory, scheme: 'cursor' }),
    buildPlanHref: ({ planId }) =>
      `cursor://anysphere.cursor-deeplink/prompt?${toQueryString(
        new URLSearchParams({
          text: `Run OpenThrottle plan ${planId} following .agents/skills/ot-loop/SKILL.md`,
        }),
      )}`,
    label: 'Cursor',
    promptTargetsFocusedWindow: true,
  },
  [WorkspaceEditorId.Vscode]: {
    buildFolderHref: (workingDirectory) =>
      workingDirectory === ''
        ? null
        : editorHref({ absolutePath: workingDirectory, scheme: 'vscode' }),
    buildPlanHref: ({ workingDirectory }) =>
      workingDirectory === ''
        ? null
        : editorHref({ absolutePath: workingDirectory, scheme: 'vscode' }),
    label: 'VS Code',
    promptTargetsFocusedWindow: false,
  },
};

/**
 * Resolve deep-link metadata for an editor id, tolerating ids the server knows
 * but this client's generated enum does not yet.
 */
export const getWorkspaceEditorDeepLink = (
  editor: WorkspaceEditorId,
): WorkspaceEditorDeepLink | null => {
  return WORKSPACE_EDITOR_DEEP_LINKS[editor] ?? null;
};
