import type { WorkspaceEditorId } from '../workspace-settings.types.ts';
import type { EDITOR_PRESENCE_STATES } from './editor-presence.constants.ts';
/**
 * @public
 */
export type EditorPresenceState = (typeof EDITOR_PRESENCE_STATES)[number];

/**
 * Probed presence of a single editor.
 *
 * @public
 */
export interface EditorPresence {
  readonly editor: WorkspaceEditorId;
  readonly presence: EditorPresenceState;
}

/**
 * Result of one editor-presence sweep.
 *
 * @public
 */
export interface EditorPresenceResult {
  /** Every editor in the vocabulary, in {@link WORKSPACE_EDITOR_IDS} order. */
  readonly editors: readonly EditorPresence[];
  /** ISO-8601 scan timestamp (caller-stamped, else current time). */
  readonly scannedAt: string;
  /**
   * True when the probe was trusted to run against the user's own machine. False
   * means every entry is `unknown` — the UI should render no hints at all rather
   * than implying anything about what is installed.
   */
  readonly trusted: boolean;
}

/**
 * Options for {@link detectEditorPresence}.
 *
 * @public
 */
export interface DetectEditorPresenceOptions {
  /** Environment used for the container-bridge and HOME lookups (defaults to process.env). */
  readonly env?: NodeJS.ProcessEnv;
  /** Spotlight-fallback timeout in ms (default 3000). */
  readonly mdfindTimeoutMs?: number;
  /** Platform under test (defaults to process.platform). */
  readonly platform?: NodeJS.Platform;
  /** ISO-8601 scan timestamp; defaults to now when omitted. */
  readonly scannedAt?: string;
}
