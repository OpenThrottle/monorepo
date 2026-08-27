import { EditorPresenceState } from '~/__generated__/graphql';
import type {
  GetEditorPresenceQuery,
  WorkspaceEditorId,
} from '~/__generated__/graphql';

type EditorPresenceResult = GetEditorPresenceQuery['editorPresence'];

/**
 * @description Indexes a presence payload by editor id so a card can look its
 * own state up in one step. Built from the response rather than the catalog:
 * an editor the probe omitted resolves to `null`, which renders no claim.
 */
export const buildWorkspaceEditorPresenceMap = (
  presence?: EditorPresenceResult | null,
): ReadonlyMap<WorkspaceEditorId, EditorPresenceState> =>
  new Map(
    (presence?.editors ?? []).map((entry) => [entry.editor, entry.presence]),
  );

/**
 * Locale timestamp for the scan footnote, or null when unparseable.
 *
 * Accepts a `Date` as well as a string on purpose: codegen types `scannedAt`
 * as `string`, but the DateTime scalar deserializes to a real `Date` through
 * the router's single-fetch payload. A string-only guard silently swallowed
 * the whole footnote in the running app while every unit test passed.
 */
export const formatWorkspaceEditorScannedAt = (
  scannedAt?: Date | string | null,
): string | null => {
  if (scannedAt === null || scannedAt === undefined || scannedAt === '') {
    return null;
  }

  const date = scannedAt instanceof Date ? scannedAt : new Date(scannedAt);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleString();
};
