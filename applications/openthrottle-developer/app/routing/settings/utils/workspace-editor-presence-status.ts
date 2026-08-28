import {
  CircleCheckIcon,
  CircleDashedIcon,
  CircleHelpIcon,
} from 'lucide-react';
import { EditorPresenceState } from '~/__generated__/graphql';
import { WORKSPACE_SETTINGS_COPY } from '~/routing/settings/data/data.copy';
import type { LucideIcon } from 'lucide-react';
import type {
  GetEditorPresenceQuery,
  WorkspaceEditorId,
} from '~/__generated__/graphql';

/** One probed editor as it arrives from the `editorPresence` query. */
type EditorPresenceEntry =
  GetEditorPresenceQuery['editorPresence']['editors'][number];

/**
 * @description How loudly a presence state is allowed to speak. `positive` makes a claim,
 * `muted` makes a quieter one, and `neutral` makes none at all — consumers branch on this
 * instead of on class names, so an UNKNOWN entry can be skipped without knowing the palette.
 * @public
 */
export type EditorPresenceTone = 'muted' | 'neutral' | 'positive';

/**
 * @description The complete display treatment for one presence state. Purely presentational:
 * nothing here disables a control or changes a submitted value.
 * @public
 */
export interface EditorPresenceStatusDescriptor {
  /** Badge variant to pair the marker with when the status renders as a chip. */
  badgeVariant: 'outline' | 'secondary';
  /** Icon for the status marker. */
  icon: LucideIcon;
  /** Tone class for the dot/icon itself. */
  indicatorClassName: string;
  /** Short suffix appended after an editor name, e.g. "detected". */
  label: string;
  /** Full sentence for assistive tech, so status is never conveyed by color alone. */
  srLabel: (editorLabel: string) => string;
  /** Whether this state makes a claim at all — see `EditorPresenceTone`. */
  tone: EditorPresenceTone;
}

/**
 * @description Display treatment per presence state. Exhaustive over `EditorPresenceState`:
 * adding a state to the schema fails typecheck here until it is given a treatment, rather
 * than silently falling through to a default. Same discipline as `WORKSPACE_EDITOR_LABELS`.
 * @public
 */
export const WORKSPACE_EDITOR_PRESENCE_STATUS: Record<
  EditorPresenceState,
  EditorPresenceStatusDescriptor
> = {
  [EditorPresenceState.Installed]: {
    badgeVariant: 'secondary',
    icon: CircleCheckIcon,
    indicatorClassName: 'text-emerald-600 dark:text-emerald-400',
    label: WORKSPACE_SETTINGS_COPY.presenceInstalledSuffix,
    srLabel: (editorLabel) =>
      `${editorLabel} ${WORKSPACE_SETTINGS_COPY.presenceInstalledSrSuffix}`,
    tone: 'positive',
  },
  [EditorPresenceState.NotFound]: {
    badgeVariant: 'outline',
    icon: CircleDashedIcon,
    indicatorClassName: 'text-muted-foreground',
    label: WORKSPACE_SETTINGS_COPY.presenceNotFoundSuffix,
    srLabel: (editorLabel) =>
      `${editorLabel} ${WORKSPACE_SETTINGS_COPY.presenceNotFoundSrSuffix}`,
    tone: 'muted',
  },
  // UNKNOWN is given a treatment so the Record stays exhaustive, but its tone is
  // `neutral` precisely so per-item consumers skip it: absence of a claim must never
  // look like a negative claim.
  [EditorPresenceState.Unknown]: {
    badgeVariant: 'outline',
    icon: CircleHelpIcon,
    indicatorClassName: 'text-muted-foreground/60',
    label: WORKSPACE_SETTINGS_COPY.presenceUnknownSuffix,
    srLabel: (editorLabel) =>
      `${editorLabel} ${WORKSPACE_SETTINGS_COPY.presenceUnknownSrSuffix}`,
    tone: 'neutral',
  },
};

/**
 * @description Descriptor for a single presence state, for consumers that hold a state but
 * not the whole map.
 * @public
 */
export const getEditorPresenceStatus = (
  state: EditorPresenceState,
): EditorPresenceStatusDescriptor => WORKSPACE_EDITOR_PRESENCE_STATUS[state];

/**
 * @description Indexes a probe result by editor so any surface can look up a state in O(1),
 * including for editors the probe never covered — those read as UNKNOWN rather than as a
 * missing entry the caller has to special-case. Tolerates a null result (failed query).
 * @public
 */
export const buildEditorPresenceIndex = (
  editors?: readonly EditorPresenceEntry[] | null,
): Map<WorkspaceEditorId, EditorPresenceState> => {
  const index = new Map<WorkspaceEditorId, EditorPresenceState>();

  for (const entry of editors ?? []) {
    index.set(entry.editor, entry.presence);
  }

  return index;
};

/**
 * @description Presence for one editor out of an index, defaulting to UNKNOWN. Keeps the
 * "unprobed reads as unknown" rule in exactly one place.
 * @public
 */
export const readEditorPresence = (
  index: ReadonlyMap<WorkspaceEditorId, EditorPresenceState> | null | undefined,
  editor: WorkspaceEditorId,
): EditorPresenceState => index?.get(editor) ?? EditorPresenceState.Unknown;
