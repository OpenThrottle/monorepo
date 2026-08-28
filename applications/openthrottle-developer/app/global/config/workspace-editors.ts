/**
 * @description Client-side workspace editor ids, derived from the generated GraphQL enum
 * rather than re-listed. Server ids are lowercase (`claude`); wire values are SCREAMING
 * (`CLAUDE`) — two distinct string sets bridged by GraphQL. Index maps with
 * `WorkspaceEditorId.Claude`.
 *
 * `isWorkspaceEditorId` is the one guard for this union on the client. A second,
 * hand-copied `Set` is what let Claude Code appear checked in the picker and get
 * dropped on save.
 */

import { WorkspaceEditorId } from '~/__generated__/graphql';

export const WORKSPACE_EDITOR_IDS: readonly WorkspaceEditorId[] =
  Object.values(WorkspaceEditorId);

const WORKSPACE_EDITOR_ID_SET: ReadonlySet<string> = new Set(
  WORKSPACE_EDITOR_IDS,
);

export const isWorkspaceEditorId = (
  value: string,
): value is WorkspaceEditorId => WORKSPACE_EDITOR_ID_SET.has(value);
